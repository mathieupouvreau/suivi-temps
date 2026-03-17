# Agent d'affectation automatique — Documentation

## Vue d'ensemble

L'agent **manager** permet de planifier automatiquement l'affectation des membres de l'équipe aux projets. Il fonctionne en deux étapes via des skills spécialisés.

```
Utilisateur                   Agent                         Fichiers
    │                           │                              │
    │  Exporter les données     │                              │
    │  depuis l'application ──────────────────────────────────▶│ data/equipe.json
    │                           │                              │ data/projets.json
    │                           │                              │ data/jours.json
    │                           │                              │ data/affectations.json
    │                           │                              │
    │  @manager ─────────────────▶│                              │
    │                           │                              │
    │                           │ ── Étape 1 : Analyse ───────▶│ Lecture des 4 fichiers
    │                           │                              │
    │  ◀── Diagnostic ─────────│                              │
    │  ◀── Demande de dates ───│                              │
    │                           │                              │
    │  Réponse dates ──────────▶│                              │
    │                           │                              │
    │                           │ ── Étape 2 : Affectation ──▶│
    │                           │                              │
    │  ◀── Plan récapitulatif ─│                              │
    │                           │                              │
    │  Validation ─────────────▶│                              │
    │                           │                              │
    │                           │ ── Génération ──────────────▶│ data/affectations-finales.json
    │                           │                              │ data/rapport-affectations.md
    │                           │                              │
    │  Réimporter dans l'app    │                              │
    │  via "Importer (JSON)" ◀─────────────────────────────────│
    │                           │                              │
```

## Structure des fichiers

```
.github/
  agents/
    manager.agent.md                       # Agent orchestrateur
  skills/
    analyse-affectations/
      SKILL.md                             # Skill 1 : diagnostic
      references/
        structures-donnees.md              # Référence : formats de données
    executer-affectations/
      SKILL.md                             # Skill 2 : affectation
      references/
        structures-donnees.md              # Référence : formats de données
data/                                      # Dossier des données (à la racine)
  equipe.json                              # Entrée : membres
  projets.json                             # Entrée : projets
  jours.json                               # Entrée : absences
  affectations.json                        # Entrée/Sortie : affectations
  rapport-affectations.md                  # Sortie : rapport d'échec
```

---

## Fichiers d'entrée

### `data/equipe.json`

Exporté depuis la vue **Équipe** (`/equipe`) → bouton **Exporter JSON**.

Tableau JSON d'objets membres :

| Champ | Description | Exemple |
|-------|-------------|--------|
| id | Identifiant unique du membre | `1` |
| nom | Nom complet | `"Jean Dupont"` |
| actif | Membre actif | `true` |
| rolePrincipal | Rôle principal : Spec, Dev, Tests (ou vide) | `"Dev"` |
| roleSecondaire | Rôle secondaire (ou vide) | `"Tests"` |

```json
[
  { "id": 1, "nom": "Jean Dupont", "actif": true, "rolePrincipal": "Dev", "roleSecondaire": "Tests" },
  { "id": 2, "nom": "Marie Martin", "actif": true, "rolePrincipal": "Spec", "roleSecondaire": "" },
  { "id": 3, "nom": "Paul Durand", "actif": true, "rolePrincipal": "Tests", "roleSecondaire": "Dev" }
]
```

### `data/projets.json`

Exporté depuis la vue **Projets** (`/projets`) → bouton **Exporter JSON**.

Tableau JSON d'objets projets :

| Champ | Description | Exemple |
|-------|-------------|--------|
| id | Identifiant unique du projet | `1` |
| nom | Nom du projet | `"Mon Projet"` |
| chiffrage | Chiffrage total en jours | `50` |
| spec | Jours de spécification | `5` |
| specPersonnes | Max personnes en parallèle pour Spec | `1` |
| dev | Jours de développement | `30` |
| devPersonnes | Max personnes en parallèle pour Dev | `2` |
| tests | Jours de tests | `10` |
| testsPersonnes | Max personnes en parallèle pour Tests | `1` |
| retourDev | Jours de retour dev | `5` |
| retourDevPersonnes | Max personnes en parallèle pour Retour dev | `1` |

```json
[
  { "id": 1, "nom": "Mon Projet", "chiffrage": 50, "spec": 5, "specPersonnes": 1, "dev": 30, "devPersonnes": 2, "tests": 10, "testsPersonnes": 1, "retourDev": 5, "retourDevPersonnes": 1 },
  { "id": 2, "nom": "Autre Projet", "chiffrage": 20, "spec": 2, "specPersonnes": 1, "dev": 12, "devPersonnes": 1, "tests": 4, "testsPersonnes": 1, "retourDev": 2, "retourDevPersonnes": 1 }
]
```

### `data/jours.json`

Exporté depuis la vue **Calendrier absences** (`/annee/:annee`) → bouton **Exporter les jours (JSON)**.

Structure imbriquée : `annee > personneId > moisIndex > jour = typeId`

| Clé | Description | Valeurs |
|-----|-------------|---------|
| annee | Année | `"2026"` |
| personneId | ID du membre | `"1"` |
| moisIndex | Mois (0 = Janvier, 11 = Décembre) | `"0"` à `"11"` |
| jour | Numéro du jour | `"1"` à `"31"` |
| typeId | Type de jour | `CP`, `1/2CP`, `Fe`, `1/2Fe`, `Arr`, `1/2Arr`, `For`, `1/2For`, `Cli`, `1/2Cli` |

```json
{
  "2026": {
    "1": {
      "0": { "1": "Fe", "15": "CP" },
      "7": { "10": "CP", "11": "CP" }
    }
  }
}
```

