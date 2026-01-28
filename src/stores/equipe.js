import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useEquipeStore = defineStore('equipe', () => {
  // Charger depuis localStorage ou utiliser les valeurs par défaut
  const membresInitiaux = localStorage.getItem('equipe')
    ? JSON.parse(localStorage.getItem('equipe'))
    : [
        { id: 1, nom: 'Prénom Nom' }
      ]

  const membres = ref(membresInitiaux)

  // Sauvegarder dans localStorage à chaque modification
  watch(membres, (newMembres) => {
    localStorage.setItem('equipe', JSON.stringify(newMembres))
  }, { deep: true })

  function ajouterMembre(nom) {
    const nouvelId = membres.value.length > 0
      ? Math.max(...membres.value.map(p => p.id)) + 1
      : 1
    membres.value.push({
      id: nouvelId,
      nom: nom.trim()
    })
  }

  function supprimerMembre(id) {
    membres.value = membres.value.filter(p => p.id !== id)
  }

  function chargerEquipe(nouveauxMembres) {
    membres.value = nouveauxMembres
  }

  return { membres, ajouterMembre, supprimerMembre, chargerEquipe }
})
