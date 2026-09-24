<template>
  <div class="split-view">
    <ul class="split-view__list">
      <li v-for="faction in factions" :key="faction.id">
        <button class="list-row" :class="{ 'is-selected': faction.id === selectedId, 'is-current': faction.current }" type="button" @click="select(faction.id)">
          <SealAvatar :name="faction.name" :seed="faction.id" size="sm" :variant="faction.current ? 'cinnabar' : 'ink'" />
          <span class="list-row__main">
            <strong>{{ faction.name }}</strong>
            <span>{{ faction.typeLabel }} · {{ faction.locationName }}</span>
          </span>
          <span class="tag" :class="faction.statusClass">{{ faction.status }}</span>
        </button>
      </li>
    </ul>

    <article v-if="selected" class="split-view__detail faction-detail">
      <header class="faction-detail__head">
        <SealAvatar :name="selected.name" :seed="selected.id" size="lg" :variant="selected.current ? 'cinnabar' : 'ink'" />
        <div>
          <h3>{{ selected.name }}</h3>
          <p>{{ selected.typeLabel }} · 驻{{ selected.locationName }} · 可开{{ selected.unlocks }}</p>
        </div>
      </header>
      <p class="faction-detail__desc">{{ selected.desc }}</p>

      <section>
        <h4 class="sheet__heading">入门</h4>
        <ul class="req-list">
          <li v-for="req in selected.requirements" :key="req.label" :class="{ 'is-met': req.met }">
            <GameIcon :name="req.met ? 'check' : 'close'" />
            <span>{{ req.label }}</span>
            <span class="req-list__value">{{ req.value }}</span>
          </li>
        </ul>
      </section>

      <section>
        <h4 class="sheet__heading">身份</h4>
        <ol class="rank-ladder">
          <li v-for="(title, index) in selected.titles" :key="title" :class="{ 'is-current': selected.current && index === player.affiliationRank, 'is-past': selected.current && index < player.affiliationRank }">
            <span class="rank-ladder__title">{{ title }}</span>
            <span class="rank-ladder__need num">{{ index === 0 ? '入门' : `立场 ${RANK_THRESHOLDS[index]}` }}</span>
          </li>
        </ol>
        <InkBar v-if="selected.current" label="立场" tone="cultivation" :value="selected.standing" :max="selected.nextThreshold" :text="`${selected.standing} / ${selected.nextThreshold}`" />
      </section>

      <footer class="faction-detail__actions">
        <template v-if="selected.current">
          <button class="ink-btn ink-btn--danger" type="button" @click="confirmLeave = !confirmLeave">退出此势力</button>
          <p v-if="confirmLeave" class="faction-detail__warn">
            退出要折损声望 8 点，{{ selected.official ? '且会被官面追缉一阵' : '12 天内不得重返' }}。
            <button class="ink-btn ink-btn--small ink-btn--danger" type="button" @click="leave">仍要退出</button>
          </p>
        </template>
        <button v-else class="ink-btn ink-btn--primary" type="button" :aria-disabled="!selected.canJoin" :data-tip="selected.canJoin ? undefined : selected.gap" @click="join(selected.id)">
          {{ player.affiliationId ? '改投此门' : '投入此门' }}
        </button>
        <p v-if="!selected.current && !selected.canJoin" class="faction-detail__gap">{{ selected.gap }}</p>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { FACTIONS, LOCATION_MAP, RANKS } from '@/config'
import { formatUnlockLabels, getFactionTypeLabel } from '@/composables/useUIHelpers'
import { canJoinFaction, explainFactionJoin, getFactionRejoinCooldownDays, hasActiveFactionPursuit, joinFaction, leaveFaction } from '@/systems/social'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import InkBar from '@/components/common/InkBar.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'

const RANK_THRESHOLDS = [0, 18, 45, 80]
const OFFICIAL_TYPES = new Set(['court', 'bureau', 'garrison'])

const store = useGameStore()
const { player, world } = storeToRefs(store)
const selectedId = ref(player.value.affiliationId || FACTIONS.find(f => f.locationId === player.value.locationId)?.id || FACTIONS[0].id)
const confirmLeave = ref(false)

const factions = computed(() => {
  void world.value.day
  void player.value.money
  void player.value.locationId
  return FACTIONS.map(faction => {
    const current = player.value.affiliationId === faction.id
    const cooldown = getFactionRejoinCooldownDays(faction.id)
    const pursuit = hasActiveFactionPursuit(faction.id)
    const canJoin = !current && canJoinFaction(faction.id)
    const status = current ? '已入' : pursuit ? '追缉中' : cooldown > 0 ? `冷却${cooldown}天` : canJoin ? '可投' : '未及'
    const statusClass = current ? 'tag--jade' : pursuit ? 'tag--danger' : canJoin ? 'tag--gold' : ''
    const standing = Math.max(0, Math.round(player.value.factionStanding[faction.id] || 0))
    const nextThreshold = RANK_THRESHOLDS[Math.min(RANK_THRESHOLDS.length - 1, player.value.affiliationRank + 1)] || 80
    const req = faction.joinRequirement
    return {
      ...faction,
      current,
      canJoin,
      status,
      statusClass,
      standing,
      nextThreshold,
      official: OFFICIAL_TYPES.has(faction.type),
      typeLabel: getFactionTypeLabel(faction.type),
      locationName: LOCATION_MAP.get(faction.locationId)?.name || faction.locationId,
      unlocks: formatUnlockLabels(faction.unlocks),
      gap: current ? '' : explainFactionJoin(faction.id),
      requirements: [
        { label: '身在', value: LOCATION_MAP.get(faction.locationId)?.name || '', met: player.value.locationId === faction.locationId },
        { label: '境界', value: RANKS[req.rankIndex].name, met: player.value.rankIndex >= req.rankIndex },
        { label: '声望', value: `${req.reputation}`, met: player.value.reputation >= req.reputation },
        { label: '灵石', value: `${req.money}`, met: player.value.money >= req.money },
      ],
    }
  })
})

const selected = computed(() => factions.value.find(f => f.id === selectedId.value) || null)

function select(id: string) {
  sfx.page()
  confirmLeave.value = false
  selectedId.value = id
}

function join(id: string) {
  if (!canJoinFaction(id)) {
    sfx.deny()
    return
  }
  joinFaction(id)
}

function leave() {
  sfx.deny()
  confirmLeave.value = false
  leaveFaction()
}
</script>
