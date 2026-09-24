<template>
  <div class="title-screen">
    <canvas ref="canvasEl" class="title-screen__canvas" />
    <div class="title-screen__veil" aria-hidden="true" />

    <div class="title-screen__brand">
      <h1 class="title-screen__title">
        <span v-for="(char, index) in '凡尘立道录'" :key="index" :style="{ animationDelay: `${0.25 + index * 0.18}s` }">{{ char }}</span>
      </h1>
      <span class="title-screen__seal" aria-hidden="true">立道</span>
      <p class="title-screen__verse">一粒凡尘，亦可问道青冥。</p>
    </div>

    <nav v-if="!creating" class="title-screen__menu" aria-label="开始">
      <button v-if="hasSave" class="title-option" type="button" @click="continueGame">
        <span class="title-option__name">续前缘</span>
        <span class="title-option__desc">{{ saveSummary }}</span>
      </button>
      <button class="title-option" type="button" @click="startCreating">
        <span class="title-option__name">踏入凡尘</span>
        <span class="title-option__desc">{{ hasSave ? '另起一世，旧档将被覆盖' : '寒门一介，从青禾镇街口醒来' }}</span>
      </button>
      <button class="title-option title-option--minor" type="button" @click="$emit('settings')">
        <span class="title-option__name">声画设置</span>
      </button>
    </nav>

    <NewLifeDialog v-else :overwrite="hasSave" @cancel="creating = false" @confirm="beginLife" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { RANKS, SAVE_KEY } from '@/config'
import { SceneRenderer } from '@/art/scene/renderer'
import { useGamePhase } from '@/composables/useGamePhase'
import { useSettings } from '@/composables/useSettings'
import { sfx } from '@/audio/sfx'
import type { NewLifeOptions } from '@/stores/game/store'
import NewLifeDialog from '@/components/shell/NewLifeDialog.vue'

defineEmits<{ settings: [] }>()

const store = useGameStore()
const settings = useSettings()
const { enterGame } = useGamePhase()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const creating = ref(false)
const hasSave = ref(store.hasStoredSave())
let renderer: SceneRenderer | null = null

const saveSummary = computed(() => {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return '接着上回的行程'
    const data = JSON.parse(raw)
    const rank = RANKS[data.player?.rankIndex || 0]?.name || '凡胎'
    return `${data.player?.name || '无名'} · ${rank} · 第${data.world?.day || 1}日`
  } catch {
    return '接着上回的行程'
  }
})

function continueGame() {
  sfx.confirm()
  if (store.initialized) store.loadGame()
  else store.initializeGame()
  enterGame()
}

function startCreating() {
  sfx.page()
  creating.value = true
}

function beginLife(options: NewLifeOptions) {
  sfx.chime()
  store.startNewLife(options)
  enterGame()
}

onMounted(() => {
  if (!canvasEl.value) return
  renderer = new SceneRenderer(canvasEl.value)
  renderer.resize()
  renderer.setInput({
    key: 'title',
    archetype: {
      relief: 'karst', water: 'lake', settlement: 'none', flora: ['pine'],
      smoke: false, mystic: false, snowCover: false, fields: false, warm: 0, seed: 'title-scroll',
    },
    hour: 9,
    weather: 'clear',
    travel: false,
    heroEffect: 'none',
    reduceMotion: settings.reduceMotion,
  })
  renderer.start()
  window.addEventListener('resize', onResize)
})

function onResize() {
  renderer?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  renderer?.destroy()
})
</script>
