<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import Modal from '../components/Modal.vue'

/**
 * Vue de gestion de l'équipe
 * Permet d'ajouter/supprimer des membres
 * Gère l'import/export CSV de l'équipe
 * Utilise le soft-delete: les membres supprimés sont marqués inactifs
 */

const router = useRouter()
const equipeStore = useEquipeStore()

const nouveauNom = ref('')
const showModal = ref(false)
const modalMessage = ref('')

const afficherModal = (message) => {
  modalMessage.value = message
  showModal.value = true
}

const fermerModal = () => {
  showModal.value = false
}

const roles = ['', 'Mng', 'Spec', 'Dev', 'Tests']

const ajouterPersonne = () => {
  if (nouveauNom.value.trim()) {
    equipeStore.ajouterMembre(nouveauNom.value)
    nouveauNom.value = ''
  }
}

const supprimerPersonne = (id) => {
  equipeStore.supprimerMembre(id)
}

/**
 * Exporte l'équipe au format CSV
 * Format: ID,Nom avec guillemets autour des noms
 * Nom du fichier: equipe_YYYY-MM-DD.csv
 */
const exporterCSV = () => {
const csv = [
    'ID,Nom,Rôle principal,Rôle secondaire',
    ...equipeStore.membres.map(p => `${p.id},"${p.nom}","${p.rolePrincipal || ''}","${p.roleSecondaire || ''}"`)
  ].join('\n')

  // Création du blob et téléchargement automatique
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `equipe_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href) // Libérer la mémoire
}

/**
 * Importe une équipe depuis un fichier CSV
 * Remplace l'équipe actuelle par les données du fichier
 * Format attendu: ID,Nom (avec ou sans guillemets)
 * @param {Event} event - Événement de changement du input file
 */
const importerCSV = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const text = await file.text()
  const lignes = text.split('\n').filter(l => l.trim())

  const donnees = lignes.slice(1).map(ligne => {
    const match = ligne.match(/^(\d+),"?([^"]+?)"?,?"?([^"]*)"?,?"?([^"]*)"?$/)
    if (match) {
      return {
        id: Number.parseInt(match[1]),
        nom: match[2].trim(),
        actif: true,
        rolePrincipal: match[3] ? match[3].trim() : '',
        roleSecondaire: match[4] ? match[4].trim() : ''
      }
    }
    const parts = ligne.split(',')
    if (parts.length >= 2) {
      return {
        id: Number.parseInt(parts[0]),
        nom: parts[1].replaceAll('"', '').trim(),
        actif: true,
        rolePrincipal: parts[2] ? parts[2].replaceAll('"', '').trim() : '',
        roleSecondaire: parts[3] ? parts[3].replaceAll('"', '').trim() : ''
      }
    }
    return null
  }).filter(p => p && p.id && p.nom)

  if (donnees.length > 0) {
    equipeStore.chargerEquipe(donnees)
    afficherModal(`${donnees.length} membre(s) chargé(s)`)
  } else {
    afficherModal('Aucune donnée valide trouvée dans le fichier')
  }
  event.target.value = ''
}
</script>

<template>
  <div class="equipe-view">
    <button @click="router.push('/')" class="btn-back">← Retour à l'accueil</button>
    <h1>Gestion de l'équipe</h1>

    <div class="ajout-section">
      <div class="ajout-left">
        <input
          v-model="nouveauNom"
          type="text"
          placeholder="Nom de la personne"
          @keyup.enter="ajouterPersonne"
        />
        <button @click="ajouterPersonne">Ajouter</button>
      </div>
      <div class="ajout-right">
        <button @click="exporterCSV" class="btn-export">Exporter CSV</button>
        <label class="btn-import">
          Importer CSV
          <input type="file" accept=".csv" @change="importerCSV" style="display: none;" />
        </label>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Rôle principal</th>
          <th>Rôle secondaire</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="personne in equipeStore.membresActifs" :key="personne.id">
          <td>{{ personne.nom }}</td>
          <td>
            <select v-model="personne.rolePrincipal" class="select-role">
              <option v-for="role in roles" :key="role" :value="role">{{ role || '—' }}</option>
            </select>
          </td>
          <td>
            <select v-model="personne.roleSecondaire" class="select-role">
              <option v-for="role in roles" :key="role" :value="role">{{ role || '—' }}</option>
            </select>
          </td>
          <td>
            <button @click="supprimerPersonne(personne.id)" class="btn-supprimer">
              Supprimer
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <Modal :show="showModal" :message="modalMessage" @close="fermerModal" />
  </div>
</template>

<style scoped>
.select-role {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
}
</style>
