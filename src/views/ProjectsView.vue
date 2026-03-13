<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjetsStore } from '../stores/projets'
import Modal from '../components/Modal.vue'

/**
 * Vue de gestion des projets (CRUD)
 * Permet de créer, modifier et supprimer des projets
 * Chaque projet a un chiffrage global ventilé par tâche (Spec, Dev, Tests, Retour dev)
 * Affiche un indicateur si la somme des tâches ne correspond pas au chiffrage global
 * Gère l'import/export CSV des projets
 */

const router = useRouter()
const projetsStore = useProjetsStore()

// État de la modal d'information
const nouveauProjet = ref('')
const showModal = ref(false)
const modalMessage = ref('')

/** Affiche une modal avec un message d'information */
const afficherModal = (message) => {
  modalMessage.value = message
  showModal.value = true
}

const fermerModal = () => {
  showModal.value = false
}

/** Ajoute un nouveau projet via le store */
const ajouterProjet = () => {
  if (nouveauProjet.value.trim()) {
    projetsStore.ajouterProjet(nouveauProjet.value)
    nouveauProjet.value = ''
  }
}

/**
 * Calcule la somme des chiffrages détaillés (Spec + Dev + Tests + Retour dev)
 * @param {Object} projet - Objet projet
 * @returns {number} Somme des détails
 */
const sommeDetails = (projet) => (projet.spec || 0) + (projet.dev || 0) + (projet.tests || 0) + (projet.retourDev || 0)

/**
 * Calcule l'écart entre le chiffrage global et la somme des détails
 * Positif = il reste du chiffrage à répartir, Négatif = les détails dépassent le chiffrage
 * @param {Object} projet - Objet projet
 * @returns {number} Écart (chiffrage - sommeDétails)
 */
const ecartChiffrage = (projet) => (projet.chiffrage || 0) - sommeDetails(projet)

/** Vérifie si le chiffrage d'un projet est incohérent (somme détails ≠ chiffrage global) */
const chiffrageInvalide = (projet) => ecartChiffrage(projet) !== 0

/** Supprime un projet après confirmation utilisateur */
const supprimerProjet = (id) => {
  if (confirm('Supprimer ce projet ?')) {
    projetsStore.supprimerProjet(id)
  }
}

/**
 * Exporte la liste des projets au format CSV
 * Format : ID,Nom,Chiffrage,Spec,Dev,Tests,Retour dev
 * Téléchargement automatique avec nom de fichier daté
 */
const exporterCSV = () => {
  const csv = [
    'ID,Nom,Chiffrage,Spec,Dev,Tests,Retour dev',
    ...projetsStore.projets.map(p => `${p.id},"${p.nom}",${p.chiffrage || 0},${p.spec || 0},${p.dev || 0},${p.tests || 0},${p.retourDev || 0}`)
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `projets_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Importe des projets depuis un fichier CSV
 * Remplace la liste actuelle par les données du fichier
 * Supporte 2 formats de parsing : regex (avec guillemets) et split par virgule
 * @param {Event} event - Événement change du champ file
 */
const importerCSV = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const text = await file.text()
  const lignes = text.split('\n').filter(l => l.trim())

  const donnees = lignes.slice(1).map(ligne => {
    const match = ligne.match(/^(\d+),"?([^"]+?)"?,?(\d*),?(\d*),?(\d*),?(\d*),?(\d*)$/)
    if (match) {
      return {
        id: Number.parseInt(match[1]),
        nom: match[2].trim(),
        chiffrage: Number.parseInt(match[3]) || 0,
        spec: Number.parseInt(match[4]) || 0,
        dev: Number.parseInt(match[5]) || 0,
        tests: Number.parseInt(match[6]) || 0,
        retourDev: Number.parseInt(match[7]) || 0
      }
    }
    const parts = ligne.split(',')
    if (parts.length >= 2) {
      return {
        id: Number.parseInt(parts[0]),
        nom: parts[1].replaceAll('"', '').trim(),
        chiffrage: Number.parseInt(parts[2]) || 0,
        spec: Number.parseInt(parts[3]) || 0,
        dev: Number.parseInt(parts[4]) || 0,
        tests: Number.parseInt(parts[5]) || 0,
        retourDev: Number.parseInt(parts[6]) || 0
      }
    }
    return null
  }).filter(p => p && p.id && p.nom)

  if (donnees.length > 0) {
    projetsStore.chargerProjets(donnees)
    afficherModal(`${donnees.length} projet(s) chargé(s)`)
  } else {
    afficherModal('Aucune donnée valide trouvée dans le fichier')
  }
  event.target.value = ''
}
</script>

<template>
  <div class="projets-view">
    <button @click="router.push('/')" class="btn-back">← Retour à l'accueil</button>
    <h1>Gestion des projets</h1>

    <div class="ajout-section">
      <div class="ajout-left">
        <input
          v-model="nouveauProjet"
          type="text"
          placeholder="Nom du projet"
          @keyup.enter="ajouterProjet"
        />
        <button @click="ajouterProjet">Ajouter</button>
      </div>
      <div class="ajout-right">
        <button @click="exporterCSV" class="btn-export">Exporter CSV</button>
        <label class="btn-import">
          Importer CSV
          <input type="file" accept=".csv" @change="importerCSV" style="display: none;" />
        </label>
      </div>
    </div>

    <table v-if="projetsStore.projets.length > 0">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Chiffrage</th>
          <th>Spec</th>
          <th>Dev</th>
          <th>Tests</th>
          <th>Retour dev</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="projet in projetsStore.projets" :key="projet.id" :class="{ 'ligne-erreur': chiffrageInvalide(projet) }">
          <td>{{ projet.nom }}</td>
          <td>
            <input type="number" v-model.number="projet.chiffrage" min="0" class="input-chiffre" :class="{ 'input-erreur': chiffrageInvalide(projet) }" />
            <span v-if="chiffrageInvalide(projet)" :class="ecartChiffrage(projet) <= 0 ? 'erreur-msg-rouge' : 'erreur-msg-vert'" :title="`Attendu : ${sommeDetails(projet)} (écart : ${ecartChiffrage(projet) > 0 ? '+' : ''}${ecartChiffrage(projet)})`">&#9888;</span>
          </td>
          <td><input type="number" v-model.number="projet.spec" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.dev" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.tests" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.retourDev" min="0" class="input-chiffre" /></td>
          <td>
            <button @click="supprimerProjet(projet.id)" class="btn-supprimer">Supprimer</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Aucun projet pour le moment.</p>

    <Modal :show="showModal" :message="modalMessage" @close="fermerModal" />
  </div>
</template>

<style scoped>
.input-chiffre {
  width: 70px;
  text-align: center;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.input-erreur {
  border-color: #e74c3c;
  background-color: #fdecea;
}
.erreur-msg-rouge {
  color: #e74c3c;
  margin-left: 4px;
  cursor: help;
  font-size: 1.1em;
}
.erreur-msg-vert {
  color: #27ae60;
  margin-left: 4px;
  cursor: help;
  font-size: 1.1em;
}
.ligne-erreur {
  background-color: #fdf2f0;
}
</style>
