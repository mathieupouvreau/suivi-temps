import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useJoursStore = defineStore('jours', () => {
  // Structure : { annee: { personneId: { moisIndex: { jour: typeJourId } } } }
  const donneesInitiales = localStorage.getItem('jours')
    ? JSON.parse(localStorage.getItem('jours'))
    : {}

  const jours = ref(donneesInitiales)

  // Sauvegarder dans localStorage à chaque modification
  watch(jours, (newJours) => {
    localStorage.setItem('jours', JSON.stringify(newJours))
  }, { deep: true })

  // Obtenir le type d'un jour pour une personne
  function getTypeJour(annee, personneId, moisIndex, jour) {
    return jours.value[annee]?.[personneId]?.[moisIndex]?.[jour] || null
  }

  // Définir le type d'un jour pour une personne
  function setTypeJour(annee, personneId, moisIndex, jour, typeId) {
    if (!jours.value[annee]) {
      jours.value[annee] = {}
    }
    if (!jours.value[annee][personneId]) {
      jours.value[annee][personneId] = {}
    }
    if (!jours.value[annee][personneId][moisIndex]) {
      jours.value[annee][personneId][moisIndex] = {}
    }
    jours.value[annee][personneId][moisIndex][jour] = typeId
  }

  // Supprimer le type d'un jour (remettre à null)
  function clearTypeJour(annee, personneId, moisIndex, jour) {
    if (jours.value[annee]?.[personneId]?.[moisIndex]) {
      delete jours.value[annee][personneId][moisIndex][jour]
    }
  }

  // Obtenir tous les jours d'un mois pour une personne
  function getJoursMois(annee, personneId, moisIndex) {
    return jours.value[annee]?.[personneId]?.[moisIndex] || {}
  }

  // Supprimer tous les jours d'une année
  function supprimerJoursAnnee(annee) {
    if (jours.value[annee]) {
      delete jours.value[annee]
    }
  }

  return {
    jours,
    getTypeJour,
    setTypeJour,
    clearTypeJour,
    getJoursMois,
    supprimerJoursAnnee
  }
})
