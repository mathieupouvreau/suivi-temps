"""
Script de génération automatique des affectations.

Lit   : data/contexte-affectations.json  (produit par analyse-affectations)
Écrit : data/affectations-draft.json     (affectations fusionnées)
        data/plan-affectation.json        (résumé compact pour l'agent)
        data/rapport-affectations.md      (si des projets échouent)
Stdout: résumé JSON compact
"""

from __future__ import annotations

import json
import sys
import copy
from datetime import date, datetime, timedelta
from pathlib import Path

# ────────────────────────────────────────────────────────────
# 0. Lecture du contexte
# ────────────────────────────────────────────────────────────
CONTEXTE_PATH = Path("data/contexte-affectations.json")

if not CONTEXTE_PATH.exists():
    print(json.dumps({
        "status": "error",
        "message": f"Fichier {CONTEXTE_PATH} introuvable. Lancez d'abord le skill analyse-affectations."
    }))
    sys.exit(1)

try:
    ctx = json.loads(CONTEXTE_PATH.read_text(encoding="utf-8"))
except (json.JSONDecodeError, OSError) as e:
    print(json.dumps({
        "status": "error",
        "message": f"Erreur de parsing de {CONTEXTE_PATH} : {e}"
    }))
    sys.exit(1)

equipe = ctx["equipe"]
projets = ctx["projets"]
jours = ctx["jours"]
affectations_existantes = ctx.get("affectationsExistantes", {})
projets_a_planifier = ctx.get("projetsAPlanifier", [])
projets_ignores = ctx.get("projetsIgnores", [])

if not projets_a_planifier:
    print(json.dumps({
        "status": "error",
        "message": "Aucun projet à planifier dans le contexte."
    }))
    sys.exit(1)

# ────────────────────────────────────────────────────────────
# 1. Helpers
# ────────────────────────────────────────────────────────────

def parse_date(s: str) -> date:
    """Parse une date au format JJ/MM/AAAA."""
    d, m, y = s.split("/")
    return date(int(y), int(m), int(d))


def format_date(d: date) -> str:
    """Formate une date en JJ/MM/AAAA."""
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def date_key(d: date) -> str:
    """Clé unique pour un jour (pour les sets)."""
    return f"{d.year}-{d.month - 1}-{d.day}"


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5


def next_day(d: date) -> date:
    return d + timedelta(days=1)


def next_business_day(d: date) -> date:
    nd = next_day(d)
    while is_weekend(nd):
        nd = next_day(nd)
    return nd


# ────────────────────────────────────────────────────────────
# 2. Index des données
# ────────────────────────────────────────────────────────────

membre_par_nom: dict = {m["nom"]: m for m in equipe}

RETOUR_DEV = "Retour dev"

ROLE_TACHE = {
    "Spec": "Spec",
    "Dev": "Dev",
    "Tests": "Tests",
    RETOUR_DEV: "Dev",
}

TACHE_ORDER = ["Spec", "Dev", "Tests", RETOUR_DEV]


def get_preceding_task(tache: str) -> str | None:
    """Tâche prédécesseur dans l'ordonnancement."""
    if tache == "Dev":
        return "Spec"
    if tache in ("Tests", RETOUR_DEV):
        return "Dev"
    return None


def get_chiffrage_tache(projet_id: int, tache: str) -> int:
    """Chiffrage d'une tâche pour un projet donné."""
    p = next((pr for pr in projets if pr["id"] == projet_id), None)
    if not p:
        return 0
    mapping = {"Spec": p["spec"], "Dev": p["dev"], "Tests": p["tests"], RETOUR_DEV: p["retourDev"]}
    return mapping.get(tache, 0)


# ────────────────────────────────────────────────────────────
# 3. Suivi des nouvelles affectations (évite double-réservation)
# ────────────────────────────────────────────────────────────

new_aff_keys: set[str] = set()


def mark_affected(membre_id: int, d: date) -> None:
    new_aff_keys.add(f"{date_key(d)}|{membre_id}")


def is_newly_affected(membre_id: int, d: date) -> bool:
    return f"{date_key(d)}|{membre_id}" in new_aff_keys


new_affectations: dict = {}


