---
name: analyse-affectations
description: "Analyse les données exportées pour lister les projets et tâches à affecter. Use when: lister projets, analyser affectations, voir tâches restantes, diagnostic planification, état des affectations."
---

# Analyse des affectations

## Objectif

Lire les fichiers de données exportés et produire un diagnostic complet : quels projets ont des tâches encore à planifier, quelles ressources sont disponibles, et quels sont les chiffrages restants.

## Prérequis

L'utilisateur doit avoir exporté les données depuis l'application dans le dossier `data/` :

1. **`data/equipe.csv`** — Format : `ID,Nom,Rôle principal,Rôle secondaire`
2. **`data/projets.csv`** — Format : `ID,Nom,Chiffrage,Spec,Spec Pers.,Dev,Dev Pers.,Tests,Tests Pers.,Retour dev,Retour dev Pers.` (les colonnes `Pers.` indiquent le nombre max de personnes en parallèle par tâche ; si absentes → défaut 1)
3. **`data/jours.json`** — Format : `{ "annee": { "personneId": { "moisIndex": { "jour": "typeId" } } } }`
4. **`data/affectations.json`** — Format : `{ "annee": { "personneId": { "moisIndex": { "jour": { "projetId": N, "tache": "Dev" } } } } }` (peut être absent)

Si un fichier manque, demander à l'utilisateur de l'exporter depuis l'application.

## Procédure

### 1. Lire les données

- Parser `data/equipe.csv` pour obtenir la liste des membres actifs avec leurs rôles
- Parser `data/projets.csv` pour obtenir la liste des projets et leurs chiffrages par tâche. **Deux formats supportés** :
  - Nouveau format (11 colonnes) : `ID,Nom,Chiffrage,Spec,Spec Pers.,Dev,Dev Pers.,Tests,Tests Pers.,Retour dev,Retour dev Pers.`
  - Ancien format (7 colonnes) : `ID,Nom,Chiffrage,Spec,Dev,Tests,Retour dev` — dans ce cas, `maxPersonnes` vaut 1 pour toutes les tâches
- Lire `data/jours.json` pour les jours d'absence (CP, 1/2CP, Fe, 1/2Fe, Arr, 1/2Arr, For, 1/2For, Cli, 1/2Cli)
- Lire `data/affectations.json` pour les affectations existantes (si le fichier existe)

### 2. Identifier les tâches déjà planifiées

Pour chaque projet, parcourir les affectations existantes et lister les tâches (Spec, Dev, Tests, Retour dev) qui ont au moins une affectation. Une tâche est planifiée si elle apparaît au moins une fois pour ce projet.

### 3. Déterminer les tâches à planifier

Pour chaque projet :
- Ne garder que les tâches **sans aucune affectation existante** ET dont le **chiffrage > 0**
- Ignorer complètement les projets dont toutes les tâches sont déjà planifiées ou à chiffrage 0

### 4. Présenter le diagnostic

Afficher un tableau récapitulatif et **attendre la validation de l'utilisateur** avant de passer à l'étape 5 (demande des dates). Ne pas poser de question sur les dates dans le même message que le diagnostic.

```
## Projets à planifier

| Projet       | Tâches à planifier       | Chiffrage restant | Tâches déjà planifiées |
|-------------|--------------------------|-------------------|------------------------|
| Projet Alpha | Spec (5j), Dev (30j)     | 35j               | Tests, Retour dev      |
| Projet Beta  | Tests (10j)              | 10j               | Spec, Dev, Retour dev  |

## Projets ignorés (entièrement planifiés)

| Projet        | Raison                    |
|--------------|---------------------------|
| Projet Gamma  | Toutes les tâches planifiées |

## Équipe disponible

| Membre       | Rôle principal | Rôle secondaire |
|-------------|----------------|-----------------|
| Jean Dupont  | Dev            | Tests           |

## Alertes

- Projet X : chiffrage Spec = 0, tâche ignorée
- Projet Y : aucun membre avec rôle "Tests" disponible
```

Utiliser `vscode_askQuestions` pour valider le diagnostic :

