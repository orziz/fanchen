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
        :max="hasNextRank ? need : player.cultivation || 1"
        :data-tip="cultivationTip"
        data-tip-title="修为"
      />
      <InkBar
        label="年岁"
        icon="sun"
        tone="breakthrough"
        :value="age"
        :max="lifespan"
        :text="`${age} / ${lifespan} 岁`"
        :data-tip="`寿元${lifespan}岁，还剩${lifespan - age}年。破境可延寿。`"
        data-tip-title="年岁与寿元"
      />
      <p class="character-card__hint">{{ growthHint }}</p>
    </div>

    <div class="character-card__vitals">
      <InkBar label="气血" icon="hp" tone="hp" :value="player.hp" :max="player.maxHp" compact />
      <div class="character-card__injury" :class="`is-level-${player.injury}`" :data-tip="injuryTip" data-tip-title="伤势">
        <GameIcon name="warning" />
        <span>{{ injuryText }}</span>
      </div>
    </div>

    <dl class="character-card__stats">
      <div v-for="stat in stats" :key="stat.label" :data-tip="stat.tip" :data-tip-title="stat.label">
        <dt><GameIcon :name="stat.icon" />{{ stat.label }}</dt>
        <dd class="num">{{ stat.value }}</dd>
      </div>
    </dl>

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
import { RANKS, getItem, getTechnique } from '@/config'
import { describeTechniqueEffect } from '@/composables/useUIHelpers'
import { useBooks } from '@/composables/useBooks'
import { ageOf, breakthroughIssue, hasHeartMethod, lifespanOf, nextRealmNeed } from '@/systems/life/cultivation'
import { injuryLabel } from '@/systems/life/effects'
import GameIcon from '@/components/common/GameIcon.vue'
import InkBar from '@/components/common/InkBar.vue'

const store = useGameStore()
const { player, rankData, hasNextRank, currentLocation, currentAffiliation, world, playerPower, playerInsight, playerCharisma } = storeToRefs(store)
const { openBook } = useBooks()

const nextRankName = computed(() => RANKS[player.value.rankIndex + 1]?.name || '')
const need = computed(() => nextRealmNeed(player.value.rankIndex))
const age = computed(() => { void world.value.day; return ageOf(player.value) })
const lifespan = computed(() => lifespanOf(player.value))

const growthHint = computed(() => {
  const p = player.value
  if (!hasNextRank.value) return '已到当前境界尽头，只能继续温养根基。'
  if (p.cultivation < need.value) {
    if (p.rankIndex === 0) return `练体攒修为，再积 ${Math.ceil(need.value - p.cultivation)} 便可冲关练力。`
    if (p.rankIndex === 1 && !hasHeartMethod(p)) return '没有心法引气，静坐几乎感不到气。先求一门心法。'
    return `静坐攒修为，再积 ${Math.ceil(need.value - p.cultivation)} 便可冲关${nextRankName.value}。`
  }
  return breakthroughIssue(p, currentLocation.value) || '修为已满，此地便可冲关。'
})

const cultivationTip = computed(() => `这一境攒满 ${need.value} 修为才能冲关。灵气越足、心法越好，静坐越快；带伤时要慢上几分。`)

const injuryText = computed(() => (player.value.injury ? injuryLabel(player.value.injury) : '身无伤病'))
const injuryTip = computed(() => (player.value.injury
  ? `伤势 ${player.value.injury} 级：气血上限、修行快慢与各项检定都受拖累。歇满五日好一级，草药与医馆好得更快。`
  : '打输、失手、挨饿都会带伤。'))

const stats = computed(() => [
  { label: '体魄', icon: 'power', value: Math.round(playerPower.value), tip: '力战与吃力气的检定看体魄；练体与破境都会长' },
  { label: '悟性', icon: 'insight', value: Math.round(playerInsight.value), tip: '静坐快慢、冲关把握与动脑子的检定看悟性' },
  { label: '魅力', icon: 'charisma', value: Math.round(playerCharisma.value), tip: '讨价还价、说服与结交看魅力' },
])

const gear = computed(() => {
  const eq = player.value.equipment
  const weapon = eq.weapon ? getItem(eq.weapon) : null
  const armor = eq.armor ? getItem(eq.armor) : null
  const heart = eq.heart ? getTechnique(eq.heart) : null
  return [
    { key: 'weapon', label: '兵器', icon: 'weapon', name: weapon?.name || '', tip: weapon ? weapon.desc : '行囊中的兵器可在此装备，直接抬高体魄' },
    { key: 'armor', label: '护甲', icon: 'armor', name: armor?.name || '', tip: armor ? armor.desc : '护甲能加厚气血' },
    { key: 'heart', label: '心法', icon: 'meditate', name: heart?.name || '', tip: heart ? `${heart.desc} ${describeTechniqueEffect(heart.effect)}` : '有了心法才能引气感气' },
  ]
})

const affiliationLabel = computed(() => {
  const faction = currentAffiliation.value
  if (!faction) return '白身 · 尚无门路'
  return `${faction.name} · ${faction.titles[player.value.affiliationRank] || faction.titles[0]}`
})
</script>
