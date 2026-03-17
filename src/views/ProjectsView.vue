<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjetsStore } from '../stores/projets'
import Modal from '../components/Modal.vue'
import { exporterProjetsJSON } from '../services/export'

/**
 * Vue de gestion des projets (CRUD)
 * Permet de créer, modifier et supprimer des projets
 * Chaque projet a un chiffrage global ventilé par tâche (Spec, Dev, Tests, Retour dev)
 * Affiche un indicateur si la somme des tâches ne correspond pas au chiffrage global
 * Gère l'import/export JSON des projets
 */

const router = useRouter()
const projetsStore = useProjetsStore()

// État de la modal d'information
const nouveauProjet = ref('')
const filtreRecherche = ref('')
const showModal = ref(false)
const modalMessage = ref('')

/** Liste des projets filtrée par le champ de recherche */
const projetsFiltres = computed(() => {
  const terme = filtreRecherche.value.trim().toLowerCase()
  if (!terme) return projetsStore.projets
  return projetsStore.projets.filter(p => p.nom.toLowerCase().includes(terme))
})

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

/** Exporte les projets au format JSON via la fonction partagée */
const exporterJSON = () => {
  exporterProjetsJSON(projetsStore.projets)
}

/**
 * Importe des projets depuis un fichier JSON
 * Remplace la liste actuelle par les données du fichier
 * Format attendu : tableau d'objets { id, nom, chiffrage, spec, dev, tests, retourDev, ... }
 * @param {Event} event - Événement change du champ file
 */
const importerJSON = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const donnees = JSON.parse(text)

    if (Array.isArray(donnees) && donnees.length > 0) {
      const projetsValides = donnees
        .filter(p => p && p.id && p.nom)
        .map(p => ({
          id: p.id,
          nom: p.nom,
          chiffrage: p.chiffrage || 0,
          spec: p.spec || 0,
          specPersonnes: p.specPersonnes || 1,
          dev: p.dev || 0,
          devPersonnes: p.devPersonnes || 1,
          tests: p.tests || 0,
          testsPersonnes: p.testsPersonnes || 1,
          retourDev: p.retourDev || 0,
          retourDevPersonnes: p.retourDevPersonnes || 1
        }))

      if (projetsValides.length > 0) {
        projetsStore.chargerProjets(projetsValides)
        afficherModal(`${projetsValides.length} projet(s) chargé(s)`)
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
        <button @click="exporterJSON" class="btn-export">Exporter JSON</button>
        <label class="btn-import">
          Importer JSON
          <input type="file" accept=".json" @change="importerJSON" style="display: none;" />
        </label>
      </div>
    </div>

    <div v-if="projetsStore.projets.length > 0" class="filtre-section">
      <input
        v-model="filtreRecherche"
        type="text"
        placeholder="🔍 Filtrer les projets par nom..."
        class="input-filtre"
      />
      <span class="filtre-compteur">{{ projetsFiltres.length }} / {{ projetsStore.projets.length }} projet(s)</span>
    </div>

    <table v-if="projetsFiltres.length > 0">
      <thead>
        <tr>
          <th scope="col" rowspan="2">Nom</th>
          <th scope="col" rowspan="2">Chiffrage</th>
          <th scope="colgroup" colspan="2">Spec</th>
          <th scope="colgroup" colspan="2">Dev</th>
          <th scope="colgroup" colspan="2">Tests</th>
          <th scope="colgroup" colspan="2">Retour dev</th>
          <th scope="col" rowspan="2">Actions</th>
        </tr>
        <tr>
          <th scope="col">Jours</th>
          <th scope="col">Pers.</th>
          <th scope="col">Jours</th>
          <th scope="col">Pers.</th>
          <th scope="col">Jours</th>
          <th scope="col">Pers.</th>
          <th scope="col">Jours</th>
          <th scope="col">Pers.</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="projet in projetsFiltres" :key="projet.id" :class="{ 'ligne-erreur': chiffrageInvalide(projet) }">
          <td>{{ projet.nom }}</td>
          <td>
            <input type="number" v-model.number="projet.chiffrage" min="0" class="input-chiffre" :class="{ 'input-erreur': chiffrageInvalide(projet) }" />
            <span v-if="chiffrageInvalide(projet)" :class="ecartChiffrage(projet) <= 0 ? 'erreur-msg-rouge' : 'erreur-msg-vert'" :title="`Attendu : ${sommeDetails(projet)} (écart : ${ecartChiffrage(projet) > 0 ? '+' : ''}${ecartChiffrage(projet)})`">&#9888;</span>
          </td>
          <td><input type="number" v-model.number="projet.spec" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.specPersonnes" min="1" class="input-chiffre input-personnes" /></td>
          <td><input type="number" v-model.number="projet.dev" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.devPersonnes" min="1" class="input-chiffre input-personnes" /></td>
          <td><input type="number" v-model.number="projet.tests" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.testsPersonnes" min="1" class="input-chiffre input-personnes" /></td>
          <td><input type="number" v-model.number="projet.retourDev" min="0" class="input-chiffre" /></td>
          <td><input type="number" v-model.number="projet.retourDevPersonnes" min="1" class="input-chiffre input-personnes" /></td>
          <td>
            <button @click="supprimerProjet(projet.id)" class="btn-supprimer">Supprimer</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="projetsStore.projets.length === 0">Aucun projet pour le moment.</p>
    <p v-else>Aucun projet ne correspond au filtre.</p>

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
.input-personnes {
  width: 50px;
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
.filtre-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.input-filtre {
  flex: 1;
  max-width: 350px;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.95em;
}
.input-filtre:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}
.filtre-compteur {
  color: #888;
  font-size: 0.9em;
}
</style>
