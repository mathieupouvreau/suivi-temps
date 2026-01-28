<script setup>
import { defineProps, defineEmits } from 'vue'

/**
 * Composant modal simple pour afficher des messages
 * Utilisé pour les confirmations et notifications (export réussi, import réussi, etc.)
 * Fermeture possible en cliquant sur le bouton OK ou sur l'overlay
 */

defineProps({
  message: String,  // Message à afficher dans la modal
  show: Boolean     // Visibilité de la modal
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <p>{{ message }}</p>
      <button @click="emit('close')">OK</button>
    </div>
  </div>
</template>

<style scoped>
</style>
