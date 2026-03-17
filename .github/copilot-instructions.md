# Suivi Temps — Instructions Copilot

## Résumé du projet
Application de suivi du temps d'équipe en français, construite avec Vue 3, Vite, Pinia et Vue Router. Elle gère les plannings des membres, les affectations projets et les types de jours (congés, fériés, etc.) avec persistance localStorage, sans backend. Elle inclut un moteur d'affectation automatique (assistant 5 étapes) qui répartit les tâches projet (Spec, Dev, Tests, Retour dev) sur les membres disponibles avec un algorithme en 2 passes, gap de 1 jour ouvré entre tâches et priorité Retour dev → même développeur.

## Stack technique
- **Framework** : Vue 3.5 (Composition API avec `<script setup>`)
- **State management** : Pinia 3.x (pattern composition API)
- **Routeur** : Vue Router 4.x (hash-based history)
- **Build** : Vite 7.x
- **Styles** : CSS pur (pas de framework), police Google Inter
- **Persistance** : localStorage (synchronisation automatique)

## Structure du projet
```
src/
  components/     # Composants Vue réutilisables
  views/          # Composants de niveau route (7 vues dont AffectationsAutoView)
  stores/         # Stores Pinia (equipe, annees, jours, projets, affectationsProjets)
  services/       # Services métier (affectationsAuto.js, export.js)
  router/         # Configuration Vue Router
  config/         # Constantes et configuration (mois, jours, types)
  assets/         # Styles et ressources statiques
documentation/    # Documentation métier (regles-affectation.md)
data/             # Fichiers JSON de données (actuellement vide, peuplé via localStorage)
```

## Conventions de nommage
- **Langue française** partout : variables, fonctions, commentaires (`membres`, `annees`, `jours`, `projets`)
- **camelCase** pour les fichiers JS et les variables (`nouvelleAnnee`, `membresActifs`)
- **PascalCase** pour les composants Vue (`CelluleJour.vue`, `AffectationMasse.vue`)
- **Commentaires JSDoc en français** au-dessus de chaque fonction

## Pattern des stores Pinia

Tous les stores suivent ce pattern :

```javascript
import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'

export const useMonStore = defineStore('monStore', () => {
  // 1. Charger depuis localStorage ou utiliser les valeurs par défaut
  const dataInitial = localStorage.getItem('cle')
    ? JSON.parse(localStorage.getItem('cle'))
    : []
  const data = ref(dataInitial)

  // 2. Sync automatique vers localStorage avec watch profond
  watch(data, (newValue) => {
    localStorage.setItem('cle', JSON.stringify(newValue))
  }, { deep: true })

  // 3. Génération d'ID auto-incrémenté
  function ajouter(item) {
    const newId = data.value.length > 0
      ? Math.max(...data.value.map(x => x.id)) + 1
      : 1
    data.value.push({ id: newId, ...item })
  }

  // 4. Computed pour les vues filtrées
  const actifs = computed(() => data.value.filter(x => x.actif !== false))

  return { data, actifs, ajouter }
})
```

## Pattern des composants Vue

```vue
<script setup>
import { ref, computed } from 'vue'

/** @description Description en français */
const props = defineProps({
  monProp: String,
  monId: Number
})

const emit = defineEmits(['change', 'close'])

const estOuvert = ref(false)

const valeurAffichee = computed(() => props.monProp?.toUpperCase())

/** Gère le clic sur l'élément */
const handleClick = () => {
  emit('change', nouvelleValeur)
}
</script>

<template>
  <div v-if="estOuvert" @click="emit('close')">
    <div @click.stop>
      <!-- Contenu -->
    </div>
  </div>
</template>

<style scoped>
/* Styles scopés uniquement */
</style>
```

## Règles impératives

1. **Toujours utiliser la Composition API** avec `<script setup>` et `defineProps`/`defineEmits`
2. **Toujours synchroniser l'état vers localStorage** via `watch(..., { deep: true })`
3. **Toujours écrire les commentaires JSDoc en français**
4. **Toujours nommer en français** les variables, fonctions et identifiants
5. **Toujours utiliser le soft delete** (`actif: false`) au lieu de supprimer
6. **Toujours utiliser `<style scoped>`** pour éviter les collisions CSS
7. **Toujours émettre des events depuis les composants enfants** au lieu de muter les props
8. **Pas d'appels API / backend** — architecture 100% locale avec localStorage
9. **Ne jamais utiliser `structuredClone()`** sur les données réactives Pinia (Proxy Vue) — provoque un `DataCloneError` silencieux. Toujours utiliser `JSON.parse(JSON.stringify(...))` pour cloner les données du store

## Structures de données principales

```javascript
// Membres d'équipe
{ id: 1, nom: "Prénom Nom", actif: true, rolePrincipal: "", roleSecondaire: "" }

// Jours (structure imbriquée)
jours[annee][personneId][moisIndex][jour] = typeId

// Types de jours
{ id: "CP", libelle: "Congé Payé", abreviation: "Congé", couleur: "#4CAF50", couleurTexte: "#FFFFFF" }

// Projets
{ id: 1, nom: "Nom Projet", chiffrage: 0, spec: 0, dev: 0, tests: 0, retourDev: 0, specPersonnes: 1, devPersonnes: 1, testsPersonnes: 1, retourDevPersonnes: 1 }

// Affectations projets (structure imbriquée)
affectations[annee][personneId][moisIndex][jour] = { projetId: 3, tache: 'Dev' }

// Années
[2025, 2026]
```

## Routes
- `/` → HomeView (sélecteur d'année)
- `/annee/:annee` → HolidaysView (calendrier par année)
- `/equipe` → EquipeView (gestion de l'équipe)
- `/calendrier/:annee` → ProjetView (calendrier projets)
- `/projets` → ProjectsView (liste des projets)
- `/types-jours` → TypesJoursView (référentiel types de jours)
- `/affectations-auto` → AffectationsAutoView (assistant d'affectation automatique en 5 étapes)

## Styles
- CSS pur, pas de framework (pas de Tailwind, Bootstrap, etc.)
- Couleurs dynamiques via `:style="{ backgroundColor: couleur }"`
- Tables avec `border-collapse: collapse`, padding `0.5rem`, bordures `#ddd`
- Tokens couleur définis dans `config/typesJours.json`

## Commandes
```bash
npm run dev      # Serveur de dev sur http://localhost:5173
npm run build    # Build de production
npm run preview  # Prévisualisation du build
```

## Ajout de fonctionnalités
- **Nouveau store** : suivre le pattern store ci-dessus (ref + watch + localStorage)
- **Nouveau composant** : utiliser `<script setup>` avec props/emits
- **Nouvelle route** : ajouter dans `src/router/index.js` avec le composant vue associé