> Les types préfixés `1/2` comptent pour **0.5 jour** (demi-journée disponible pour un projet).

### `data/affectations.json`

Exporté depuis la vue **Calendrier projets** (`/calendrier/:annee`) → bouton **Exporter (JSON)**.

Ce fichier **peut être absent** si aucune affectation n'existe encore.

Structure imbriquée : `annee > personneId > moisIndex > jour = { projetId, tache }`

| Clé | Description | Valeurs |
|-----|-------------|---------|
| projetId | ID du projet | Entier |
| tache | Type de tâche | `Spec`, `Dev`, `Tests`, `Retour dev` |

```json
{
  "2026": {
    "1": {
      "0": {
        "5": { "projetId": 1, "tache": "Dev" },
        "6": { "projetId": 1, "tache": "Dev" }
      }
    }
  }
}
```

---

## Fichiers de sortie

### `data/affectations-finales.json`

Fichier principal généré par le skill `executer-affectations`. Contient :
- Toutes les affectations **existantes** (conservées intégralement)
- Les **nouvelles affectations** générées (projets faisables uniquement)

**Même format** que le fichier d'entrée. À réimporter dans l'application via la vue **Calendrier projets** → bouton **Importer (JSON)**.

### `data/rapport-affectations.md`

Fichier généré **uniquement si des projets sont en échec** (ressources insuffisantes). Contient pour chaque projet exclu :

| Section | Contenu |
|---------|---------|
| Raison | Cause de l'exclusion (ressources, fenêtre de dates) |
| Tableau par tâche | Chiffrage demandé vs jours disponibles |
| Membres éligibles | Liste des membres avec leur disponibilité |
| Suggestion | Pistes pour résoudre le problème |

---

## Skills

### `/analyse-affectations` — Diagnostic

**Objectif** : Lire les fichiers exportés et identifier ce qui reste à planifier.

| Étape | Action |
|-------|--------|
| 1 | Lire et parser les 4 fichiers de données |
| 2 | Identifier les tâches déjà planifiées par projet |
| 3 | Filtrer les tâches restantes (non planifiées, chiffrage > 0) |
| 4 | Afficher le diagnostic (projets à planifier, projets ignorés, équipe) |
| 5 | Demander les dates de début et de fin par projet |

**Entrées** : `data/equipe.json`, `data/projets.json`, `data/jours.json`, `data/affectations.json`
**Sortie** : Diagnostic affiché dans le chat + collecte des dates

### `/executer-affectations` — Affectation

**Objectif** : Générer les affectations en respectant toutes les contraintes.

| Étape | Action |
|-------|--------|
| 1 | Calculer la disponibilité de chaque membre par projet |
| 2 | Vérifier la faisabilité (chiffrage vs ressources disponibles) |
| 3 | Générer le rapport d'échec si nécessaire |
| 4 | Affecter les projets faisables (rôle principal → secondaire → sans rôle) |
| 5 | Proposer le plan récapitulatif et attendre validation |
| 6 | Générer `data/affectations-finales.json` et `data/rapport-affectations.md` |

**Entrées** : `data/equipe.json`, `data/projets.json`, `data/jours.json`, `data/affectations.json`, dates fournies par l'utilisateur
**Sorties** : `data/affectations-finales.json`, `data/rapport-affectations.md` (si échecs)

---

## Contraintes métier

### Jours disponibles
- Pas d'affectation sur les **week-ends** (samedi, dimanche)
- Pas d'affectation sur les **jours fériés** (type `Fe`)
- Pas d'affectation sur les **jours typés** (CP, Arr, For, Cli, etc.)
- Les **demi-journées** (`1/2*`) laissent 0.5 jour disponible

### Tâches
- Ne **jamais replanifier** une tâche déjà affectée
- **Ordonnancement strict** : Spec → Dev → Tests / Retour dev

```
 Spec ──▶ Dev ──▶ Tests
                  Retour dev  (en parallèle des Tests ou après)
```

### Priorité des rôles
1. Membres avec **rôle principal** correspondant
2. Membres avec **rôle secondaire** correspondant (seulement si le chiffrage n'est pas couvert)
3. Membres **sans rôle** défini (en dernier recours)

| Tâche | Rôle correspondant |
|-------|-------------------|
| Spec | Spec |
| Dev | Dev |
| Tests | Tests |
| Retour dev | Dev |

### Manque de ressources
Si une tâche d'un projet ne peut pas être couverte → le **projet entier est exclu** et documenté dans `data/rapport-affectations.md`.

---

## Comment utiliser

### 1. Exporter les données

Depuis l'application, exporter les 4 fichiers :

| Vue | Bouton | Fichier à renommer |
|-----|--------|--------------------|
| `/equipe` | Exporter JSON | → `data/equipe.json` |
| `/projets` | Exporter JSON | → `data/projets.json` |
| `/annee/:annee` | Exporter les jours (JSON) | → `data/jours.json` |
| `/calendrier/:annee` | Exporter (JSON) | → `data/affectations.json` |

### 2. Lancer l'agent

Dans le chat Copilot, sélectionner **`@manager`** ou utiliser les skills directement :
- `/analyse-affectations` pour le diagnostic seul
- `/executer-affectations` pour lancer l'affectation (après analyse)

### 3. Répondre aux questions

L'agent demandera pour chaque projet :
- **Date de début** (JJ/MM/AAAA)
- **Date de fin** (JJ/MM/AAAA)

### 4. Valider le plan

L'agent propose un tableau récapitulatif. Valider pour générer les fichiers.

### 5. Réimporter

Réimporter `data/affectations-finales.json` dans l'application via la vue **Calendrier projets** → bouton **Importer (JSON)**.
