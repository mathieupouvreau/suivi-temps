import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * Store de gestion des affectations de projets par jour et par personne
 * Permet d'associer un projet et une tâche à chaque jour ouvré de chaque membre
 * Structure imbriquée : { annee: { personneId: { moisIndex: { jour: { projetId, tache } } } } }
 * Exemple : affectations[2025][1][0][15] = { projetId: 3, tache: 'Dev' }
 *           → Le 15 janvier 2025, la personne 1 travaille sur le projet 3, tâche "Dev"
 * Stocke les données dans localStorage avec la clé 'affectationsProjets'
 */

/** Types de tâches disponibles pour les affectations projet */
export const TACHES_PROJET = ['Spec', 'Dev', 'Tests', 'Retour dev']

export const useAffectationsProjetsStore = defineStore('affectationsProjets', () => {
  // Charger depuis localStorage ou initialiser avec un objet vide
  const donneesInitiales = localStorage.getItem('affectationsProjets')
    ? JSON.parse(localStorage.getItem('affectationsProjets'))
    : {}

  // État réactif contenant toutes les affectations
  const affectations = ref(donneesInitiales)

  // Synchronisation automatique avec localStorage à chaque modification
  watch(affectations, (val) => {
    localStorage.setItem('affectationsProjets', JSON.stringify(val))
  }, { deep: true })

  /**
   * Récupère l'affectation d'un jour spécifique pour une personne
   * @param {number} annee - Année (ex: 2025)
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11, 0=janvier)
   * @param {number} jour - Numéro du jour (1-31)
   * @returns {{ projetId: number, tache: string }|null} Affectation ou null si aucune
   */
  function getProjetJour(annee, personneId, moisIndex, jour) {
    return affectations.value[annee]?.[personneId]?.[moisIndex]?.[jour] || null
  }

  /**
   * Définit l'affectation d'un jour pour une personne
   * Crée automatiquement la structure imbriquée si elle n'existe pas
   * @param {number} annee - Année
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11)
   * @param {number} jour - Numéro du jour (1-31)
   * @param {number} projetId - ID du projet affecté
   * @param {string} tache - Type de tâche ('Spec', 'Dev', 'Tests', 'Retour dev')
   */
  function setProjetJour(annee, personneId, moisIndex, jour, projetId, tache) {
    // Initialisation progressive de la structure imbriquée
    if (!affectations.value[annee]) {
      affectations.value[annee] = {}
    }
    if (!affectations.value[annee][personneId]) {
      affectations.value[annee][personneId] = {}
    }
    if (!affectations.value[annee][personneId][moisIndex]) {
      affectations.value[annee][personneId][moisIndex] = {}
    }
    affectations.value[annee][personneId][moisIndex][jour] = { projetId, tache }
  }

  /**
   * Supprime l'affectation d'un jour pour une personne
   * @param {number} annee - Année
   * @param {number} personneId - ID de la personne
   * @param {number} moisIndex - Index du mois (0-11)
   * @param {number} jour - Numéro du jour (1-31)
   */
  function clearProjetJour(annee, personneId, moisIndex, jour) {
    if (affectations.value[annee]?.[personneId]?.[moisIndex]) {
      delete affectations.value[annee][personneId][moisIndex][jour]
    }
  }

  return { affectations, getProjetJour, setProjetJour, clearProjetJour }
})
