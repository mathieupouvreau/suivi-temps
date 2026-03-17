---
name: executer-affectations
description: "Génère les affectations automatiques des personnes aux projets. Use when: affecter, planifier, assigner membres, générer affectations, répartir charge, distribuer tâches projets."
---

# Exécution des affectations

## Objectif

Générer le fichier `data/affectations-finales.json` via un **script Python** pour éviter de remplir le contexte de conversation avec les calculs de disponibilité. Ce skill s'exécute **après** l'analyse (skill `analyse-affectations`).

## Principe

Toute la logique de calcul (disponibilité, faisabilité, allocation jour par jour) est implémentée dans le script `.github/skills/executer-affectations/scripts/generer-affectations.py`. L'agent n'a **jamais** besoin de lire le fichier de contexte ni de raisonner sur les jours individuels.

## Prérequis

- `data/contexte-affectations.json` généré par le skill `analyse-affectations`
- Python 3.10+ disponible dans l'environnement

## Procédure

### 1. Exécuter le script

Exécuter directement la commande suivante dans le terminal via `run_in_terminal` :

```bash
cd /workspaces/suivi-temps && python3 .github/skills/executer-affectations/scripts/generer-affectations.py
```

**Ne jamais demander à l'utilisateur de lancer la commande manuellement.** L'agent doit toujours exécuter le script lui-même.

Le script :
- Lit `data/contexte-affectations.json`
- Calcule les disponibilités et génère les affectations
- Écrit `data/affectations-draft.json` (affectations fusionnées existantes + nouvelles)
- Écrit `data/plan-affectation.json` (résumé compact)
- Écrit `data/rapport-affectations.md` si des projets échouent
- Affiche un résumé JSON sur stdout

**Si le script échoue** (fichier de contexte absent, erreur de parsing), il affiche un message d'erreur JSON avec `"status": "error"`. Dans ce cas, signaler l'erreur à l'utilisateur et lui demander de relancer le skill `analyse-affectations`.

### 2. Lire le résumé

Lire **uniquement** le fichier `data/plan-affectation.json`. **Ne pas lire** `data/contexte-affectations.json` ni `data/affectations-draft.json`.

Le fichier contient :
```json
{
  "plan": [
    { "membre": "Nom", "projet": "Nom projet", "tache": "Dev", "jours": 15, "debut": "02/03/2026", "fin": "20/03/2026" }
  ],
  "echecs": [
    { "nom": "Nom projet", "tache": "Dev", "chiffrage": 30, "alloue": 22, "manque": 8, "raison": "..." }
  ]
}
```

### 3. Présenter le plan

Construire un tableau récapitulatif à partir du JSON :

```markdown
## Plan d'affectation proposé

| Membre | Projet | Tâche | Jours | Début | Fin |
|--------|--------|-------|-------|-------|-----|
| ...    | ...    | ...   | ...   | ...   | ... |
```

Si `echecs` est non vide, ajouter :
```markdown
## Projets exclus
- Nom projet : raison (Xj demandés, Yj alloués, Zj manquants)
```

### 4. Validation

Utiliser `vscode_askQuestions` :

```
questions:
  - header: "Validation du plan d'affectation"
    question: "Ce plan vous convient-il ?"
    options:
      - label: "Oui, générer les fichiers"
        description: "Valider data/affectations-finales.json avec ces affectations"
        recommended: true
      - label: "Non, annuler"
        description: "Ne pas générer les fichiers"
```

### 5. Finaliser

**Si validé** :

Exécuter directement dans le terminal via `run_in_terminal` :
```bash
cd /workspaces/suivi-temps && mv data/affectations-draft.json data/affectations-finales.json
```

**Ne jamais demander à l'utilisateur de renommer le fichier manuellement.** L'agent doit toujours exécuter la commande lui-même.

Si l'outil terminal est disponible, exécuter la commande directement. Sinon, afficher la commande et attendre que l'utilisateur confirme.

Confirmer : "Fichier `data/affectations-finales.json` généré. Réimportez-le via le bouton **Importer (JSON)**."

Si un rapport d'échec existe, ajouter : "Consultez `data/rapport-affectations.md` pour les projets non planifiés."

**Si refusé** :

Demander à l'utilisateur de supprimer les fichiers temporaires :
```bash
rm data/affectations-draft.json data/plan-affectation.json
```
Confirmer l'annulation.

## Contraintes métier (implémentées par le script)

Le script respecte automatiquement toutes ces règles — l'agent n'a pas besoin de les vérifier manuellement :

1. **Jours non ouvrés** : week-ends et jours fériés (Fe) exclus
2. **Jours typés** : CP, Arr, For, Cli et variantes exclus ; demi-journées (1/2*) = 0.5 jour
3. **Fenêtre de dates** : affectation uniquement dans [dateDebut, dateFin] de chaque projet
4. **Chiffrage respecté** par tâche
5. **Affectations existantes** conservées intégralement, jamais replanifiées
6. **Préférences utilisateur** : personnes préférées affectées en priorité, dans l'ordre de sélection
7. **Priorité des rôles (deux passes)** : passe 1 = préférences + rôle principal uniquement ; passe 2 (si échec) = + rôle secondaire + restants
8. **Ordonnancement** : Spec → Dev → Tests / Retour dev (parallèles après Dev)
9. **Tâche amont chiffrage 0** : ignorée, la suivante commence à la date de début du projet
10. **Projet en échec** : si une tâche ne peut pas être couverte, le projet entier est exclu

## Limites

- Ne modifie JAMAIS les fichiers source de l'application (stores, composants, vues)
- Ne crée pas de nouveaux projets ou membres
- Demande toujours confirmation avant de finaliser
- Ne lit jamais le fichier de contexte directement — seul le script le traite

## Références

- [Structure des données](./references/structures-donnees.md)
- [Script de génération](./scripts/generer-affectations.py)
