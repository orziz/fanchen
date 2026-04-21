<template>
  <section class="card panel-card dock-card">
    <div class="dock-layout">
      <UiCardHeader kicker="即时" title="手动操作" title-tag="h2" head-class="section-head compact">
        <template #aside>
          <UiPill variant="tag">不改自动循环</UiPill>
        </template>
      </UiCardHeader>

      <UiActionGroup variant="quick" class-name="command-action-grid">
        <UiActionCardButton
          v-for="action in manualActions"
          :key="action.key"
          button-class="command-action-card"
          theme-class="command-action-theme"
          :theme="action.theme"
          :title="action.label"
          :description="action.desc"
          :disabled="action.disabled"
          :disabled-reason="action.reason"
          @click="runQuickAction(action.key)"
        />
      </UiActionGroup>

      <div class="dock-callout">
        <p class="section-kicker">操作说明</p>
        <p class="item-meta">这些动作都只执行一次，不会改掉长期挂机策略。想换长期节奏，去右侧打开策略盘。</p>
        <UiActionGroup>
          <button class="item-button" @click="openWindow('command')">打开策略盘</button>
        </UiActionGroup>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { PLAYER_SECT_ENABLED, getBreakthroughActionDescription, getBreakthroughDisabledReason } from '@/config'
import { useWindows } from '@/composables/useWindows'
import { attemptBreakthrough } from '@/systems/player'
import { performAction } from '@/systems/world'
import UiActionCardButton from '@/components/ui/UiActionCardButton.vue'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPill from '@/components/ui/UiPill.vue'

const store = useGameStore()
const { player, currentAffiliation, sect, hasNextRank, nextBreakthroughNeed, breakthroughReadyNeed } = storeToRefs(store)
const { openWindow } = useWindows()

const canManualBreakthrough = computed(() =>
  hasNextRank.value && player.value.breakthrough >= breakthroughReadyNeed.value
)

const manualActions = computed(() => {
  const g = store.game
  const s = PLAYER_SECT_ENABLED ? sect.value : null
  const archivedSect = !PLAYER_SECT_ENABLED ? sect.value : null
  const aff = currentAffiliation.value
  const breakthroughReason = getBreakthroughDisabledReason({
    hasNextRank: hasNextRank.value,
    nextBreakthroughNeed: nextBreakthroughNeed.value,
    cultivation: player.value.cultivation,
    breakthrough: player.value.breakthrough,
    rankIndex: player.value.rankIndex,
  })
  return [
    { key: 'meditate', label: '手动修炼', desc: '静坐一轮，补修为与真气。', theme: '补修为', disabled: false, reason: '' },
    {
      key: 'breakthrough',
      label: '主动冲关',
      desc: getBreakthroughActionDescription({
        hasNextRank: hasNextRank.value,
        nextBreakthroughNeed: nextBreakthroughNeed.value,
        cultivation: player.value.cultivation,
        breakthrough: player.value.breakthrough,
        rankIndex: player.value.rankIndex,
      }),
      theme: '抢关口',
      disabled: !canManualBreakthrough.value,
      reason: breakthroughReason,
    },
    { key: 'quest', label: '追查机缘', desc: '跑一趟差事，碰碰风闻与奇遇。', theme: '探风闻', disabled: false, reason: '' },
    {
      key: 'trade',
      label: g.player.tradeRun ? '继续跑商' : '顺手做买卖',
      desc: g.player.tradeRun ? `${g.player.tradeRun.originName}到${g.player.tradeRun.destinationName}的货路还在跑。` : '跑一笔货，快进一轮营生。',
      theme: '滚营生',
      disabled: false,
      reason: '',
    },
    { key: 'rest', label: '短暂调息', desc: '先把状态拉回安全线。', theme: '回状态', disabled: false, reason: '' },
    {
      key: s ? 'sect' : 'affiliation',
      label: s ? '处理宗门事务' : archivedSect ? '宗门已封山' : aff ? '查看门内事务' : '去投门路',
      desc: s ? '去处理宗门、弟子和传功。' : archivedSect ? '旧宗门仅保留旧账与旧人，不再继续运转。' : aff ? '去处理当前门路。' : '先去势力页找个落脚点。',
      theme: s ? '理宗门' : archivedSect ? '封山门' : '看门路',
      disabled: Boolean(archivedSect),
      reason: archivedSect ? '自建宗门暂时关闭，可去宗门页查看封存信息。' : '',
    },
  ]
})

function runQuickAction(action: string) {
  const actionMeta = manualActions.value.find(entry => entry.key === action)
  if (actionMeta?.disabled) return
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
