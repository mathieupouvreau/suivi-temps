<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
  message: String,
  show: Boolean
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
