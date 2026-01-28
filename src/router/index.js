import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AnneeView from '../views/AnneeView.vue'
import EquipeView from '../views/EquipeView.vue'
import TypesJoursView from '../views/TypesJoursView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/annee/:annee',
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
