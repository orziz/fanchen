<template>
  <section class="card panel-card">
    <div class="player-layout">
      <div class="player-header">
        <div>
          <p class="section-kicker">角色</p>
          <h2 class="player-name">{{ player.name }}</h2>
          <p class="player-title">
            {{ player.title }}，现居{{ currentLocation.name }}{{ sect ? `，掌${sect.name}` : currentAffiliation ? `，隶属${currentAffiliation.name}` : '，尚无门路' }}
          </p>
        </div>
        <UiPillRow>
          <UiPill variant="tag">境界 {{ rankData.name }}</UiPill>
          <UiPill variant="tag">灵石 {{ formatNumber(player.money) }}</UiPill>
          <UiPill variant="tag">悟性 {{ round(playerInsight) }}</UiPill>
          <UiPill variant="tag">战力 {{ round(playerPower) }}</UiPill>
        </UiPillRow>
      </div>

      <UiMetricGrid variant="badge" :items="badgeItems" />

      <div class="meter-stack">
        <MeterBar label="气血" :value="player.hp" :max="player.maxHp" class-name="hp" />
        <MeterBar label="真气" :value="player.qi" :max="player.maxQi" class-name="qi" />
        <MeterBar label="体力" :value="player.stamina" :max="player.maxStamina" class-name="stamina" />
        <MeterBar label="突破火候" :value="player.breakthrough" :max="nextBreakthroughNeed" class-name="breakthrough" />
        <MeterBar label="修为积累" :value="player.cultivation" :max="nextBreakthroughNeed" />
      </div>

      <UiMetricGrid variant="stat" :items="statItems" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber, round } from '@/utils'
import MeterBar from './MeterBar.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const {
  player, world, currentLocation, rankData, nextBreakthroughNeed,
  playerPower, playerInsight, playerCharisma, currentAffiliation, sect,
} = storeToRefs(store)

const badgeItems = computed(() => [
  { label: '当前地点灵气', value: currentLocation.value.aura },
  { label: '世界异象', value: world.value.omen },
])

const statItems = computed(() => [
  { label: '魅力', value: round(playerCharisma.value) },
  { label: '突破率', value: `${Math.round((player.value.breakthroughRate || 0.55) * 100)}%` },
  { label: '修炼加成', value: `${Math.round((1 + (player.value.cultivationBonus || 0)) * 100)}%` },
  {
    label: '江湖归属',
    value: sect.value ? sect.value.name : currentAffiliation.value ? currentAffiliation.value.titles[player.value.affiliationRank] : '白身',
  },
])
</script>
