<script setup>
import { useRouter } from 'vue-router'
import typesJoursData from '../config/typesJours.json'

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
