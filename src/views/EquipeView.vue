<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import Modal from '../components/Modal.vue'
import { exporterEquipeJSON } from '../services/export'

/**
 * Vue de gestion de l'équipe
 * Permet d'ajouter/supprimer des membres
 * Gère l'import/export JSON de l'équipe
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

/** Exporte l'équipe au format JSON via la fonction partagée */
const exporterJSON = () => {
  exporterEquipeJSON(equipeStore.membres)
}

/**
 * Importe une équipe depuis un fichier JSON
 * Remplace l'équipe actuelle par les données du fichier
 * Format attendu : tableau d'objets { id, nom, actif, rolePrincipal, roleSecondaire }
 * @param {Event} event - Événement de changement du input file
 */
const importerJSON = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const donnees = JSON.parse(text)

    if (Array.isArray(donnees) && donnees.length > 0) {
      const membresValides = donnees
        .filter(m => m && m.id && m.nom)
        .map(m => ({
          id: m.id,
          nom: m.nom,
          actif: m.actif !== undefined ? m.actif : true,
          rolePrincipal: m.rolePrincipal || '',
          roleSecondaire: m.roleSecondaire || ''
        }))

      if (membresValides.length > 0) {
        equipeStore.chargerEquipe(membresValides)
        afficherModal(`${membresValides.length} membre(s) chargé(s)`)
      } else {
        afficherModal('Aucune donnée valide trouvée dans le fichier')
      }
    } else {
      afficherModal('Aucune donnée valide trouvée dans le fichier')
    }
  } catch {
    afficherModal('Erreur lors de l\'import : fichier JSON invalide')
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
        <button @click="exporterJSON" class="btn-export">Exporter JSON</button>
        <label class="btn-import">
          Importer JSON
          <input type="file" accept=".json" @change="importerJSON" style="display: none;" />
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
