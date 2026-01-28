<script setup>
import { computed } from 'vue'
import typesJoursData from '../config/typesJours.json'

/**
 * Modal affichant les compteurs de jours par personne et par type
 * Calcule les totaux par type et les totaux généraux
 * Gère les demi-journées (affichage décimal: 0.5, 1.5, etc.)
 */

const props = defineProps({
  show: Boolean,         // Visibilité de la modal
  personnes: Array,      // Liste des personnes actives
  compteurs: Object      // Compteurs pré-calculés depuis AnneeView
})

const emit = defineEmits(['close'])

const typesJours = typesJoursData.typesJours

const fermer = () => {
  emit('close')
}

/**
 * Calcule les totaux par type pour toutes les personnes
 * Additionne les compteurs de chaque personne pour obtenir les totaux globaux
 * @returns {Object} Totaux par type { 'CP': 10, 'Fe': 5, 'joursSansType': 200 }
 */
const totauxParType = computed(() => {
  const totaux = { joursSansType: 0 }
  // Initialiser tous les types à 0
  typesJours.forEach(type => {
    totaux[type.id] = 0
  })

  // Additionner les compteurs de chaque personne
  Object.values(props.compteurs || {}).forEach(compteurPersonne => {
    Object.entries(compteurPersonne).forEach(([typeId, count]) => {
      totaux[typeId] = (totaux[typeId] || 0) + count
    })
  })

  return totaux
})

/**
 * Calcule le total des jours avec type pour une personne
 * (somme de tous les types, hors "Jours travaillés")
 * @param {number} personneId - ID de la personne
 * @returns {number} Total des jours typés
 */
const getTotalJoursTypesPersonne = (personneId) => {
  return typesJours.reduce((sum, type) => {
    return sum + (props.compteurs[personneId]?.[type.id] || 0)
  }, 0)
}

/**
 * Calcule le total global des jours avec type
 * (somme de tous les types pour toutes les personnes)
 */
const totalGlobalJoursTypes = computed(() => {
  return typesJours.reduce((sum, type) => {
    return sum + (totauxParType.value[type.id] || 0)
  }, 0)
})

/**
 * Formate les nombres pour l'affichage
 * Entiers: affiche sans décimale (10)
 * Décimaux: affiche avec 1 décimale (10.5)
 * @param {number} value - Valeur à formater
 * @returns {string|number} Valeur formatée
 */
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
