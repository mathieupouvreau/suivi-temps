import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * Store de gestion des projets
 * Maintient la liste des projets avec leur chiffrage ventilé par tâche
 * Structure : { id, nom, chiffrage, spec, dev, tests, retourDev, specPersonnes, devPersonnes, testsPersonnes, retourDevPersonnes }
 * Les champs *Personnes indiquent le nombre de personnes pouvant effectuer chaque tâche (défaut : 1)
 * Stocke les données dans localStorage avec la clé 'projets'
 */
export const useProjetsStore = defineStore('projets', () => {
  // Charger depuis localStorage ou initialiser avec une liste vide
  const projetsInitiaux = localStorage.getItem('projets')
    ? JSON.parse(localStorage.getItem('projets'))
    : []

  // État réactif contenant la liste des projets
  const projets = ref(projetsInitiaux)

  // Synchronisation automatique avec localStorage à chaque modification
  watch(projets, (newProjets) => {
    localStorage.setItem('projets', JSON.stringify(newProjets))
  }, { deep: true })

  /**
   * Ajoute un nouveau projet avec un chiffrage initialisé à zéro
   * Génère un ID auto-incrémenté basé sur le max existant
   * @param {string} nom - Nom du projet
   */
  function ajouterProjet(nom) {
    const nomTrimmed = nom.trim()
    if (!nomTrimmed) return
    const nouvelId = projets.value.length > 0
      ? Math.max(...projets.value.map(p => p.id)) + 1
      : 1
    projets.value.push({ id: nouvelId, nom: nomTrimmed, chiffrage: 0, spec: 0, dev: 0, tests: 0, retourDev: 0, specPersonnes: 1, devPersonnes: 1, testsPersonnes: 1, retourDevPersonnes: 1 })
  }

  /**
   * Supprime définitivement un projet par son ID
   * Attention : suppression physique (pas de soft delete comme pour les membres)
   * @param {number} id - ID du projet à supprimer
   */
  function supprimerProjet(id) {
    projets.value = projets.value.filter(p => p.id !== id)
  }

  /**
   * Remplace l'intégralité de la liste des projets (utilisé pour l'import CSV)
   * @param {Array} nouveauxProjets - Nouvelle liste de projets
   */
  function chargerProjets(nouveauxProjets) {
    projets.value = nouveauxProjets
  }

  return { projets, ajouterProjet, supprimerProjet, chargerProjets }
})
