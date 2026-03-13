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
 * Fichiers : equipe.csv, projets.csv, jours.json, affectations.json
 * @param {number} annee - Année concernée pour les jours et affectations
 */
const exporterPourAgent = (annee) => {
  const equipeCsv = [
    'ID,Nom,Rôle principal,Rôle secondaire',
    ...equipeStore.membresActifs.map(m => `${m.id},"${m.nom}","${m.rolePrincipal || ''}","${m.roleSecondaire || ''}"`)
  ].join('\n')
  telechargerFichier(equipeCsv, 'equipe.csv', 'text/csv;charset=utf-8;')

  const projetsCsv = [
    'ID,Nom,Chiffrage,Spec,Dev,Tests,Retour dev',
    ...projetsStore.projets.map(p => `${p.id},"${p.nom}",${p.chiffrage || 0},${p.spec || 0},${p.dev || 0},${p.tests || 0},${p.retourDev || 0}`)
  ].join('\n')
  telechargerFichier(projetsCsv, 'projets.csv', 'text/csv;charset=utf-8;')

  const joursAnnee = joursStore.jours[annee] ? { [annee]: joursStore.jours[annee] } : {}
  telechargerFichier(JSON.stringify(joursAnnee, null, 2), 'jours.json', 'application/json;charset=utf-8;')

  const affectationsAnnee = affectationsStore.affectations[annee] ? { [annee]: affectationsStore.affectations[annee] } : {}
  telechargerFichier(JSON.stringify(affectationsAnnee, null, 2), 'affectations.json', 'application/json;charset=utf-8;')
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
            <button @click="exporterPourAgent(annee)" style="margin-left: 0.5rem;" class="btn-export" title="Exporte equipe.csv, projets.csv, jours.json et affectations.json">Export agent {{ annee }}</button>
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