def add_new_affectation(membre_id: int, d: date, projet_id: int, tache: str) -> None:
    annee = str(d.year)
    mid = str(membre_id)
    mois_index = str(d.month - 1)
    jour = str(d.day)

    new_affectations.setdefault(annee, {}).setdefault(mid, {}).setdefault(mois_index, {})[jour] = {
        "projetId": projet_id,
        "tache": tache,
    }
    mark_affected(membre_id, d)


# ────────────────────────────────────────────────────────────
# 4. Disponibilité
# ────────────────────────────────────────────────────────────

def _safe_get(d: dict, *keys):
    """Accès sécurisé imbriqué dans un dict."""
    current = d
    for k in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(k)
    return current


def get_jour_capacite(membre_id: int, d: date) -> float:
    """Capacité d'un membre pour un jour donné (0, 0.5 ou 1)."""
    if is_weekend(d):
        return 0

    annee = str(d.year)
    mid = str(membre_id)
    mois_index = str(d.month - 1)
    jour = str(d.day)

    type_jour = _safe_get(jours, annee, mid, mois_index, jour)
    if type_jour:
        if str(type_jour).startswith("1/2"):
            return 0.5
        return 0

    if _safe_get(affectations_existantes, annee, mid, mois_index, jour):
        return 0

    if is_newly_affected(membre_id, d):
        return 0

    return 1


def get_jours_disponibles(membre_id: int, date_debut: date, date_fin: date, temp_keys: set[str]):
    """Liste des jours disponibles pour un membre sur une période."""
    result = []
    current = date_debut
    while current <= date_fin:
        cap = get_jour_capacite(membre_id, current)
        if cap > 0:
            tk = f"{date_key(current)}|{membre_id}"
            if tk not in temp_keys:
                result.append({"date": current, "capacite": cap})
        current = next_day(current)
    return result


# ────────────────────────────────────────────────────────────
# 5. Membres éligibles ordonnés par priorité
# ────────────────────────────────────────────────────────────

def _ajouter_membres(liste: list, added: set, filtre) -> None:
    for m in equipe:
        if m["id"] not in added and filtre(m):
            liste.append(m)
            added.add(m["id"])


def get_membres_ordonnes(tache: str, preferences: list[str] | None, passe: int = 1) -> list[dict]:
    """Membres éligibles ordonnés par priorité.

    Passe 1 : préférences utilisateur + rôle principal uniquement.
    Passe 2 : + rôle secondaire + tous les restants.
    """
    role_recherche = ROLE_TACHE[tache]
    ordered: list[dict] = []
    added: set[int] = set()

    # Préférences (toujours en premier, quel que soit le rôle)
    for nom in (preferences or []):
        m = membre_par_nom.get(nom)
        if m and m["id"] not in added:
            ordered.append(m)
            added.add(m["id"])

    # Rôle principal
    _ajouter_membres(ordered, added, lambda m: m.get("rolePrincipal") == role_recherche)

    # Passe 2 uniquement : rôle secondaire + restants
    if passe >= 2:
        _ajouter_membres(ordered, added, lambda m: m.get("roleSecondaire") == role_recherche)
        _ajouter_membres(ordered, added, lambda m: True)

    return ordered


# ────────────────────────────────────────────────────────────
# 6. Date de fin d'une tâche dans les affectations existantes
# ────────────────────────────────────────────────────────────

def flatten_affectations(aff: dict) -> list[dict]:
    """Collecte toutes les entrées d'affectation sous forme plate."""
    entries = []
    for annee, membres in aff.items():
        for _mid, mois_data in membres.items():
            for mois_idx, jour_entries in mois_data.items():
                for jour, a in jour_entries.items():
                    entries.append({"annee": annee, "moisIdx": mois_idx, "jour": jour, **a})
    return entries


def find_fin_tache_existante(projet_id: int, tache: str) -> date | None:
    last_date = None
    for e in flatten_affectations(affectations_existantes or {}):
        if e["projetId"] != projet_id or e["tache"] != tache:
            continue
        d = date(int(e["annee"]), int(e["moisIdx"]) + 1, int(e["jour"]))
        if last_date is None or d > last_date:
            last_date = d
    return last_date


