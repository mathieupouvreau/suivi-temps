# Règles d'affectation automatique — Suivi Temps

> Ce document décrit l'ensemble des règles implémentées dans le moteur d'affectation
> automatique (`src/services/affectationsAuto.js`) et l'assistant d'affectation
> (`src/views/AffectationsAutoView.vue`).
>
> **Dernière mise à jour : mars 2026**

---

## 1. Éligibilité des jours

Seuls les jours ouvrés disponibles peuvent recevoir une affectation :

| Type de jour | Comportement |
|---|---|
| **Jours ouvrés** (lundi–vendredi) | Éligibles si aucune absence ni affectation existante |
| **Week-ends** (samedi/dimanche) | Exclus — jamais affectés |
| **Jours fériés** (Fe) | Exclus |
| **Absences complètes** (CP, Arr, For, Cli) | Exclus |
| **Demi-journées** (1/2CP, 1/2Fe, 1/2Arr, 1/2For, 1/2Cli) | Comptent comme **0.5 jour** de disponibilité |
| **Jours ayant déjà une affectation** | Exclus (jamais écrasés) |

L'affectation se fait uniquement dans la **fenêtre [dateDebut, dateFin]** définie pour chaque projet.

---

## 2. Conservation des affectations existantes

- Les affectations déjà enregistrées dans le store sont **conservées intégralement** et **jamais replanifiées**.
- Seules les tâches **sans aucune affectation existante** et dont le **chiffrage > 0** sont éligibles à la planification automatique.
- Les jours déjà occupés par une affectation existante ont une capacité de 0 — aucune nouvelle affectation ne peut s'y superposer.

---

## 3. Ordonnancement des tâches

L'ordre d'exécution des tâches est strict :

```
Spec → Dev → Tests (parallèle) / Retour dev (parallèle)
```

### Règles de séquencement

| Tâche | Prédécesseur | Règle |
|---|---|---|
| **Spec** | Aucun | Commence à la date de début du projet |
| **Dev** | Spec | Commence le **prochain jour ouvré** après la fin de Spec |
| **Tests** | Dev | Commence le **prochain jour ouvré** après la fin de Dev |
| **Retour dev** | Dev | Commence le **prochain jour ouvré** après la fin de Dev |

- **Tests** et **Retour dev** sont planifiés en parallèle (ils peuvent se chevaucher).
- Si la tâche prédécesseur a un **chiffrage de 0** et n'a **aucune affectation existante**, elle est ignorée — la tâche suivante commence directement à la date de début du projet.
- Si la tâche prédécesseur fait partie des **tâches déjà planifiées** (affectations existantes), sa date de fin réelle est retrouvée dans les affectations existantes — **même si son chiffrage est de 0**.

---

## 4. Objectif de rapidité et parallélisme

- Les projets doivent être **terminés le plus tôt possible** : l'algorithme remplit les jours au plus tôt pour minimiser la durée totale de chaque projet.
- Le nombre de personnes travaillant **simultanément** sur une même tâche est limité par le champ `maxPersonnes` (colonne « Pers. » du projet).

| Valeur maxPersonnes | Comportement |
|---|---|
| `1` (défaut) | **Une seule personne** est assignée à cette tâche. Personne d'autre ne peut y contribuer. |
| `N` (N > 1) | Jusqu'à **N personnes distinctes** peuvent être affectées à cette tâche, sur le même jour ou sur des jours différents. |

**Important :** `maxPersonnes` limite le nombre total de **personnes distinctes** sur une tâche (pas seulement le nombre simultané par jour). Si `maxPersonnes = 1`, seule la première personne éligible est retenue pour toute la durée de la tâche.

---

## 5. Priorité d'affectation des personnes — Deux passes

L'affectation fonctionne en **deux passes** successives pour préserver les rôles principaux tout en garantissant la couverture.

### Correspondance tâche → rôle

| Tâche | Rôle recherché |
|---|---|
| Spec | Spec |
| Dev | Dev |
| Tests | Tests |
| Retour dev | **Dev** (même rôle que Dev) |

### Passe 1 — Rôles principaux uniquement

Pour chaque tâche, les personnes sont triées par ordre de priorité décroissant :

1. **Développeurs du même projet** (uniquement pour Retour dev — voir section 6)
2. **Personnes préférées** désignées par l'utilisateur dans l'assistant — quel que soit leur rôle, dans l'ordre de sélection
3. **Membres dont le rôle principal** correspond à la tâche — par ordre de disponibilité

Le rôle secondaire n'est **jamais** utilisé lors de cette passe.

### Passe 2 — Rôles secondaires en renfort (uniquement si la passe 1 échoue)

