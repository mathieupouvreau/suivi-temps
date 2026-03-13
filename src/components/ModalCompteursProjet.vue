<script setup>
import { computed, ref } from 'vue'
import { useProjetsStore } from '../stores/projets'
import { TACHES_PROJET } from '../stores/affectationsProjets'

/**
 * Modal affichant les compteurs de jours affectés par projet et par personne
 * Tableau croisé avec les personnes en lignes et les projets en colonnes
 * Chaque projet est dépliable pour afficher le détail par tâche (Spec, Dev, Tests, Retour dev)
 * Affiche également une ligne "Chiffrage" pour comparer le réalisé au prévu
 */

const props = defineProps({
  show: Boolean,         // Visibilité de la modal
  personnes: Array,      // Liste des personnes actives
  compteurs: Object      // Compteurs pré-calculés : { personneId: { projetId: { total, Spec, Dev, ... }, sanProjet } }
})

const emit = defineEmits(['close'])

const projetsStore = useProjetsStore()

/** Ferme la modal */
const fermer = () => {
  emit('close')
}

/** État de dépliage de chaque projet (clé = projetId, valeur = booléen) */
const projetsDepliees = ref({})

/** Bascule l'état déplié/replié d'un projet dans le tableau */
const toggleProjet = (projetId) => {
  projetsDepliees.value[projetId] = !projetsDepliees.value[projetId]
}

/** Vérifie si un projet est actuellement déplié */
const isDeplie = (projetId) => {
  return !!projetsDepliees.value[projetId]
}

/**
 * Récupère le total de jours affectés à un projet pour une personne
 * @param {number} personneId - ID de la personne
 * @param {number} projetId - ID du projet
 * @returns {number} Nombre total de jours (peut être décimal pour les demi-journées)
 */
const getProjetTotal = (personneId, projetId) => {
  return props.compteurs[personneId]?.[projetId]?.total || 0
}

/**
 * Récupère le nombre de jours d'une tâche spécifique pour un projet et une personne
 * @param {number} personneId - ID de la personne
 * @param {number} projetId - ID du projet
 * @param {string} tache - Type de tâche ('Spec', 'Dev', etc.)
 * @returns {number} Nombre de jours
 */
const getProjetTache = (personneId, projetId, tache) => {
  return props.compteurs[personneId]?.[projetId]?.[tache] || 0
}

/**
 * Calcule les totaux par projet (somme de toutes les personnes)
 * Utilisé pour la ligne "Total" en bas du tableau
 * @returns {Object} { projetId: { total, Spec, Dev, ... }, sanProjet: N }
 */
const totauxParProjet = computed(() => {
  const totaux = { sanProjet: 0 }
  projetsStore.projets.forEach(p => {
    totaux[p.id] = { total: 0 }
    TACHES_PROJET.forEach(t => { totaux[p.id][t] = 0 })
  })

  Object.values(props.compteurs || {}).forEach(compteurPersonne => {
    Object.entries(compteurPersonne).forEach(([key, value]) => {
      if (key === 'sanProjet') {
        totaux.sanProjet += value
      } else if (totaux[key]) {
        totaux[key].total += (value.total || 0)
        TACHES_PROJET.forEach(t => {
          totaux[key][t] += (value[t] || 0)
        })
      }
    })
  })

  return totaux
})

/** Total des jours affectés (tous projets) pour une personne */
const getTotalJoursProjetsPersonne = (personneId) => {
  return projetsStore.projets.reduce((sum, projet) => {
    return sum + getProjetTotal(personneId, projet.id)
  }, 0)
}

/** Total global des jours affectés (toutes personnes, tous projets) */
const totalGlobalJoursProjets = computed(() => {
  return projetsStore.projets.reduce((sum, projet) => {
    return sum + (totauxParProjet.value[projet.id]?.total || 0)
  }, 0)
})

/** Total global d'une tâche donnée sur tous les projets */
const totalGlobalTache = (tache) => {
  return projetsStore.projets.reduce((sum, projet) => {
    return sum + (totauxParProjet.value[projet.id]?.[tache] || 0)
  }, 0)
}

/** Total d'une tâche donnée pour une personne sur tous les projets */
const getTotalTachePersonne = (personneId, tache) => {
  return projetsStore.projets.reduce((sum, projet) => {
    return sum + getProjetTache(personneId, projet.id, tache)
  }, 0)
}

/** Correspondance entre les noms de tâches et les propriétés du modèle projet */
const chiffrageParTache = { Spec: 'spec', Dev: 'dev', Tests: 'tests', 'Retour dev': 'retourDev' }

/** Récupère le chiffrage prévu pour une tâche d'un projet */
const getChiffrageTache = (projet, tache) => {
  return projet[chiffrageParTache[tache]] || 0
}

