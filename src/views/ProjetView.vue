<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import { useProjetsStore } from '../stores/projets'
import { useAffectationsProjetsStore } from '../stores/affectationsProjets'
import { useJoursStore } from '../stores/jours'
import CelluleProjet from '../components/CelluleProjet.vue'
import Modal from '../components/Modal.vue'
import AffectationMasseProjet from '../components/AffectationMasseProjet.vue'
import ModalCompteursProjet from '../components/ModalCompteursProjet.vue'
import { MOIS, NOMS_JOURS } from '../config/constantes'

/**
 * Vue calendrier des affectations projets par année
 * Affiche 12 tableaux (1 par mois) avec les jours en colonnes et les membres en lignes
 * Chaque cellule permet d'affecter un projet + tâche via CelluleProjet
 * Les jours d'absence complète (congés, fériés) sont grisés et non-cliquables
 * Les demi-journées d'absence restent accessibles (comptent pour 0.5 jour)
 * Gère l'import/export JSON et l'affectation en masse via une modal
 */

const router = useRouter()
const equipeStore = useEquipeStore()
const projetsStore = useProjetsStore()
const affectationsStore = useAffectationsProjetsStore()
const joursStore = useJoursStore()

// Année extraite du paramètre de route (ex: /calendrier/2025)
const route = useRoute()
const annee = ref(Number.parseInt(route.params.annee) || new Date().getFullYear())

// États des modals
const showModal = ref(false)
const modalMessage = ref('')
const showAffectation = ref(false)
const showCompteurs = ref(false)

const afficherModal = (message) => {
  modalMessage.value = message
  showModal.value = true
}

const fermerModal = () => {
  showModal.value = false
}

const mois = MOIS
const nomsJours = NOMS_JOURS

/**
 * Calcule le nombre de jours dans un mois (gère les années bissextiles)
 * @param {number} moisIndex - Index du mois (0-11)
 * @returns {number} Nombre de jours (28-31)
 */
const getJoursDansMois = (moisIndex) => {
  return new Date(annee.value, moisIndex + 1, 0).getDate()
}

/**
 * Récupère le nom abrégé du jour de la semaine
 * @param {number} moisIndex - Index du mois (0-11)
 * @param {number} jour - Numéro du jour (1-31)
 * @returns {string} Abréviation ('Lun', 'Mar', etc.)
 */
const getNomJour = (moisIndex, jour) => {
  const date = new Date(annee.value, moisIndex, jour)
  return nomsJours[date.getDay()]
}

/**
 * Vérifie si un jour est un weekend (samedi ou dimanche)
 * @param {number} moisIndex - Index du mois (0-11)
 * @param {number} jour - Numéro du jour (1-31)
 * @returns {boolean} true si samedi ou dimanche
 */
