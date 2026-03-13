/**
 * Point d'entrée principal de l'application Suivi Temps
 * Initialise Vue 3, Pinia (gestion d'état) et Vue Router (navigation)
 * Monte l'application sur l'élément #app défini dans index.html
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Création de l'instance Vue
const app = createApp(App)

// Enregistrement des plugins : Pinia pour les stores, Router pour la navigation
app.use(createPinia())
app.use(router)

// Montage de l'application dans le DOM
app.mount('#app')
