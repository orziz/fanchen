<template>
  <footer class="action-dock">
    <div class="action-dock__status">
      <GameIcon :name="statusIcon" />
      <div>
        <strong>{{ statusTitle }}</strong>
        <span>{{ statusSub }}</span>
      </div>
    </div>

    <div class="action-dock__actions" role="toolbar" :aria-label="fighting ? '交战' : '行动'">
      <template v-if="fighting">
        <button v-for="cmd in combatCommands" :key="cmd.key" class="action-btn" :class="[`action-btn--${cmd.key}`, { 'is-on': cmd.on }]" type="button" :disabled="cmd.disabled" :data-tip="cmd.tip" @click="cmd.run">
          <GameIcon :name="cmd.icon" />
          <span>{{ cmd.label }}</span>
        </button>
      </template>
      <template v-else>
        <button
          v-for="action in actions"
          :key="action.key"
          class="action-btn"
          :class="{ 'is-current': action.current, 'is-ready': action.key === 'breakthrough' && !action.reason }"
          type="button"
          :aria-disabled="Boolean(action.reason)"
          :data-tip="action.reason || action.tip"
          :data-tip-title="action.label"
          @click="run(action.key, action.reason)"
        >
          <GameIcon :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </template>
    </div>

    <div class="action-dock__controls">
      <button class="strategy-btn" type="button" :class="{ 'is-open': strategyOpen }" data-tip="挂机时自动遵循的长线打算" @click="$emit('toggle-strategy')">
        <GameIcon name="strategy" />
        <span class="strategy-btn__label">{{ modeLabel }}</span>
        <GameIcon name="chevronDown" />
      </button>
      <div class="speed-control" role="group" aria-label="时间流速">
        <button class="speed-btn" type="button" :class="{ 'is-active': paused }" :data-tip="paused ? '继续（空格）' : '暂停（空格）'" :aria-label="paused ? '继续' : '暂停'" @click="$emit('toggle-pause')">
          <GameIcon :name="paused ? 'play' : 'pause'" />
        </button>
        <button v-for="option in speeds" :key="option.value" class="speed-btn num" type="button" :class="{ 'is-active': !paused && speed === option.value }" @click="setSpeed(option.value)">
          {{ option.label }}
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, LOCATION_MAP, SPEED_OPTIONS } from '@/config'
import { iconForAction } from '@/art/icons'
import { getModeLabel } from '@/composables/useUIHelpers'
import { getActionUnavailableReason, performAction } from '@/systems/world'
import { processBattleRound } from '@/systems/combat'
import { getPreferredSpellId } from '@/systems/techniques'
import { getManualActionLockReason } from '@/systems/tutorial'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

defineProps<{ paused: boolean; strategyOpen: boolean }>()
const emit = defineEmits<{ 'toggle-pause': []; 'toggle-strategy': []; 'resume': [] }>()

const store = useGameStore()
const { player, combat, currentLocation, story, hasNextRank, cultivationGateNeed, breakthroughReadyNeed } = storeToRefs(store)
const speed = computed(() => store.speed)

const fighting = computed(() => Boolean(combat.value.currentEnemy))
const speeds = SPEED_OPTIONS
const modeLabel = computed(() => getModeLabel(player.value.mode))

const ACTION_ORDER = ['rest', 'meditate', 'train', 'trade', 'hunt', 'quest', 'auction', 'sect', 'breakthrough'] as const
const LABELS: Record<string, string> = {
  rest: '调息', meditate: '修炼', train: '炼体', trade: '行商', quest: '探风闻', hunt: '历练', auction: '拍市', breakthrough: '破境', sect: '门内事',
}
const TIPS: Record<string, string> = {
  rest: '收束心神，回复气血、真气与体力',
  meditate: '静坐运息，积攒修为与火候',
  train: '打熬筋骨，涨修为也涨战力',
  trade: '亲自跑一轮买卖或推进货路',
  quest: '追查风闻差事，常有机缘与遭遇',
  hunt: '到险处历练，收获与凶险并存',
  auction: '去拍市看看新货与抬价',
  sect: '处理此地门内事务',
  breakthrough: '以当前火候冲击下一重境界',
}

