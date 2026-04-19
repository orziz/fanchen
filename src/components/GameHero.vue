<template>
  <header class="card hero">
    <div class="hero-copy">
      <p class="eyebrow">离线原生修真经营</p>
      <h1>凡尘立道录</h1>
      <p class="subtitle">从寒门凡人起步，在乡社、商帮、官府与行院之间挣门路、跑商路、攒产业，再决定自己是继续借势而起，还是另立唯一的宗门。</p>
    </div>
    <div class="hero-side">
      <div class="hero-top-row">
        <div class="hero-status">
          <div class="status-pill">
            <span>第</span>
            <strong>{{ world.day }}</strong>
            <span>日</span>
          </div>
          <div class="status-pill">
            <span>{{ timeLabelText }}</span>
          </div>
          <div class="status-pill">
            <span>声望</span>
            <strong>{{ formatNumber(player.reputation) }}</strong>
          </div>
          <div class="status-pill accent">
            <span>{{ saveState }}</span>
          </div>
        </div>
        <div class="hero-action-row">
          <button class="control-button primary" type="button" @click="store.saveGame(true)">手动存档</button>
          <button class="control-button" type="button" @click="store.loadGame()">读取存档</button>
          <button class="control-button" type="button" @click="handleReset">重开此世</button>
        </div>
      </div>
      <div class="hero-speed-row">
        <div class="hero-context-row">
          <div class="status-pill context-pill">
            <span>当前焦点</span>
            <strong>{{ focusSummary }}</strong>
          </div>
          <div class="status-pill context-pill">
            <span>当前门路</span>
            <strong>{{ routeSummary }}</strong>
          </div>
        </div>
        <div class="speed-switch">
          <button
            v-for="opt in SPEED_OPTIONS"
            :key="opt.value"
            class="speed-button"
            :class="{ active: speed === opt.value }"
            type="button"
            @click="speed = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { SPEED_OPTIONS, TIME_LABELS, ACTION_META, REALM_TEMPLATES } from '@/config'
import { formatNumber } from '@/utils'
import { getModeLabel } from '@/composables/useUIHelpers'
import { getOpeningTutorialObjective } from '@/systems/tutorial'

const store = useGameStore()
const { player, world, currentAffiliation, sect, saveState, speed, story } = storeToRefs(store)

const timeLabelText = computed(() => TIME_LABELS[world.value.hour] || '子时')

const focusSummary = computed(() => {
  const tutorialObjective = getOpeningTutorialObjective(story.value, player.value)
  if (tutorialObjective) return tutorialObjective
  const p = player.value
  const tr = p.tradeRun
  const realm = world.value.realm.activeRealmId
  if (tr) return `跑商·${tr.destinationName}`
  if (realm) {
    const tpl = REALM_TEMPLATES.find(r => r.id === realm)
    return `秘境·${tpl?.name ?? realm}`
  }
  if (p.hp < p.maxHp * 0.42 || p.qi < p.maxQi * 0.34) return '调息回稳'
  if (p.breakthrough >= store.nextBreakthroughNeed * 0.85) return '可试冲关'
  return '平稳推进'
})

const routeSummary = computed(() => {
  if (currentAffiliation.value) return currentAffiliation.value.name
  if (sect.value) return sect.value.name
  return '尚未投势'
})

function handleReset() {
  if (window.confirm('确认重开此世？当前未存档进度会被覆盖。')) {
    store.resetGame()
  }
}
</script>
