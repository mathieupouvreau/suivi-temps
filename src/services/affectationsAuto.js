/**
 * Moteur d'affectation automatique des personnes aux projets
 * Port JavaScript de l'algorithme Python generer-affectations.py
 *
 * Lit directement les données des stores Pinia (équipe, projets, jours, affectations)
 * et génère un plan d'affectation optimal en respectant les contraintes métier.
 */

/** Correspondance tâche → rôle recherché */
const ROLE_TACHE = {
  'Spec': 'Spec',
  'Dev': 'Dev',
  'Tests': 'Tests',
  'Retour dev': 'Dev'
}

/** Ordre d'exécution des tâches */
const TACHE_ORDER = ['Spec', 'Dev', 'Tests', 'Retour dev']

// ────────────────────────────────────────────────────────────
// Helpers dates
// ────────────────────────────────────────────────────────────

/**
 * Parse une date JJ/MM/AAAA en objet Date
 * @param {string} s - Date au format JJ/MM/AAAA
 * @returns {Date}
 */
function parseDate(s) {
  const [j, m, a] = s.split('/')
  return new Date(Number.parseInt(a), Number.parseInt(m) - 1, Number.parseInt(j))
}

/**
 * Formate une date en JJ/MM/AAAA
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  const j = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${j}/${m}/${d.getFullYear()}`
}

/**
 * Clé unique pour un jour (alignée sur le format des stores)
 * @param {Date} d
 * @returns {string} ex: "2026-2-17" (annee-moisIndex-jour)
 */
function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** @param {Date} d */
function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6
}

/** @param {Date} d @returns {Date} */
function nextDay(d) {
  const n = new Date(d)
  n.setDate(n.getDate() + 1)
  return n
}

/** @param {Date} d @returns {Date} */
function nextBusinessDay(d) {
  let nd = nextDay(d)
  while (isWeekend(nd)) nd = nextDay(nd)
  return nd
}

/**
 * Compte les jours ouvrés (hors week-ends) dans une période
 * @param {Date} debut
 * @param {Date} fin
 * @returns {number}
 */
function compterJoursOuvres(debut, fin) {
  let count = 0
  let current = new Date(debut)
  while (current <= fin) {
    if (!isWeekend(current)) count++
    current = nextDay(current)
  }
  return count
}

// ────────────────────────────────────────────────────────────
// Accès sécurisé aux données imbriquées
// ────────────────────────────────────────────────────────────

/**
 * Accès imbriqué sécurisé dans un objet
 * @param {Object} obj
 * @param  {...string} keys
 * @returns {*}
 */
function safeGet(obj, ...keys) {
  let current = obj
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return null
    current = current[k]
  }
  return current ?? null
}

// ────────────────────────────────────────────────────────────
// Tâche prédécesseur
// ────────────────────────────────────────────────────────────

/**
 * Retourne la tâche prédécesseur dans l'ordonnancement
 * @param {string} tache
 * @returns {string|null}
 */
function getTachePrecedente(tache) {
  if (tache === 'Dev') return 'Spec'
  if (tache === 'Tests' || tache === 'Retour dev') return 'Dev'
  return null
}

// ────────────────────────────────────────────────────────────
// Phase 1 : Diagnostic
// ────────────────────────────────────────────────────────────

/**
 * Analyse les données existantes et produit un diagnostic complet
 * @param {Array} equipe - Membres de l'équipe
 * @param {Array} projets - Projets avec chiffrages
 * @param {Object} jours - Jours d'absence
 * @param {Object} affectations - Affectations existantes
 * @returns {{ projetsAPlanifier: Array, projetsIgnores: Array, equipeDispo: Array }}
 */
