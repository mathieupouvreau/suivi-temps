<script setup>
import { ref, computed } from 'vue'
import { defineProps, defineEmits } from 'vue'
import typesJoursData from '../config/typesJours.json'
import { MOIS_AVEC_INDEX } from '../config/constantes'

/**
 * Composant modal pour affecter un type de jour en masse
 * Permet de sélectionner :
 * - Un type de jour (CP, Fe, Arr, etc.)
 * - Une ou plusieurs personnes
 * - Une période (date début - date fin)
 * Applique le type à tous les jours de la période pour les personnes sélectionnées
 */

const props = defineProps({
  show: Boolean,        // Visibilité de la modal
  annee: Number,        // Année en cours
  personnes: Array      // Liste des personnes actives
})

const emit = defineEmits(['close', 'apply'])

// Configuration des types de jours disponibles
const typesJours = typesJoursData.typesJours

// État du formulaire
const typeSelectionne = ref(null)            // ID du type sélectionné (ex: 'CP', 'Fe')
const personnesSelectionnees = ref([])       // IDs des personnes sélectionnées
const moisDebut = ref(1)                     // Mois de début (1-12)
const jourDebut = ref(1)                     // Jour de début (1-31)
const moisFin = ref(1)                       // Mois de fin (1-12)
const jourFin = ref(1)                       // Jour de fin (1-31)

const mois = MOIS_AVEC_INDEX

/**
 * Calcule le nombre maximum de jours dans le mois de début sélectionné
 * Gère automatiquement les années bissextiles et les mois de différentes durées
 * @returns {number} Nombre de jours (28-31)
 */
const joursMaxDebut = computed(() => {
  return new Date(props.annee, moisDebut.value, 0).getDate()
})

/**
 * Calcule le nombre maximum de jours dans le mois de fin sélectionné
 * @returns {number} Nombre de jours (28-31)
 */
const joursMaxFin = computed(() => {
  return new Date(props.annee, moisFin.value, 0).getDate()
})

/**
 * Toggle la sélection d'une personne (ajoute ou retire de la liste)
 * @param {number} personneId - ID de la personne à toggler
 */
const togglePersonne = (personneId) => {
  const index = personnesSelectionnees.value.indexOf(personneId)
  if (index > -1) {
    // Désélectionner si déjà sélectionnée
    personnesSelectionnees.value.splice(index, 1)
  } else {
    // Ajouter à la sélection
    personnesSelectionnees.value.push(personneId)
  }
}

/**
 * Sélectionne toutes les personnes ou désélectionne tout
 * Bascule entre les deux états selon l'état actuel
 */
const selectionnerTout = () => {
  if (personnesSelectionnees.value.length === props.personnes.length) {
    // Tout désélectionner si tout est déjà sélectionné
    personnesSelectionnees.value = []
  } else {
    // Sélectionner toutes les personnes
    personnesSelectionnees.value = props.personnes.map(p => p.id)
  }
}

/**
 * Applique l'affectation en masse et émet l'événement vers le parent
 * Valide les données, génère la liste des jours concernés et réinitialise le formulaire
 */
const appliquer = () => {
  // Validation : vérifier qu'un type est sélectionné
  if (!typeSelectionne.value) {
    alert('Veuillez sélectionner un type de jour')
    return
  }

  // Validation : vérifier qu'au moins une personne est sélectionnée
  if (personnesSelectionnees.value.length === 0) {
    alert('Veuillez sélectionner au moins une personne')
    return
  }

  // Construire la liste de tous les jours entre la date de début et de fin
  const joursAAffecter = []
  // Note : moisDebut.value va de 1 à 12, mais Date() attend 0-11
  const dateDebut = new Date(props.annee, moisDebut.value - 1, jourDebut.value)
  const dateFin = new Date(props.annee, moisFin.value - 1, jourFin.value)

  // Validation : vérifier que la période est cohérente
  if (dateDebut > dateFin) {
    alert('La date de début doit être antérieure ou égale à la date de fin')
    return
  }

  // Générer tous les jours de la période (inclusif)
  let dateCourante = new Date(dateDebut)
  while (dateCourante <= dateFin) {
    joursAAffecter.push({
      moisIndex: dateCourante.getMonth(),    // 0-11
      jour: dateCourante.getDate()           // 1-31
    })
    dateCourante.setDate(dateCourante.getDate() + 1)  // Avancer d'un jour
  }

  // Émettre l'événement 'apply' avec toutes les données
  emit('apply', {
    typeId: typeSelectionne.value,
    personnesIds: personnesSelectionnees.value,
    jours: joursAAffecter
  })

  // Réinitialiser le formulaire après application
  typeSelectionne.value = null
  personnesSelectionnees.value = []
  moisDebut.value = 1
  jourDebut.value = 1
  moisFin.value = 1
  jourFin.value = 1
}

/**
 * Ferme la modal sans appliquer les modifications
 */
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