const breakReady = computed(() => hasNextRank.value
  && player.value.cultivation >= cultivationGateNeed.value
  && player.value.breakthrough >= breakthroughReadyNeed.value)

const actions = computed(() => {
  void story.value.flags
  const keys = new Set<string>(['rest', ...currentLocation.value.actions])
  if (player.value.tradeRun) keys.add('trade')
  if (breakReady.value) keys.add('breakthrough')
  return ACTION_ORDER.filter(key => keys.has(key)).map(key => {
    const reason = getManualActionLockReason(key, story.value, player.value) || getActionUnavailableReason(key)
    const tradeLabel = player.value.tradeRun
      ? (player.value.locationId === player.value.tradeRun.destinationId ? '交货' : '押货')
      : LABELS.trade
    return {
      key,
      label: key === 'trade' ? tradeLabel : LABELS[key],
      icon: iconForAction(key),
      tip: TIPS[key],
      reason,
      current: player.value.action === key && !player.value.travelPlan,
    }
  })
})

function run(key: string, reason: string | null) {
  if (reason) {
    sfx.deny()
    return
  }
  sfx.action()
  performAction(key)
}

const combatCommands = computed(() => {
  const spellId = getPreferredSpellId(player.value.qi)
  const auto = combat.value.autoBattle
  const round = (action: string, skill: string | null = null) => () => {
    if (!combat.value.currentEnemy) return
    sfx.action()
    processBattleRound(action, skill)
  }
  return [
    { key: 'attack', label: '出手', icon: 'combat', tip: '以兵器与拳脚硬攻', disabled: false, on: false, run: round('attack') },
    { key: 'skill', label: '术法', icon: 'spell', tip: spellId ? '施展已学术法，耗真气' : '尚无可用术法，或真气不足', disabled: !spellId, on: false, run: round('skill', spellId) },
    { key: 'defend', label: '守势', icon: 'defend', tip: '稳住身形，硬接下一击', disabled: false, on: false, run: round('defend') },
    { key: 'item', label: '服药', icon: 'potion', tip: '服下行囊里的疗伤药食', disabled: false, on: false, run: round('item') },
    { key: 'flee', label: '撤走', icon: 'flee', tip: combat.value.currentEnemy?.boss ? '秘境退路已封' : '设法脱身，不一定成功', disabled: Boolean(combat.value.currentEnemy?.boss), on: false, run: round('flee') },
    {
      key: 'auto', label: auto ? '自动中' : '自动', icon: 'auto', tip: auto ? '点此改为亲手出招' : '交给本能自动出招', disabled: false, on: auto,
      run: () => { sfx.confirm(); store.toggleAutoBattle(); if (store.combat.autoBattle) emit('resume') },
    },
  ]
})

const statusIcon = computed(() => (fighting.value ? 'combat' : player.value.travelPlan ? 'travel' : iconForAction(player.value.action)))
const statusTitle = computed(() => {
  if (fighting.value) return `与${combat.value.currentEnemy!.name}交手`
  const plan = player.value.travelPlan
  if (plan) return `赶往${plan.destinationName}`
  return ACTION_META[player.value.action]?.label || '歇脚'
})
const statusSub = computed(() => {
  const plan = player.value.travelPlan
  if (plan) {
    const next = plan.route[plan.nextIndex]
    return next ? `下一站 ${LOCATION_MAP.get(next)?.name || next}` : '即将抵达'
  }
  return `${currentLocation.value.name} · 第${store.world.day}日`
})

function setSpeed(value: number) {
  sfx.confirm()
  store.speed = value
  emit('resume')
}
</script>
