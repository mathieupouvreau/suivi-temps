<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipeStore } from '../stores/equipe'
import { useProjetsStore } from '../stores/projets'
import { useJoursStore } from '../stores/jours'
import { useAffectationsProjetsStore } from '../stores/affectationsProjets'
import {
  diagnostiquer,
  genererAffectations,
  fusionnerAffectations,
  calculerDisponibilite
} from '../services/affectationsAuto'

/**
 * Vue d'affectation automatique des personnes aux projets
 * Wizard en 5 étapes :
 *   1. Diagnostic — vue d'ensemble des projets et tâches à planifier
 *   2. Dates — saisie des dates de début/fin par projet
 *   3. Préférences — choix des personnes préférées par tâche
 *   4. Vérification — revue du plan généré avant application
 *   5. Application — écriture dans le store
 */

const router = useRouter()
const equipeStore = useEquipeStore()
const projetsStore = useProjetsStore()
const joursStore = useJoursStore()
const affectationsStore = useAffectationsProjetsStore()

// ── État du wizard ──

/** Étape courante (1 à 5) */
const etape = ref(1)

/** Résultat du diagnostic (étape 1) */
const diagnostic = ref(null)

/** Mode dates : 'communes' ou 'separees' */
const modeDates = ref('communes')

/** Dates communes à tous les projets */
const dateDebutCommune = ref('')
const dateFinCommune = ref('')

/** Dates par projet : { projetId: { debut: '', fin: '' } } */
const datesParProjet = ref({})

/** Préférences par projet/tâche : { projetId: { tache: [nomPersonne, ...] } } */
const preferences = ref({})

/** Résultat de la génération (étape 4) */
const resultat = ref(null)

/** Message de confirmation (étape 5) */
const applicationTerminee = ref(false)

// ── Étape 1 : Diagnostic ──

/** Lance le diagnostic à l'ouverture de la page */
function lancerDiagnostic() {
  const membresActifs = equipeStore.membres.filter(m => m.actif !== false)
  diagnostic.value = diagnostiquer(
    membresActifs,
    projetsStore.projets,
    joursStore.jours,
    affectationsStore.affectations
  )

  // Initialiser les dates et préférences pour chaque projet
  for (const p of diagnostic.value.projetsAPlanifier) {
    datesParProjet.value[p.projetId] = { debut: '', fin: '' }
    preferences.value[p.projetId] = {}
    for (const t of p.tachesAPlanifier) {
      preferences.value[p.projetId][t.tache] = []
    }
  }
}

// Lancer immédiatement
lancerDiagnostic()

// ── Étape 2 : Dates ──

/** Validation des dates (toutes remplies et cohérentes) */
const datesValides = computed(() => {
  if (!diagnostic.value) return false
  for (const p of diagnostic.value.projetsAPlanifier) {
    const d = modeDates.value === 'communes'
      ? { debut: dateDebutCommune.value, fin: dateFinCommune.value }
      : datesParProjet.value[p.projetId]
    if (!d || !d.debut || !d.fin) return false
    if (new Date(d.fin) < new Date(d.debut)) return false
  }
  return true
})

// ── Étape 3 : Préférences ──

/**
 * Membres éligibles pour une tâche donnée, triés par pertinence de rôle
 * @param {string} nomTache
 * @returns {Array<{id, nom, role}>}
 */
function membresEligibles(nomTache) {
  const roleRecherche = { 'Spec': 'Spec', 'Dev': 'Dev', 'Tests': 'Tests', 'Retour dev': 'Dev' }[nomTache]
  if (!diagnostic.value) return []

  const result = []
  const added = new Set()

  // Rôle principal d'abord
  for (const m of diagnostic.value.equipeDispo) {
    if (m.rolePrincipal === roleRecherche && !added.has(m.id)) {
      result.push({ ...m, role: `Rôle principal : ${m.rolePrincipal}` })
      added.add(m.id)
    }
  }
  // Rôle secondaire ensuite
  for (const m of diagnostic.value.equipeDispo) {
    if (m.roleSecondaire === roleRecherche && !added.has(m.id)) {
      result.push({ ...m, role: `Rôle secondaire : ${m.roleSecondaire}` })
      added.add(m.id)
    }
  }
  // Tous les autres
  for (const m of diagnostic.value.equipeDispo) {
    if (!added.has(m.id)) {
      result.push({ ...m, role: 'Autre' })
      added.add(m.id)
    }
  }

  return result
}