Si une tâche n'a pas pu être entièrement couverte en passe 1 (chiffrage non atteint), relancer l'affectation **de tout le projet** en élargissant les candidats :

4. **Membres dont le rôle secondaire** correspond à la tâche
5. **Tous les autres membres** (sans rôle correspondant)

Les nouvelles affectations de la passe 1 sont **annulées** — la passe 2 reprend de zéro avec le vivier élargi.

### Résumé

| Situation | Rôles utilisés |
|---|---|
| Passe 1 (normale) | Dev du projet (Retour dev) + préférences utilisateur + rôle principal |
| Passe 2 (rattrapage) | + rôle secondaire + sans rôle |
| Préférence explicite de l'utilisateur | La personne est affectée même si son rôle ne correspond pas (priorité 2, dès la passe 1) |

---

## 6. Retour dev — Priorité au développeur du même projet

Pour les tâches **Retour dev**, l'algorithme privilégie les personnes qui ont déjà été assignées à la tâche **Dev** du même projet :

- L'algorithme mémorise la liste des membres assignés à chaque tâche au fil de la planification (`taskAssignees`), et **pré-charge les assignations des tâches déjà planifiées** (affectations existantes).
- Lorsqu'une tâche Retour dev est planifiée, les membres ayant travaillé sur le Dev du même projet sont placés **en tête** de la liste de priorité, avant les préférences utilisateur et les membres par rôle.

Cela permet d'assurer une **continuité de connaissance** : la personne qui a développé la fonctionnalité corrige aussi les retours.

> **Note** : cette règle fonctionne que le Dev soit planifié **automatiquement** (dans la même exécution) ou **manuellement** (affectations existantes). Dans les deux cas, les membres assignés au Dev sont retrouvés et priorisés.

---

## 7. Jour de battement entre tâches

Lorsqu'une personne termine une tâche et est éligible pour une autre tâche, un **jour ouvré de battement** est imposé avant qu'elle ne commence la nouvelle tâche :

### Principe

- L'algorithme suit la **dernière date travaillée** de chaque membre, **tous projets confondus** (`memberLastTaskDate` au niveau global).
- Chaque tentative d'allocation (passe 1 ou passe 2) travaille sur une **copie locale** de ce suivi. Si l'allocation échoue, le suivi global n'est pas pollué par les dates de la tentative avortée.
- Lorsqu'un membre est candidat pour une nouvelle tâche qu'il n'a pas encore commencée, l'algorithme vérifie :
  - `dateCandidate > prochainJourOuvré(dernièreDateTravaillée)`
- Si la condition n'est pas remplie, le membre est **ignoré** pour ce jour et sera reconsidéré les jours suivants.

### Exemple

```
Marie termine la tâche Dev sur Projet A le vendredi 13 mars.
→ prochainJourOuvré(vendredi 13) = lundi 16 mars
→ Marie ne peut commencer une nouvelle tâche (Tests sur Projet A,
  ou Spec sur Projet B) qu'à partir du mardi 17 mars.
```

### Cas d'application

- Le jour de battement s'applique **entre tout changement de tâche** pour une même personne, que ce soit au sein du même projet ou entre deux projets différents.
- Il ne s'applique **pas** si le membre continue la même tâche qu'il avait déjà commencée.
- Le suivi de la dernière date est mis à jour après le commit de chaque projet, ce qui garantit la continuité entre projets successifs.

---

## 8. Chiffrage

- Le nombre de jours affectés respecte **exactement le chiffrage** de chaque tâche (ni plus, ni moins).
- Chiffrage total d'un projet = Spec + Dev + Tests + Retour dev.
- Les demi-journées (0.5) sont décomptées du chiffrage restant. Si la capacité d'un jour (0.5 ou 1) dépasse le chiffrage restant, seule la fraction nécessaire est utilisée — aucune sur-allocation ne peut se produire.

---

## 9. Gestion des échecs

Si une tâche ne peut pas être entièrement couverte (ressources insuffisantes ou fenêtre temporelle trop courte) :

- Le **projet entier** est exclu du plan d'affectation.
- Les affectations partiellement calculées pour ce projet sont **annulées**.
- Un détail d'échec est consigné avec :
  - Le nom du projet et de la tâche en échec
  - La raison (fenêtre insuffisante ou ressources insuffisantes)
  - Le chiffrage demandé, le nombre de jours alloués avant échec, et le manque
  - La liste des membres éligibles et leur disponibilité restante

---

## 10. Plusieurs personnes par tâche

- Plusieurs personnes préférées peuvent être désignées pour une même tâche via l'assistant.
- Elles sont affectées dans l'**ordre de sélection**, chacune au maximum de sa capacité.
- Si le chiffrage n'est pas atteint, le complément est assuré par les membres éligibles par priorité de rôle.
- Les personnes contribuent **jour par jour** : chaque jour ouvré, jusqu'à `maxPersonnes` peuvent travailler simultanément sur la tâche.

