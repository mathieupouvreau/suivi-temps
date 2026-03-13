/**
 * Configuration Vite pour l'application Suivi Temps
 * - base './' : chemins relatifs pour un déploiement sur n'importe quel sous-dossier
 * - Plugin vue() : compilation des fichiers .vue
 * - Plugin vueDevTools() : outils de debug Vue en développement
 * - Alias '@' : raccourci pour le dossier src/ dans les imports
 * - Serveur sur 0.0.0.0 : accessible depuis d'autres machines du réseau
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  // Chemins relatifs pour compatibilité avec les déploiements statiques (GitHub Pages, etc.)
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    // Permet d'écrire import X from '@/stores/equipe' au lieu de '../stores/equipe'
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Serveur de développement accessible en réseau local
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
