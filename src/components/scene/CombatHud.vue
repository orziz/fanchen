<template>
  <div v-if="enemy" class="combat-hud">
    <div class="combat-hud__plate combat-hud__plate--hero">
      <strong>{{ player.name }}</strong>
      <InkBar tone="hp" :value="player.hp" :max="player.maxHp" compact />
      <InkBar tone="qi" :value="player.qi" :max="player.maxQi" compact />
    </div>

    <div class="combat-hud__plate combat-hud__plate--enemy" :data-tip="rewardTip" data-tip-title="胜则可得">
      <div class="combat-hud__name">
        <span v-if="enemy.boss" class="tag tag--danger">首领</span>
        <strong>{{ enemy.name }}</strong>
      </div>
      <InkBar tone="enemy" :value="enemy.hp" :max="enemy.maxHp" :text="`${enemy.hp}`" compact />
      <div class="combat-hud__affixes">
        <span v-for="affix in affixes" :key="affix.id" class="tag tag--gold" :data-tip="affix.desc">{{ affix.label }}</span>
        <span class="tag">体魄 {{ Math.round(enemy.power) }}</span>
      </div>
    </div>

    <TransitionGroup name="combat-line" tag="ol" class="combat-hud__log">
      <li v-for="line in lines" :key="line.key" :class="`is-${line.type}`">{{ line.text }}</li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { MONSTER_AFFIXES } from '@/config'
import InkBar from '@/components/common/InkBar.vue'

const store = useGameStore()
const { player, combat } = storeToRefs(store)

const enemy = computed(() => combat.value.currentEnemy)
const affixes = computed(() => (enemy.value?.affixIds || []).map(id => MONSTER_AFFIXES.find(a => a.id === id)).filter(Boolean) as typeof MONSTER_AFFIXES)
const rewardTip = computed(() => {
  const r = enemy.value?.rewards
  return r ? `灵石 ${r.money} · 修为 ${Math.round(r.cultivation)} · 火候 ${Math.round(r.breakthrough)}${r.reputation ? ` · 声望 ${Math.round(r.reputation)}` : ''}` : ''
})
const lines = computed(() => combat.value.history.slice(0, 3).map((entry, index) => ({
  ...entry,
  key: `${combat.value.history.length - index}:${entry.text}`,
})))
</script>
