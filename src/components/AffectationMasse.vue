<script setup>
import { ref, computed } from 'vue'
import { defineProps, defineEmits } from 'vue'
import typesJoursData from '../config/typesJours.json'
import { MOIS_AVEC_INDEX } from '../config/constantes'

const props = defineProps({
  show: Boolean,
  annee: Number,
  personnes: Array
})

const emit = defineEmits(['close', 'apply'])

const typesJours = typesJoursData.typesJours
const typeSelectionne = ref(null)
const personnesSelectionnees = ref([])
const moisDebut = ref(1)
const jourDebut = ref(1)
const moisFin = ref(1)
const jourFin = ref(1)

const mois = MOIS_AVEC_INDEX

const joursMaxDebut = computed(() => {
  return new Date(props.annee, moisDebut.value, 0).getDate()
})

const joursMaxFin = computed(() => {
  return new Date(props.annee, moisFin.value, 0).getDate()
})

const togglePersonne = (personneId) => {
  const index = personnesSelectionnees.value.indexOf(personneId)
  if (index > -1) {
    personnesSelectionnees.value.splice(index, 1)
  } else {
    personnesSelectionnees.value.push(personneId)
  }
}

const selectionnerTout = () => {
  if (personnesSelectionnees.value.length === props.personnes.length) {
    personnesSelectionnees.value = []
  } else {
    personnesSelectionnees.value = props.personnes.map(p => p.id)
  }
}

const appliquer = () => {
  if (!typeSelectionne.value) {
    alert('Veuillez sélectionner un type de jour')
    return
  }
  if (personnesSelectionnees.value.length === 0) {
    alert('Veuillez sélectionner au moins une personne')
    return
  }

  // Construire la liste des jours à affecter
  const joursAAffecter = []
  const dateDebut = new Date(props.annee, moisDebut.value - 1, jourDebut.value)
  const dateFin = new Date(props.annee, moisFin.value - 1, jourFin.value)

  if (dateDebut > dateFin) {
    alert('La date de début doit être antérieure ou égale à la date de fin')
    return
  }

  let dateCourante = new Date(dateDebut)
  while (dateCourante <= dateFin) {
    joursAAffecter.push({
      moisIndex: dateCourante.getMonth(),
      jour: dateCourante.getDate()
    })
    dateCourante.setDate(dateCourante.getDate() + 1)
  }

  emit('apply', {
    typeId: typeSelectionne.value,
    personnesIds: personnesSelectionnees.value,
    jours: joursAAffecter
  })

  // Réinitialiser le formulaire
  typeSelectionne.value = null
  personnesSelectionnees.value = []
  moisDebut.value = 1
  jourDebut.value = 1
  moisFin.value = 1
  jourFin.value = 1
}

const fermer = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="fermer">
    <div class="modal-affectation" @click.stop>
      <h2>Affectation en masse</h2>

      <div class="form-section">
        <h3>Type de jour</h3>
        <div class="types-list">
          <button
            v-for="type in typesJours"
            :key="type.id"
            @click="typeSelectionne = type.id"
            class="type-button"
            :class="{ 'selected': typeSelectionne === type.id }"
            :style="{
              backgroundColor: typeSelectionne === type.id ? type.couleur : 'transparent',
              color: typeSelectionne === type.id ? type.couleurTexte : '#333',
              borderColor: type.couleur
            }"
          >
            {{ type.id }} - {{ type.libelle }}
          </button>
        </div>
      </div>

      <div class="form-section">
        <h3>Personnes</h3>
        <button @click="selectionnerTout" class="btn-select-all">
          {{ personnesSelectionnees.length === personnes.length ? 'Tout désélectionner' : 'Tout sélectionner' }}
        </button>
        <div class="personnes-list">
          <label v-for="personne in personnes" :key="personne.id" class="checkbox-label">
            <input
              type="checkbox"
              :checked="personnesSelectionnees.includes(personne.id)"
              @change="togglePersonne(personne.id)"
            />
            {{ personne.nom }}
          </label>
        </div>
      </div>

      <div class="form-section">
        <h3>Période</h3>
        <div class="date-range">
          <div class="date-input">
            <label>Début</label>
            <select v-model.number="moisDebut">
              <option v-for="m in mois" :key="m.index" :value="m.index + 1">{{ m.nom }}</option>
            </select>
            <input type="number" v-model.number="jourDebut" :min="1" :max="joursMaxDebut" />
          </div>
          <div class="date-input">
            <label>Fin</label>
            <select v-model.number="moisFin">
              <option v-for="m in mois" :key="m.index" :value="m.index + 1">{{ m.nom }}</option>
            </select>
            <input type="number" v-model.number="jourFin" :min="1" :max="joursMaxFin" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="appliquer" class="btn-apply">Appliquer</button>
        <button @click="fermer" class="btn-cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>
