<template>
  <section class="card panel-card dock-card">
    <div class="dock-layout">
      <div class="section-head compact">
        <div>
          <p class="section-kicker">即时</p>
          <h2>手动操作</h2>
        </div>
        <span class="tag">不改自动循环</span>
      </div>

      <div class="quick-actions command-action-grid">
        <button
          v-for="action in manualActions"
          :key="action.key"
          class="mini-button action-button-card command-action-card"
          @click="runQuickAction(action.key)"
        >
          <span class="command-action-theme">{{ action.theme }}</span>
          <strong>{{ action.label }}</strong>
          <span>{{ action.desc }}</span>
        </button>
      </div>

      <div class="dock-callout">
        <p class="section-kicker">操作说明</p>
        <p class="item-meta">这些动作都只执行一次，不会改掉长期挂机策略。想换长期节奏，去右侧打开策略盘。</p>
        <div class="item-actions">
          <button class="item-button" @click="openWindow('command')">打开策略盘</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWindows } from '@/composables/useWindows'
import { setMode, attemptBreakthrough } from '@/systems/player'
import { performAction } from '@/systems/world'

const store = useGameStore()
const { player, currentAffiliation, sect } = storeToRefs(store)
const { openWindow } = useWindows()

const manualActions = computed(() => {
  const g = store.game
  const s = sect.value
  const aff = currentAffiliation.value
  return [
    { key: 'meditate', label: '手动修炼', desc: '静坐一轮，补修为与真气。', theme: '补修为' },
    { key: 'breakthrough', label: '主动冲关', desc: '火候够了就立刻试破境。', theme: '抢关口' },
    { key: 'quest', label: '追查机缘', desc: '跑一趟差事，碰碰风闻与奇遇。', theme: '探风闻' },
    {
      key: 'trade',
      label: g.player.tradeRun ? '继续跑商' : '顺手做买卖',
      desc: g.player.tradeRun ? `${g.player.tradeRun.originName}到${g.player.tradeRun.destinationName}的货路还在跑。` : '跑一笔货，快进一轮营生。',
      theme: '滚营生',
    },
    { key: 'rest', label: '短暂调息', desc: '先把状态拉回安全线。', theme: '回状态' },
    {
      key: s ? 'sect' : 'affiliation',
      label: s ? '处理宗门事务' : aff ? '查看门内事务' : '去投门路',
      desc: s ? '去处理山门、弟子和传功。' : aff ? '去处理当前门路。' : '先去势力页找个落脚点。',
      theme: s ? '理山门' : '看门路',
    },
  ]
})

function runQuickAction(action: string) {
  if (action === 'rest') {
    store.adjustResource('hp', 18, 'maxHp')
    store.adjustResource('qi', 16, 'maxQi')
    store.adjustResource('stamina', 20, 'maxStamina')
    store.appendLog('你暂时收束心神，运气回息。', 'info')
    return
  }
  if (action === 'breakthrough') {
    attemptBreakthrough()
    return
  }
  performAction(action)
}
</script>
