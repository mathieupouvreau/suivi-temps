<script setup>
import { ref, computed } from 'vue'
import { useProjetsStore } from '../stores/projets'
import { TACHES_PROJET } from '../stores/affectationsProjets'
import { MOIS_AVEC_INDEX } from '../config/constantes'

/**
 * Composant modal pour affecter ou désaffecter des projets en masse
 * Similaire à AffectationMasse.vue mais pour les projets au lieu des types de jours.
 * Permet de :
 * - Affecter un projet + tâche à une période pour plusieurs personnes
 * - Désaffecter un projet (toutes tâches) sur une période
 * - Désaffecter un projet + tâche spécifique sur une période
 * Émet l'event 'apply' avec un mode ('affecter', 'desaffecter-projet', 'desaffecter-tache')
 */

const props = defineProps({
  show: Boolean,        // Visibilité de la modal
  annee: Number,        // Année en cours
  personnes: Array      // Liste des personnes actives
})

const emit = defineEmits(['close', 'apply'])

const projetsStore = useProjetsStore()

// État du formulaire
const projetSelectionne = ref(null)          // ID du projet sélectionné
const tacheSelectionnee = ref(null)          // Type de tâche sélectionnée (Spec, Dev, etc.)
const personnesSelectionnees = ref([])       // IDs des personnes sélectionnées
const moisDebut = ref(1)                     // Mois de début (1-12)
const jourDebut = ref(1)                     // Jour de début (1-31)
const moisFin = ref(1)                       // Mois de fin (1-12)
const jourFin = ref(1)                       // Jour de fin (1-31)

const mois = MOIS_AVEC_INDEX

/**
 * Calcule le nombre maximum de jours dans le mois de début sélectionné
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
 * Bascule la sélection d'une personne (ajoute ou retire de la liste)
 * @param {number} personneId - ID de la personne à toggler
 */
const togglePersonne = (personneId) => {
  const index = personnesSelectionnees.value.indexOf(personneId)
  if (index > -1) {
    personnesSelectionnees.value.splice(index, 1)
  } else {
    personnesSelectionnees.value.push(personneId)
  }
}

/**
 * Sélectionne/désélectionne toutes les personnes d'un coup
 */
const selectionnerTout = () => {
  if (personnesSelectionnees.value.length === props.personnes.length) {
    personnesSelectionnees.value = []
  } else {
    personnesSelectionnees.value = props.personnes.map(p => p.id)
  }
}

/**
 * Génère la liste des jours compris dans la période sélectionnée
 * Valide que des personnes sont sélectionnées et que la période est cohérente
 * @returns {{ moisIndex: number, jour: number }[]|null} Liste des jours ou null si invalide
 */
const getJoursPeriode = () => {
  if (personnesSelectionnees.value.length === 0) {
    alert('Veuillez sélectionner au moins une personne')
    return null
  }

  const dateDebut = new Date(props.annee, moisDebut.value - 1, jourDebut.value)
  const dateFin = new Date(props.annee, moisFin.value - 1, jourFin.value)

  if (dateDebut > dateFin) {
    alert('La date de début doit être antérieure ou égale à la date de fin')
    return null
  }

  const jours = []
  let dateCourante = new Date(dateDebut)
  while (dateCourante <= dateFin) {
    jours.push({
      moisIndex: dateCourante.getMonth(),
      jour: dateCourante.getDate()
    })
    dateCourante.setDate(dateCourante.getDate() + 1)
  }
  return jours
}

/** Réinitialise tous les champs du formulaire à leur valeur par défaut */
const resetForm = () => {
  projetSelectionne.value = null
  tacheSelectionnee.value = null
  personnesSelectionnees.value = []
  moisDebut.value = 1
  jourDebut.value = 1
  moisFin.value = 1
  jourFin.value = 1
}

/**
 * Applique une affectation projet+tâche sur la période pour les personnes sélectionnées
 * Mode 'affecter' : associe le projet et la tâche aux jours de la période
 */
const appliquer = () => {
  if (projetSelectionne.value === null) {
    alert('Veuillez sélectionner un projet')
    return
  }
  if (!tacheSelectionnee.value) {
    alert('Veuillez sélectionner une tâche')
    return
  }
  const jours = getJoursPeriode()
  if (!jours) return

  emit('apply', {
    mode: 'affecter',
    projetId: projetSelectionne.value,
    tache: tacheSelectionnee.value,
    personnesIds: personnesSelectionnees.value,
    jours
  })
  resetForm()
}

/**
 * Désaffecte un projet (toutes tâches confondues) sur la période
 * Mode 'desaffecter-projet' : supprime l'affectation si le projet correspond
 */
const desaffecterProjet = () => {
  if (projetSelectionne.value === null) {
    alert('Veuillez sélectionner un projet')
    return
  }
  const jours = getJoursPeriode()
  if (!jours) return

  emit('apply', {
    mode: 'desaffecter-projet',
    projetId: projetSelectionne.value,
    tache: null,
    personnesIds: personnesSelectionnees.value,
    jours
  })
  resetForm()
}

/**
 * Désaffecte un projet + tâche spécifique sur la période
 * Mode 'desaffecter-tache' : supprime uniquement si projet ET tâche correspondent
 */
const desaffecterTache = () => {
  if (projetSelectionne.value === null) {
    alert('Veuillez sélectionner un projet')
    return
  }
  if (!tacheSelectionnee.value) {
    alert('Veuillez sélectionner une tâche')
    return
  }
  const jours = getJoursPeriode()
  if (!jours) return

  emit('apply', {
    mode: 'desaffecter-tache',
    projetId: projetSelectionne.value,
    tache: tacheSelectionnee.value,
    personnesIds: personnesSelectionnees.value,
    jours
  })
  resetForm()
}

/** Ferme la modal sans appliquer de modification */
const fermer = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="fermer">
    <div class="modal-affectation" @click.stop>
      <h2>Affectation en masse - Projets</h2>

      <div class="form-section">
        <h3>Projet</h3>
        <select v-model="projetSelectionne" class="select-projet">
          <option :value="null" disabled>-- Sélectionner un projet --</option>
          <option v-for="projet in projetsStore.projets" :key="projet.id" :value="projet.id">
            {{ projet.nom }}
          </option>
        </select>
      </div>

      <div class="form-section">
        <h3>Tâche</h3>
        <div class="types-list">
          <button
            v-for="t in TACHES_PROJET"
            :key="t"
            @click="tacheSelectionnee = t"
            class="type-button"
            :class="{ 'selected': tacheSelectionnee === t }"
            :style="{
              backgroundColor: tacheSelectionnee === t ? '#388e3c' : 'transparent',
              color: tacheSelectionnee === t ? '#fff' : '#333',
              borderColor: '#388e3c'
            }"
          >
            {{ t }}
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

      <div class="form-actions">
        <button @click="appliquer" class="btn-appliquer">Affecter</button>
        <button @click="desaffecterTache" class="btn-desaffecter">Désaffecter projet + tâche</button>
        <button @click="desaffecterProjet" class="btn-desaffecter">Désaffecter projet (toutes tâches)</button>
        <button @click="fermer" class="btn-annuler">Annuler</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-projet {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-desaffecter {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn-desaffecter:hover {
  background-color: #c82333;
}
</style>
