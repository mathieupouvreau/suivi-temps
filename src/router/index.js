import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AnneeView from '../views/AnneeView.vue'
import EquipeView from '../views/EquipeView.vue'
import TypesJoursView from '../views/TypesJoursView.vue'

/**
 * Configuration du routeur Vue Router
 * Utilise createWebHashHistory pour compatibilité avec les déploiements statiques
 * (pas besoin de configuration serveur pour les routes)
 *
 * Routes disponibles :
 * - / : Page d'accueil avec la liste des années
 * - /annee/:annee : Vue détaillée d'une année avec calendriers mensuels
 * - /equipe : Gestion de l'équipe (ajout/suppression de membres)
 * - /types-jours : Liste des types de jours avec aperçu des couleurs
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
      component: AnneeView
    },
    {
      path: '/equipe',
      name: 'equipe',
      component: EquipeView
    },
    {
      path: '/types-jours',
      name: 'types-jours',
      component: TypesJoursView
    }
  ],
})

export default router
