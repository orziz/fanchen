<template>
  <section
    :class="['current-focus', `is-${guidance.tone}`]"
    style="--focus-background-image: url('./assets/bg.png')"
    aria-label="当前要务"
  >
    <div class="current-focus__brand">
      <span class="current-focus__seal" aria-hidden="true">凡</span>
      <div>
        <h1>凡尘立道录</h1>
        <p>第{{ world.day }}日 · {{ timeLabel }} · {{ world.weather }}</p>
      </div>
    </div>

    <div class="current-focus__objective">
      <span>{{ guidance.kicker }}</span>
      <strong>{{ guidance.title }}</strong>
      <p>{{ guidance.detail }}</p>
    </div>

    <dl class="current-focus__facts">
      <div>
        <dt>所在</dt>
        <dd>{{ currentLocation.name }} · 险{{ currentLocation.danger }}</dd>
      </div>
      <div>
        <dt>修为底子</dt>
        <dd>{{ formatNumber(player.cultivation) }}/{{ formatNumber(cultivationGateNeed) }}</dd>
      </div>
      <div>
        <dt>破境火候</dt>
        <dd>{{ formatNumber(player.breakthrough) }}/{{ formatNumber(breakthroughReadyNeed) }}</dd>
      </div>
    </dl>

    <button class="current-focus__action" type="button" @click="followGuidance">
      {{ guidance.actionLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { REALM_TEMPLATES, TIME_LABELS } from '@/config'
import { useStage, type StageTab } from '@/composables/useStage'
import { useWindows } from '@/composables/useWindows'
import { getModeLabel } from '@/composables/useUIHelpers'
import { resolveGuidance } from '@/core/guidance'
import { formatNumber } from '@/utils'
import { getActiveStoryScene, showStoryOverlay } from '@/systems/story'
import { getOpeningTutorialObjective } from '@/systems/tutorial'
import { performAction } from '@/systems/world'

const store = useGameStore()
const {
  player,
  world,
  combat,
  story,
  currentLocation,
  currentAffiliation,
  cultivationGateNeed,
  breakthroughReadyNeed,
  hasNextRank,
} = storeToRefs(store)
const { setTab } = useStage()
const { openWindow } = useWindows()

const timeLabel = computed(() => TIME_LABELS[world.value.hour] || '子时')
const activeStory = computed(() => {
  story.value
  return getActiveStoryScene()
})
const activeRealmName = computed(() => {
  const realmId = world.value.realm.activeRealmId
  return realmId ? REALM_TEMPLATES.find(realm => realm.id === realmId)?.name || realmId : null
})
const breakthroughReady = computed(() => hasNextRank.value
  && player.value.cultivation >= cultivationGateNeed.value
  && player.value.breakthrough >= breakthroughReadyNeed.value)

const guidance = computed(() => resolveGuidance({
  tutorialObjective: getOpeningTutorialObjective(story.value, player.value),
  activeStoryTitle: activeStory.value?.title || null,
  enemyName: combat.value.currentEnemy?.name || null,
  travelDestination: player.value.travelPlan?.destinationName || null,
  hpPercent: getPercent(player.value.hp, player.value.maxHp),
  qiPercent: getPercent(player.value.qi, player.value.maxQi),
  staminaPercent: getPercent(player.value.stamina, player.value.maxStamina),
  breakthroughReady: breakthroughReady.value,
  canBreakthrough: breakthroughReady.value && currentLocation.value.actions.includes('breakthrough'),
  affiliationName: currentAffiliation.value?.name || null,
  tradeDestination: player.value.tradeRun?.destinationName || null,
  activeRealmName: activeRealmName.value,
  currentModeLabel: getModeLabel(player.value.mode),
  locationName: currentLocation.value.name,
}))

function getPercent(value: number, max: number) {
  return max > 0 ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0
}

function followGuidance() {
  if (guidance.value.target === 'command') {
    openWindow('command')
    return
  }
  if (guidance.value.target === 'rest' || guidance.value.target === 'breakthrough') {
    performAction(guidance.value.target)
    return
  }
  if (guidance.value.target === 'story') {
    if (story.value.activeStoryId) showStoryOverlay()
    setTab('story')
    return
  }
  setTab(guidance.value.target as StageTab)
}
</script>
