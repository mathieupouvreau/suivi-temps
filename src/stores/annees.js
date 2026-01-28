import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useAnneesStore = defineStore('annees', () => {
  // Charger depuis localStorage ou utiliser les valeurs par défaut
  const anneesInitiales = localStorage.getItem('annees')
    ? JSON.parse(localStorage.getItem('annees'))
    : [2025, 2026]

  const annees = ref(anneesInitiales)

  // Sauvegarder dans localStorage à chaque modification
  watch(annees, (newAnnees) => {
    localStorage.setItem('annees', JSON.stringify(newAnnees))
  }, { deep: true })

  function ajouterAnnee(annee) {
    if (!annees.value.includes(annee)) {
      annees.value.push(annee)
      annees.value.sort()
    }
  }

  function supprimerAnnee(annee) {
    annees.value = annees.value.filter(a => a !== annee)
  }

  return { annees, ajouterAnnee, supprimerAnnee }
})
