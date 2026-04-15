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
            <span>破境火候</span>
            <strong>{{ breakthroughPercent }}%</strong>
            <p>{{ breakthroughPercent >= 85 ? '已接近可冲关线' : `距下一境尚差 ${formatNumber(Math.max(0, nextBreakthroughNeed - player.breakthrough))}` }}</p>
          </article>
          <article class="command-reading-card">
            <span>当前门路</span>
            <strong>{{ routeLabel }}</strong>
            <p>{{ routeDesc }}</p>
          </article>
        </div>
      </div>
      <div class="command-chip-row">
        <span class="command-chip active">当前策略：{{ currentModeLabel }}</span>
        <span class="command-chip">落脚：{{ currentLocation.name }}</span>
        <span class="command-chip">灵气 {{ currentLocation.aura }}</span>
        <span :class="['command-chip', dangerClass]">险度 {{ currentLocation.danger }}</span>
        <span :class="['command-chip', activeRealm ? 'active' : '']">{{ activeRealm ? `${activeRealm.name}现世` : world.omen }}</span>
      </div>
    </section>

    <!-- Mode Selection -->
    <section class="command-section standout">
      <div class="section-head compact">
        <div>
          <p class="section-kicker">挂机策略</p>
          <h3>今日主路</h3>
        </div>
        <span class="tag">推荐：{{ getModeLabel(recommendation.preferredMode) }}</span>
      </div>
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
            <span class="command-badge-row">
              <span v-if="mode.id === player.mode" class="command-pill current">当前</span>
              <span v-if="mode.id === recommendation.preferredMode" class="command-pill recommended">局势推荐</span>
            </span>
          </div>
          <span>{{ mode.desc }}</span>
        </button>
      </div>
      <div :class="['command-footnote', player.mode === 'manual' ? 'manual' : '']">
        <strong>{{ player.mode === 'manual' ? '手动操作已接管' : `当前自动遵循"${currentModeLabel}"` }}</strong>
        <span>{{ player.mode === 'manual' ? '世界仍会照常流转，但不会替你自动修炼、跑商或接差事。' : '局势一变，就立刻改换门路，别让人和货空耗在路上。' }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { MODE_OPTIONS, REALM_TEMPLATES } from '@/config'
import { formatNumber } from '@/utils'
import { getModeLabel } from '@/composables/useUIHelpers'
import { setMode } from '@/systems/player'

const store = useGameStore()
const { player, world, currentLocation, currentAffiliation, sect, nextBreakthroughNeed } = storeToRefs(store)

function getPercent(value: number, max: number) {
  if (!max) return 0
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)))
}

const hpPercent = computed(() => getPercent(player.value.hp, player.value.maxHp))
const qiPercent = computed(() => getPercent(player.value.qi, player.value.maxQi))
const staminaPercent = computed(() => getPercent(player.value.stamina, player.value.maxStamina))
const breakthroughPercent = computed(() => getPercent(player.value.breakthrough, nextBreakthroughNeed.value))

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
</script>