```
questions:
  - header: "Validation du diagnostic"
    question: "Ce diagnostic vous convient-il ?"
    options:
      - label: "Oui, passer aux dates"
        description: "Le diagnostic est correct, on passe à la saisie des dates par projet"
        recommended: true
      - label: "Non, corriger"
        description: "Il y a des erreurs dans le diagnostic"
```

Attendre la réponse avant de continuer.

### 5. Demander les dates

#### 5a. Dates communes ou différentes ?

Avant de demander les dates, lister les projets à planifier avec leurs noms et demander si l'utilisateur souhaite utiliser les **mêmes dates** pour tous les projets ou des **dates différentes** par projet.

Utiliser `vscode_askQuestions` :

```
questions:
  - header: "Dates de planification — Projets : Nom Projet A, Nom Projet B, Nom Projet C"
    question: "Souhaitez-vous utiliser les mêmes dates de début et de fin pour tous les projets ?"
    options:
      - label: "Oui, mêmes dates pour tous"
        description: "Une seule paire de dates (début/fin) appliquée à tous les projets"
        recommended: true
      - label: "Non, dates différentes par projet"
        description: "Saisir des dates de début et de fin spécifiques pour chaque projet"
```

Attendre la réponse avant de continuer.

#### 5b. Saisie des dates

**Si mêmes dates pour tous** : poser une seule paire de questions (début + fin) et appliquer les mêmes dates à tous les projets.

```
questions:
  - header: "Dates communes — Projets : Nom Projet A, Nom Projet B, Nom Projet C"
    question: "Date de début (JJ/MM/AAAA) ?"
  - header: "Dates communes — Projets : Nom Projet A, Nom Projet B, Nom Projet C"
    question: "Date de fin (JJ/MM/AAAA) ?"
```

**Si dates différentes par projet** : pour chaque projet (1 par 1), utiliser `vscode_askQuestions` en affichant le **nom du projet** dans le header :

```
questions:
  - header: "Projet 1/N — Nom du projet (tâches : Spec, Dev)"
    question: "Date de début (JJ/MM/AAAA) ?"
  - header: "Projet 1/N — Nom du projet"
    question: "Date de fin (JJ/MM/AAAA) ?"
```

1. Poser la question pour le **premier projet** uniquement
2. Attendre la réponse de l'utilisateur
3. Poser la question pour le **projet suivant**
4. Répéter jusqu'à avoir toutes les dates

Ne jamais demander les dates de plusieurs projets dans un même appel. Attendre la réponse avant de passer au projet suivant.

### 6. Demander les préférences de personnes

Après avoir collecté les dates de **tous** les projets, demander à l'utilisateur s'il souhaite saisir des préférences de personnes pour les projets.

#### 6a. Préférences oui ou non ?

Utiliser `vscode_askQuestions` :

```
questions:
  - header: "Préférences de personnes — Projets : Nom Projet A, Nom Projet B, Nom Projet C"
    question: "Souhaitez-vous définir des préférences de personnes pour certains projets ?"
    options:
      - label: "Non, pas de préférence"
        description: "L'agent choisira automatiquement selon les rôles et disponibilités pour tous les projets"
        recommended: true
      - label: "Oui, saisir des préférences"
        description: "Choisir les personnes préférées pour chaque tâche de chaque projet"
```

Attendre la réponse avant de continuer.

**Si "Non, pas de préférence"** : passer directement à l'étape 7. Toutes les `preferences` seront des listes vides dans le fichier de contexte.

#### 6b. Saisie des préférences (uniquement si l'utilisateur a choisi "Oui")

**Processus séquentiel** : pour chaque projet (1 par 1), utiliser `vscode_askQuestions` avec une question par tâche à planifier. Ne poser la question que pour les tâches dont le chiffrage > 0 et qui ne sont pas déjà planifiées.

Pour chaque tâche du projet, proposer la liste des membres éligibles (rôle principal, puis secondaire, puis sans rôle) plus l'option "Pas de préférence". **L'utilisateur peut sélectionner plusieurs personnes** pour une même tâche. Afficher le **nom du projet** dans chaque header.