# ────────────────────────────────────────────────────────────
# 7. ALGORITHME PRINCIPAL — Deux passes
#    Passe 1 : préférences + rôle principal uniquement
#    Passe 2 : + rôle secondaire + restants (si passe 1 échoue)
# ────────────────────────────────────────────────────────────


def try_allocate_project(projet: dict, passe: int):
    """Tente d'allouer toutes les tâches d'un projet.

    Retourne (ok, temp_affectations, task_end_dates, echec_detail).
    Les affectations ne sont PAS commitées (pas d'appel à add_new_affectation).
    """
    date_debut_projet = parse_date(projet["dateDebut"])
    date_fin_projet = parse_date(projet["dateFin"])

    taches_ordonnees = [
        t for t in TACHE_ORDER
        if any(tp["tache"] == t and tp["chiffrage"] > 0 for tp in projet["tachesAPlanifier"])
    ]

    temp_affectations: list[dict] = []
    temp_keys: set[str] = set()
    task_end_dates: dict[str, date] = {}
    projet_ok = True
    echec_detail = None

    for nom_tache in taches_ordonnees:
        tache_info = next((t for t in projet["tachesAPlanifier"] if t["tache"] == nom_tache), None)
        if not tache_info:
            continue

        # Date de début effective
        date_debut_tache = date_debut_projet
        prec_task = get_preceding_task(nom_tache)

        if prec_task:
            deja_planifiees = projet.get("tachesDejaPlanifiees") or []
            if prec_task in deja_planifiees:
                fin_prec = find_fin_tache_existante(projet["projetId"], prec_task)
                if fin_prec:
                    nd = next_business_day(fin_prec)
                    if nd > date_debut_tache:
                        date_debut_tache = nd
            elif prec_task in task_end_dates:
                nd = next_business_day(task_end_dates[prec_task])
                if nd > date_debut_tache:
                    date_debut_tache = nd

        if date_debut_tache > date_fin_projet:
            projet_ok = False
            echec_detail = {
                "projetId": projet["projetId"],
                "nom": projet["nom"],
                "tache": nom_tache,
                "raison": f"Fenêtre insuffisante : début tâche {format_date(date_debut_tache)} > fin projet {format_date(date_fin_projet)}",
                "chiffrage": tache_info["chiffrage"],
                "alloue": 0,
                "manque": tache_info["chiffrage"],
                "membresEligibles": [],
            }
            break

        # Membres éligibles par priorité (selon la passe)
        membres = get_membres_ordonnes(nom_tache, tache_info.get("preferences"), passe)

        # Nombre max de personnes en parallèle sur cette tâche (défaut : 1)
        max_personnes = tache_info.get("maxPersonnes", 1)

        # Allocation jour par jour — au plus tôt
        remaining = tache_info["chiffrage"]
        task_allocations: list[dict] = []

        current_date = date_debut_tache
        while remaining > 0 and current_date <= date_fin_projet:
            if is_weekend(current_date):
                current_date = next_day(current_date)
                continue

            personnes_ce_jour = 0
            for membre in membres:
                if remaining <= 0:
                    break
                if personnes_ce_jour >= max_personnes:
                    break
                tk = f"{date_key(current_date)}|{membre['id']}"
                if tk in temp_keys:
                    continue
                cap = get_jour_capacite(membre["id"], current_date)
                if cap > 0:
                    remaining -= cap
                    task_allocations.append({
                        "membreId": membre["id"],
                        "membreNom": membre["nom"],
                        "date": current_date,
                        "projetId": projet["projetId"],
                        "tache": nom_tache,
                        "capacite": cap,
                    })
                    temp_keys.add(tk)
                    personnes_ce_jour += 1

            current_date = next_day(current_date)

        if remaining > 0:
            projet_ok = False
            membres_eligibles = []
            for m in membres:
                avail_days = get_jours_disponibles(m["id"], date_debut_tache, date_fin_projet, temp_keys)
                total_dispo = sum(d["capacite"] for d in avail_days)
                if total_dispo > 0:
                    membres_eligibles.append({
                        "nom": m["nom"],
                        "rolePrincipal": m.get("rolePrincipal") or "aucun",
                        "roleSecondaire": m.get("roleSecondaire") or "aucun",
                        "joursDispo": total_dispo,
                    })
            echec_detail = {
                "projetId": projet["projetId"],
                "nom": projet["nom"],
                "tache": nom_tache,
                "raison": "Ressources insuffisantes",
                "chiffrage": tache_info["chiffrage"],
                "alloue": tache_info["chiffrage"] - remaining,
                "manque": remaining,
                "membresEligibles": membres_eligibles,
            }
            break

        temp_affectations.extend(task_allocations)

        if task_allocations:
            task_end_dates[nom_tache] = max(a["date"] for a in task_allocations)

    return projet_ok, temp_affectations, task_end_dates, echec_detail


