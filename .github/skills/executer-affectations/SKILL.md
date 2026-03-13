---
name: executer-affectations
description: "Génère les affectations automatiques des personnes aux projets. Use when: affecter, planifier, assigner membres, générer affectations, répartir charge, distribuer tâches projets."
---

# Exécution des affectations

## Objectif

Générer le fichier `data/affectations.json` avec les nouvelles affectations en respectant toutes les contraintes métier. Ce skill s'exécute **après** l'analyse (skill `analyse-affectations`) et la validation des dates par l'utilisateur.

## Entrées attendues

L'utilisateur ou l'agent a déjà fourni :
- La liste des projets et tâches à planifier (issue de l'analyse)
- Les dates de début et de fin par projet (JJ/MM/AAAA)
- Les préférences de personnes par tâche et par projet (optionnel — "Pas de préférence" si non renseigné). Chaque tâche peut avoir **une ou plusieurs personnes préférées** (liste ordonnée).
- Les fichiers `data/equipe.csv`, `data/projets.csv`, `data/jours.json`, `data/affectations.json`

## Contraintes métier

### Jours disponibles
1. **Ne jamais affecter sur un jour non ouvré** : week-ends (samedi, dimanche) et jours fériés (type `Fe`)
2. **Ne jamais affecter sur un jour déjà typé** : si un jour a un type (CP, Arr, For, Cli, etc.), il n'est pas disponible
3. **Les demi-journées** (types `1/2*`) laissent une demi-journée disponible pour un projet
4. **Fenêtre de dates** : n'affecter que dans la période [date début, date fin] de chaque projet

### Chiffrages
5. **Respecter le chiffrage** par tâche — ne pas dépasser le nombre de jours prévu (spec, dev, tests, retourDev)
6. **Ne JAMAIS replanifier une tâche déjà affectée** — seules les tâches sans affectation existante sont éligibles
7. **Conserver intégralement les affectations existantes** dans le fichier de sortie

### Préférences utilisateur
8. **Respecter les préférences de personnes** — si l'utilisateur a indiqué une ou plusieurs préférences pour une tâche d'un projet :
   - Les personnes préférées sont **affectées en priorité** à cette tâche, avant les autres membres éligibles, **dans l'ordre de sélection** fourni par l'utilisateur
   - La première personne préférée est affectée au maximum de sa capacité, puis la deuxième, etc.
   - Si toutes les personnes préférées n'ont pas assez de jours disponibles pour couvrir tout le chiffrage, le reste est complété par les autres membres selon la priorité des rôles (ci-dessous)
   - Si la préférence est "Pas de préférence", appliquer la logique standard de priorité des rôles

### Priorité des rôles
9. **Priorité aux rôles principaux** — pour chaque tâche, après avoir affecté la personne préférée (si applicable), compléter dans cet ordre :
   - **Étape 1** : Membres dont le `rolePrincipal` correspond à la tâche
   - **Étape 2** : Si le chiffrage n'est pas couvert, compléter avec les membres dont le `roleSecondaire` correspond
   - **Étape 3** : Si toujours pas couvert, compléter avec les membres sans rôle défini (champs vides)
   - **Manque de ressources** : Si le chiffrage d'une tâche ne peut pas être entièrement couvert (pas assez de jours disponibles ou pas assez de membres), le projet entier est **exclu** de l'affectation et un rapport est généré
   - Correspondance : `Spec` ↔ "Spec", `Dev` ↔ "Dev", `Tests` ↔ "Tests", `Retour dev` ↔ "Dev"

### Ordonnancement des tâches
10. **Enchaînement séquentiel strict** pour chaque projet :
   - **Spec → Dev** : le Dev ne peut pas commencer avant la fin de la Spec (dernier jour de Spec < premier jour de Dev)
   - **Dev → Tests** : les Tests ne peuvent pas commencer avant la fin du Dev
   - **Dev → Retour dev** : le Retour dev peut commencer en même temps que les Tests ou après, mais jamais avant la fin du Dev
   - Ordre résumé : `Spec` puis `Dev` puis `Tests` et `Retour dev` (parallèles ou séquentiels)
   - Si une tâche amont est déjà planifiée (affectations existantes), utiliser sa date de fin réelle comme point de départ
   - Si une tâche amont a un chiffrage de 0, elle est ignorée et la tâche suivante peut commencer dès la date de début du projet

## Procédure

### 1. Calculer la disponibilité

Pour chaque membre actif, calculer les jours ouvrés disponibles dans la fenêtre [date début, date fin] de chaque projet :
- Exclure week-ends (samedi = jour 6, dimanche = jour 0 en JS)
- Exclure jours typés dans `data/jours.json`
- Exclure jours déjà affectés dans `data/affectations.json`
- Les demi-journées (`1/2*`) comptent comme 0.5 jour disponible

### 2. Vérifier la faisabilité par projet

Pour chaque projet, vérifier que **toutes ses tâches à planifier** peuvent être entièrement couvertes :
1. Pour chaque tâche, calculer les jours disponibles des membres éligibles (par priorité de rôle) dans la fenêtre de dates
2. Si le total des jours disponibles < chiffrage de la tâche → le projet est **en échec**
3. Si la fenêtre de dates est trop courte pour respecter l'ordonnancement (Spec → Dev → Tests/Retour dev) → le projet est **en échec**

**Projet en échec** = le projet entier est exclu de l'affectation (aucune tâche n'est affectée, même celles qui auraient pu l'être).

### 3. Générer le rapport d'échec

Si des projets sont en échec, générer le fichier `data/rapport-affectations.md` avec le détail :

```markdown
# Rapport d'affectation — Projets non planifiés

Date : JJ/MM/AAAA

## Projet Alpha

**Raison** : Ressources insuffisantes

| Tâche      | Chiffrage | Jours disponibles | Manque  |
|------------|-----------|-------------------|---------|
| Dev        | 30j       | 22j               | -8j     |
| Tests      | 10j       | 10j               | OK      |

**Membres éligibles** :
- Jean Dupont (rôle principal : Dev) — 12j disponibles
- Paul Martin (rôle secondaire : Dev) — 10j disponibles

**Suggestion** : Réduire le chiffrage, élargir la fenêtre de dates, ou ajouter des ressources.
```

### 4. Affecter les projets faisables

Pour chaque projet **non en échec**, dans l'ordre des tâches (Spec → Dev → Tests / Retour dev) :

1. Déterminer la date de début effective (max entre date début projet et fin tâche précédente + 1 jour ouvré)
2. Si des préférences utilisateur existent pour cette tâche, affecter les personnes préférées en priorité **dans l'ordre de sélection** (chacune sur ses jours disponibles, l'une après l'autre)
3. Compléter avec les membres éligibles par priorité de rôle (principal → secondaire → sans rôle) si le chiffrage n'est pas encore couvert après toutes les personnes préférées
4. Répartir le chiffrage restant sur les jours ouvrés disponibles des membres sélectionnés
5. Stocker les affectations : `{ projetId, tache }` pour chaque jour

### 5. Proposer le plan

Présenter un tableau récapitulatif AVANT d'écrire les fichiers :

```
## Plan d'affectation proposé

| Membre       | Projet      | Tâche      | Jours | Début      | Fin        |
|-------------|-------------|------------|-------|------------|------------|
| Jean Dupont  | Projet Alpha | Dev        | 15    | 02/03/2026 | 20/03/2026 |
| Marie Martin | Projet Alpha | Spec       | 5     | 02/03/2026 | 06/03/2026 |

## Projets exclus (voir data/rapport-affectations.md)
- Projet Beta : ressources insuffisantes pour la tâche Tests (10j demandés, 7j disponibles)
```

Utiliser `vscode_askQuestions` pour valider le plan :

```
questions:
  - header: "Validation du plan d'affectation"
    question: "Ce plan vous convient-il ?"
    options:
      - label: "Oui, générer les fichiers"
        description: "Écrire data/affectations.json avec ces affectations"
        recommended: true
      - label: "Non, annuler"
        description: "Ne pas générer les fichiers"
```

Attendre la validation de l'utilisateur.

### 6. Générer les fichiers

Après validation :
- Fusionner les affectations existantes (inchangées) avec les nouvelles affectations (projets faisables uniquement)
- Écrire `data/affectations.json`
- Écrire `data/rapport-affectations.md` si des projets sont en échec
- Confirmer : "Fichier `data/affectations.json` généré. Réimportez-le via le bouton **Importer (JSON)**. Consultez `data/rapport-affectations.md` pour les projets non planifiés."

## Limites

- Ne modifie JAMAIS les fichiers source de l'application (stores, composants, vues)
- Ne crée pas de nouveaux projets ou membres
- Demande toujours confirmation avant d'écrire le fichier
- Si les chiffrages sont à 0, demander à l'utilisateur de les renseigner d'abord

## Références

- [Structure des données](./references/structures-donnees.md)
