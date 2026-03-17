<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnneesStore } from '../stores/annees'
import { useEquipeStore } from '../stores/equipe'
import { useProjetsStore } from '../stores/projets'
import { useJoursStore } from '../stores/jours'
import { useAffectationsProjetsStore } from '../stores/affectationsProjets'

/**
 * Vue d'accueil de l'application
 * Affiche la liste des années disponibles et permet de :
 * - Ajouter une nouvelle année
 * - Supprimer une année (avec confirmation)
 * - Accéder à la vue détaillée d'une année
 * - Naviguer vers la gestion de l'équipe
 * - Consulter les types de jours
 * - Exporter les données pour l'agent d'affectation
 */

const router = useRouter()
const anneesStore = useAnneesStore()
const equipeStore = useEquipeStore()
const projetsStore = useProjetsStore()
const joursStore = useJoursStore()
const affectationsStore = useAffectationsProjetsStore()
const nouvelleAnnee = ref('')  // Input pour ajouter une année

/**
 * Navigue vers la vue détaillée d'une année
 * @param {number} annee - Année à afficher (ex: 2025)
 */
const voirAnnee = (annee) => {
  router.push(`/annee/${annee}`)
}

const voirCalendrier = (annee) => {
  router.push(`/calendrier/${annee}`)
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

/**
 * Télécharge un fichier avec le contenu et le nom donnés
 * @param {string} contenu - Contenu du fichier
 * @param {string} nomFichier - Nom du fichier à télécharger
 * @param {string} type - Type MIME du fichier
 */
const telechargerFichier = (contenu, nomFichier, type) => {
  const blob = new Blob([contenu], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = nomFichier
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Exporte les 4 fichiers de données pour l'agent d'affectation
 * Utilise les mêmes formats que les exports des écrans spécifiques
 * Fichiers : equipe.csv, projets.csv, jours.json, affectations.json
 */
const exporterPourAgent = () => {
  // Équipe — même format que EquipeView.exporterCSV (tous les membres)
  const equipeCsv = [
    'ID,Nom,Rôle principal,Rôle secondaire',
    ...equipeStore.membres.map(m => `${m.id},"${m.nom}","${m.rolePrincipal || ''}","${m.roleSecondaire || ''}"`)
  ].join('\n')
  telechargerFichier(equipeCsv, 'equipe.csv', 'text/csv;charset=utf-8;')

  // Projets — même format que ProjectsView.exporterCSV (avec colonnes Pers.)
  const projetsCsv = [
    'ID,Nom,Chiffrage,Spec,Spec Pers.,Dev,Dev Pers.,Tests,Tests Pers.,Retour dev,Retour dev Pers.',
    ...projetsStore.projets.map(p => `${p.id},"${p.nom}",${p.chiffrage || 0},${p.spec || 0},${p.specPersonnes || 1},${p.dev || 0},${p.devPersonnes || 1},${p.tests || 0},${p.testsPersonnes || 1},${p.retourDev || 0},${p.retourDevPersonnes || 1}`)
  ].join('\n')
  telechargerFichier(projetsCsv, 'projets.csv', 'text/csv;charset=utf-8;')

  // Jours — même format que HolidaysView.exporterJSON (toutes les années)
  telechargerFichier(JSON.stringify(joursStore.jours, null, 2), 'jours.json', 'application/json;charset=utf-8;')

  // Affectations — même format que ProjetView.exporterJSON (toutes les années)
  telechargerFichier(JSON.stringify(affectationsStore.affectations, null, 2), 'affectations.json', 'application/json;charset=utf-8;')
}
</script>

<template>
  <div>
    <h1>Suivi du temps de l'équipe</h1>

    <div style="margin-bottom: 1rem; display: flex; gap: 1rem;">
      <button @click="router.push('/equipe')">Gérer l'équipe</button>
      <button @click="router.push('/projets')">Projets</button>
      <button @click="router.push('/types-jours')">Types de jours</button>
      <input
        v-model="nouvelleAnnee"
        type="number"
        placeholder="Nouvelle année"
        @keyup.enter="ajouterAnnee"
        style="padding: 0.5rem; width: 10rem;"
      />
      <button @click="ajouterAnnee">Ajouter année</button>
      <button @click="exporterPourAgent" class="btn-export" title="Exporte equipe.csv, projets.csv, jours.json et affectations.json">Export agent</button>
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
            <button @click="voirAnnee(annee)">Congés {{ annee }}</button>
            <button @click="voirCalendrier(annee)" style="margin-left: 0.5rem;">Projets {{ annee }}</button>
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