export function diagnostiquer(equipe, projets, jours, affectations) {
  const membresActifs = equipe.filter(m => m.actif !== false)

  const projetsAPlanifier = []
  const projetsIgnores = []

  for (const projet of projets) {
    const tachesAPlanifier = []
    const tachesDejaPlanifiees = []

    // Vérifier pour chaque tâche si elle a déjà des affectations
    const taches = [
      { nom: 'Spec', chiffrage: projet.spec, maxPersonnes: projet.specPersonnes || 1 },
      { nom: 'Dev', chiffrage: projet.dev, maxPersonnes: projet.devPersonnes || 1 },
      { nom: 'Tests', chiffrage: projet.tests, maxPersonnes: projet.testsPersonnes || 1 },
      { nom: 'Retour dev', chiffrage: projet.retourDev, maxPersonnes: projet.retourDevPersonnes || 1 }
    ]

    for (const tache of taches) {
      const dejaPlanifiee = _tacheADesAffectations(affectations, projet.id, tache.nom)
      if (dejaPlanifiee) {
        tachesDejaPlanifiees.push(tache.nom)
      } else if (tache.chiffrage > 0) {
        tachesAPlanifier.push({
          tache: tache.nom,
          chiffrage: tache.chiffrage,
          maxPersonnes: tache.maxPersonnes
        })
      }
    }

    if (tachesAPlanifier.length > 0) {
      projetsAPlanifier.push({
        projetId: projet.id,
        nom: projet.nom,
        tachesAPlanifier,
        tachesDejaPlanifiees
      })
    } else {
      const raison = tachesDejaPlanifiees.length > 0
        ? 'Toutes les tâches sont planifiées'
        : 'Chiffrage à 0 pour toutes les tâches'
      projetsIgnores.push({ nom: projet.nom, raison })
    }
  }

  return {
    projetsAPlanifier,
    projetsIgnores,
    equipeDispo: membresActifs.map(m => ({
      id: m.id,
      nom: m.nom,
      rolePrincipal: m.rolePrincipal || '',
      roleSecondaire: m.roleSecondaire || ''
    }))
  }
}

/**
 * Vérifie si une tâche a déjà au moins une affectation existante
 * @param {Object} affectations
 * @param {number} projetId
 * @param {string} nomTache
 * @returns {boolean}
 */
function _tacheADesAffectations(affectations, projetId, nomTache) {
  for (const annee of Object.values(affectations)) {
    for (const membre of Object.values(annee)) {
      for (const mois of Object.values(membre)) {
        for (const jour of Object.values(mois)) {
          if (jour?.projetId === projetId && jour?.tache === nomTache) {
            return true
          }
        }
      }
    }
  }
  return false
}

/**
 * Retourne les IDs des membres assignés à une tâche dans les affectations existantes
 * @param {Object} affectations
 * @param {number} projetId
 * @param {string} nomTache
 * @returns {Set<number>}
 */
function _getAssigneesExistants(affectations, projetId, nomTache) {
  const assignees = new Set()
  for (const anneeData of Object.values(affectations || {})) {
    for (const [membreId, moisData] of Object.entries(anneeData)) {
      for (const jourEntries of Object.values(moisData)) {
        for (const a of Object.values(jourEntries)) {
          if (a?.projetId === projetId && a?.tache === nomTache) {
            assignees.add(Number.parseInt(membreId))
          }
        }
      }
    }
  }
  return assignees
}

// ────────────────────────────────────────────────────────────
// Phase 4 : Génération des affectations
// ────────────────────────────────────────────────────────────

/**
 * Génère les affectations automatiques pour les projets à planifier
 *
 * @param {Array} equipe - Membres actifs de l'équipe
 * @param {Array} projets - Tous les projets (pour référence chiffrage)
 * @param {Object} jours - Jours d'absence (structure du store)
 * @param {Object} affectationsExistantes - Affectations déjà enregistrées
 * @param {Array} projetsAPlanifier - Projets avec tâches, dates et préférences
 * @returns {{ plan: Array, echecs: Array, nouvellesAffectations: Object }}
 */
