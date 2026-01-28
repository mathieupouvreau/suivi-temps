import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useJoursStore } from './jours'

/**
 * Store de gestion des années
 * Maintient la liste des années disponibles dans l'application
 * Stocke les données dans localStorage avec la clé 'annees'
 */
export const useAnneesStore = defineStore('annees', () => {
  // Charger depuis localStorage ou utiliser les valeurs par défaut [2025, 2026]
  const anneesInitiales = localStorage.getItem('annees')
    ? JSON.parse(localStorage.getItem('annees'))
    : [2025, 2026]

  // État réactif contenant la liste des années
  const annees = ref(anneesInitiales)

  // Synchronisation automatique avec localStorage à chaque modification
  watch(annees, (newAnnees) => {
    localStorage.setItem('annees', JSON.stringify(newAnnees))
  }, { deep: true })

  /**
   * Ajoute une nouvelle année et trie la liste
   * @param {number} annee - Année à ajouter (format: YYYY)
   */
  function ajouterAnnee(annee) {
    if (!annees.value.includes(annee)) {
      annees.value.push(annee)
      annees.value.sort() // Maintenir l'ordre chronologique
    }
  }

  /**
   * Supprime une année et nettoie toutes les données associées
   * Supprime automatiquement tous les jours de cette année du localStorage
   * @param {number} annee - Année à supprimer
   */
  function supprimerAnnee(annee) {
    annees.value = annees.value.filter(a => a !== annee)
    // Cascade delete: supprimer tous les jours de cette année
    const joursStore = useJoursStore()
    joursStore.supprimerJoursAnnee(annee)
  }

  return { annees, ajouterAnnee, supprimerAnnee }
})
