import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import HolidaysView from '../views/HolidaysView.vue'
import EquipeView from '../views/EquipeView.vue'
import TypesJoursView from '../views/TypesJoursView.vue'
import ProjetView from '../views/ProjetView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import AffectationsAutoView from '../views/AffectationsAutoView.vue'

/**
 * Configuration du routeur Vue Router
 * Utilise createWebHashHistory pour compatibilité avec les déploiements statiques
 * (pas besoin de configuration serveur pour les routes)
 *
 * Routes disponibles :
 * - /                  → HomeView : page d'accueil avec la liste des années
 * - /annee/:annee      → HolidaysView : calendrier congés/absences d'une année
 * - /equipe            → EquipeView : gestion des membres de l'équipe
 * - /calendrier/:annee → ProjetView : calendrier des affectations projet d'une année
 * - /projets           → ProjectsView : gestion des projets (CRUD + chiffrage)
 * - /types-jours       → TypesJoursView : référentiel des types de jours avec aperçu couleurs
 */
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/annee/:annee',  // Paramètre dynamique :annee (ex: /annee/2025)
      name: 'annee',
      component: HolidaysView
    },
    {
      path: '/equipe',
      name: 'equipe',
      component: EquipeView
    },
    {
      path: '/calendrier/:annee',  // Paramètre dynamique :annee (ex: /calendrier/2025)
      name: 'calendrier',
      component: ProjetView
    },
    {
      path: '/projets',
      name: 'projets',
      component: ProjectsView
    },
    {
      path: '/types-jours',
      name: 'types-jours',
      component: TypesJoursView
    },
    {
      path: '/affectations-auto',
      name: 'affectations-auto',
      component: AffectationsAutoView
    }
  ],
})

export default router
