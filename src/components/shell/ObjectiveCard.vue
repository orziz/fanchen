<template>
  <section class="side-panel objective-card" aria-label="志向">
    <span class="objective-card__kicker">{{ kicker }}</span>
    <h3 class="objective-card__title">{{ title }}</h3>
    <p class="objective-card__detail">{{ detail }}</p>
    <div v-if="summary" class="objective-card__milestone" :data-tip="summary.lines.join('；')" data-tip-title="刚做完的事">
      <span class="objective-card__milestone-kicker">刚才</span>
      <span class="objective-card__milestone-title">{{ summary.label }}</span>
      <span class="objective-card__milestone-progress">{{ summary.lines[0] || '' }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { currentGoal } from '@/systems/life/goals'

const store = useGameStore()

const goal = computed(() => {
  void store.game.life.goalsDone.length
  return currentGoal()
})

const kicker = computed(() => {
  if (store.game.life.ended) return '一世已尽'
  if (store.combat.currentEnemy) return '交战中'
  return store.game.life.goalsDone.includes('trial') ? '长志' : '志向 · 拜入玉阙行院'
})

const title = computed(() => {
  if (store.game.life.ended) return '这一世走到了尽头'
  if (store.combat.currentEnemy) return `${store.combat.currentEnemy.name}就在眼前`
  return goal.value?.title || '随心而行'
})

const detail = computed(() => {
  if (store.game.life.ended) return '坐化之后，还可再入轮回。'
  if (store.combat.currentEnemy) return '可以交给自动出招，也可以亲手出招、服药或设法撤走。'
  return goal.value?.detail || '眼下没有迫在眉睫的事，想做什么便做什么。'
})

const summary = computed(() => (store.game.life.runner ? null : store.game.life.lastSummary))
</script>