export function genererAffectations(equipe, projets, jours, affectationsExistantes, projetsAPlanifier) {
  const membreParNom = {}
  for (const m of equipe) membreParNom[m.nom] = m

  // Suivi des nouvelles affectations (évite double-réservation)
  const newAffKeys = new Set()
  const newAffectations = {}
  // Dernière date travaillée par membre tous projets confondus (pour le jour de battement)
  const memberLastTaskDate = {}

  /** Marque un jour comme pris pour un membre */
  function markAffected(membreId, d) {
    newAffKeys.add(`${dateKey(d)}|${membreId}`)
  }

  /** Vérifie si un jour est déjà pris par une nouvelle affectation */
  function isNewlyAffected(membreId, d) {
    return newAffKeys.has(`${dateKey(d)}|${membreId}`)
  }

  /** Enregistre une nouvelle affectation */
  function addNewAffectation(membreId, d, projetId, tache) {
    const annee = String(d.getFullYear())
    const mid = String(membreId)
    const moisIndex = String(d.getMonth())
    const jour = String(d.getDate())

    if (!newAffectations[annee]) newAffectations[annee] = {}
    if (!newAffectations[annee][mid]) newAffectations[annee][mid] = {}
    if (!newAffectations[annee][mid][moisIndex]) newAffectations[annee][mid][moisIndex] = {}
    newAffectations[annee][mid][moisIndex][jour] = { projetId, tache }
    markAffected(membreId, d)
  }

  /**
   * Capacité d'un membre pour un jour donné (0, 0.5 ou 1)
   * @param {number} membreId
   * @param {Date} d
   * @returns {number}
   */
  function getJourCapacite(membreId, d) {
    if (isWeekend(d)) return 0

    const annee = String(d.getFullYear())
    const mid = String(membreId)
    const moisIndex = String(d.getMonth())
    const jour = String(d.getDate())

    const typeJour = safeGet(jours, annee, mid, moisIndex, jour)
    if (typeJour) {
      if (String(typeJour).startsWith('1/2')) return 0.5
      return 0
    }

    if (safeGet(affectationsExistantes, annee, mid, moisIndex, jour)) return 0
    if (isNewlyAffected(membreId, d)) return 0

    return 1
  }

  /**
   * Jours disponibles pour un membre sur une période, excluant les clés temporaires
   * @param {number} membreId
   * @param {Date} dateDebut
   * @param {Date} dateFin
   * @param {Set} tempKeys
   * @returns {Array<{date: Date, capacite: number}>}
   */
  function getJoursDisponibles(membreId, dateDebut, dateFin, tempKeys) {
    const result = []
    let current = new Date(dateDebut)
    while (current <= dateFin) {
      const cap = getJourCapacite(membreId, current)
      if (cap > 0) {
        const tk = `${dateKey(current)}|${membreId}`
        if (!tempKeys.has(tk)) {
          result.push({ date: new Date(current), capacite: cap })
        }
      }
      current = nextDay(current)
    }
    return result
  }

  /**
   * Membres éligibles ordonnés par priorité
   * @param {string} tache
   * @param {Array<string>} preferences
   * @param {number} passe - 1 ou 2
   * @returns {Array}
   */
  function getMembresOrdonnes(tache, preferences, passe, membresDevProjet) {
    const roleRecherche = ROLE_TACHE[tache]
    const ordered = []
    const added = new Set()

    // Pour "Retour dev" : prioriser les développeurs déjà assignés au Dev du même projet
    if (tache === 'Retour dev' && membresDevProjet && membresDevProjet.size > 0) {
      for (const membreId of membresDevProjet) {
        const m = equipe.find(e => e.id === membreId)
        if (m && !added.has(m.id)) {
          ordered.push(m)
          added.add(m.id)
        }
      }
    }

    // Préférences en premier
    for (const nom of (preferences || [])) {
      const m = membreParNom[nom]
      if (m && !added.has(m.id)) {
        ordered.push(m)
        added.add(m.id)
      }
    }

    // Rôle principal
    for (const m of equipe) {
      if (!added.has(m.id) && m.rolePrincipal === roleRecherche) {
        ordered.push(m)
        added.add(m.id)
      }
    }

    // Passe 2 : rôle secondaire + restants
    if (passe >= 2) {
      for (const m of equipe) {
        if (!added.has(m.id) && m.roleSecondaire === roleRecherche) {
          ordered.push(m)
          added.add(m.id)
        }
      }
      for (const m of equipe) {
        if (!added.has(m.id)) {
          ordered.push(m)
          added.add(m.id)
        }
      }
    }

    return ordered
  }

  /**
   * Trouve la date de fin d'une tâche dans les affectations existantes
   * @param {number} projetId
   * @param {string} tache
   * @returns {Date|null}
   */
  function findFinTacheExistante(projetId, tache) {
    let lastDate = null
    for (const [annee, membres] of Object.entries(affectationsExistantes || {})) {
      for (const [, moisData] of Object.entries(membres)) {
        for (const [moisIdx, jourEntries] of Object.entries(moisData)) {
          for (const [jour, a] of Object.entries(jourEntries)) {
            if (a.projetId !== projetId || a.tache !== tache) continue
            const d = new Date(Number.parseInt(annee), Number.parseInt(moisIdx), Number.parseInt(jour))
            if (lastDate === null || d > lastDate) lastDate = d
          }
        }
      }
    }
    return lastDate
  }

  /**
   * Tente d'allouer toutes les tâches d'un projet (sans commit)
   * @param {Object} projet
   * @param {number} passe - 1 ou 2
   * @returns {{ ok: boolean, tempAffectations: Array, taskEndDates: Object, echecDetail: Object|null }}
   */
  function tryAllocateProject(projet, passe) {
    const dateDebutProjet = parseDate(projet.dateDebut)
    const dateFinProjet = parseDate(projet.dateFin)

    const tachesOrdonnees = TACHE_ORDER.filter(t =>
      projet.tachesAPlanifier.some(tp => tp.tache === t && tp.chiffrage > 0)
    )

    const tempAffectations = []
    const tempKeys = new Set()
    const taskEndDates = {}
    // Suivi des membres assignés par tâche (pour lier Retour dev → Dev)
    // Pré-charger les assignations des tâches déjà planifiées (affectations existantes)
    const taskAssignees = {}
    for (const tacheName of (projet.tachesDejaPlanifiees || [])) {
      const assignees = _getAssigneesExistants(affectationsExistantes, projet.projetId, tacheName)
      if (assignees.size > 0) {
        taskAssignees[tacheName] = assignees
      }
    }
    // Copie locale des dernières dates travaillées (pour ne pas polluer le global en cas d'échec)
    const localLastTaskDate = { ...memberLastTaskDate }
    let projetOk = true
    let echecDetail = null

    for (const nomTache of tachesOrdonnees) {
      const tacheInfo = projet.tachesAPlanifier.find(t => t.tache === nomTache)
      if (!tacheInfo) continue

      // Date de début effective
      let dateDebutTache = new Date(dateDebutProjet)
      const precTask = getTachePrecedente(nomTache)

      if (precTask) {
        const dejaPlanifiees = projet.tachesDejaPlanifiees || []
        if (dejaPlanifiees.includes(precTask)) {
          const finPrec = findFinTacheExistante(projet.projetId, precTask)
          if (finPrec) {
            const nd = nextBusinessDay(finPrec)
            if (nd > dateDebutTache) dateDebutTache = nd
          }
        } else if (taskEndDates[precTask]) {
          const nd = nextBusinessDay(taskEndDates[precTask])
          if (nd > dateDebutTache) dateDebutTache = nd
        }
      }

      if (dateDebutTache > dateFinProjet) {
        projetOk = false
        echecDetail = {
          projetId: projet.projetId,
          nom: projet.nom,
          tache: nomTache,
          raison: `Fenêtre insuffisante : début tâche ${formatDate(dateDebutTache)} > fin projet ${formatDate(dateFinProjet)}`,
          chiffrage: tacheInfo.chiffrage,
          alloue: 0,
          manque: tacheInfo.chiffrage
        }
        break
      }

      // Membres éligibles par priorité (pour Retour dev, prioriser les développeurs du même projet)
      const membres = getMembresOrdonnes(nomTache, tacheInfo.preferences, passe, taskAssignees['Dev'])
      const maxPersonnes = tacheInfo.maxPersonnes || 1

      // Allocation jour par jour — au plus tôt
      let remaining = tacheInfo.chiffrage
      const taskAllocations = []
      // Suivi des personnes distinctes déjà assignées à cette tâche
      const assignedToTask = new Set()

      let currentDate = new Date(dateDebutTache)
      while (remaining > 0 && currentDate <= dateFinProjet) {
        if (isWeekend(currentDate)) {
          currentDate = nextDay(currentDate)
          continue
        }

        let personnesCeJour = 0
        for (const membre of membres) {
          if (remaining <= 0 || personnesCeJour >= maxPersonnes) break
          // Ne pas accepter un nouveau membre si le quota de personnes distinctes est atteint
          if (!assignedToTask.has(membre.id) && assignedToTask.size >= maxPersonnes) continue
          // Jour de battement : si ce membre a travaillé sur une autre tâche (tous projets),
          // laisser 1 jour ouvré de trou avant la nouvelle tâche
          if (!assignedToTask.has(membre.id) && localLastTaskDate[membre.id]) {
            const minStart = nextBusinessDay(localLastTaskDate[membre.id])
            if (currentDate <= minStart) continue
          }
          const tk = `${dateKey(currentDate)}|${membre.id}`
          if (tempKeys.has(tk)) continue
          const cap = getJourCapacite(membre.id, currentDate)
          if (cap > 0) {
            const used = Math.min(cap, remaining)
            remaining -= used
            taskAllocations.push({
              membreId: membre.id,
              membreNom: membre.nom,
              date: new Date(currentDate),
              projetId: projet.projetId,
              tache: nomTache,
              capacite: used
            })
            tempKeys.add(tk)
            assignedToTask.add(membre.id)
            personnesCeJour++
          }
        }

        currentDate = nextDay(currentDate)
      }

      if (remaining > 0) {
        projetOk = false
        const membresEligibles = []
        for (const m of membres) {
          const availDays = getJoursDisponibles(m.id, dateDebutTache, dateFinProjet, tempKeys)
          const totalDispo = availDays.reduce((s, d) => s + d.capacite, 0)
          if (totalDispo > 0) {
            membresEligibles.push({
              nom: m.nom,
              rolePrincipal: m.rolePrincipal || 'aucun',
              roleSecondaire: m.roleSecondaire || 'aucun',
              joursDispo: totalDispo
            })
          }
        }
        echecDetail = {
          projetId: projet.projetId,
          nom: projet.nom,
          tache: nomTache,
          raison: 'Ressources insuffisantes',
          chiffrage: tacheInfo.chiffrage,
          alloue: tacheInfo.chiffrage - remaining,
          manque: remaining,
          membresEligibles
        }
        break
      }

      tempAffectations.push(...taskAllocations)

      // Mémoriser les membres assignés à cette tâche
      taskAssignees[nomTache] = assignedToTask

      // Mettre à jour la dernière date travaillée par membre (copie locale)
      for (const a of taskAllocations) {
        if (!localLastTaskDate[a.membreId] || a.date > localLastTaskDate[a.membreId]) {
          localLastTaskDate[a.membreId] = a.date
        }
      }

      if (taskAllocations.length > 0) {
        taskEndDates[nomTache] = taskAllocations.reduce(
          (max, a) => a.date > max ? a.date : max,
          taskAllocations[0].date
        )
      }
    }

    return { ok: projetOk, tempAffectations, taskEndDates, echecDetail }
  }

  // ── Algorithme principal : deux passes ──

  const plan = []
  const echecs = []

  for (const projet of projetsAPlanifier) {
    // Passe 1 : préférences + rôle principal uniquement
    let result = tryAllocateProject(projet, 1)

    // Passe 2 : si échec, réessayer avec rôle secondaire + restants
    if (!result.ok) {
      result = tryAllocateProject(projet, 2)
    }

    if (result.ok) {
      // Commit des affectations
      for (const a of result.tempAffectations) {
        addNewAffectation(a.membreId, a.date, a.projetId, a.tache)
        // Mettre à jour la dernière date travaillée (global, tous projets)
        if (!memberLastTaskDate[a.membreId] || a.date > memberLastTaskDate[a.membreId]) {
          memberLastTaskDate[a.membreId] = a.date
        }
      }

      // Regrouper pour le plan
      const groups = {}
      for (const a of result.tempAffectations) {
        const key = `${a.membreId}|${a.tache}`
        if (!groups[key]) {
          groups[key] = {
            membre: a.membreNom,
            projet: projet.nom,
            tache: a.tache,
            jours: 0,
            debut: a.date,
            fin: a.date
          }
        }
        groups[key].jours += a.capacite
        if (a.date < groups[key].debut) groups[key].debut = a.date
        if (a.date > groups[key].fin) groups[key].fin = a.date
      }

      for (const g of Object.values(groups)) {
        plan.push({
          membre: g.membre,
          projet: g.projet,
          tache: g.tache,
          jours: g.jours,
          debut: formatDate(g.debut),
          fin: formatDate(g.fin)
        })
      }
    } else {
      echecs.push(result.echecDetail)
    }
  }

  return { plan, echecs, nouvellesAffectations: newAffectations }
}

