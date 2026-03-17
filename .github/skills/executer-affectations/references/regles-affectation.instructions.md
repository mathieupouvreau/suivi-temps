# Règles d'affectation — Suivi Temps

## 1. Éligibilité des jours

- **Week-ends** (samedi/dimanche) : exclus, jamais affectés
- **Jours fériés** (Fe) : exclus
- **Jours d'absence** (CP, Arr, For, Cli) : exclus
- **Demi-journées** (1/2CP, 1/2Fe, 1/2Arr, 1/2For, 1/2Cli) : comptent comme **0.5 jour** de disponibilité
- Affectation uniquement dans la **fenêtre [dateDebut, dateFin]** définie pour chaque projet

## 2. Affectations existantes

- Conservées **intégralement**, jamais replanifiées
- Seules les tâches **sans aucune affectation existante** et dont le **chiffrage > 0** sont éligibles

## 3. Ordonnancement des tâches

Ordre strict : **Spec → Dev → Tests / Retour dev** (parallèles après Dev)

- Dev commence après la fin de Spec
- Tests et Retour dev en parallèle, après la fin de Dev
- Tâche amont à chiffrage 0 : ignorée, la suivante commence à la date de début du projet

## 4. Objectif de rapidité et parallélisme

- Les projets doivent être **terminés le plus tôt possible**
- Remplir les jours au plus tôt pour minimiser la durée totale de chaque projet
- Le nombre de personnes travaillant **simultanément** sur une tâche est limité par le champ `maxPersonnes` (colonne `Pers.` du projet)
- Si `maxPersonnes = 1` (défaut) : une seule personne par jour sur cette tâche
- Si `maxPersonnes > 1` : jusqu'à N personnes affectées le même jour, toujours par ordre de priorité (voir section 5)

## 5. Priorité d'affectation des personnes — Deux passes

L'affectation fonctionne en **deux passes** pour préserver les rôles principaux :

### Passe 1 — Rôles principaux uniquement

Pour chaque tâche, affecter les personnes dans cet ordre :
1. **Personnes préférées** (désignées par l'utilisateur) — quel que soit leur rôle, dans l'ordre de sélection, chacune au max de sa capacité
2. **Membres dont le rôle principal** correspond à la tâche — par ordre de disponibilité

Le rôle secondaire n'est **jamais** utilisé lors de cette passe.

### Passe 2 — Rôles secondaires en renfort (uniquement si la passe 1 échoue)

Si une tâche n'a pas pu être entièrement couverte en passe 1 (chiffrage non atteint), relancer l'affectation de cette tâche en élargissant aux :
3. **Membres dont le rôle secondaire** correspond à la tâche
4. **Membres sans rôle correspondant**

Les jours déjà affectés en passe 1 sont conservés ; la passe 2 complète uniquement le reste.

### Résumé

| Situation | Rôles utilisés |
|---|---|
| Passe 1 (normale) | Préférences utilisateur + rôle principal uniquement |
| Passe 2 (rattrapage) | + rôle secondaire + sans rôle |
| Préférence explicite de l'utilisateur | La personne est affectée même si son seul rôle correspondant est le secondaire (traitée en passe 1) |

## 6. Chiffrage

- Le nombre de jours affectés respecte **exactement le chiffrage** de chaque tâche
- Chiffrage total = Spec + Dev + Tests + Retour dev

## 7. Gestion des échecs

- Tâche non entièrement couverte → **projet entier exclu** du plan
- Échecs consignés dans `data/rapport-affectations.md`

## 8. Plusieurs personnes par tâche

- Plusieurs personnes préférées possibles pour une même tâche
- Affectées dans l'ordre de sélection, chacune au max de sa capacité, puis complément par priorité de rôle

## 9. Contraintes générales

- Ne jamais modifier les fichiers source de l'application (stores, composants, vues)
- Ne jamais créer de nouveaux projets ou membres
- Toujours demander confirmation avant de générer le fichier d'affectations
- Questions séquentielles : une seule question à la fois, attendre la réponse avant la suivante
