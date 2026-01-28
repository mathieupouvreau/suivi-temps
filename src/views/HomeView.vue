<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnneesStore } from '../stores/annees'

/**
 * Vue d'accueil de l'application
 * Affiche la liste des années disponibles et permet de :
 * - Ajouter une nouvelle année
 * - Supprimer une année (avec confirmation)
 * - Accéder à la vue détaillée d'une année
 * - Naviguer vers la gestion de l'équipe
 * - Consulter les types de jours
 */

const router = useRouter()
const anneesStore = useAnneesStore()
const nouvelleAnnee = ref('')  // Input pour ajouter une année

/**
 * Navigue vers la vue détaillée d'une année
 * @param {number} annee - Année à afficher (ex: 2025)
 */
const voirAnnee = (annee) => {
  router.push(`/annee/${annee}`)
}

/**
 * Ajoute une nouvelle année après validation
 * Validation : année entre 1900 et 2100
 */
const ajouterAnnee = () => {
  const annee = parseInt(nouvelleAnnee.value)
  if (annee && annee > 1900 && annee < 2100) {
    anneesStore.ajouterAnnee(annee)
    nouvelleAnnee.value = ''  // Réinitialiser l'input
  }
}

/**
 * Supprime une année après confirmation
 * Supprime aussi tous les jours associés (cascade delete)
 * @param {number} annee - Année à supprimer
 */
const supprimerAnnee = (annee) => {
  if (confirm(`Supprimer l'année ${annee} ?`)) {
    anneesStore.supprimerAnnee(annee)
  }
}
</script>

<template>
  <div>
    <h1>Suivi du temps de l'équipe</h1>

    <div style="margin-bottom: 1rem; display: flex; gap: 1rem;">
      <button @click="router.push('/equipe')">Gérer l'équipe</button>
      <button @click="router.push('/types-jours')">Types de jours</button>
      <input
        v-model="nouvelleAnnee"
        type="number"
        placeholder="Nouvelle année"
        @keyup.enter="ajouterAnnee"
        style="padding: 0.5rem; width: 10rem;"
      />
      <button @click="ajouterAnnee">Ajouter année</button>
    </div>

    <table v-if="anneesStore.annees.length > 0">
      <thead>
        <tr>
          <th>Années</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="annee in anneesStore.annees" :key="annee">
          <td>
            <button @click="voirAnnee(annee)">{{ annee }}</button>
          </td>
          <td>
            <button @click="supprimerAnnee(annee)" class="btn-supprimer">
              Supprimer
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
</style>
