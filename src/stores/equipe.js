import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'

export const useEquipeStore = defineStore('equipe', () => {
  // Charger depuis localStorage ou utiliser les valeurs par défaut
  const membresInitiaux = localStorage.getItem('equipe')
    ? JSON.parse(localStorage.getItem('equipe')).map(m => ({
        ...m,
        actif: m.actif !== undefined ? m.actif : true // Migration: ajouter actif=true si absent
      }))
    : [
        { id: 1, nom: 'Prénom Nom', actif: true }
      ]

  const membres = ref(membresInitiaux)

  // Sauvegarder immédiatement si une migration a eu lieu
  if (membresInitiaux.some(m => m.actif === true)) {
    localStorage.setItem('equipe', JSON.stringify(membresInitiaux))
  }

  // Sauvegarder dans localStorage à chaque modification
  watch(membres, (newMembres) => {
    localStorage.setItem('equipe', JSON.stringify(newMembres))
  }, { deep: true })

  function ajouterMembre(nom) {
    const nomTrimmed = nom.trim()

    // Vérifier si un membre avec ce nom existe déjà (actif ou inactif)
    const membreExistant = membres.value.find(m => m.nom === nomTrimmed)

    if (membreExistant) {
      // Réactiver le membre s'il était inactif
      membreExistant.actif = true
    } else {
      // Créer un nouveau membre
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

  function supprimerMembre(id) {
    // Marquer comme inactif au lieu de supprimer
    const membre = membres.value.find(m => m.id === id)
    if (membre) {
      membre.actif = false
    }
  }

  function chargerEquipe(nouveauxMembres) {
    membres.value = nouveauxMembres
  }

  // Computed pour obtenir seulement les membres actifs
  const membresActifs = computed(() => membres.value.filter(m => m.actif !== false))

  return { membres, membresActifs, ajouterMembre, supprimerMembre, chargerEquipe }
})
