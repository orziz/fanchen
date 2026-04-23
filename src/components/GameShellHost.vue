<template>
  <div class="app-runtime" :class="`ui-mode-${uiMode}`">
    <div class="backdrop"></div>
    <GameShell v-if="uiMode === 'text'" />
    <JianghuShell v-else />
    <StoryOverlay />
    <ToastStack />
  </div>
</template>

<script setup lang="ts">
import { usePresentationMode } from '@/composables/usePresentationMode'
import GameShell from '@/components/v1/GameShell.vue'
import JianghuShell from '@/components/v2/JianghuShell.vue'
import StoryOverlay from '@/components/StoryOverlay.vue'
import ToastStack from '@/components/ToastStack.vue'

const { uiMode } = usePresentationMode()
</script>