/**
 * Calcule la disponibilité d'un membre pour un projet donné
 * @param {number} membreId
 * @param {number} projetId
 * @returns {number} jours ouvrés disponibles
 */
function dispoMembre(membreId, projetId) {
  const d = modeDates.value === 'communes'
    ? { debut: dateDebutCommune.value, fin: dateFinCommune.value }
    : datesParProjet.value[projetId]
  if (!d || !d.debut || !d.fin) return 0
  return calculerDisponibilite(
    membreId,
    new Date(d.debut),
    new Date(d.fin),
    joursStore.jours,
    affectationsStore.affectations
  )
}

/**
 * Bascule la sélection d'un membre pour une tâche
 * @param {number} projetId
 * @param {string} tache
 * @param {string} nomMembre
 */
function togglePreference(projetId, tache, nomMembre) {
  const prefs = preferences.value[projetId][tache]
  const idx = prefs.indexOf(nomMembre)
  if (idx >= 0) {
    prefs.splice(idx, 1)
  } else {
    prefs.push(nomMembre)
  }
}

// ── Étape 4 : Génération et vérification ──

/** Lance la génération des affectations */
function generer() {
  const membresActifs = equipeStore.membres.filter(m => m.actif !== false)

  // Construire les projets à planifier avec dates et préférences
  const projetsAvecDates = diagnostic.value.projetsAPlanifier.map(p => {
    const d = modeDates.value === 'communes'
      ? { debut: dateDebutCommune.value, fin: dateFinCommune.value }
      : datesParProjet.value[p.projetId]

    // Convertir les dates YYYY-MM-DD → JJ/MM/AAAA
    const [aD, mD, jD] = d.debut.split('-')
    const [aF, mF, jF] = d.fin.split('-')

    return {
      ...p,
      dateDebut: `${jD}/${mD}/${aD}`,
      dateFin: `${jF}/${mF}/${aF}`,
      tachesAPlanifier: p.tachesAPlanifier.map(t => ({
        ...t,
        preferences: preferences.value[p.projetId]?.[t.tache] || []
      }))
    }
  })

  resultat.value = genererAffectations(
    membresActifs,
    projetsStore.projets,
    joursStore.jours,
    affectationsStore.affectations,
    projetsAvecDates
  )

  etape.value = 4
}

// ── Étape 5 : Application ──

/** Applique les affectations dans le store */
function appliquer() {
  if (!resultat.value) return

  const merged = fusionnerAffectations(
    affectationsStore.affectations,
    resultat.value.nouvellesAffectations
  )
  affectationsStore.affectations = merged
  applicationTerminee.value = true
  etape.value = 5
}

/** Retour à la page d'accueil */
function retourAccueil() {
  router.push('/')
}
</script>

