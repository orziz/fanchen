<template>
  <div class="own-faction">
    <section v-if="!playerFaction" class="own-faction__create">
      <SealAvatar name="立" size="lg" variant="cinnabar" />
      <h3>拉起自家的盘子</h3>
      <p class="sheet__note">不再只替人跑腿：招几个跑货的、看场的、牵线的，在一方地面上立起自己的字号。需练力以上的根基、22 点声望与 900 灵石的本钱。</p>
      <p class="own-faction__gap">{{ createReason }}</p>
      <button class="ink-btn ink-btn--primary" type="button" :aria-disabled="!canCreate" :data-tip="canCreate ? undefined : createReason" @click="create">立起字号</button>
    </section>

    <template v-else>
      <dl class="record-grid">
        <div v-for="item in summary" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
      </dl>

      <h4 class="sheet__heading">分支</h4>
      <div class="branch-grid">
        <article v-for="branch in branches" :key="branch.key" class="branch-card">
          <header>
            <strong>{{ branch.label }}</strong>
            <span class="tag tag--gold num">{{ branch.level }} 级</span>
          </header>
          <p>{{ branch.desc }}</p>
          <button class="ink-btn ink-btn--small" type="button" :aria-disabled="!branch.affordable" :data-tip="branch.affordable ? undefined : `灵石还差 ${branch.cost - player.money}`" @click="upgrade(branch.key, branch.affordable)">
            扩张 · {{ branch.cost }} 灵石
          </button>
        </article>
      </div>

      <h4 class="sheet__heading">今日事务</h4>
      <div v-if="missions.length" class="task-grid">
        <article v-for="mission in missions" :key="mission.id" class="task-card" :class="{ 'is-ready': mission.ready }">
          <header><GameIcon name="faction" /><strong>{{ mission.title }}</strong></header>
          <p class="task-card__desc">{{ mission.desc }}</p>
          <p v-if="!mission.ready" class="task-card__gap">{{ mission.reason }}</p>
          <footer>
            <span />
            <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': mission.ready }" type="button" :aria-disabled="!mission.ready" :data-tip="mission.ready ? undefined : mission.reason" @click="runMission(mission.id, mission.ready)">推动</button>
          </footer>
        </article>
      </div>
      <p v-else class="empty-note">今日盘子里无新事。</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber } from '@/utils'
import {
  PLAYER_FACTION_BRANCHES, canCompletePlayerFactionMission, canCreatePlayerFaction, completePlayerFactionMission, createPlayerFaction,
  explainCreatePlayerFaction, explainPlayerFactionMission, refreshPlayerFactionMissions, upgradePlayerFactionBranch,
} from '@/systems/social'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'

const store = useGameStore()
const { player, playerFaction, world } = storeToRefs(store)

const canCreate = computed(() => {
  void player.value.money
  return canCreatePlayerFaction()
})
const createReason = computed(() => {
  void player.value.money
  void player.value.reputation
  return explainCreatePlayerFaction()
})

const summary = computed(() => {
  const pf = playerFaction.value
  if (!pf) return []
  return [
    { label: '字号', value: pf.name },
    { label: '等级', value: pf.level },
    { label: '地盘影响', value: formatNumber(pf.influence) },
    { label: '金库', value: formatNumber(pf.treasury) },
    { label: '补给', value: formatNumber(pf.supplies) },
    { label: '骨干', value: pf.members.length },
  ]
})

const branches = computed(() => {
  const pf = playerFaction.value
  if (!pf) return []
  return Object.entries(PLAYER_FACTION_BRANCHES).map(([key, branch]) => {
    const level = pf.branches[key as keyof typeof pf.branches] || 0
    const cost = branch.baseCost * (level + 1)
    return { key, label: branch.label, desc: branch.desc, level, cost, affordable: player.value.money >= cost }
  })
})

const missions = computed(() => {
  void world.value.hour
  if (!playerFaction.value) return []
  return refreshPlayerFactionMissions().map(mission => ({
    id: mission.id,
    title: String(mission.title || ''),
    desc: String(mission.desc || ''),
    ready: canCompletePlayerFactionMission(mission.id),
    reason: explainPlayerFactionMission(mission.id),
  }))
})

function create() {
  if (!canCreate.value) {
    sfx.deny()
    return
  }
  sfx.chime()
  createPlayerFaction()
}

function upgrade(key: string, affordable: boolean) {
  if (!affordable) {
    sfx.deny()
    return
  }
  sfx.coin()
  upgradePlayerFactionBranch(key)
}

function runMission(id: string, ready: boolean) {
  if (!ready) {
    sfx.deny()
    return
  }
  sfx.confirm()
  completePlayerFactionMission(id)
}
</script>
