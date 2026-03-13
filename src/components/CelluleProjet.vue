<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProjetsStore } from '../stores/projets'
import { TACHES_PROJET } from '../stores/affectationsProjets'

/**
 * Composant représentant une cellule de projet dans le calendrier ProjetView
 * Affiche un badge coloré avec les 2 premières lettres du projet + l'abréviation de la tâche
 * Menu de sélection en 2 étapes : 1) choisir le projet, 2) choisir la tâche
 * Le menu se ferme automatiquement au clic extérieur
 */

const props = defineProps({
  affectation: [Object, Number, String],       // Affectation actuelle { projetId, tache } ou null
  disabled: { type: Boolean, default: false }  // Désactive la cellule (weekends, absences complètes)
})

const emit = defineEmits(['change'])

const projetsStore = useProjetsStore()
const showMenu = ref(false)              // Affichage du menu déroulant
const etape = ref('projet')              // Étape du menu : 'projet' (choix projet) ou 'tache' (choix tâche)
const projetChoisi = ref(null)           // Projet sélectionné en étape 1 (avant choix de tâche)
const celluleRef = ref(null)             // Référence DOM pour détecter les clics extérieurs

/** Extrait l'ID du projet depuis la prop affectation (supporte l'ancien et le nouveau format) */
const projetId = computed(() => {
  if (!props.affectation) return null
  return props.affectation?.projetId || props.affectation
})

/** Extrait le type de tâche depuis l'affectation */
const tache = computed(() => {
  return props.affectation?.tache || null
})

/** Récupère les données complètes du projet depuis le store */
const projetData = computed(() => {
  if (!projetId.value) return null
  return projetsStore.projets.find(p => p.id === projetId.value)
})

/** Correspondance tâche → lettre abrégée pour le badge compact */
const TACHES_ABREV = { 'Spec': 'S', 'Dev': 'D', 'Tests': 'T', 'Retour dev': 'R' }

/**
 * Génère le libellé court du badge : 2 lettres du projet + lettre de la tâche
 * Exemple : projet "Frontend" avec tâche "Dev" → "Fr.D"
 */
const badgeLabel = computed(() => {
  if (!projetData.value) return null
  const prefix = projetData.value.nom.substring(0, 2)
  const suffix = tache.value ? TACHES_ABREV[tache.value] || '' : ''
  return suffix ? `${prefix}.${suffix}` : prefix
})

/** Texte du tooltip affiché au survol du badge (nom complet du projet + tâche) */
const badgeTitle = computed(() => {
  if (!projetData.value) return ''
  return tache.value ? `${projetData.value.nom} - ${tache.value}` : projetData.value.nom
})

/** Ouvre/ferme le menu et réinitialise l'étape de sélection */
const toggleMenu = () => {
  if (props.disabled) return
  showMenu.value = !showMenu.value
  etape.value = 'projet'
  projetChoisi.value = null
}

/** Étape 1 : sélectionne un projet et passe à l'étape 2 (choix de tâche) */
const selectProjet = (id) => {
  projetChoisi.value = id
  etape.value = 'tache'
}

/** Étape 2 : sélectionne la tâche et émet l'affectation complète au parent */
const selectTache = (t) => {
  emit('change', { projetId: projetChoisi.value, tache: t })
  showMenu.value = false
  etape.value = 'projet'
  projetChoisi.value = null
}

/** Efface l'affectation (remet à null) et ferme le menu */
const clearProjet = () => {
  emit('change', null)
  showMenu.value = false
}

/** Retourne à l'étape 1 (choix de projet) depuis l'étape tâche */
const retourProjets = () => {
  etape.value = 'projet'
  projetChoisi.value = null
}

/** Ferme le menu si l'utilisateur clique en dehors de la cellule */
const handleClickOutside = (event) => {
  if (celluleRef.value && !celluleRef.value.contains(event.target)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

/** Palette de 10 couleurs pour différencier visuellement les projets */
const COULEURS = [
  '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'
]

/**
 * Attribue une couleur à un projet en fonction de sa position dans la liste
 * Rotation cyclique : le 11ème projet reprend la couleur du 1er
 * @param {number} id - ID du projet
 * @returns {string} Code couleur hexadécimal
 */
const getCouleur = (id) => {
  const index = projetsStore.projets.findIndex(p => p.id === id)
  return COULEURS[index % COULEURS.length]
}
</script>

<template>
  <div class="cellule-projet" :class="{ 'cellule-disabled': disabled }" @click="toggleMenu" ref="celluleRef">
    <span
      v-if="projetData"
      class="projet-badge"
      :style="{ backgroundColor: getCouleur(projetId), color: '#fff' }"
      :title="badgeTitle"
    >
      {{ badgeLabel }}
    </span>
    <span v-else class="type-vide">-</span>

    <div v-if="showMenu" class="menu-projets" @click.stop>
      <template v-if="etape === 'projet'">
        <button
          v-for="projet in projetsStore.projets"
          :key="projet.id"
          @click="selectProjet(projet.id)"
          class="menu-projet-item"
          :style="{ backgroundColor: getCouleur(projet.id), color: '#fff' }"
        >
          {{ projet.nom }}
        </button>
        <button @click="clearProjet" class="menu-projet-clear">
          Effacer
        </button>
      </template>
      <template v-else>
        <button @click="retourProjets" class="menu-projet-back">← Retour</button>
        <button
          v-for="t in TACHES_PROJET"
          :key="t"
          @click="selectTache(t)"
          class="menu-tache-item"
        >
          {{ t }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cellule-projet {
  position: relative;
  cursor: pointer;
  min-width: 28px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.projet-badge {
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.7em;
  font-weight: bold;
  white-space: nowrap;
}

.type-vide {
  color: #ccc;
  font-size: 0.8em;
}

.menu-projets {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 150px;
  max-height: 250px;
  overflow-y: auto;
}

.menu-projet-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.85em;
}

.menu-projet-item:hover {
  opacity: 0.85;
}

.menu-projet-clear {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: #f8f8f8;
  text-align: left;
  cursor: pointer;
  color: #999;
  font-size: 0.85em;
}

.menu-projet-clear:hover {
  background: #eee;
}

.cellule-disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.menu-projet-back {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: #f0f0f0;
  text-align: left;
  cursor: pointer;
  font-size: 0.85em;
  color: #555;
  font-weight: bold;
}

.menu-projet-back:hover {
  background: #e0e0e0;
}

.menu-tache-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  font-size: 0.85em;
}

.menu-tache-item:hover {
  background: #eaf4ff;
}
</style>
