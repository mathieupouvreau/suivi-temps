<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { defineProps, defineEmits } from 'vue'
import typesJoursData from '../config/typesJours.json'

const props = defineProps({
  typeActuel: String,
  annee: Number,
  personneId: Number,
  moisIndex: Number,
  jour: Number
})

const emit = defineEmits(['change'])

const showMenu = ref(false)
const typesJours = typesJoursData.typesJours
const celluleRef = ref(null)

const typeActuelData = computed(() => {
  return typesJours.find(t => t.id === props.typeActuel)
})

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const selectType = (typeId) => {
  emit('change', typeId)
  showMenu.value = false
}

const clearType = () => {
  emit('change', null)
  showMenu.value = false
}

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
        {{ type.id }} - {{ type.libelle }}
      </button>
      <button @click="clearType" class="menu-type-clear">
        Effacer
      </button>
    </div>
  </div>
</template>
