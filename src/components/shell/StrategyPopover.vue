<template>
  <div class="strategy-popover" role="dialog" aria-label="挂机策略">
    <header class="strategy-popover__head">
      <span class="strategy-popover__kicker">局势</span>
      <p class="strategy-popover__advice">{{ recommendation.title }}</p>
    </header>
    <ul class="strategy-popover__list">
      <li v-for="mode in modes" :key="mode.id">
        <button class="strategy-option" :class="{ 'is-current': mode.id === player.mode, 'is-recommended': mode.id === recommendation.mode }" type="button" @click="choose(mode.id)">
          <span class="strategy-option__name">{{ mode.label }}</span>
          <span v-if="mode.id === recommendation.mode" class="strategy-option__tag">宜</span>
          <span class="strategy-option__desc">{{ mode.desc }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { MODE_OPTIONS, REALM_TEMPLATES } from '@/config'
import { setMode } from '@/systems/player'
import { sfx } from '@/audio/sfx'

const emit = defineEmits<{ close: [] }>()

const store = useGameStore()
const { player, world, currentLocation, currentAffiliation, nextBreakthroughNeed } = storeToRefs(store)
const modes = MODE_OPTIONS

function pct(value: number, max: number) {
  return max > 0 ? Math.round((value / max) * 100) : 0
}

/** 局势判断：据伤势、火候、门路与本钱给出建议的挂机打算。 */
const recommendation = computed(() => {
  const p = player.value
  const realmActive = Boolean(world.value.realm.activeRealmId && REALM_TEMPLATES.some(r => r.id === world.value.realm.activeRealmId))
  const assets = p.assets.farms.length + p.assets.workshops.length + p.assets.shops.length
  if (pct(p.hp, p.maxHp) < 42 || pct(p.qi, p.maxQi) < 34 || pct(p.stamina, p.maxStamina) < 30) {
    return { title: '根基偏虚，先收手回息，再谈闯荡冲关。', mode: 'cultivation' }
  }
  if (realmActive) return { title: '异象显世，正是出门闯一闯的时候。', mode: 'adventure' }
  if (pct(p.breakthrough, nextBreakthroughNeed.value) >= 85) {
    return { title: currentLocation.value.actions.includes('breakthrough') ? '火候将满，此地可冲关。' : '火候将满，宜寻灵地冲关。', mode: 'cultivation' }
  }
  if (!currentAffiliation.value) return { title: '还没站稳门路，边维生边探路。', mode: 'balanced' }
  if (!assets && p.money >= 120) return { title: '手里已有本钱，可以开始营生置业。', mode: 'merchant' }
  return { title: `落脚${currentLocation.value.name}，按眼下打算稳步推进。`, mode: p.mode === 'manual' ? 'balanced' : p.mode }
})

function choose(modeId: string) {
  sfx.confirm()
  setMode(modeId)
  emit('close')
}
</script>
