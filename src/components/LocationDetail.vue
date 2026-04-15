<template>
  <div class="location-card">
    <div class="location-top">
      <div>
        <p class="section-kicker">地脉详情</p>
        <h3 class="location-title">{{ selected.name }}</h3>
        <p class="location-meta">{{ selected.desc }}</p>
      </div>
      <div class="inline-list">
        <span class="tag">{{ selected.region }}</span>
        <span class="tag">灵气 {{ selected.aura }}</span>
        <span class="tag">风险 {{ selected.danger }}</span>
      </div>
    </div>

    <div class="two-column">
      <div class="world-card"><span>地貌</span><strong>{{ selected.terrain }}</strong></div>
      <div class="world-card"><span>特产</span><strong>{{ selected.resource }}</strong></div>
      <div class="world-card"><span>市集层级</span><strong>{{ selected.marketTier || 0 }} 阶</strong></div>
      <div class="world-card"><span>势力驻点</span><strong>{{ factionsHere.length ? factionsHere.map(f => f.name).join('、') : '暂无' }}</strong></div>
      <div class="world-card"><span>地头归属</span><strong>{{ territoryHolder }}</strong></div>
      <div class="world-card"><span>你在此地的门路</span><strong>{{ Math.round(territory?.playerInfluence || 0) }}</strong></div>
    </div>

    <!-- Active realm at this location -->
    <template v-if="activeRealm">
      <div class="divider"></div>
      <div class="combat-card standout">
        <div class="location-top">
          <div>
            <p class="section-kicker">首领秘境</p>
            <h3 class="location-title">{{ activeRealm.name }}</h3>
            <p class="location-meta">{{ activeRealm.desc }}</p>
          </div>
          <span class="rarity epic">声望需求 {{ activeRealm.unlockRep }}</span>
        </div>
        <div class="location-actions">
          <button class="item-button" @click="onChallengeRealm">{{ isCurrent ? '立即闯入秘境' : '先赶赴此地并挑战' }}</button>
        </div>
      </div>
    </template>

    <div class="divider"></div>
    <div class="inline-list">
      <span v-for="action in selected.actions" :key="action" class="route-pill">{{ ACTION_META[action]?.label || action }}</span>
      <span v-for="hint in industryHints" :key="hint" class="route-pill">{{ hint }}</span>
    </div>

    <div class="location-actions">
      <button
        class="item-button"
        :aria-disabled="!canTravel"
        @click="canTravel ? onTravel() : undefined"
      >{{ isCurrent ? '已在此地' : reachable ? '前往此地' : '尚不可达' }}</button>
      <button
        v-for="action in selected.actions" :key="action"
        class="item-button"
        @click="onLocationAction(action)"
      >{{ isCurrent ? `执行${ACTION_META[action]?.label || action}` : `前往后${ACTION_META[action]?.label || action}` }}</button>
    </div>

    <p class="location-meta">常驻人物：{{ residents.length ? residents.map(n => `${n.name}·${n.personalityLabel}`).join('、') : '暂无熟悉面孔' }}</p>
    <p class="location-meta">此地门路：{{ factionsText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, FACTIONS, REALM_TEMPLATES } from '@/config'
import { formatUnlockLabels } from '@/composables/useUIHelpers'
import { getTerritoryState } from '@/systems/social'
import { currentLocationCanReach, travelTo, travelAndAct, performAction, tickWorld } from '@/systems/world'
import { challengeRealm } from '@/systems/combat'

const store = useGameStore()
const { player, npcs, world, currentLocation, selectedLocation: selected } = storeToRefs(store)

const isCurrent = computed(() => selected.value.id === currentLocation.value.id)
const reachable = computed(() => isCurrent.value || currentLocationCanReach(selected.value.id))
const canTravel = computed(() => reachable.value && !isCurrent.value)

const residents = computed(() =>
  store.npcs.filter(n => n.locationId === selected.value.id).slice(0, 5)
)

const factionsHere = computed(() =>
  FACTIONS.filter(f => (selected.value as any).factionIds?.includes(f.id))
)

const territory = computed(() => getTerritoryState(selected.value.id))

const territoryHolder = computed(() => {
  const t = territory.value
  if (!t) return '暂无'
  const pf = player.value.playerFaction
  if (pf && t.controllerId === pf.id) return pf.name
  const faction = FACTIONS.find(f => f.id === t.controllerId)
  return faction?.name || '散户地头'
})

const activeRealm = computed(() => {
  const realmId = (selected.value as any).realmId
  if (!realmId || world.value.realm.activeRealmId !== realmId) return null
  return REALM_TEMPLATES.find(r => r.id === realmId) || null
})

const industryHints = computed(() => {
  const tags = selected.value.tags as string[]
  return [
    tags.includes('starter') ? '适合白手起家' : null,
    tags.includes('town') ? '可置办田产或铺面' : null,
    tags.includes('forge') ? '可经营工坊' : null,
    tags.includes('market') || tags.includes('port') ? '适合行商开铺' : null,
    tags.includes('court') ? '可买官契、办路引' : null,
    tags.includes('pass') ? '适合跑长线商路' : null,
    tags.includes('sect') ? '有行院与修行门路' : null,
  ].filter(Boolean) as string[]
})

const factionsText = computed(() =>
  factionsHere.value.length
    ? factionsHere.value.map(f => `${f.name}·可开${formatUnlockLabels((f as any).unlocks)}`).join('；')
    : '暂无成型势力，可先路过打探。'
)

function onTravel() {
  const before = player.value.locationId
  travelTo(selected.value.id)
  if (before !== player.value.locationId) tickWorld()
}

function onLocationAction(action: string) {
  if (player.value.locationId === selected.value.id) {
    performAction(action)
  } else {
    travelAndAct(selected.value.id, action)
  }
}

function onChallengeRealm() {
  if (!activeRealm.value) return
  if (player.value.locationId !== (selected.value as any).realmLocationId && player.value.locationId !== selected.value.id) {
    travelTo(selected.value.id)
  }
  challengeRealm(activeRealm.value.id)
}
</script>