plan: list[dict] = []
echecs: list[dict] = []

for projet in projets_a_planifier:
    # Passe 1 : préférences + rôle principal uniquement
    ok, temp_affectations, task_end_dates, echec_detail = try_allocate_project(projet, passe=1)

    # Passe 2 : si échec, réessayer avec rôle secondaire + restants
    if not ok:
        ok, temp_affectations, task_end_dates, echec_detail = try_allocate_project(projet, passe=2)

    # Commit ou échec
    if ok:
        for a in temp_affectations:
            add_new_affectation(a["membreId"], a["date"], a["projetId"], a["tache"])

        groups: dict[str, dict] = {}
        for a in temp_affectations:
            key = f"{a['membreId']}|{a['tache']}"
            if key not in groups:
                groups[key] = {
                    "membre": a["membreNom"],
                    "projet": projet["nom"],
                    "tache": a["tache"],
                    "jours": 0,
                    "debut": a["date"],
                    "fin": a["date"],
                }
            groups[key]["jours"] += a["capacite"]
            if a["date"] < groups[key]["debut"]:
                groups[key]["debut"] = a["date"]
            if a["date"] > groups[key]["fin"]:
                groups[key]["fin"] = a["date"]

        for g in groups.values():
            plan.append({
                "membre": g["membre"],
                "projet": g["projet"],
                "tache": g["tache"],
                "jours": g["jours"],
                "debut": format_date(g["debut"]),
                "fin": format_date(g["fin"]),
            })
    else:
        echecs.append(echec_detail)

# ────────────────────────────────────────────────────────────
# 8. Génération des fichiers de sortie
# ────────────────────────────────────────────────────────────


def deep_merge(target: dict, source: dict) -> dict:
    """Fusion profonde de deux dicts."""
    for key, value in source.items():
        if isinstance(value, dict) and not isinstance(value, list):
            if key not in target:
                target[key] = {}
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target


merged_affectations = deep_merge(
    copy.deepcopy(affectations_existantes or {}),
    new_affectations,
)

Path("data/affectations-draft.json").write_text(
    json.dumps(merged_affectations, indent=2, ensure_ascii=False), encoding="utf-8"
)

plan_output = {"plan": plan, "echecs": echecs}
Path("data/plan-affectation.json").write_text(
    json.dumps(plan_output, indent=2, ensure_ascii=False), encoding="utf-8"
)

if echecs:
    rapport = f"# Rapport d'affectation — Projets non planifiés\n\nDate : {format_date(date.today())}\n\n"

    for e in echecs:
        rapport += f"## {e['nom']}\n\n"
        rapport += f"**Raison** : {e['raison']}\n\n"
        rapport += "| Tâche | Chiffrage | Alloué | Manque |\n"
        rapport += "|-------|-----------|--------|--------|\n"
        rapport += f"| {e['tache']} | {e['chiffrage']}j | {e.get('alloue', 0)}j | {e['manque']}j |\n\n"

        if e.get("membresEligibles"):
            rapport += "**Membres éligibles** :\n"
            for m in e["membresEligibles"]:
                rapport += f"- {m['nom']} (rôle principal : {m['rolePrincipal']}) — {m['joursDispo']}j disponibles\n"
            rapport += "\n"

        rapport += "**Suggestion** : Réduire le chiffrage, élargir la fenêtre de dates, ou ajouter des ressources.\n\n"

    Path("data/rapport-affectations.md").write_text(rapport, encoding="utf-8")

# Résumé stdout
print(json.dumps(plan_output, ensure_ascii=False))