```
questions:
  - header: "Projet 1/N — Nom du projet — Préférences"
    question: "Préférence(s) pour la Spec ? (plusieurs choix possibles, séparés par des virgules, ou 'Pas de préférence')"
    options:
      - label: "Pas de préférence"
        description: "L'agent choisira automatiquement selon les rôles et disponibilités"
        recommended: true
      - label: "Prénom Nom"
        description: "Rôle principal : Spec — X jours ouvrés disponibles"
      - label: "Prénom Nom2"
        description: "Rôle secondaire : Spec — Y jours ouvrés disponibles"
  - header: "Projet 1/N — Nom du projet — Préférences"
    question: "Préférence(s) pour le Dev ? (plusieurs choix possibles, séparés par des virgules, ou 'Pas de préférence')"
    options:
      - label: "Pas de préférence"
        description: "L'agent choisira automatiquement selon les rôles et disponibilités"
        recommended: true
      - label: "Prénom Nom"
        description: "Rôle principal : Dev — X jours ouvrés disponibles"
      - label: "Prénom Nom2"
        description: "Rôle secondaire : Dev — Y jours ouvrés disponibles"
  - header: "Projet 1/N — Nom du projet — Préférences"
    question: "Préférence(s) pour les Tests ? (plusieurs choix possibles, séparés par des virgules, ou 'Pas de préférence')"
    options:
      - label: "Pas de préférence"
        description: "L'agent choisira automatiquement selon les rôles et disponibilités"
        recommended: true
      - label: "Prénom Nom"
        description: "Rôle principal : Tests — X jours ouvrés disponibles"
      - label: "Prénom Nom2"
        description: "Rôle secondaire : Tests — Y jours ouvrés disponibles"
  - header: "Projet 1/N — Nom du projet — Préférences"
    question: "Préférence(s) pour le Retour Dev ? (plusieurs choix possibles, séparés par des virgules, ou 'Pas de préférence')"
    options:
      - label: "Pas de préférence"
        description: "L'agent choisira automatiquement selon les rôles et disponibilités"
        recommended: true
      - label: "Prénom Nom"
        description: "Rôle principal : Dev — X jours ouvrés disponibles"
      - label: "Prénom Nom2"
        description: "Rôle secondaire : Dev — Y jours ouvrés disponibles"
```

1. Poser les questions de préférence pour le **premier projet** uniquement (toutes les tâches à planifier de ce projet dans un même appel)
2. Attendre la réponse de l'utilisateur
3. Poser les questions pour le **projet suivant**
4. Répéter jusqu'à avoir toutes les préférences

**Règles** :
- Ne proposer que les membres actifs de l'équipe
- L'option "Pas de préférence" est toujours `recommended: true`
- **L'utilisateur peut choisir plusieurs personnes** pour une même tâche — dans ce cas, toutes les personnes choisies sont traitées comme préférées et affectées en priorité (dans l'ordre de sélection)
- Si la réponse contient plusieurs noms séparés par des virgules, les interpréter comme une sélection multiple
- Si une tâche n'a qu'un seul membre éligible, le mentionner mais proposer quand même le choix
- **Jours ouvrés disponibles** : lors du calcul des "X jours disponibles" affichés dans les options, exclure les week-ends (samedi et dimanche) et les jours d'absence de la période [date début, date fin] du projet
- Les préférences (liste de personnes par tâche) sont transmises au skill `executer-affectations` avec les dates

### 7. Générer le fichier de contexte

Après avoir collecté toutes les informations (diagnostic, dates, préférences), générer le fichier de contexte en **deux sous-étapes** :

#### 7a. Écrire le fichier de choix utilisateur

Générer le fichier `data/choix-utilisateur.json` contenant **uniquement** les décisions collectées aux étapes 5 et 6. Ce fichier est petit et ne contient aucune donnée brute (pas d'équipe, pas de jours, pas d'affectations existantes).

**Structure du fichier** :

