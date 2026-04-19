<template>
  <div class="command-layout refined command-hub">
    <!-- Hero / Situation Assessment -->
    <section class="command-hero standout">
      <div class="command-hero-top">
        <div class="command-hero-copy">
          <p class="section-kicker">局势判断</p>
          <h3 class="command-hero-title">{{ recommendation.title }}</h3>
          <p class="panel-intro compact">{{ recommendation.desc }}</p>
        </div>
        <div class="command-reading-grid">
          <article class="command-reading-card">
            <span>根基状态</span>
            <strong>{{ Math.min(hpPercent, qiPercent, staminaPercent) }}%</strong>
            <p>气血 {{ hpPercent }}% / 真气 {{ qiPercent }}% / 体力 {{ staminaPercent }}%</p>
          </article>
          <article class="command-reading-card">
            <span>修为底子</span>
            <strong>{{ cultivationPercent }}%</strong>
            <p>{{ cultivationStatus }}</p>
          </article>
          <article class="command-reading-card">
            <span>破境火候</span>
            <strong>{{ breakthroughPercent }}%</strong>
            <p>{{ breakthroughStatus }}</p>
          </article>
          <article class="command-reading-card">
            <span>当前门路</span>
            <strong>{{ routeLabel }}</strong>
            <p>{{ routeDesc }}</p>
          </article>
        </div>
      </div>
      <UiPillRow class-name="command-chip-row">
        <UiPill variant="command-chip" tone="active">当前策略：{{ currentModeLabel }}</UiPill>
        <UiPill variant="command-chip">落脚：{{ currentLocation.name }}</UiPill>
        <UiPill variant="command-chip">灵气 {{ currentLocation.aura }}</UiPill>
        <UiPill variant="command-chip" :tone="dangerClass">险度 {{ currentLocation.danger }}</UiPill>
        <UiPill variant="command-chip" :tone="activeRealm ? 'active' : ''">{{ activeRealm ? `${activeRealm.name}现世` : world.omen }}</UiPill>
      </UiPillRow>
    </section>

    <!-- Mode Selection -->
    <section class="command-section standout">
      <UiCardHeader kicker="挂机策略" title="今日主路" head-class="section-head compact">
        <template #aside>
          <UiPill variant="tag">推荐：{{ getModeLabel(recommendation.preferredMode) }}</UiPill>
        </template>
      </UiCardHeader>
      <p class="panel-intro compact">此处只定长线门路，短手动作仍归你临机掌握。</p>
      <div class="mode-grid command-mode-grid command-strategy-stack">
        <button
          v-for="mode in MODE_OPTIONS" :key="mode.id"
          :class="['mode-button', 'mode-button-card', 'command-strategy-card',
            mode.id === player.mode ? 'active' : '',
            mode.id === recommendation.preferredMode ? 'recommended' : '']"
          :title="mode.desc"
          @click="setMode(mode.id)"
        >
          <div class="command-strategy-meta">
            <strong>{{ mode.label }}</strong>
            <UiPillRow as="span" class-name="command-badge-row">
              <UiPill v-if="mode.id === player.mode" as="span" variant="command-pill" tone="current">当前</UiPill>
              <UiPill v-if="mode.id === recommendation.preferredMode" as="span" variant="command-pill" tone="recommended">局势推荐</UiPill>
            </UiPillRow>
          </div>
          <span>{{ mode.desc }}</span>
        </button>
      </div>
      <div :class="['command-footnote', player.mode === 'manual' ? 'manual' : '']">
        <strong>{{ player.mode === 'manual' ? '手动操作已接管' : `当前自动遵循"${currentModeLabel}"` }}</strong>
        <span>{{ player.mode === 'manual' ? '世界仍会照常流转，但不会替你自动修炼、跑商或接差事。' : '局势一变，就立刻改换门路，别让人和货空耗在路上。' }}</span>
      </div>
    </section>

    <section class="command-section command-action-section standout">
      <UiCardHeader kicker="临机手动" title="谋局台手动操作" head-class="section-head compact">
        <template #aside>
          <UiPill variant="tag">{{ manualActionTag }}</UiPill>
        </template>
      </UiCardHeader>
      <p class="panel-intro compact">{{ breakthroughHint }}</p>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import {
  MODE_OPTIONS,
  REALM_TEMPLATES,
  getBreakthroughActionDescription,
  getBreakthroughDisabledReason,
  getBreakthroughHintCopy,
  getBreakthroughStatusCopy,
  getCultivationStatusCopy,
} from '@/config'
import { getModeLabel } from '@/composables/useUIHelpers'
import { attemptBreakthrough, setMode } from '@/systems/player'
import { performAction } from '@/systems/world'
import UiActionCardButton from '@/components/ui/UiActionCardButton.vue'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const {
  player, world, currentLocation, currentAffiliation, sect, hasNextRank, nextBreakthroughNeed,
  cultivationGateNeed, breakthroughReadyNeed,
} = storeToRefs(store)

