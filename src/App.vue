<template>
  <GameShellHost />
</template>

<script setup lang="ts">
import GameShellHost from '@/components/GameShellHost.vue'
import { useGameLoop } from '@/composables/useGameLoop'

useGameLoop()
</script>