<template>
  <div class="affectations-auto-view">
    <button class="btn-back" @click="retourAccueil">← Retour</button>
    <h1>Affectation automatique</h1>

    <!-- Indicateur d'étapes -->
    <div class="wizard-steps">
      <div
        v-for="(label, i) in ['Diagnostic', 'Dates', 'Préférences', 'Vérification', 'Application']"
        :key="i"
        :class="['wizard-step', { active: etape === i + 1, done: etape > i + 1 }]"
      >
        <span class="step-number">{{ i + 1 }}</span>
        <span class="step-label">{{ label }}</span>
      </div>
    </div>

    <!-- ═══ ÉTAPE 1 : Diagnostic ═══ -->
    <div v-if="etape === 1 && diagnostic">
      <h2>Diagnostic</h2>

      <div v-if="diagnostic.projetsAPlanifier.length === 0" class="alert-info">
        Aucun projet à planifier. Toutes les tâches sont déjà affectées ou les chiffrages sont à 0.
      </div>

      <div v-else>
        <h3>Projets à planifier</h3>
        <table class="table-diagnostic">
          <thead>
            <tr>
              <th>Projet</th>
              <th>Tâches à planifier</th>
              <th>Chiffrage restant</th>
              <th>Tâches déjà planifiées</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in diagnostic.projetsAPlanifier" :key="p.projetId">
              <td>{{ p.nom }}</td>
              <td>
                <span
                  v-for="t in p.tachesAPlanifier"
                  :key="t.tache"
                  class="badge-tache"
                >
                  {{ t.tache }} ({{ t.chiffrage }}j)
                </span>
              </td>
              <td class="text-center">
                {{ p.tachesAPlanifier.reduce((s, t) => s + t.chiffrage, 0) }}j
              </td>
              <td>
                <span v-if="p.tachesDejaPlanifiees.length > 0">
                  {{ p.tachesDejaPlanifiees.join(', ') }}
                </span>
                <span v-else class="text-muted">Aucune</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="diagnostic.projetsIgnores.length > 0" style="margin-top: 1.5rem;">
          <h3>Projets ignorés</h3>
          <table class="table-diagnostic">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Raison</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in diagnostic.projetsIgnores" :key="p.nom">
                <td>{{ p.nom }}</td>
                <td>{{ p.raison }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style="margin-top: 1.5rem;">Équipe disponible</h3>
        <table class="table-diagnostic">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle principal</th>
              <th>Rôle secondaire</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in diagnostic.equipeDispo" :key="m.id">
              <td>{{ m.nom }}</td>
              <td>{{ m.rolePrincipal || '—' }}</td>
              <td>{{ m.roleSecondaire || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="wizard-actions">
          <button class="btn-next" @click="etape = 2">Suivant →</button>
        </div>
      </div>
    </div>

    <!-- ═══ ÉTAPE 2 : Dates ═══ -->
    <div v-if="etape === 2 && diagnostic">
      <h2>Dates de planification</h2>

      <div class="mode-dates">
        <label class="radio-label">
          <input type="radio" v-model="modeDates" value="communes" />
          Mêmes dates pour tous les projets
        </label>
        <label class="radio-label">
          <input type="radio" v-model="modeDates" value="separees" />
          Dates différentes par projet
        </label>
      </div>

      <!-- Dates communes -->
      <div v-if="modeDates === 'communes'" class="dates-form">
        <div class="date-row">
          <label for="date-debut-commune">Date de début :</label>
          <input id="date-debut-commune" type="date" v-model="dateDebutCommune" />
        </div>
        <div class="date-row">
          <label for="date-fin-commune">Date de fin :</label>
          <input id="date-fin-commune" type="date" v-model="dateFinCommune" />
        </div>
      </div>

      <!-- Dates par projet -->
      <div v-else class="dates-form">
        <div
          v-for="p in diagnostic.projetsAPlanifier"
          :key="p.projetId"
          class="projet-dates"
        >
          <h4>{{ p.nom }}</h4>
          <div class="date-row-inline">
            <div class="date-row">
              <label :for="'date-debut-' + p.projetId">Début :</label>
              <input :id="'date-debut-' + p.projetId" type="date" v-model="datesParProjet[p.projetId].debut" />
            </div>
            <div class="date-row">
              <label :for="'date-fin-' + p.projetId">Fin :</label>
              <input :id="'date-fin-' + p.projetId" type="date" v-model="datesParProjet[p.projetId].fin" />
            </div>
          </div>
        </div>
      </div>

      <div class="wizard-actions">
        <button class="btn-prev" @click="etape = 1">← Précédent</button>
        <button class="btn-next" :disabled="!datesValides" @click="etape = 3">Suivant →</button>
      </div>
    </div>

    <!-- ═══ ÉTAPE 3 : Préférences ═══ -->
    <div v-if="etape === 3 && diagnostic">
      <h2>Préférences de personnes</h2>
      <p class="text-muted">Optionnel — sélectionnez les personnes préférées pour chaque tâche, ou passez directement à la génération.</p>

      <div
        v-for="p in diagnostic.projetsAPlanifier"
        :key="p.projetId"
        class="projet-prefs"
      >
        <h3>{{ p.nom }}</h3>
        <div
          v-for="t in p.tachesAPlanifier"
          :key="t.tache"
          class="tache-prefs"
        >
          <h4>{{ t.tache }} ({{ t.chiffrage }}j)</h4>
          <div class="membres-grid">
            <label
              v-for="m in membresEligibles(t.tache)"
              :key="m.id"
              class="checkbox-label membre-option"
              :class="{
                'membre-principal': m.role.startsWith('Rôle principal'),
                'membre-secondaire': m.role.startsWith('Rôle secondaire')
              }"
            >
              <input
                type="checkbox"
                :checked="preferences[p.projetId]?.[t.tache]?.includes(m.nom)"
                @change="togglePreference(p.projetId, t.tache, m.nom)"
              />
              <span>
                {{ m.nom }}
                <small class="text-muted">({{ m.role }} — {{ dispoMembre(m.id, p.projetId) }}j dispo)</small>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="wizard-actions">
        <button class="btn-prev" @click="etape = 2">← Précédent</button>
        <button class="btn-next" @click="generer">Générer le plan →</button>
      </div>
    </div>

    <!-- ═══ ÉTAPE 4 : Vérification ═══ -->
    <div v-if="etape === 4 && resultat">
      <h2>Vérification du plan</h2>
      <p>Vérifiez le plan d'affectation avant de l'appliquer. Vous pouvez revenir en arrière pour modifier les paramètres.</p>

      <div v-if="resultat.plan.length > 0">
        <h3>Plan d'affectation</h3>
        <table class="table-diagnostic table-plan">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Projet</th>
              <th>Tâche</th>
              <th>Jours</th>
              <th>Début</th>
              <th>Fin</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ligne, i) in resultat.plan" :key="i">
              <td>{{ ligne.membre }}</td>
              <td>{{ ligne.projet }}</td>
              <td>
                <span class="badge-tache" :class="'badge-' + ligne.tache.toLowerCase().replace(' ', '-')">
                  {{ ligne.tache }}
                </span>
              </td>
              <td class="text-center">{{ ligne.jours }}j</td>
              <td class="text-center">{{ ligne.debut }}</td>
              <td class="text-center">{{ ligne.fin }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Total</strong></td>
              <td class="text-center"><strong>{{ resultat.plan.reduce((s, l) => s + l.jours, 0) }}j</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-if="resultat.echecs.length > 0" class="echecs-section">
        <h3>⚠ Projets en échec</h3>
        <div v-for="(e, i) in resultat.echecs" :key="i" class="echec-card">
          <h4>{{ e.nom }} — {{ e.tache }}</h4>
          <p><strong>Raison :</strong> {{ e.raison }}</p>
          <p>Chiffrage : {{ e.chiffrage }}j — Alloué : {{ e.alloue }}j — Manque : {{ e.manque }}j</p>
          <div v-if="e.membresEligibles && e.membresEligibles.length > 0">
            <p><strong>Membres éligibles :</strong></p>
            <ul>
              <li v-for="m in e.membresEligibles" :key="m.nom">
                {{ m.nom }} ({{ m.rolePrincipal }}) — {{ m.joursDispo }}j disponibles
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="resultat.plan.length === 0 && resultat.echecs.length > 0" class="alert-warning">
        Aucune affectation n'a pu être générée. Revenez aux étapes précédentes pour ajuster les dates ou les préférences.
      </div>

      <div class="wizard-actions">
        <button class="btn-prev" @click="etape = 3">← Modifier les préférences</button>
        <button class="btn-prev" @click="etape = 2">← Modifier les dates</button>
        <button
          class="btn-apply"
          :disabled="resultat.plan.length === 0"
          @click="appliquer"
        >
          ✓ Appliquer les affectations
        </button>
      </div>
    </div>

    <!-- ═══ ÉTAPE 5 : Application terminée ═══ -->
    <div v-if="etape === 5 && applicationTerminee">
      <h2>Affectations appliquées ✓</h2>
      <div class="success-message">
        <p>
          <strong>{{ resultat.plan.length }}</strong> affectation(s) ont été enregistrées
          pour un total de <strong>{{ resultat.plan.reduce((s, l) => s + l.jours, 0) }}j</strong>.
        </p>
        <p v-if="resultat.echecs.length > 0" class="text-warning">
          {{ resultat.echecs.length }} projet(s) n'ont pas pu être planifiés (ressources insuffisantes).
        </p>
        <p>Les données sont sauvegardées dans le localStorage. Vous pouvez consulter le résultat dans les calendriers projets.</p>
      </div>

      <div class="wizard-actions">
        <button class="btn-next" @click="retourAccueil">Retour à l'accueil</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.affectations-auto-view {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* ─── Wizard steps indicator ─── */
.wizard-steps {
  display: flex;
  gap: 0.5rem;
  margin: 1.5rem 0 2rem;
  padding: 0;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 2rem;
  font-size: 0.9rem;
  color: #666;
  flex: 1;
  justify-content: center;
}

.wizard-step.active {
  background: #007bff;
  color: white;
  font-weight: 600;
}

.wizard-step.done {
  background: #28a745;
  color: white;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  font-size: 0.8rem;
  font-weight: 700;
}

.wizard-step.active .step-number,
.wizard-step.done .step-number {
  background: rgba(255, 255, 255, 0.3);
}

/* ─── Tables diagnostique ─── */
.table-diagnostic {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;
}

.table-diagnostic th,
.table-diagnostic td {
  padding: 0.6rem 0.75rem;
  border: 1px solid #dee2e6;
  text-align: left;
}

.table-diagnostic th {
  background: #f8f9fa;
  font-weight: 600;
  font-size: 0.9rem;
}

.text-center { text-align: center; }
.text-muted { color: #888; font-size: 0.85rem; }
.text-warning { color: #e65100; }

.badge-tache {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  margin: 0.15rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  background: #e3f2fd;
  color: #1565c0;
}

.badge-spec { background: #e8f5e9; color: #2e7d32; }
.badge-dev { background: #e3f2fd; color: #1565c0; }
.badge-tests { background: #fff3e0; color: #e65100; }
.badge-retour-dev { background: #fce4ec; color: #c62828; }

/* ─── Dates form ─── */
.mode-dates {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.dates-form {
  margin-bottom: 1rem;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.date-row label {
  min-width: 8rem;
  font-weight: 500;
}

.date-row input[type="date"] {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  font-size: 1rem;
}

.projet-dates {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.projet-dates h4 {
  margin: 0 0 0.75rem;
}

.date-row-inline {
  display: flex;
  gap: 2rem;
}

/* ─── Préférences ─── */
.projet-prefs {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.projet-prefs h3 {
  margin: 0 0 1rem;
}

.tache-prefs {
  margin-bottom: 1rem;
}

.tache-prefs h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.membres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
  gap: 0.4rem;
}

.membre-option {
  padding: 0.35rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.9rem;
}

.membre-principal {
  background: #e8f5e9;
}

.membre-secondaire {
  background: #fff3e0;
}

/* ─── Plan / vérification ─── */
.table-plan tbody tr:hover {
  background: #f0f7ff;
}

.table-plan tfoot td {
  background: #f8f9fa;
  border-top: 2px solid #dee2e6;
}

.echecs-section {
  margin-top: 1.5rem;
}

.echec-card {
  background: #fff3e0;
  border-left: 4px solid #e65100;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 0 0.5rem 0.5rem 0;
}

.echec-card h4 {
  margin: 0 0 0.5rem;
  color: #e65100;
}

.echec-card ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

/* ─── Success ─── */
.success-message {
  background: #e8f5e9;
  border-left: 4px solid #28a745;
  padding: 1.5rem;
  border-radius: 0 0.5rem 0.5rem 0;
  margin-bottom: 1.5rem;
}

.success-message p {
  margin: 0 0 0.5rem;
}

/* ─── Alerts ─── */
.alert-info {
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
  padding: 1rem;
  border-radius: 0 0.5rem 0.5rem 0;
  margin: 1rem 0;
}

.alert-warning {
  background: #fff3e0;
  border-left: 4px solid #e65100;
  padding: 1rem;
  border-radius: 0 0.5rem 0.5rem 0;
  margin: 1rem 0;
}

/* ─── Wizard actions ─── */
.wizard-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.btn-next {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.btn-next:hover { background: #0056b3; }
.btn-next:disabled { background: #ccc; cursor: not-allowed; }

.btn-prev {
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.btn-prev:hover { background: #5a6268; }
</style>
