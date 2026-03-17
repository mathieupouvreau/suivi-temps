# Structures de données — Référence

## Fichiers de données (dossier `data/`)

### equipe.json
```json
[
  { "id": 1, "nom": "Jean Dupont", "actif": true, "rolePrincipal": "Dev", "roleSecondaire": "Tests" },
  { "id": 2, "nom": "Marie Martin", "actif": true, "rolePrincipal": "Spec", "roleSecondaire": "" }
]
```

### projets.json
```json
[
  { "id": 1, "nom": "Mon Projet", "chiffrage": 50, "spec": 5, "specPersonnes": 1, "dev": 30, "devPersonnes": 2, "tests": 10, "testsPersonnes": 1, "retourDev": 5, "retourDevPersonnes": 1 }
]
```
- Les champs `*Personnes` indiquent le nombre max de personnes pouvant travailler en parallèle sur chaque tâche (défaut : 1 si absent)

### jours.json
```json
{
  "2026": {
    "1": {
      "0": { "15": "CP" },
      "4": { "1": "Fe" }
    }
  }
}
```
- Clés : `annee` > `personneId` > `moisIndex` (0=Janvier, 11=Décembre) > `jour`
- Types : CP, 1/2CP, Fe, 1/2Fe, Arr, 1/2Arr, For, 1/2For, Cli, 1/2Cli
- Les types préfixés `1/2` comptent pour 0.5 jour

### affectations.json
```json
{
  "2026": {
    "1": {
      "0": {
        "5": { "projetId": 1, "tache": "Dev" }
      }
    }
  }
}
```
- Clés : `annee` > `personneId` > `moisIndex` > `jour` > `{ projetId, tache }`
- Tâches possibles : `Spec`, `Dev`, `Tests`, `Retour dev`

## Stores de référence (code source)

- `src/stores/equipe.js` — `{ id, nom, actif, rolePrincipal, roleSecondaire }`
- `src/stores/projets.js` — `{ id, nom, chiffrage, spec, specPersonnes, dev, devPersonnes, tests, testsPersonnes, retourDev, retourDevPersonnes }`
- `src/stores/jours.js` — `jours[annee][personneId][moisIndex][jour] = typeId`
- `src/stores/affectationsProjets.js` — `affectations[annee][personneId][moisIndex][jour] = { projetId, tache }`
- `src/config/constantes.js` — `MOIS` (noms des mois), `NOMS_JOURS` (Dim, Lun, Mar, etc.)

## Correspondance rôles ↔ tâches

| Tâche       | Rôle correspondant |
|------------|-------------------|
| Spec       | Spec              |
| Dev        | Dev               |
| Tests      | Tests             |
| Retour dev | Dev               |
