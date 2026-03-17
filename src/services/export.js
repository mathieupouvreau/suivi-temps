/**
 * Fonctions utilitaires d'export des données
 * Chaque fonction génère le contenu et déclenche le téléchargement du fichier correspondant
 * Utilisées depuis la page Home (export agent) et les pages dédiées de chaque donnée
 */

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
 * Exporte l'équipe au format JSON
 * @param {Array} membres - Liste des membres (tous, actifs et inactifs)
 * @param {string} [nomFichier] - Nom du fichier (défaut : equipe_YYYY-MM-DD.json)
 */
export const exporterEquipeJSON = (membres, nomFichier) => {
  telechargerFichier(
    JSON.stringify(membres, null, 2),
    nomFichier || `equipe_${new Date().toISOString().split('T')[0]}.json`,
    'application/json;charset=utf-8;'
  )
}

/**
 * Exporte les projets au format JSON
 * @param {Array} projets - Liste des projets
 * @param {string} [nomFichier] - Nom du fichier (défaut : projets_YYYY-MM-DD.json)
 */
export const exporterProjetsJSON = (projets, nomFichier) => {
  telechargerFichier(
    JSON.stringify(projets, null, 2),
    nomFichier || `projets_${new Date().toISOString().split('T')[0]}.json`,
    'application/json;charset=utf-8;'
  )
}

/**
 * Exporte les jours au format JSON
 * @param {Object} jours - Objet jours du store (structure imbriquée annee/personne/mois/jour)
 * @param {string} [nomFichier] - Nom du fichier (défaut : jours_YYYY-MM-DD.json)
 */
export const exporterJoursJSON = (jours, nomFichier) => {
  telechargerFichier(
    JSON.stringify(jours, null, 2),
    nomFichier || `jours_${new Date().toISOString().split('T')[0]}.json`,
    'application/json;charset=utf-8;'
  )
}

/**
 * Exporte les affectations projets au format JSON
 * @param {Object} affectations - Objet affectations du store
 * @param {string} [nomFichier] - Nom du fichier (défaut : affectations_projets_YYYY-MM-DD.json)
 */
export const exporterAffectationsJSON = (affectations, nomFichier) => {
  telechargerFichier(
    JSON.stringify(affectations, null, 2),
    nomFichier || `affectations_projets_${new Date().toISOString().split('T')[0]}.json`,
    'application/json;charset=utf-8;'
  )
}
