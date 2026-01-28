import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * Store de gestion des jours typés
 * Structure des données: { annee: { personneId: { moisIndex: { jour: typeJourId } } } }
 * Exemple: { 2025: { 1: { 0: { 15: 'CP' } } } } = personne 1, janvier, jour 15 = CP
 * Stocke les données dans localStorage avec la clé 'jours'
 */
export const useJoursStore = defineStore('jours', () => {
  // Charger depuis localStorage ou initialiser avec un objet vide
  const donneesInitiales = localStorage.getItem('jours')
    ? JSON.parse(localStorage.getItem('jours'))
    : {}

  // État réactif contenant tous les jours typés
  const jours = ref(donneesInitiales)

  // Synchronisation automatique avec localStorage à chaque modification
  // deep: true est essentiel pour détecter les changements dans la structure imbriquée
  watch(jours, (newJours) => {
    localStorage.setItem('jours', JSON.stringify(newJours))
  }, { deep: true })

  /**
   * Récupère le type d'un jour spécifique pour une personne
   * @param {number} annee - Année (ex: 2025)
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11, 0=janvier)
   * @param {number} jour - Numéro du jour (1-31)
   * @returns {string|null} ID du type de jour (ex: 'CP', '1/2Fe') ou null si non défini
   */
  function getTypeJour(annee, personneId, moisIndex, jour) {
    return jours.value[annee]?.[personneId]?.[moisIndex]?.[jour] || null
  }

  /**
   * Définit le type d'un jour pour une personne
   * Crée automatiquement la structure imbriquée si elle n'existe pas
   * @param {number} annee - Année
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11)
   * @param {number} jour - Numéro du jour (1-31)
   * @param {string} typeId - ID du type de jour (ex: 'CP', 'Fe', '1/2Arr')
   */
  function setTypeJour(annee, personneId, moisIndex, jour, typeId) {
    // Initialisation progressive de la structure imbriquée
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

  /**
   * Supprime le type d'un jour (remet à null)
   * @param {number} annee - Année
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11)
   * @param {number} jour - Numéro du jour (1-31)
   */
  function clearTypeJour(annee, personneId, moisIndex, jour) {
    if (jours.value[annee]?.[personneId]?.[moisIndex]) {
      delete jours.value[annee][personneId][moisIndex][jour]
    }
  }

  /**
   * Récupère tous les jours typés d'un mois pour une personne
   * @param {number} annee - Année
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11)
   * @returns {Object} Objet avec les jours en clé et types en valeur { 15: 'CP', 20: 'Fe' }
   */
  function getJoursMois(annee, personneId, moisIndex) {
    return jours.value[annee]?.[personneId]?.[moisIndex] || {}
  }

  /**
   * Supprime tous les jours d'une année (cascade delete)
   * Appelé automatiquement lors de la suppression d'une année
   * @param {number} annee - Année à supprimer
   */
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