/** Somme de tous les chiffrages de tous les projets */
const totalChiffrage = computed(() => {
  return projetsStore.projets.reduce((sum, p) => sum + (p.chiffrage || 0), 0)
})

/**
 * Formate les nombres pour l'affichage
 * Entiers : affiche sans décimale (10), Décimaux : affiche avec 1 décimale (10.5)
 */
const formatNumber = (value) => {
  if (value === 0) return 0
  return value % 1 === 0 ? value : value.toFixed(1)
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="fermer">
    <div class="modal-compteurs" @click.stop>
      <div class="modal-header">
        <h2>Compteurs projets</h2>
        <button @click="fermer" class="btn-close">✕</button>
      </div>

      <div class="modal-body">
        <table class="table-compteurs">
          <thead>
            <tr>
              <th>Personne</th>
              <template v-for="projet in projetsStore.projets" :key="projet.id">
                <th class="projet-header" @click="toggleProjet(projet.id)">
                  <span class="toggle-icon">{{ isDeplie(projet.id) ? '▼' : '▶' }}</span>
                  {{ projet.nom }}
                </th>
                <template v-if="isDeplie(projet.id)">
                  <th v-for="tache in TACHES_PROJET" :key="projet.id + '-' + tache" class="tache-header">
                    {{ tache }}
                  </th>
                </template>
              </template>
              <th>Total affecté</th>
              <th>Jours sans projet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="personne in personnes" :key="personne.id">
              <td class="nom-personne">{{ personne.nom }}</td>
              <template v-for="projet in projetsStore.projets" :key="projet.id">
                <td class="compteur-cell">
                  {{ formatNumber(getProjetTotal(personne.id, projet.id)) }}
                </td>
                <template v-if="isDeplie(projet.id)">
                  <td v-for="tache in TACHES_PROJET" :key="projet.id + '-' + tache" class="compteur-cell tache-cell">
                    {{ formatNumber(getProjetTache(personne.id, projet.id, tache)) }}
                  </td>
                </template>
              </template>
              <td class="total-cell">
                {{ formatNumber(getTotalJoursProjetsPersonne(personne.id)) }}
              </td>
              <td class="compteur-cell sans-type-cell">
                {{ formatNumber(compteurs[personne.id]?.sanProjet || 0) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="nom-personne"><strong>Total</strong></td>
              <template v-for="projet in projetsStore.projets" :key="projet.id">
                <td class="compteur-cell">
                  <strong>{{ formatNumber(totauxParProjet[projet.id]?.total || 0) }}</strong>
                </td>
                <template v-if="isDeplie(projet.id)">
                  <td v-for="tache in TACHES_PROJET" :key="projet.id + '-' + tache" class="compteur-cell tache-cell">
                    <strong>{{ formatNumber(totauxParProjet[projet.id]?.[tache] || 0) }}</strong>
                  </td>
                </template>
              </template>
              <td class="total-cell">
                <strong>{{ formatNumber(totalGlobalJoursProjets) }}</strong>
              </td>
              <td class="compteur-cell sans-type-cell">
                <strong>{{ formatNumber(totauxParProjet.sanProjet) }}</strong>
              </td>
            </tr>
            <tr>
              <td class="nom-personne"><strong>Chiffrage</strong></td>
              <template v-for="projet in projetsStore.projets" :key="'chiffrage-' + projet.id">
                <td class="compteur-cell chiffrage-cell">
                  {{ formatNumber(projet.chiffrage || 0) }}
                </td>
                <template v-if="isDeplie(projet.id)">
                  <td v-for="tache in TACHES_PROJET" :key="'chiffrage-' + projet.id + '-' + tache" class="compteur-cell tache-cell chiffrage-cell">
                    {{ formatNumber(getChiffrageTache(projet, tache)) }}
                  </td>
                </template>
              </template>
              <td class="total-cell chiffrage-cell">
                {{ formatNumber(totalChiffrage) }}
              </td>
              <td class="compteur-cell sans-type-cell"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="modal-footer">
        <button @click="fermer" class="btn-fermer">Fermer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projet-header {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.projet-header:hover {
  background-color: #e9ecef;
}

.toggle-icon {
  font-size: 0.7rem;
  margin-right: 0.25rem;
}

.tache-header {
  font-size: 0.8rem;
  font-weight: 500;
  background-color: #eef2f7;
  color: #495057;
}

.tache-cell {
  font-size: 0.85rem;
  background-color: #f8fafc;
  color: #495057;
}

.chiffrage-cell {
  background-color: #e8f4fd;
  color: #0c5460;
  font-style: italic;
}
</style>
