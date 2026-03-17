# Structures de données — Référence

## Fichiers de données (dossier `data/`)

### equipe.csv
```csv
ID,Nom,Rôle principal,Rôle secondaire
1,"Jean Dupont","Dev","Tests"
2,"Marie Martin","Spec",""
```

### projets.csv
```csv
ID,Nom,Chiffrage,Spec,Spec Pers.,Dev,Dev Pers.,Tests,Tests Pers.,Retour dev,Retour dev Pers.
1,"Mon Projet",50,5,1,30,2,10,1,5,1
```
- Les colonnes `Pers.` indiquent le nombre max de personnes pouvant travailler en parallèle sur chaque tâche (défaut : 1 si absent)

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
- `src/stores/projets.js` — `{ id, nom, chiffrage, spec, dev, tests, retourDev }`
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