const isWeekend = (moisIndex, jour) => {
  const date = new Date(annee.value, moisIndex, jour)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

/** Génère les listes de jours (1 à N) pour chaque mois de l'année */
const joursParMois = computed(() => {
  return mois.map((_, index) => {
    const nbJours = getJoursDansMois(index)
    return Array.from({ length: nbJours }, (_, i) => i + 1)
  })
})

/**
 * Gère le changement d'affectation projet pour une cellule
 * Si data est null, supprime l'affectation ; sinon, crée/met à jour l'affectation
 */
const handleProjetChange = (personneId, moisIndex, jour, data) => {
  if (data === null) {
    affectationsStore.clearProjetJour(annee.value, personneId, moisIndex, jour)
  } else {
    affectationsStore.setProjetJour(annee.value, personneId, moisIndex, jour, data.projetId, data.tache)
  }
}

const getProjetJour = (personneId, moisIndex, jour) => {
  return affectationsStore.getProjetJour(annee.value, personneId, moisIndex, jour)
}

/**
 * Vérifie si une personne est en absence complète un jour donné
 * (congé plein, férié plein, maladie pleine — mais PAS les demi-journées)
 */
const isAbsence = (personneId, moisIndex, jour) => {
  const typeId = joursStore.getTypeJour(annee.value, personneId, moisIndex, jour)
  return typeId && !typeId.includes('1/2')
}

/**
 * Vérifie si une cellule doit être grisée (non-cliquable)
 * Grisée si weekend OU absence complète
 */
const isJourGrise = (personneId, moisIndex, jour) => {
  return isWeekend(moisIndex, jour) || isAbsence(personneId, moisIndex, jour)
}

/**
 * Exporte les affectations projets au format JSON
 * Téléchargement automatique avec nom de fichier daté
 */
const exporterJSON = () => {
  const json = JSON.stringify(affectationsStore.affectations, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `affectations_projets_${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(link.href)
  afficherModal('Export réussi')
}

/**
 * Importe des affectations projets depuis un fichier JSON
 * Remplace intégralement les affectations existantes
 * @param {Event} event - Événement change du champ file
 */
const importerJSON = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const donnees = JSON.parse(text)
    affectationsStore.affectations = donnees
    afficherModal('Import réussi')
  } catch {
    afficherModal("Erreur lors de l'import : fichier JSON invalide")
  }
  event.target.value = ''
}

const ouvrirAffectation = () => {
  showAffectation.value = true
}

const fermerAffectation = () => {
  showAffectation.value = false
}

/**
 * Applique une affectation en masse depuis la modal AffectationMasseProjet
 * Supporte 3 modes :
 * - 'affecter' : affecte le projet+tâche aux jours non grisés (demi-absences comptent 0.5)
 * - 'desaffecter-projet' : supprime les affectations du projet (toutes tâches)
 * - 'desaffecter-tache' : supprime uniquement si projet ET tâche correspondent
 */
const appliquerAffectation = ({ mode, projetId, tache, personnesIds, jours }) => {
  let count = 0
  personnesIds.forEach(personneId => {
    jours.forEach(({ moisIndex, jour }) => {
      if (mode === 'desaffecter-projet') {
        const affectation = affectationsStore.getProjetJour(annee.value, personneId, moisIndex, jour)
        const pid = affectation?.projetId || affectation
        if (pid === projetId) {
          affectationsStore.clearProjetJour(annee.value, personneId, moisIndex, jour)
          count++
        }
      } else if (mode === 'desaffecter-tache') {
        const affectation = affectationsStore.getProjetJour(annee.value, personneId, moisIndex, jour)
        if (affectation?.projetId === projetId && affectation?.tache === tache) {
          affectationsStore.clearProjetJour(annee.value, personneId, moisIndex, jour)
          count++
        }
      } else if (!isJourGrise(personneId, moisIndex, jour)) {
        affectationsStore.setProjetJour(annee.value, personneId, moisIndex, jour, projetId, tache)
        const typeJour = joursStore.getTypeJour(annee.value, personneId, moisIndex, jour)
        count += (typeJour && typeJour.includes('1/2')) ? 0.5 : 1
      }
    })
  })
  showAffectation.value = false
  const label = mode === 'affecter' ? 'affecté' : 'désaffecté'
  afficherModal(`${count} jour(s) ${label}(s)`)
}

const ouvrirCompteurs = () => {
  showCompteurs.value = true
}

const fermerCompteurs = () => {
  showCompteurs.value = false
}

/**
 * Calcule les compteurs d'affectation projet pour l'année entière
 * Pour chaque personne, compte les jours par projet et par tâche
 * Gère les demi-journées : si une personne a un 1/2CP et un projet, le projet compte 0.5
 * @returns {Object} Structure : { personneId: { projetId: { total, Spec, Dev, ... }, sanProjet: N } }
 */
const compteurs = computed(() => {
  const result = {}

  equipeStore.membresActifs.forEach(personne => {
    result[personne.id] = { sanProjet: 0 }

    for (let moisIndex = 0; moisIndex < 12; moisIndex++) {
      const nbJours = getJoursDansMois(moisIndex)

      for (let jour = 1; jour <= nbJours; jour++) {
        if (isWeekend(moisIndex, jour)) continue

        const typeJour = joursStore.getTypeJour(annee.value, personne.id, moisIndex, jour)
        const affectation = affectationsStore.getProjetJour(annee.value, personne.id, moisIndex, jour)
        const projetId = affectation?.projetId || affectation

        // Absence complète : pas de projet possible
        if (typeJour && !typeJour.includes('1/2')) continue

        // Demi-absence : le projet compte pour 0.5
        const isDemiAbsence = typeJour && typeJour.includes('1/2')
        const increment = isDemiAbsence ? 0.5 : 1

        if (projetId) {
          if (!result[personne.id][projetId]) {
            result[personne.id][projetId] = { total: 0 }
          }
          result[personne.id][projetId].total += increment
          const tache = affectation?.tache || 'sansTache'
          result[personne.id][projetId][tache] = (result[personne.id][projetId][tache] || 0) + increment
        } else if (!isDemiAbsence) {
          result[personne.id].sanProjet += 1
        } else {
          result[personne.id].sanProjet += 0.5
        }
      }
    }
  })

  return result
})

/**
 * Calcule le nombre de jours affectés à un projet pour une personne sur un mois
 * Exclut les weekends et les absences complètes
 * Les demi-absences comptent pour 0.5 jour
 * @param {number} personneId - ID de la personne
 * @param {number} moisIndex - Index du mois (0-11)
 * @returns {number} Nombre de jours affectés (peut être décimal)
 */
const getPresenceMois = (personneId, moisIndex) => {
  let count = 0
  const nbJours = getJoursDansMois(moisIndex)

  for (let jour = 1; jour <= nbJours; jour++) {
    if (isWeekend(moisIndex, jour)) continue
    const typeJour = joursStore.getTypeJour(annee.value, personneId, moisIndex, jour)
    if (typeJour && !typeJour.includes('1/2')) continue

    const affectation = affectationsStore.getProjetJour(annee.value, personneId, moisIndex, jour)
    const projetId = affectation?.projetId || affectation
    if (projetId) {
      count += typeJour && typeJour.includes('1/2') ? 0.5 : 1
    }
  }

  return count
}
</script>

<template>
  <div class="annee-view">
    <button @click="router.push('/')" class="btn-back">← Retour à l'accueil</button>
    <h1>Projets {{ annee }}</h1>

    <div class="actions-section">
      <div class="actions-left">
        <button @click="ouvrirAffectation" class="btn-affectation">Affectation en masse</button>
        <button @click="ouvrirCompteurs" class="btn-compteurs">Compteurs</button>
      </div>
      <div class="actions-right">
        <button @click="exporterJSON" class="btn-export">Exporter (JSON)</button>
        <label class="btn-import">
          Importer (JSON)
          <input type="file" accept=".json" @change="importerJSON" style="display: none;" />
        </label>
      </div>
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
            <th class="presence-colonne">Jours affectés</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="personne in equipeStore.membresActifs" :key="personne.id">
            <td class="nom-colonne">{{ personne.nom }}</td>
            <td v-for="jour in joursParMois[moisIndex]" :key="jour"
                :class="['jour-cell', { 'weekend': isWeekend(moisIndex, jour), 'jour-absence': isJourGrise(personne.id, moisIndex, jour) }]">
              <CelluleProjet
                :affectation="getProjetJour(personne.id, moisIndex, jour)"
                :disabled="isJourGrise(personne.id, moisIndex, jour)"
                @change="(data) => handleProjetChange(personne.id, moisIndex, jour, data)"
              />
            </td>
            <td class="presence-colonne">{{ getPresenceMois(personne.id, moisIndex) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="showModal" :message="modalMessage" @close="fermerModal" />
    <AffectationMasseProjet
      :show="showAffectation"
      :annee="annee"
      :personnes="equipeStore.membresActifs"
      @close="fermerAffectation"
      @apply="appliquerAffectation"
    />
    <ModalCompteursProjet
      :show="showCompteurs"
      :personnes="equipeStore.membresActifs"
      :compteurs="compteurs"
      @close="fermerCompteurs"
    />
  </div>
</template>

<style scoped>
.jour-absence {
  background-color: #e0e0e0 !important;
  opacity: 0.6;
}
</style>
