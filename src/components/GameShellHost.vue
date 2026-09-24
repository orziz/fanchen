<template>
  <div class="app-runtime">
    <div class="backdrop"></div>
    <GameShell />
    <StoryOverlay />
    <ToastStack />
  </div>
</template>

<script setup lang="ts">
import GameShell from '@/components/v1/GameShell.vue'
import StoryOverlay from '@/components/StoryOverlay.vue'
import ToastStack from '@/components/ToastStack.vue'
</script>