<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { defineProps, defineEmits } from 'vue'
import typesJoursData from '../config/typesJours.json'

/**
 * Composant représentant une cellule de jour dans le calendrier
 * Affiche un badge de type et un menu déroulant pour modifier le type
 */

const props = defineProps({
  typeActuel: String,    // ID du type actuel (ex: 'CP', 'Fe', null)
  annee: Number,         // Année en cours
  personneId: Number,    // ID de la personne
  moisIndex: Number,     // Index du mois (0-11)
  jour: Number           // Numéro du jour (1-31)
})

const emit = defineEmits(['change'])

// État d'affichage du menu déroulant
const showMenu = ref(false)
const typesJours = typesJoursData.typesJours
const celluleRef = ref(null) // Référence pour détecter les clics extérieurs

/**
 * Récupère les données complètes du type actuel
 * (couleur, libellé, abréviation)
 */
const typeActuelData = computed(() => {
  return typesJours.find(t => t.id === props.typeActuel)
})

/**
 * Affiche/masque le menu déroulant
 */
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

/**
 * Sélectionne un type de jour et ferme le menu
 * @param {string} typeId - ID du type sélectionné
 */
const selectType = (typeId) => {
  emit('change', typeId)
  showMenu.value = false
}

/**
 * Efface le type (remet à null) et ferme le menu
 */
const clearType = () => {
  emit('change', null)
  showMenu.value = false
}

/**
 * Ferme le menu si on clique en dehors de la cellule
 */
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
</script>

<template>
  <div class="cellule-jour" @click="toggleMenu" ref="celluleRef">
    <span
      v-if="typeActuelData"
      class="type-badge"
      :style="{
        backgroundColor: typeActuelData.couleur,
        color: typeActuelData.couleurTexte
      }"
    >
      {{ typeActuelData.id }}
    </span>
    <span v-else class="type-vide">-</span>

    <div v-if="showMenu" class="menu-types" @click.stop>
      <button
        v-for="type in typesJours"
        :key="type.id"
        @click="selectType(type.id)"
        class="menu-type-item"
        :style="{
          backgroundColor: type.couleur,
          color: type.couleurTexte
        }"
      >
        {{ type.id }} - {{ type.abreviation }}
      </button>
      <button @click="clearType" class="menu-type-clear">
        Effacer
      </button>
    </div>
  </div>
</template>
