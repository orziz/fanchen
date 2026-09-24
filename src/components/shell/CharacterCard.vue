<template>
  <section class="side-panel character-card" aria-label="修行">
    <div class="character-card__realm">
      <span class="character-card__kicker">境界</span>
      <strong class="character-card__realm-name">{{ rankData.name }}</strong>
      <span v-if="hasNextRank" class="character-card__next">
        <GameIcon name="chevronRight" />{{ nextRankName }}
      </span>
    </div>

    <div class="character-card__growth">
      <InkBar
        label="修为"
        icon="cultivation"
        tone="cultivation"
        :value="player.cultivation"
        :max="hasNextRank ? nextBreakthroughNeed : player.cultivation || 1"
        :marker="hasNextRank ? cultivationGateNeed : null"
        :data-tip="cultivationTip"
        data-tip-title="修为"
      />
      <InkBar
        label="火候"
        icon="breakthrough"
        tone="breakthrough"
        :value="player.breakthrough"
        :max="hasNextRank ? nextBreakthroughNeed : player.breakthrough || 1"
        :marker="hasNextRank ? breakthroughReadyNeed : null"
        :data-tip="breakthroughTip"
        data-tip-title="破境火候"
      />
      <p class="character-card__hint">{{ growthHint }}</p>
      <button
        v-if="hasNextRank"
        class="seal-btn"
        :class="{ 'is-ready': canBreak }"
        type="button"
        :disabled="!canBreak"
        :data-tip="breakReason || '以当前火候冲击下一重境界'"
        @click="tryBreak"
      >
        <GameIcon name="breakthrough" />破境
      </button>
    </div>

    <div class="character-card__vitals">
      <InkBar label="气血" icon="hp" tone="hp" :value="player.hp" :max="player.maxHp" compact />
      <InkBar label="真气" icon="qi" tone="qi" :value="player.qi" :max="player.maxQi" compact />
      <InkBar label="体力" icon="stamina" tone="stamina" :value="player.stamina" :max="player.maxStamina" compact />
    </div>

    <div class="character-card__gear">
      <button v-for="slot in gear" :key="slot.key" class="gear-slot" :class="{ 'is-empty': !slot.name }" type="button" :data-tip="slot.tip" :data-tip-title="slot.label" @click="openBook('bag', slot.key === 'heart' ? 'skills' : 'items')">
        <GameIcon :name="slot.icon" />
        <span class="gear-slot__label">{{ slot.label }}</span>
        <strong class="gear-slot__name">{{ slot.name || '空' }}</strong>
      </button>
    </div>

    <button class="character-card__affiliation" type="button" data-tip="门路与势力" @click="openBook('faction')">
      <GameIcon name="faction" />
      <span>{{ affiliationLabel }}</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RANKS, getBreakthroughDisabledReason, getGrowthProgressNote, getItem, getTechnique } from '@/config'
import { describeTechniqueEffect } from '@/composables/useUIHelpers'
import { performAction } from '@/systems/world'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import InkBar from '@/components/common/InkBar.vue'

const store = useGameStore()
const {
  player, rankData, hasNextRank, nextBreakthroughNeed, cultivationGateNeed, breakthroughReadyNeed, currentLocation, currentAffiliation,
} = storeToRefs(store)
const { openBook } = useBooks()

const nextRankName = computed(() => RANKS[player.value.rankIndex + 1]?.name || '')

const growthInput = computed(() => ({
  hasNextRank: hasNextRank.value,
  nextBreakthroughNeed: nextBreakthroughNeed.value,
  cultivation: player.value.cultivation,
  breakthrough: player.value.breakthrough,
  rankIndex: player.value.rankIndex,
  aura: currentLocation.value.aura,
}))

const breakReason = computed(() => getBreakthroughDisabledReason(growthInput.value))
const canBreak = computed(() => hasNextRank.value && !breakReason.value && currentLocation.value.actions.includes('breakthrough'))
const growthHint = computed(() => {
  if (hasNextRank.value && !breakReason.value && !currentLocation.value.actions.includes('breakthrough')) return '火候已足，此地灵机接不住天劫，需往有冲关门路的灵地。'
  return getGrowthProgressNote(growthInput.value)
})

const cultivationTip = computed(() => `修为是日积月累的根基。积到刻度线（${cultivationGateNeed.value}）方算底子扎稳，此后越满，冲关时保底的火候越高。`)
const breakthroughTip = computed(() => `火候是冲关的把握。过刻度线（${breakthroughReadyNeed.value}）便可择地冲关；地点灵气与悟性左右成败。`)

const gear = computed(() => {
  const eq = player.value.equipment
  const weapon = eq.weapon ? getItem(eq.weapon) : null
  const armor = eq.armor ? getItem(eq.armor) : null
  const heart = eq.heart ? getTechnique(eq.heart) : null
  return [
    { key: 'weapon', label: '兵器', icon: 'weapon', name: weapon?.name || '', tip: weapon ? weapon.desc : '行囊中的兵器可在此装备，直接抬高战力' },
    { key: 'armor', label: '护甲', icon: 'armor', name: armor?.name || '', tip: armor ? armor.desc : '护甲能加厚气血与体力' },
    { key: 'heart', label: '心法', icon: 'meditate', name: heart?.name || '', tip: heart ? `${heart.desc} ${describeTechniqueEffect(heart.effect)}` : '学会心法后启用，修炼会随之精进' },
  ]
})

const affiliationLabel = computed(() => {
  const faction = currentAffiliation.value
  if (!faction) return '白身 · 尚无门路'
  return `${faction.name} · ${faction.titles[player.value.affiliationRank] || faction.titles[0]}`
})

function tryBreak() {
  if (!canBreak.value) {
    sfx.deny()
    return
  }
  performAction('breakthrough')
}
</script>
