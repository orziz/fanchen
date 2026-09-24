<template>
  <div class="game-root" :class="{ 'reduce-motion': settings.reduceMotion }">
    <Transition name="phase" mode="out-in">
      <TitleScreen v-if="phase === 'title'" key="title" @settings="settingsOpen = true" />
      <GameScreen v-else key="game" :modal-open="settingsOpen" @settings="settingsOpen = true" />
    </Transition>
    <SettingsDialog v-if="settingsOpen" :in-game="phase === 'playing'" @close="settingsOpen = false" />
    <TooltipLayer />
    <div class="rotate-hint" aria-hidden="true">
      <span class="rotate-hint__glyph">⟲</span>
      <p>横过手机，山河更开阔</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGamePhase } from '@/composables/useGamePhase'
import { useSettings } from '@/composables/useSettings'
import { useClock, useGameLoop } from '@/composables/useGameLoop'
import { useAudio } from '@/composables/useAudio'
import { useGameFeedback } from '@/composables/useGameFeedback'
import TitleScreen from '@/components/shell/TitleScreen.vue'
import GameScreen from '@/components/shell/GameScreen.vue'
import SettingsDialog from '@/components/shell/SettingsDialog.vue'
import TooltipLayer from '@/components/common/TooltipLayer.vue'

const { phase } = useGamePhase()
const settings = useSettings()
const settingsOpen = ref(false)
const { hold, release } = useClock()

useGameLoop()
useAudio()
useGameFeedback()

watch(settingsOpen, open => (open ? hold('settings') : release('settings')))
</script>