function getPercent(value: number, max: number) {
  if (!max) return 0
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)))
}

const hpPercent = computed(() => getPercent(player.value.hp, player.value.maxHp))
const qiPercent = computed(() => getPercent(player.value.qi, player.value.maxQi))
const staminaPercent = computed(() => getPercent(player.value.stamina, player.value.maxStamina))
const breakthroughPercent = computed(() => getPercent(player.value.breakthrough, nextBreakthroughNeed.value))
const cultivationPercent = computed(() => getPercent(player.value.cultivation, cultivationGateNeed.value))
const cultivationStatus = computed(() => getCultivationStatusCopy({
  hasNextRank: hasNextRank.value,
  nextBreakthroughNeed: nextBreakthroughNeed.value,
  cultivation: player.value.cultivation,
  breakthrough: player.value.breakthrough,
  rankIndex: player.value.rankIndex,
  aura: currentLocation.value.aura,
}))
const breakthroughStatus = computed(() => getBreakthroughStatusCopy({
  hasNextRank: hasNextRank.value,
  nextBreakthroughNeed: nextBreakthroughNeed.value,
  cultivation: player.value.cultivation,
  breakthrough: player.value.breakthrough,
  rankIndex: player.value.rankIndex,
  aura: currentLocation.value.aura,
}))

const activeRealm = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id) || null : null
})

const assetCount = computed(() =>
  player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length
)

const currentModeLabel = computed(() => getModeLabel(player.value.mode))

const dangerClass = computed(() => {
  const d = currentLocation.value.danger
  return d >= 6 ? 'warn' : d >= 4 ? 'steady' : 'good'
})

const routeLabel = computed(() =>
  sect.value ? sect.value.name : currentAffiliation.value ? currentAffiliation.value.name : '白身'
)

const routeDesc = computed(() => {
  if (sect.value) return '已立宗门，可直接处理门内事务。'
  if (currentAffiliation.value) return `现为${currentAffiliation.value.titles[player.value.affiliationRank]}。`
  return `资产 ${assetCount.value} 处，仍需继续摸门路。`
})

const breakthroughReady = computed(() =>
  hasNextRank.value && player.value.breakthrough >= breakthroughReadyNeed.value
)

const breakthroughHint = computed(() => {
  return getBreakthroughHintCopy({
    hasNextRank: hasNextRank.value,
    nextBreakthroughNeed: nextBreakthroughNeed.value,
    cultivation: player.value.cultivation,
    breakthrough: player.value.breakthrough,
    rankIndex: player.value.rankIndex,
    aura: currentLocation.value.aura,
  })
})

const manualActionTag = computed(() => {
  if (breakthroughReady.value) return '可直接冲关'
  if (player.value.mode === 'manual') return '手动接管中'
  return '一次一发'
})

