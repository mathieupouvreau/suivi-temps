<!--
  Composant racine de l'application
  Charge les styles globaux et affiche la vue correspondant à la route active
  via <router-view> (le contenu change selon l'URL : accueil, calendrier, équipe, etc.)
-->
<script setup>
import './assets/styles.css'
</script>

<template>
  <!-- Conteneur principal : le router-view injecte la vue de la route courante -->
  <div>
    <router-view></router-view>
  </div>
</template>



<style scoped>
</style>
