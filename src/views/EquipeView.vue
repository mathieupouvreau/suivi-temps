<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import Modal from '../components/Modal.vue'

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

const ajouterPersonne = () => {
  if (nouveauNom.value.trim()) {
    equipeStore.ajouterMembre(nouveauNom.value)
    nouveauNom.value = ''
  }
}

const supprimerPersonne = (id) => {
  equipeStore.supprimerMembre(id)
}

const exporterCSV = () => {
  // Création du contenu CSV
  const csv = [
    'ID,Nom',
    ...equipeStore.membres.map(p => `${p.id},"${p.nom}"`)
  ].join('\n')

  // Création du blob et téléchargement
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `equipe_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const importerCSV = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lignes = text.split('\n').filter(l => l.trim())

    // Ignorer la première ligne (en-tête)
    const donnees = lignes.slice(1).map(ligne => {
      // Gestion des CSV avec guillemets
      const match = ligne.match(/^(\d+),\"?([^\"]+)\"?$/)
      if (match) {
        return {
          id: parseInt(match[1]),
          nom: match[2].trim(),
          actif: true
        }
      }
      // Fallback simple
      const parts = ligne.split(',')
      if (parts.length >= 2) {
        return {
          id: parseInt(parts[0]),
          nom: parts.slice(1).join(',').replace(/"/g, '').trim(),
          actif: true
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
  }
  reader.readAsText(file)
  // Réinitialiser l'input pour permettre de recharger le même fichier
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
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="personne in equipeStore.membresActifs" :key="personne.id">
          <td>{{ personne.nom }}</td>
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
</style>