```json
{
  "projets": [
    {
      "projetId": 1,
      "nom": "Refonte site web",
      "dateDebut": "02/03/2026",
      "dateFin": "30/06/2026",
      "preferences": [
        { "tache": "Spec", "personnes": ["Mickaël", "Eric"] },
        { "tache": "Dev", "personnes": [] }
      ]
    },
    {
      "projetId": 2,
      "nom": "Application mobile",
      "dateDebut": "01/04/2026",
      "dateFin": "30/09/2026",
      "preferences": [
        { "tache": "Spec", "personnes": [] },
        { "tache": "Dev", "personnes": ["Tapas"] },
        { "tache": "Tests", "personnes": [] },
        { "tache": "Retour dev", "personnes": [] }
      ]
    }
  ]
}
```

**Champs** :

| Champ | Description |
|-------|-------------|
| `projets` | Liste des projets sélectionnés par l'utilisateur |
| `projets[].projetId` | ID du projet (correspond à `data/projets.csv`) |
| `projets[].nom` | Nom du projet (informatif) |
| `projets[].dateDebut` | Date de début au format `JJ/MM/AAAA` (collectée à l'étape 5) |
| `projets[].dateFin` | Date de fin au format `JJ/MM/AAAA` (collectée à l'étape 5) |
| `projets[].preferences` | Liste des préférences par tâche (collectées à l'étape 6) |
| `projets[].preferences[].tache` | Nom de la tâche (`Spec`, `Dev`, `Tests`, `Retour dev`) |
| `projets[].preferences[].personnes` | Liste ordonnée de noms de personnes préférées ; liste vide = "Pas de préférence" |

**Règles** :
- N'inclure que les projets à planifier (pas les projets ignorés)
- N'inclure que les tâches à planifier (chiffrage > 0, pas déjà affectées)
- Les `personnes` sont une liste de **noms** (strings) correspondant aux noms dans `equipe.csv`
- Si l'utilisateur a choisi "Pas de préférence" pour une tâche, la liste `personnes` est vide `[]`

#### 7b. Exécuter le script de génération du contexte

Exécuter directement la commande suivante dans le terminal via `run_in_terminal` :

```bash
cd /workspaces/suivi-temps && python3 .github/skills/analyse-affectations/scripts/generer-contexte.py
```

**Ne jamais demander à l'utilisateur de lancer la commande manuellement.** L'agent doit toujours exécuter le script lui-même.

Le script :
- Lit `data/equipe.csv`, `data/projets.csv`, `data/jours.json`, `data/affectations.json` et `data/choix-utilisateur.json`
- Calcule les week-ends, identifie les tâches déjà planifiées, fusionne le tout
- Écrit `data/contexte-affectations.json` (fichier complet consommé par le skill `executer-affectations`)
- Affiche un résumé JSON sur stdout

**Si le script échoue** (fichier manquant, erreur de parsing), il affiche un message d'erreur JSON avec `"status": "error"`. Dans ce cas, signaler l'erreur à l'utilisateur.

**Si le script réussit**, afficher un message de confirmation et enchaîner avec le skill `executer-affectations`.

Le fichier `data/contexte-affectations.json` produit contient :

| Champ | Description |
|-------|-------------|
| `dateGeneration` | Date ISO de génération du fichier |
| `equipe` | Membres actifs issus de `data/equipe.csv` (id, nom, rolePrincipal, roleSecondaire) |
| `projets` | Projets issus de `data/projets.csv` (id, nom, chiffrage, spec, specPersonnes, dev, devPersonnes, tests, testsPersonnes, retourDev, retourDevPersonnes) |
| `jours` | Copie intégrale de `data/jours.json` (absences et types de jours) |
| `weekends` | Liste de toutes les dates (format `JJ/MM/AAAA`) correspondant à des samedis et dimanches dans la période de planification |
| `affectationsExistantes` | Copie intégrale de `data/affectations.json` (affectations déjà faites) |
| `projetsAPlanifier` | Projets avec tâches restantes, dates et préférences (fusionnés depuis les fichiers sources + choix utilisateur) |
| `projetsIgnores` | Projets exclus (toutes tâches planifiées ou chiffrage 0) avec la raison |

## Références

- [Structure des stores](./references/structures-donnees.md)
- [Script de génération du contexte](./scripts/generer-contexte.py)
