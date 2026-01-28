<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnneesStore } from '../stores/annees'

const router = useRouter()
const anneesStore = useAnneesStore()
const nouvelleAnnee = ref('')

const voirAnnee = (annee) => {
  router.push(`/annee/${annee}`)
}

const ajouterAnnee = () => {
  const annee = parseInt(nouvelleAnnee.value)
  if (annee && annee > 1900 && annee < 2100) {
    anneesStore.ajouterAnnee(annee)
    nouvelleAnnee.value = ''
  }
}

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
