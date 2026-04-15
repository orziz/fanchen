<template>
  <nav class="game-dock">
    <div class="dock-tabs">
      <button
        v-for="tab in STAGE_TABS"
        :key="tab.id"
        class="dock-tab-btn"
        :class="{ active: activeTab === tab.id }"
        type="button"
        :title="tab.label"
        @click="setTab(tab.id)"
      >
        <span class="dock-tab-label-full">{{ tab.label }}</span>
        <span class="dock-tab-label-short">{{ tab.shortLabel }}</span>
      </button>
    </div>
    <div class="dock-quick">
      <div class="dock-hotbar">
        <button
          v-for="action in manualActions"
          :key="action.key"
          class="dock-hotbar-btn"
          :class="{ active: isActionHighlighted(action.key) }"
          type="button"
          :title="action.title"
          @click="performManualAction(action.key)"
        >{{ action.label }}</button>
      </div>
      <div class="dock-hotbar-state">
        <div class="dock-hotbar-copy">
          <span class="dock-hotbar-kicker">当前策略</span>
          <button class="dock-strategy-btn" type="button" :title="`快速切到${nextModeLabel}`" @click="cycleMode">
            {{ currentModeLabel }}
          </button>
        </div>
        <span class="dock-hotbar-divider">·</span>
        <span class="dock-hotbar-action">{{ currentActionLabel }}</span>
        <span class="dock-hotbar-divider">·</span>
        <span class="dock-hotbar-location">所在 {{ currentLocationLabel }}</span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useStage, STAGE_TABS } from '@/composables/useStage'
import { ACTION_META, MODE_OPTIONS } from '@/config'
import { getModeLabel } from '@/composables/useUIHelpers'
import { performAction } from '@/systems/world'
import { setMode } from '@/systems/player'

const { activeTab, setTab } = useStage()
const store = useGameStore()
const { player, currentLocation } = storeToRefs(store)

const QUICK_MODE_OPTIONS = MODE_OPTIONS
const ACTION_ORDER = ['rest', 'meditate', 'train', 'trade', 'quest', 'hunt', 'auction', 'breakthrough', 'sect'] as const
const ACTION_LABELS: Record<string, string> = {
  rest: '调息',
  meditate: '修炼',
  train: '炼体',
  trade: '行商',
  quest: '探风闻',
  hunt: '历练',
  auction: '拍市',
  breakthrough: '冲关',
  sect: '门内事',
}
const ACTION_TITLES: Record<string, string> = {
  rest: '暂时调息，回复气血体力',
  meditate: '静坐运息，补充修为与真气',
  train: '练体打熬，稳步夯实体魄',
  trade: '亲自盯一轮买卖和货路',
  quest: '追查机缘，碰碰风闻与奇遇',
  hunt: '主动历练，试试当前地界的险路',
  auction: '去拍市看看有没有新货与抬价机会',
  breakthrough: '尝试冲破当前境界',
  sect: '处理当前地点可做的门内事务',
}

const currentModeLabel = computed(() => getModeLabel(player.value.mode))
const currentActionKey = computed(() => player.value.action || '')
const currentActionLabel = computed(() => currentActionKey.value === 'combat'
  ? '交战中'
  : ACTION_META[currentActionKey.value]?.label || '未定行动')
const currentLocationLabel = computed(() => currentLocation.value.name)

const nextModeId = computed(() => {
  const currentIndex = QUICK_MODE_OPTIONS.findIndex(mode => mode.id === player.value.mode)
  if (currentIndex < 0) return QUICK_MODE_OPTIONS[0]?.id || player.value.mode
  return QUICK_MODE_OPTIONS[(currentIndex + 1) % QUICK_MODE_OPTIONS.length]?.id || player.value.mode
})

const nextModeLabel = computed(() => getModeLabel(nextModeId.value))

const manualActions = computed(() => {
  const actionKeys = new Set<string>(['rest', ...currentLocation.value.actions])
  if (player.value.tradeRun) actionKeys.add('trade')
  if (player.value.breakthrough >= store.nextBreakthroughNeed * 0.75 && currentLocation.value.actions.includes('breakthrough')) {
    actionKeys.add('breakthrough')
  }

  return ACTION_ORDER
    .filter(actionKey => actionKeys.has(actionKey))
    .map(actionKey => ({
      key: actionKey,
      label: actionKey === 'trade' && player.value.tradeRun
        ? player.value.locationId === player.value.tradeRun.destinationId ? '交货' : '跑商'
        : ACTION_LABELS[actionKey],
      title: ACTION_TITLES[actionKey] || ACTION_META[actionKey]?.label || actionKey,
    }))
})

function isActionHighlighted(action: string) {
  return currentActionKey.value === action
}

function cycleMode() {
  setMode(nextModeId.value)
}

function performManualAction(actionKey: string) {
  if (actionKey === 'breakthrough') {
    player.value.action = 'breakthrough'
    if (player.value.breakthrough >= store.nextBreakthroughNeed * 0.75) {
      performAction('breakthrough')
    } else {
      store.appendLog('火候尚未到位，不宜强行冲关。', 'warn')
    }
    return
  }

  const feedbackText: Record<string, string> = {
    rest: '你暂时收束心神，调息回元。',
    meditate: '你盘膝静坐，运转一轮内息。',
    train: '你亲自下场练体打熬，先把筋骨撑稳。',
    trade: player.value.tradeRun
      ? player.value.locationId === player.value.tradeRun.destinationId
        ? '你亲自把这趟货路收口，准备当场交割。'
        : '你亲自盯着这趟货路，准备继续前压。'
      : '你亲自去市面上跑一轮买卖。',
    quest: '你压低气息，先去追一圈附近风闻。',
    hunt: '你决定亲自出门历练一轮。',
    auction: '你亲自去拍市看看今夜的动静。',
    sect: '你先亲自去处理这一轮门内事务。',
  }
  if (feedbackText[actionKey]) store.appendLog(feedbackText[actionKey], 'action')
  performAction(actionKey)
}
</script>
