/**
 * Constantes partagées pour l'affichage des calendriers
 * Utilisées dans les vues HolidaysView, ProjetView et les composants d'affectation
 */

/**
 * Noms des 12 mois de l'année en français
 * Indexés de 0 (Janvier) à 11 (Décembre), compatible avec Date.getMonth()
 * @type {string[]}
 */
export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

/**
 * Mois avec leur index numérique, utilisés dans les <select> des formulaires
 * Format : [{ index: 0, nom: 'Janvier' }, { index: 1, nom: 'Février' }, ...]
 * @type {{ index: number, nom: string }[]}
 */
export const MOIS_AVEC_INDEX = MOIS.map((nom, index) => ({ index, nom }))

/**
 * Abréviations des jours de la semaine, indexées selon Date.getDay()
 * 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
 * @type {string[]}
 */
export const NOMS_JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
