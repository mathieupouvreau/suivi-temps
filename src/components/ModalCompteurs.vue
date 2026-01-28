<script setup>
import { computed } from 'vue'
import typesJoursData from '../config/typesJours.json'

const props = defineProps({
  show: Boolean,
  personnes: Array,
  compteurs: Object
})

const emit = defineEmits(['close'])

const typesJours = typesJoursData.typesJours

const fermer = () => {
  emit('close')
}

// Calculer le total par type pour toutes les personnes
const totauxParType = computed(() => {
  const totaux = { joursSansType: 0 }
  typesJours.forEach(type => {
    totaux[type.id] = 0
  })

  Object.values(props.compteurs || {}).forEach(compteurPersonne => {
    Object.entries(compteurPersonne).forEach(([typeId, count]) => {
      totaux[typeId] = (totaux[typeId] || 0) + count
    })
  })

  return totaux
})

// Calculer le total des jours avec type pour une personne
const getTotalJoursTypesPersonne = (personneId) => {
  return typesJours.reduce((sum, type) => {
    return sum + (props.compteurs[personneId]?.[type.id] || 0)
  }, 0)
}

// Calculer le total global des jours avec type
const totalGlobalJoursTypes = computed(() => {
  return typesJours.reduce((sum, type) => {
    return sum + (totauxParType.value[type.id] || 0)
  }, 0)
})

// Formater les nombres (afficher 1 décimale seulement si nécessaire)
const formatNumber = (value) => {
  if (value === 0) return 0
  return value % 1 === 0 ? value : value.toFixed(1)
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="fermer">
    <div class="modal-compteurs" @click.stop>
      <div class="modal-header">
        <h2>Compteurs de jours</h2>
        <button @click="fermer" class="btn-close">✕</button>
      </div>

      <div class="modal-body">
        <table class="table-compteurs">
          <thead>
            <tr>
              <th>Personne</th>
              <th v-for="type in typesJours" :key="type.id">
                {{ type.id }}
              </th>
              <th>Total</th>
              <th>Jours travaillés</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="personne in personnes" :key="personne.id">
              <td class="nom-personne">{{ personne.nom }}</td>
              <td v-for="type in typesJours" :key="type.id" class="compteur-cell">
                {{ formatNumber(compteurs[personne.id]?.[type.id] || 0) }}
              </td>
              <td class="total-cell">
                {{ formatNumber(getTotalJoursTypesPersonne(personne.id)) }}
              </td>
              <td class="compteur-cell sans-type-cell">
                {{ formatNumber(compteurs[personne.id]?.joursSansType || 0) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="nom-personne"><strong>Total</strong></td>
              <td v-for="type in typesJours" :key="type.id" class="compteur-cell">
                <strong>{{ formatNumber(totauxParType[type.id]) }}</strong>
              </td>
              <td class="total-cell">
                <strong>{{ formatNumber(totalGlobalJoursTypes) }}</strong>
              </td>
              <td class="compteur-cell sans-type-cell">
                <strong>{{ formatNumber(totauxParType.joursSansType) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="modal-footer">
        <button @click="fermer" class="btn-fermer">Fermer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