---

## 11. Fusion avec les affectations existantes

L'application des affectations dans le store se fait par **fusion profonde** (deep merge) :

- Les affectations existantes ne sont jamais supprimées ni modifiées.
- Les nouvelles affectations sont ajoutées à la structure existante (`annee → membreId → moisIndex → jour`).
- La fusion utilise `JSON.parse(JSON.stringify(...))` pour créer une copie profonde (nécessaire car `structuredClone()` échoue silencieusement sur les Proxy Vue réactifs).

---

## 12. Assistant d'affectation — Étapes du wizard

L'assistant d'affectation (`AffectationsAutoView.vue`) guide l'utilisateur en **5 étapes** :

| Étape | Nom | Description |
|---|---|---|
| 1 | **Diagnostic** | Analyse les projets : tâches à planifier, tâches déjà planifiées, projets ignorés |
| 2 | **Dates** | Choix de la fenêtre temporelle : dates communes ou dates par projet |
| 3 | **Préférences** | Grilles de cases à cocher par tâche : l'utilisateur désigne les personnes préférées. Les membres sont triés par rôle et affichent leur disponibilité restante |
| 4 | **Vérification** | Affichage du plan complet (tableau membre/projet/tâche/jours/dates) et des alertes en cas d'échec |
| 5 | **Application** | Écriture des affectations dans le store (avec confirmation). Irréversible. |

### Cohérence vérification/application

Le plan affiché à l'étape 4 et les affectations appliquées à l'étape 5 proviennent des **mêmes données calculées** (`tempAffectations`). Ce qui est vérifié est exactement ce qui est appliqué.

---

## 13. Algorithme principal — Vue d'ensemble

```
Pour chaque projet à planifier :
│
├─ Passe 1 (rôle principal uniquement)
│   ├─ Pour chaque tâche (Spec → Dev → Tests → Retour dev) :
│   │   ├─ Calculer la date de début effective (après le prédécesseur)
│   │   ├─ Trier les membres par priorité :
│   │   │   1. Développeurs du projet (Retour dev uniquement)
│   │   │   2. Préférences utilisateur
│   │   │   3. Rôle principal correspondant
│   │   ├─ Jour par jour, du plus tôt au plus tard :
│   │   │   ├─ Vérifier : maxPersonnes distinctes non dépassé
│   │   │   ├─ Vérifier : jour de battement respecté
│   │   │   ├─ Vérifier : capacité du membre > 0
│   │   │   └─ Affecter et décompter du chiffrage restant
│   │   └─ Si chiffrage non atteint → ÉCHEC de la passe 1
│   └─ Si toutes les tâches OK → COMMIT des affectations
│
├─ Passe 2 (si passe 1 en échec — vivier élargi)
│   ├─ Reprise identique mais avec :
│   │   + Rôle secondaire
│   │   + Tous les autres membres
│   └─ Si OK → COMMIT ; sinon → ÉCHEC du projet
│
└─ Si ÉCHEC → projet exclu + détail consigné
```

---

## 14. Structures de données

### Affectations (format store Pinia)

```javascript
affectations = {
  "2026": {                    // année
    "3": {                     // membreId
      "2": {                   // moisIndex (0-based : 2 = mars)
        "17": {                // jour du mois
          projetId: 5,
          tache: "Dev"
        }
      }
    }
  }
}
```

### Projet à planifier (entrée de l'algorithme)

```javascript
{
  projetId: 5,
  nom: "Mon Projet",
  dateDebut: "02/03/2026",       // JJ/MM/AAAA
  dateFin: "30/06/2026",
  tachesAPlanifier: [
    { tache: "Dev", chiffrage: 10, maxPersonnes: 2, preferences: ["Alice", "Bob"] },
    { tache: "Tests", chiffrage: 5, maxPersonnes: 1, preferences: [] }
  ],
  tachesDejaPlanifiees: ["Spec"]
}
```

### Plan de sortie (résultat)

```javascript
{
  plan: [
    { membre: "Alice", projet: "Mon Projet", tache: "Dev", jours: 7, debut: "02/03/2026", fin: "12/03/2026" },
    { membre: "Bob", projet: "Mon Projet", tache: "Dev", jours: 3, debut: "02/03/2026", fin: "06/03/2026" }
  ],
  echecs: [
    { projetId: 8, nom: "Autre Projet", tache: "Tests", raison: "Ressources insuffisantes", chiffrage: 5, alloue: 2, manque: 3 }
  ],
  nouvellesAffectations: { /* même format que le store */ }
}
```
