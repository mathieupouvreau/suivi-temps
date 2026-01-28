import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Store de gestion de l'équipe
 * Gère la liste des membres avec soft-delete (marquage inactif au lieu de suppression)
 * Stocke les données dans localStorage avec la clé 'equipe'
 */
export const useEquipeStore = defineStore('equipe', () => {
  // Charger depuis localStorage ou utiliser les valeurs par défaut
  // Migration automatique: ajoute le champ 'actif' aux membres existants s'il est absent
  const membresInitiaux = localStorage.getItem('equipe')
    ? JSON.parse(localStorage.getItem('equipe')).map(m => ({
        ...m,
        actif: m.actif !== undefined ? m.actif : true // Migration: ajouter actif=true si absent
      }))
    : [
        { id: 1, nom: 'Prénom Nom', actif: true }
      ]

  // État réactif contenant tous les membres (actifs et inactifs)
  const membres = ref(membresInitiaux)

  // Sauvegarder immédiatement si une migration a eu lieu
  if (membresInitiaux.some(m => m.actif === true)) {
    localStorage.setItem('equipe', JSON.stringify(membresInitiaux))
  }

  // Synchronisation automatique avec localStorage à chaque modification
  // deep: true permet de détecter les changements dans les objets imbriqués
  watch(membres, (newMembres) => {
    localStorage.setItem('equipe', JSON.stringify(newMembres))
  }, { deep: true })

  /**
   * Ajoute un nouveau membre ou réactive un membre inactif existant
   * @param {string} nom - Nom du membre à ajouter
   */
  function ajouterMembre(nom) {
    const nomTrimmed = nom.trim()

    // Vérifier si un membre avec ce nom existe déjà (actif ou inactif)
    const membreExistant = membres.value.find(m => m.nom === nomTrimmed)

    if (membreExistant) {
      // Réactiver le membre s'il était inactif (préserve l'historique des données)
      membreExistant.actif = true
    } else {
      // Créer un nouveau membre avec un ID incrémental
      const nouvelId = membres.value.length > 0
        ? Math.max(...membres.value.map(p => p.id)) + 1
        : 1
      membres.value.push({
        id: nouvelId,
        nom: nomTrimmed,
        actif: true
      })
    }
  }

  /**
   * Supprime un membre (soft delete: marque comme inactif)
   * Les données associées au membre sont préservées
   * @param {number} id - ID du membre à supprimer
   */
  function supprimerMembre(id) {
    const membre = membres.value.find(m => m.id === id)
    if (membre) {
      membre.actif = false
    }
  }

  /**
   * Remplace tous les membres par une nouvelle liste (utilisé pour l'import CSV)
   * @param {Array} nouveauxMembres - Liste des nouveaux membres
   */
  function chargerEquipe(nouveauxMembres) {
    membres.value = nouveauxMembres
  }

  /**
   * Computed property retournant uniquement les membres actifs
   * Utilisé pour l'affichage dans les vues
   */
  const membresActifs = computed(() => membres.value.filter(m => m.actif !== false))

  return { membres, membresActifs, ajouterMembre, supprimerMembre, chargerEquipe }
})
