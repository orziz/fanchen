<template>
  <p class="panel-intro">天机簿汇总天气、异象、各地资源与秘境动向，方便你决定挂机策略和路线。</p>

  <UiMetricGrid :items="worldSummaryItems" />

  <!-- Active realm -->
  <template v-if="activeRealm">
    <h3 class="subsection-title">活跃秘境</h3>
    <UiPanelCard tone="combat" standout>
      <UiCardHeader :title="activeRealm.name" title-class="auction-title">
        <template #aside>
          <UiPill variant="rarity" tone="epic">{{ getLocationName(activeRealm.locationId) }}</UiPill>
        </template>
      </UiCardHeader>
      <p class="auction-meta">{{ activeRealm.desc }}</p>
      <UiActionGroup variant="auction">
        <button class="item-button" @click="doChallenge(activeRealm.id)">
          {{ player.locationId === activeRealm.locationId ? '立即挑战' : '赶赴并挑战' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </template>

  <!-- All locations -->
  <h3 class="subsection-title">九州总览</h3>
  <div class="world-grid">
    <UiPanelCard
      v-for="loc in LOCATIONS"
      :key="loc.id"
      tone="world"
      :standout="isRealmHere(loc.id)"
      :class-name="{ 'is-current-card': player.locationId === loc.id }"
    >
      <UiCardHeader kicker="地点" :title="loc.name" title-class="world-card-title" aside-class="world-card-status">
        <template #aside>
          <UiPill v-if="player.locationId === loc.id" variant="trait" tone="current">你在此地</UiPill>
          <UiPill v-else-if="canTravelTo(loc.id)" variant="trait" tone="route">可前往</UiPill>
          <UiPill v-else variant="trait">前路受阻</UiPill>
          <UiPill v-if="isRealmHere(loc.id)" variant="rarity" tone="epic">异象活跃</UiPill>
        </template>
      </UiCardHeader>
      <p class="item-meta">{{ loc.region }} · {{ loc.terrain }} · 市集 {{ loc.marketTier || 0 }} 阶</p>
      <p class="item-meta">灵气 {{ loc.aura }}，风险 {{ loc.danger }}，治安 {{ getSecurity(loc.id) }}，税赋 {{ formatPercent(getTaxRate(loc.id)) }}</p>
      <p class="item-meta">{{ getEconomy(loc.id).prosperityLabel }}，{{ getEconomy(loc.id).heatLabel }}，{{ getEconomy(loc.id).supplyLabel }}，{{ getEconomy(loc.id).needLabel }}</p>
      <p class="item-meta">可在此处理 {{ getActionLine(loc.actions) }}</p>
      <p v-if="player.locationId !== loc.id && getTravelHint(loc.id)" class="item-meta">{{ getTravelHint(loc.id) }}</p>
      <UiActionGroup>
        <button class="item-button" @click="doFocus(loc.id)">查看地图</button>
        <button class="item-button" :class="player.locationId === loc.id ? 'is-current' : 'is-route'" :disabled="player.locationId !== loc.id && !canTravelTo(loc.id)" :title="getTravelButtonReason(loc.id) || undefined" @click="doTravel(loc.id)">
          {{ getTravelButtonLabel(loc.id) }}
        </button>
        <button v-if="isRealmHere(loc.id) && activeRealm" class="item-button" :class="{ 'is-route': player.locationId !== loc.id }" @click="doChallenge(activeRealm.id)">
          {{ player.locationId === loc.id ? '挑战秘境' : '赶赴并挑战' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, LOCATIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { formatNumber } from '@/utils'
import { useStage } from '@/composables/useStage'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import { getTravelPreview, travelAndChallengeRealm, travelTo } from '@/systems/world'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'

const store = useGameStore()
const { player, world, selectedLocationId } = storeToRefs(store)
const { setTab } = useStage()

const activeRealm = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id) || null : null
})

const worldSummaryItems = computed(() => [
  { label: '今日天候', value: world.value.weather },
  { label: '异象征兆', value: world.value.omen },
  { label: '商帮好感', value: formatNumber(world.value.factionFavor.merchants) },
  { label: '朝廷声望', value: formatNumber(world.value.factionFavor.court) },
  { label: '本地声望', value: formatNumber(store.getRegionStanding(player.value.locationId)) },
  { label: '当前治安', value: `${getSecurity(player.value.locationId)}` },
  { label: '当前税赋', value: formatPercent(getTaxRate(player.value.locationId)) },
  { label: '本地商气', value: getEconomy(player.value.locationId).prosperityLabel },
  { label: '外货局势', value: getEconomy(player.value.locationId).needLabel },
  { label: '活跃地点', value: LOCATIONS.length },
])

function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getSecurity(id: string) { return getTerritorySecurity(id) }
function getTaxRate(id: string) { return getTerritoryTaxRate(id) }
function getEconomy(id: string) { return getLocationEconomyOverview(id) }
function formatPercent(value: number) { return `${Math.round(value * 100)}%` }

function isRealmHere(locId: string) {
  return activeRealm.value?.locationId === locId
}

function getActionLine(actions: string[]) {
  return actions.map(action => ACTION_META[action]?.label || action).join('、')
}

function doFocus(locId: string) {
  selectedLocationId.value = locId
  store.appendLog(`山河图已标出${getLocationName(locId)}。`, 'action')
  setTab('map')
}

function doTravel(locId: string) {
  travelTo(locId)
}

function doChallenge(realmId: string) {
  travelAndChallengeRealm(realmId)
}

function canTravelTo(locId: string) {
  return Boolean(getTravelPreview(locId).route)
}

function getTravelHint(locId: string) {
  const preview = getTravelPreview(locId)
  if (!preview.route) return preview.blockedReason || ''
  if (preview.segments <= 1) return '一段路可达。'
  const via = preview.viaIds.map(id => LOCATION_MAP.get(id)?.short || id).join('、')
  return via ? `需走 ${preview.segments} 段，经由 ${via}。` : `需走 ${preview.segments} 段。`
}

function getTravelButtonLabel(locId: string) {
  if (player.value.locationId === locId) return '你在此地'
  if (!canTravelTo(locId)) return '前路受阻'
  if (player.value.travelPlan?.destinationId === locId) return '继续赶路'
  return `前往${getLocationName(locId)}`
}

function getTravelButtonReason(locId: string) {
  if (player.value.locationId === locId) return '你已在此地。'
  return getTravelHint(locId)
}
</script>
