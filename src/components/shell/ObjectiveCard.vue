<template>
  <section class="side-panel objective-card" :class="`tone-${guidance.tone}`" aria-label="当前要务">
    <span class="objective-card__kicker">{{ guidance.kicker }}</span>
    <h3 class="objective-card__title">{{ guidance.title }}</h3>
    <p class="objective-card__detail">{{ guidance.detail }}</p>
    <button class="ink-btn ink-btn--small" type="button" @click="follow">
      {{ guidance.actionLabel }}<GameIcon name="chevronRight" />
    </button>
    <div v-if="milestone" class="objective-card__milestone" :data-tip="milestone.detail" data-tip-title="修行路标">
      <span class="objective-card__milestone-kicker">路标</span>
      <span class="objective-card__milestone-title">{{ milestone.title }}</span>
      <span class="objective-card__milestone-progress num">{{ milestone.progress }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { REALM_TEMPLATES } from '@/config'
import { resolveGuidance } from '@/core/guidance'
import { getModeLabel } from '@/composables/useUIHelpers'
import { useBooks } from '@/composables/useBooks'
import { getActiveStoryScene, showStoryOverlay } from '@/systems/story'
import { getOpeningTutorialObjective } from '@/systems/tutorial'
import { performAction } from '@/systems/world'
import { getCurrentMilestone } from '@/systems/milestones'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const emit = defineEmits<{ strategy: [] }>()

const store = useGameStore()
const {
  player, world, combat, story, currentLocation, currentAffiliation, cultivationGateNeed, breakthroughReadyNeed, hasNextRank,
} = storeToRefs(store)
const { openBook } = useBooks()

const activeStory = computed(() => {
  void story.value.activeNodeId
  return getActiveStoryScene()
})

const activeRealmName = computed(() => {
  const realmId = world.value.realm.activeRealmId
  return realmId ? REALM_TEMPLATES.find(realm => realm.id === realmId)?.name || null : null
})

const breakthroughReady = computed(() => hasNextRank.value
  && player.value.cultivation >= cultivationGateNeed.value
  && player.value.breakthrough >= breakthroughReadyNeed.value)

function percent(value: number, max: number) {
  return max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0
}

const guidance = computed(() => resolveGuidance({
  tutorialObjective: getOpeningTutorialObjective(story.value, player.value),
  activeStoryTitle: activeStory.value?.title || null,
  enemyName: combat.value.currentEnemy?.name || null,
  travelDestination: player.value.travelPlan?.destinationName || null,
  hpPercent: percent(player.value.hp, player.value.maxHp),
  qiPercent: percent(player.value.qi, player.value.maxQi),
  staminaPercent: percent(player.value.stamina, player.value.maxStamina),
  breakthroughReady: breakthroughReady.value,
  canBreakthrough: breakthroughReady.value && currentLocation.value.actions.includes('breakthrough'),
  affiliationName: currentAffiliation.value?.name || null,
  tradeDestination: player.value.tradeRun?.destinationName || null,
  activeRealmName: activeRealmName.value,
  currentModeLabel: getModeLabel(player.value.mode),
  locationName: currentLocation.value.name,
}))

const milestone = computed(() => {
  void player.value.stats
  return getCurrentMilestone()
})

function follow() {
  sfx.page()
  const target = guidance.value.target
  if (target === 'command') { emit('strategy'); return }
  if (target === 'rest' || target === 'breakthrough') { performAction(target); return }
  if (target === 'story') {
    if (story.value.activeStoryId) showStoryOverlay()
    else openBook('chronicle', 'story')
    return
  }
  if (target === 'combat') return
  if (target === 'map') { openBook('map', 'map'); return }
  if (target === 'world') { openBook('map', 'realms'); return }
  if (target === 'sect') { openBook('faction'); return }
  if (target === 'market') openBook('market', 'shop')
}
</script>
