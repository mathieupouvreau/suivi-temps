"""
Script de génération du fichier de contexte pour les affectations.

Lit   : data/equipe.csv
        data/projets.csv
        data/jours.json
        data/affectations.json        (optionnel)
        data/choix-utilisateur.json   (produit par l'agent IA)
Écrit : data/contexte-affectations.json
Stdout: résumé JSON compact
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# ────────────────────────────────────────────────────────────
# 0. Chemins
# ────────────────────────────────────────────────────────────

DATA_DIR = Path("data")
EQUIPE_PATH = DATA_DIR / "equipe.csv"
PROJETS_PATH = DATA_DIR / "projets.csv"
JOURS_PATH = DATA_DIR / "jours.json"
AFFECTATIONS_PATH = DATA_DIR / "affectations.json"
CHOIX_PATH = DATA_DIR / "choix-utilisateur.json"
OUTPUT_PATH = DATA_DIR / "contexte-affectations.json"


def erreur(msg: str):
    print(json.dumps({"status": "error", "message": msg}))
    sys.exit(1)


# ────────────────────────────────────────────────────────────
# 1. Lecture des fichiers sources
# ────────────────────────────────────────────────────────────

# equipe.csv
if not EQUIPE_PATH.exists():
    erreur(f"Fichier {EQUIPE_PATH} introuvable.")

equipe: list[dict] = []
with EQUIPE_PATH.open(encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        equipe.append({
            "id": int(row["ID"]),
            "nom": row["Nom"].strip().strip('"'),
            "rolePrincipal": row.get("Rôle principal", "").strip().strip('"'),
            "roleSecondaire": row.get("Rôle secondaire", "").strip().strip('"'),
        })

# projets.csv
if not PROJETS_PATH.exists():
    erreur(f"Fichier {PROJETS_PATH} introuvable.")

projets: list[dict] = []
with PROJETS_PATH.open(encoding="utf-8") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    has_pers = "Spec Pers." in fieldnames
    for row in reader:
        p: dict = {
            "id": int(row["ID"]),
            "nom": row["Nom"].strip().strip('"'),
            "chiffrage": int(row["Chiffrage"]),
            "spec": int(row["Spec"]),
            "dev": int(row["Dev"]),
            "tests": int(row["Tests"]),
            "retourDev": int(row["Retour dev"]),
        }
        if has_pers:
            p["specPersonnes"] = int(row.get("Spec Pers.", "1") or "1")
            p["devPersonnes"] = int(row.get("Dev Pers.", "1") or "1")
            p["testsPersonnes"] = int(row.get("Tests Pers.", "1") or "1")
            p["retourDevPersonnes"] = int(row.get("Retour dev Pers.", "1") or "1")
        else:
            p["specPersonnes"] = 1
            p["devPersonnes"] = 1
            p["testsPersonnes"] = 1
            p["retourDevPersonnes"] = 1
        projets.append(p)

# jours.json
if not JOURS_PATH.exists():
    erreur(f"Fichier {JOURS_PATH} introuvable.")

jours = json.loads(JOURS_PATH.read_text(encoding="utf-8"))

# affectations.json (optionnel)
if AFFECTATIONS_PATH.exists():
    affectations_existantes = json.loads(AFFECTATIONS_PATH.read_text(encoding="utf-8"))
else:
    affectations_existantes = {}

# choix-utilisateur.json
if not CHOIX_PATH.exists():
    erreur(f"Fichier {CHOIX_PATH} introuvable. L'agent doit d'abord collecter les choix utilisateur.")

try:
    choix = json.loads(CHOIX_PATH.read_text(encoding="utf-8"))
except (json.JSONDecodeError, OSError) as e:
    erreur(f"Erreur de parsing de {CHOIX_PATH} : {e}")


# ────────────────────────────────────────────────────────────
# 2. Helpers
# ────────────────────────────────────────────────────────────

TACHES = ["Spec", "Dev", "Tests", "Retour dev"]

TACHE_KEY_MAP = {
    "Spec": ("spec", "specPersonnes"),
    "Dev": ("dev", "devPersonnes"),
    "Tests": ("tests", "testsPersonnes"),
    "Retour dev": ("retourDev", "retourDevPersonnes"),
}


def parse_date(s: str) -> date:
    """Parse JJ/MM/AAAA."""
    d, m, y = s.split("/")
    return date(int(y), int(m), int(d))


def format_date_ddmmyyyy(d: date) -> str:
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # 5=samedi, 6=dimanche


def get_taches_deja_planifiees(projet_id: int) -> list[str]:
    """Cherche dans les affectations existantes les tâches ayant au moins 1 jour affecté."""
    taches_trouvees: set[str] = set()
    for annee, membres in affectations_existantes.items():
        for mid, mois_data in membres.items():
            for mois_idx, jour_entries in mois_data.items():
                for jour, aff in jour_entries.items():
                    if isinstance(aff, dict) and aff.get("projetId") == projet_id:
                        taches_trouvees.add(aff["tache"])
    return sorted(taches_trouvees, key=lambda t: TACHES.index(t) if t in TACHES else 99)


# ────────────────────────────────────────────────────────────
# 3. Construction des projets à planifier / ignorés
# ────────────────────────────────────────────────────────────

choix_projets: dict[int, dict] = {}
for cp in choix.get("projets", []):
    choix_projets[cp["projetId"]] = cp

projets_a_planifier: list[dict] = []
projets_ignores: list[dict] = []

for p in projets:
    deja_planifiees = get_taches_deja_planifiees(p["id"])

    # Tâches restantes (pas déjà planifiées ET chiffrage > 0)
    taches_restantes: list[str] = []
    for t in TACHES:
        chiff_key, _ = TACHE_KEY_MAP[t]
        if p[chiff_key] > 0 and t not in deja_planifiees:
            taches_restantes.append(t)

    if not taches_restantes:
        projets_ignores.append({
            "projetId": p["id"],
            "nom": p["nom"],
            "raison": "Toutes les tâches planifiées ou à chiffrage 0",
        })
        continue

    # Vérifier si ce projet est dans les choix utilisateur
    cp = choix_projets.get(p["id"])
    if not cp:
        # Projet a des tâches restantes mais n'a pas été sélectionné par l'utilisateur
        # → on l'ignore (l'utilisateur ne souhaite pas le planifier maintenant)
        projets_ignores.append({
            "projetId": p["id"],
            "nom": p["nom"],
            "raison": "Non sélectionné par l'utilisateur",
        })
        continue

    # Construire les tâches à planifier avec préférences
    prefs_par_tache: dict[str, list[str]] = {}
    for tp in cp.get("preferences", []):
        prefs_par_tache[tp["tache"]] = tp.get("personnes", [])

    taches_a_planifier: list[dict] = []
    for t in taches_restantes:
        chiff_key, pers_key = TACHE_KEY_MAP[t]
        taches_a_planifier.append({
            "tache": t,
            "chiffrage": p[chiff_key],
            "maxPersonnes": p[pers_key],
            "preferences": prefs_par_tache.get(t, []),
        })

    projets_a_planifier.append({
        "projetId": p["id"],
        "nom": p["nom"],
        "dateDebut": cp["dateDebut"],
        "dateFin": cp["dateFin"],
        "tachesAPlanifier": taches_a_planifier,
        "tachesDejaPlanifiees": deja_planifiees,
    })


# ────────────────────────────────────────────────────────────
# 4. Calcul des week-ends
# ────────────────────────────────────────────────────────────

weekends: list[str] = []

if projets_a_planifier:
    all_debuts = [parse_date(p["dateDebut"]) for p in projets_a_planifier]
    all_fins = [parse_date(p["dateFin"]) for p in projets_a_planifier]
    date_min = min(all_debuts)
    date_max = max(all_fins)

    current = date_min
    while current <= date_max:
        if is_weekend(current):
            weekends.append(format_date_ddmmyyyy(current))
        current += timedelta(days=1)


# ────────────────────────────────────────────────────────────
# 5. Génération du fichier de contexte
# ────────────────────────────────────────────────────────────

contexte = {
    "dateGeneration": date.today().isoformat(),
    "equipe": equipe,
    "projets": projets,
    "jours": jours,
    "weekends": weekends,
    "affectationsExistantes": affectations_existantes,
    "projetsAPlanifier": projets_a_planifier,
    "projetsIgnores": projets_ignores,
}

OUTPUT_PATH.write_text(
    json.dumps(contexte, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

# Résumé stdout
resume = {
    "status": "ok",
    "fichier": str(OUTPUT_PATH),
    "projetsAPlanifier": len(projets_a_planifier),
    "projetsIgnores": len(projets_ignores),
    "weekends": len(weekends),
    "membres": len(equipe),
}
print(json.dumps(resume, ensure_ascii=False))