/**
 * Fusionne les nouvelles affectations dans les existantes (deep merge)
 * @param {Object} existantes
 * @param {Object} nouvelles
 * @returns {Object} - Copie fusionnée
 */
export function fusionnerAffectations(existantes, nouvelles) {
  const merged = JSON.parse(JSON.stringify(existantes || {}))
  _deepMerge(merged, nouvelles)
  return merged
}

/**
 * Fusion profonde de deux objets
 * @param {Object} target
 * @param {Object} source
 */
function _deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {}
      _deepMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
}

/**
 * Calcule les jours ouvrés disponibles d'un membre sur une période
 * (excluant week-ends, jours d'absence et affectations existantes)
 * @param {number} membreId
 * @param {Date} debut
 * @param {Date} fin
 * @param {Object} jours
 * @param {Object} affectations
 * @returns {number}
 */
export function calculerDisponibilite(membreId, debut, fin, jours, affectations) {
  let total = 0
  let current = new Date(debut)
  while (current <= fin) {
    if (!isWeekend(current)) {
      const annee = String(current.getFullYear())
      const mid = String(membreId)
      const moisIndex = String(current.getMonth())
      const jour = String(current.getDate())

      const typeJour = safeGet(jours, annee, mid, moisIndex, jour)
      if (typeJour) {
        if (String(typeJour).startsWith('1/2')) total += 0.5
        // Sinon jour complet d'absence → 0
      } else if (!safeGet(affectations, annee, mid, moisIndex, jour)) {
        total += 1
      }
    }
    current = nextDay(current)
  }
  return total
}

export { compterJoursOuvres, parseDate, formatDate }
