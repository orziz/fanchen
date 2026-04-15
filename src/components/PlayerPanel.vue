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
        <div class="inline-list">
          <span class="tag">境界 {{ rankData.name }}</span>
          <span class="tag">灵石 {{ formatNumber(player.money) }}</span>
          <span class="tag">悟性 {{ round(playerInsight) }}</span>
          <span class="tag">战力 {{ round(playerPower) }}</span>
        </div>
      </div>

      <div class="badge-row">
        <div class="status-badge">
          <span class="micro-label">当前地点灵气</span>
          <strong>{{ currentLocation.aura }}</strong>
        </div>
        <div class="status-badge">
          <span class="micro-label">世界异象</span>
          <strong>{{ world.omen }}</strong>
        </div>
      </div>

      <div class="meter-stack">
        <MeterBar label="气血" :value="player.hp" :max="player.maxHp" class-name="hp" />
        <MeterBar label="真气" :value="player.qi" :max="player.maxQi" class-name="qi" />
        <MeterBar label="体力" :value="player.stamina" :max="player.maxStamina" class-name="stamina" />
        <MeterBar label="突破火候" :value="player.breakthrough" :max="nextBreakthroughNeed" class-name="breakthrough" />
        <MeterBar label="修为积累" :value="player.cultivation" :max="nextBreakthroughNeed" />
      </div>

      <div class="stat-grid">
        <div class="stat-box"><span>魅力</span><strong>{{ round(playerCharisma) }}</strong></div>
        <div class="stat-box"><span>突破率</span><strong>{{ Math.round((player.breakthroughRate || 0.55) * 100) }}%</strong></div>
        <div class="stat-box"><span>修炼加成</span><strong>{{ Math.round((1 + (player.cultivationBonus || 0)) * 100) }}%</strong></div>
        <div class="stat-box"><span>江湖归属</span><strong>{{ sect ? sect.name : currentAffiliation ? currentAffiliation.titles[player.affiliationRank] : '白身' }}</strong></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber, round } from '@/utils'
import MeterBar from './MeterBar.vue'

const store = useGameStore()
const {
  player, world, currentLocation, rankData, nextBreakthroughNeed,
  playerPower, playerInsight, playerCharisma, currentAffiliation, sect,
} = storeToRefs(store)
</script>
