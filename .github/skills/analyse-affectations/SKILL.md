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
2. **`data/projets.csv`** — Format : `ID,Nom,Chiffrage,Spec,Dev,Tests,Retour dev`
3. **`data/jours.json`** — Format : `{ "annee": { "personneId": { "moisIndex": { "jour": "typeId" } } } }`
4. **`data/affectations.json`** — Format : `{ "annee": { "personneId": { "moisIndex": { "jour": { "projetId": N, "tache": "Dev" } } } } }` (peut être absent)

Si un fichier manque, demander à l'utilisateur de l'exporter depuis l'application.

## Procédure

### 1. Lire les données

- Parser `data/equipe.csv` pour obtenir la liste des membres actifs avec leurs rôles
- Parser `data/projets.csv` pour obtenir la liste des projets et leurs chiffrages par tâche
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

Pour chaque projet ayant des tâches à planifier, poser les questions **une par une** avec `vscode_askQuestions`, en attendant la réponse avant de passer au projet suivant.

**Processus séquentiel** : pour chaque projet (1 par 1), utiliser `vscode_askQuestions` :

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

## Références

- [Structure des stores](./references/structures-donnees.md)
