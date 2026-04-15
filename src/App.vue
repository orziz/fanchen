<template>
  <GameShell />
</template>

<script setup lang="ts">
import GameShell from './components/GameShell.vue'
import { useGameLoop } from './composables/useGameLoop'

useGameLoop()
</script>
