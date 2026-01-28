<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import { useJoursStore } from '../stores/jours'
import CelluleJour from '../components/CelluleJour.vue'
import Modal from '../components/Modal.vue'
import AffectationMasse from '../components/AffectationMasse.vue'
import { MOIS, NOMS_JOURS } from '../config/constantes'

const router = useRouter()
const equipeStore = useEquipeStore()
const joursStore = useJoursStore()

const route = useRoute()
const annee = ref(parseInt(route.params.annee) || new Date().getFullYear())

const showModal = ref(false)
const modalMessage = ref('')
const showAffectation = ref(false)

const afficherModal = (message) => {
  modalMessage.value = message
  showModal.value = true
}

const fermerModal = () => {
  showModal.value = false
}

const mois = MOIS
const nomsJours = NOMS_JOURS

// Fonction pour obtenir le nombre de jours dans un mois
const getJoursDansMois = (moisIndex) => {
  return new Date(annee.value, moisIndex + 1, 0).getDate()
}

// Fonction pour obtenir le jour de la semaine
const getNomJour = (moisIndex, jour) => {
  const date = new Date(annee.value, moisIndex, jour)
  return nomsJours[date.getDay()]
}

// Fonction pour vérifier si c'est un weekend
const isWeekend = (moisIndex, jour) => {
  const date = new Date(annee.value, moisIndex, jour)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // Dimanche ou Samedi
}

// Génère la liste des jours pour chaque mois
const joursParMois = computed(() => {
  return mois.map((_, index) => {
    const nbJours = getJoursDansMois(index)
    return Array.from({ length: nbJours }, (_, i) => i + 1)
  })
})

// Gestion des types de jours
const handleTypeChange = (personneId, moisIndex, jour, typeId) => {
  if (typeId === null) {
    joursStore.clearTypeJour(annee.value, personneId, moisIndex, jour)
  } else {
    joursStore.setTypeJour(annee.value, personneId, moisIndex, jour, typeId)
  }
}

const getTypeJour = (personneId, moisIndex, jour) => {
  return joursStore.getTypeJour(annee.value, personneId, moisIndex, jour)
}

const exporterJSON = () => {
  const json = JSON.stringify(joursStore.jours, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `jours_${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(link.href)
  afficherModal('Export réussi')
}

const importerJSON = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const donnees = JSON.parse(e.target.result)
      joursStore.jours = donnees
      afficherModal('Import réussi')
    } catch (error) {
      afficherModal('Erreur lors de l\'import : fichier JSON invalide')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

const ouvrirAffectation = () => {
  showAffectation.value = true
}

const fermerAffectation = () => {
  showAffectation.value = false
}

const appliquerAffectation = ({ typeId, personnesIds, jours }) => {
  let count = 0
  personnesIds.forEach(personneId => {
    jours.forEach(({ moisIndex, jour }) => {
      if (typeId === null) {
        joursStore.clearTypeJour(annee.value, personneId, moisIndex, jour)
      } else {
        joursStore.setTypeJour(annee.value, personneId, moisIndex, jour, typeId)
      }
      count++
    })
  })
  showAffectation.value = false
  afficherModal(`${count} jour(s) affecté(s)`)
}
</script>

<template>
  <div class="annee-view">
    <button @click="router.push('/')" class="btn-back">← Retour à l'accueil</button>
    <h1>Année {{ annee }}</h1>

    <div class="actions-section">
      <button @click="ouvrirAffectation" class="btn-affectation">Affectation en masse</button>
      <button @click="exporterJSON" class="btn-export">Exporter les jours (JSON)</button>
      <label class="btn-import">
        Importer les jours (JSON)
        <input type="file" accept=".json" @change="importerJSON" style="display: none;" />
      </label>
    </div>

    <div v-for="(nomMois, moisIndex) in mois" :key="moisIndex" class="mois-section">
      <h2>{{ nomMois }} {{ annee }}</h2>

      <table>
        <thead>
          <tr>
            <th class="nom-colonne">Nom</th>
            <th v-for="jour in joursParMois[moisIndex]" :key="jour"
                :class="['jour-colonne', { 'weekend': isWeekend(moisIndex, jour) }]">
              <div>{{ jour }}</div>
              <div class="nom-jour">{{ getNomJour(moisIndex, jour) }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="personne in equipeStore.membres" :key="personne.id">
            <td class="nom-colonne">{{ personne.nom }}</td>
            <td v-for="jour in joursParMois[moisIndex]" :key="jour"
                :class="['jour-cell', { 'weekend': isWeekend(moisIndex, jour) }]">
              <CelluleJour
                :typeActuel="getTypeJour(personne.id, moisIndex, jour)"
                :annee="annee"
                :personneId="personne.id"
                :moisIndex="moisIndex"
                :jour="jour"
                @change="(typeId) => handleTypeChange(personne.id, moisIndex, jour, typeId)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="showModal" :message="modalMessage" @close="fermerModal" />
    <AffectationMasse
      :show="showAffectation"
      :annee="annee"
      :personnes="equipeStore.membres"
      @close="fermerAffectation"
      @apply="appliquerAffectation"
    />
  </div>
</template>

<style scoped>
</style>
