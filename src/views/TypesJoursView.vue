<script setup>
import { useRouter } from 'vue-router'
import typesJoursData from '../config/typesJours.json'

/**
 * Vue de consultation des types de jours
 * Affiche tous les types disponibles avec :
 * - Code (ID du type)
 * - Libellé complet
 * - Aperçu visuel avec couleur et style
 *
 * Permet de voir rapidement la liste complète des types et leurs codes
 * Utile pour comprendre les abréviations utilisées dans l'application
 */

const router = useRouter()
const typesJours = typesJoursData.typesJours
</script>

<template>
  <div class="types-jours-view">
    <button @click="router.push('/')" class="btn-back">← Retour à l'accueil</button>
    <h1>Types de jours</h1>

    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Libellé</th>
          <th>Aperçu</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="type in typesJours" :key="type.id">
          <td>{{ type.id }}</td>
          <td>{{ type.libelle }}</td>
          <td>
            <span
              class="apercu-type"
              :style="{
                backgroundColor: type.couleur,
                color: type.couleurTexte
              }"
            >
              {{ type.id }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