const manualActions = computed(() => {
  const tradeRun = player.value.tradeRun
  const breakthroughReason = getBreakthroughDisabledReason({
    hasNextRank: hasNextRank.value,
    nextBreakthroughNeed: nextBreakthroughNeed.value,
    cultivation: player.value.cultivation,
    breakthrough: player.value.breakthrough,
    rankIndex: player.value.rankIndex,
    aura: currentLocation.value.aura,
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
        aura: currentLocation.value.aura,
      }),
      theme: '抢关口',
      disabled: !breakthroughReady.value,
      reason: breakthroughReason,
    },
    { key: 'quest', label: '追查机缘', desc: '跑一趟差事，碰碰风闻与奇遇。', theme: '探风闻', disabled: false, reason: '' },
    {
      key: 'trade',
      label: tradeRun ? '继续跑商' : '顺手做买卖',
      desc: tradeRun
        ? `${tradeRun.originName}到${tradeRun.destinationName}的货路还在跑。`
        : '跑一笔货，快进一轮营生。',
      theme: '滚营生',
      disabled: false,
      reason: '',
    },
    { key: 'rest', label: '短暂调息', desc: '先把状态拉回安全线。', theme: '回状态', disabled: false, reason: '' },
  ]
})

interface Recommendation {
  title: string
  desc: string
  preferredMode: string
}

const recommendation = computed<Recommendation>(() => {
  const loc = currentLocation.value
  const bp = breakthroughPercent.value
  const hasSect = !!sect.value
  const hasAff = !!currentAffiliation.value

  if (activeRealm.value) {
    return {
      title: `${activeRealm.value.name}现世，当前先决定去不去。`,
      desc: '异象压城，正是探风闯局的时候。要么放胆外出，要么先试一趟风声，别把机会磨过去。',
      preferredMode: 'adventure',
    }
  }

  if (hpPercent.value < 42 || qiPercent.value < 34 || staminaPercent.value < 30) {
    return {
      title: '根基偏虚，先收手回息。',
      desc: '此时强撑只会伤身，先把气血、真气和体力拉稳，再谈闯荡和冲关。',
      preferredMode: 'cultivation',
    }
  }

  if (bp >= 85 && (loc.actions as string[]).includes('breakthrough')) {
    return {
      title: '火候已近圆满，可以主动试冲一关。',
      desc: `你在${loc.name}已有足够火候。若想继续稳一手，也可以先补真气再破境。`,
      preferredMode: 'cultivation',
    }
  }

  if (!hasSect && !hasAff) {
    return {
      title: '还没站稳门路，先找个靠山或落脚点。',
      desc: '目前仍是白身，更适合边维生边探路。先别把节奏拉得太险，靠手动差事和稳态挂机把下一步门路摸出来。',
      preferredMode: 'balanced',
    }
  }

  if (!assetCount.value && player.value.money >= 120) {
    return {
      title: '手里已有启动本钱，可以开始摸第一笔产业。',
      desc: '这时最怕继续空转。把挂机节奏偏向营生，再穿插几次手动跑货，通常比继续平均撒力更快起盘。',
      preferredMode: 'merchant',
    }
  }

  if (player.value.mode === 'manual') {
    return {
      title: '当前为手动操作，世界会走，你不再自动出手。',
      desc: '你亲自盯局时，修炼、跑商和追查都得自己开口。',
      preferredMode: 'manual',
    }
  }

  return {
    title: `当前策略偏向"${currentModeLabel.value}"，按局势稳步推进。`,
    desc: `你落脚${loc.name}，灵气${loc.aura}，险度${loc.danger}。可顺势稳推，也可临时改换门路，把局势拧到自己手里。`,
    preferredMode: player.value.mode === 'manual' ? 'balanced' : player.value.mode,
  }
})

function runQuickAction(actionKey: string) {
  const action = manualActions.value.find(entry => entry.key === actionKey)
  if (action?.disabled) return
  if (actionKey === 'rest') {
    store.adjustResource('hp', 18, 'maxHp')
    store.adjustResource('qi', 16, 'maxQi')
    store.adjustResource('stamina', 20, 'maxStamina')
    store.appendLog('你暂时收束心神，运气回息。', 'info')
    return
  }

  if (actionKey === 'breakthrough') {
    attemptBreakthrough()
    return
  }

  performAction(actionKey)
}
</script>
