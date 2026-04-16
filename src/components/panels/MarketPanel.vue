<template>
  <p class="panel-intro">市集货架随时辰轮转。压货、跑城、交割和踩线，才是把商路滚活的正经做法。</p>

  <UiMetricGrid :items="tradeSummaryItems" />

  <!-- Active trade run -->
  <UiPanelCard v-if="activeTradeRun" tone="combat" standout>
    <UiCardHeader kicker="当前货队" :title="activeTradeRun.cargoLabel" title-class="auction-title">
      <template #aside>
        <UiPill variant="rarity" tone="rare">{{ currentLocation.id === activeTradeRun.destinationId ? '已到站' : '在途' }}</UiPill>
      </template>
    </UiCardHeader>
    <p class="auction-meta">{{ activeTradeRun.originName }} → {{ activeTradeRun.destinationName }} · 压货 {{ activeTradeRun.purchaseCost }} · 预估到手 {{ activeTradeRun.saleEstimate }}</p>
    <UiActionGroup variant="auction">
      <button class="item-button" @click="doContinueTrade">
        {{ currentLocation.id === activeTradeRun.destinationId ? '交割货队' : `继续前往${activeTradeRun.destinationName}` }}
      </button>
    </UiActionGroup>
  </UiPanelCard>

  <!-- Trade routes -->
  <h3 class="subsection-title">跑商货路</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="tradeRoutes.length">
      <UiPanelCard v-for="route in tradeRoutes" :key="route.destinationId" tone="item" :muted="!route.affordable">
        <UiCardHeader :title="`${route.originName} → ${route.destinationName}`" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="uncommon">净利约 {{ route.profitEstimate }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ route.cargoLabel }} · {{ route.segments }} 段路程 · 到站预估 {{ route.saleEstimate }}</p>
        <p class="item-meta">压货 {{ route.purchaseCost }} 灵石</p>
        <UiActionGroup>
          <button class="item-button" @click="doTradeRouteAction(route)">
            {{ getTradeRouteActionLabel(route) }}
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">当前地点没有成形的大宗货路。</div>
  </div>

  <div v-if="focusedTradeRoute" ref="tradeConditionRef">
    <UiPanelCard tone="combat" standout>
      <UiCardHeader kicker="压货条件详情" :title="`${focusedTradeRoute.originName} → ${focusedTradeRoute.destinationName}`" title-class="auction-title">
        <template #aside>
          <UiPill variant="rarity" :tone="focusedTradeStatusTone">{{ focusedTradeStatus }}</UiPill>
        </template>
      </UiCardHeader>
      <p class="auction-meta">{{ focusedTradeRoute.cargoLabel }} · 压货 {{ focusedTradeRoute.purchaseCost }} · 预估到手 {{ focusedTradeRoute.saleEstimate }} · 净利约 {{ focusedTradeRoute.profitEstimate }}</p>
      <UiPillRow>
        <UiPill variant="trait">现有灵石 {{ player.money }}</UiPill>
        <UiPill variant="trait">压货成本 {{ focusedTradeRoute.purchaseCost }}</UiPill>
        <UiPill variant="trait" :tone="focusedTradeShortage > 0 ? 'warning' : 'current'">
          {{ focusedTradeShortage > 0 ? `还差 ${focusedTradeShortage}` : '压货资金已齐' }}
        </UiPill>
        <UiPill variant="trait" :tone="activeTradeRun ? 'warning' : 'current'">
          {{ activeTradeRun ? '已有在途货队' : '当前可开新货队' }}
        </UiPill>
      </UiPillRow>
      <p v-for="note in focusedTradeNotes" :key="`${focusedTradeRoute.destinationId}-${note}`" class="item-meta">{{ note }}</p>
      <UiActionGroup>
        <button class="item-button" :disabled="!focusedTradeReady" @click="doStartTrade(focusedTradeRoute.destinationId)">
          {{ focusedTradeReady ? '条件已齐，立即压货' : '条件未齐，暂不能压货' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </div>

  <!-- Markets by location -->
  <h3 class="subsection-title">各地市集</h3>
  <div v-for="[locationId, listings] in sortedMarkets" :key="locationId">
    <h3 class="subsection-title">{{ getLocationName(locationId) }}</h3>
    <p class="panel-intro">灵气 {{ getLocation(locationId)?.aura }}，偏好 {{ getMarketBiasLabel(getLocation(locationId)?.marketBias || '') }}，特产 {{ getLocation(locationId)?.resource }}。</p>
    <div class="market-grid">
      <template v-if="listings.length">
        <UiPanelCard v-for="listing in listings.slice(0, 6)" :key="listing.listingId" tone="market">
          <UiCardHeader :title="`${itemOf(listing.itemId).name} x${listing.quantity}`" title-class="market-title">
            <template #aside>
              <UiPill variant="rarity" :tone="RARITY_META[itemOf(listing.itemId).rarity].color">{{ listing.price }} 灵石</UiPill>
            </template>
          </UiCardHeader>
          <p class="market-meta">{{ itemOf(listing.itemId).desc }}</p>
          <p class="market-meta">卖家：{{ listing.seller }}</p>
          <UiActionGroup variant="market">
            <button v-if="locationId === currentLocation.id" class="item-button" @click="doBuy(listing.listingId)">立即购入</button>
            <button v-else class="item-button" @click="doTravel(locationId)">前往{{ getLocationShort(locationId) }}</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">暂无货品。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, LOCATION_MAP, getItem } from '@/config'
import { round } from '@/utils'
import { getMarketBiasLabel } from '@/composables/useUIHelpers'
import { getTradeRouteOptions, startTradeRun, advanceTradeRun, buyListing } from '@/systems/trade'
import { travelTo, tickWorld } from '@/systems/world'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player, market, currentLocation } = storeToRefs(store)

const activeTradeRun = computed(() => player.value.tradeRun)

const tradeSummaryItems = computed(() => [
  { label: '当前商技', value: round(player.value.skills.trading, 1) },
  { label: '本地声望', value: round(store.getRegionStanding(), 1) },
  {
    label: '在途货路',
    value: activeTradeRun.value ? `${activeTradeRun.value.originName}→${activeTradeRun.value.destinationName}` : '暂无',
  },
])

const tradeRoutes = computed(() => getTradeRouteOptions(currentLocation.value.id))

type TradeRoute = ReturnType<typeof getTradeRouteOptions>[number]

const focusedTradeRouteId = ref<string | null>(null)
const tradeConditionRef = ref<HTMLElement | null>(null)

const focusedTradeRoute = computed<TradeRoute | null>(() =>
  tradeRoutes.value.find(route => route.destinationId === focusedTradeRouteId.value) || null
)

const focusedTradeShortage = computed(() =>
  focusedTradeRoute.value ? Math.max(0, focusedTradeRoute.value.purchaseCost - player.value.money) : 0
)

const focusedTradeReady = computed(() =>
  !!focusedTradeRoute.value && !activeTradeRun.value && focusedTradeShortage.value === 0
)

const focusedTradeStatus = computed(() => {
  if (!focusedTradeRoute.value) return ''
  if (activeTradeRun.value) return '先交割旧货'
  if (focusedTradeShortage.value > 0) return `还差${focusedTradeShortage.value}灵石`
  return '当前可启程'
})

const focusedTradeStatusTone = computed(() => {
  if (focusedTradeReady.value) return 'rare'
  if (focusedTradeShortage.value > 0) return 'uncommon'
  return 'common'
})

const focusedTradeNotes = computed(() => {
  if (!focusedTradeRoute.value) return []

  const notes: string[] = [
    `${focusedTradeRoute.value.cargoLabel}需要先在${focusedTradeRoute.value.originName}压货，再跑${focusedTradeRoute.value.segments}段路送到${focusedTradeRoute.value.destinationName}。`,
    `目的地当前本地声望 ${round(focusedTradeRoute.value.localStanding, 1)}，会继续影响这条货路后续滚动收益。`,
  ]

  if (activeTradeRun.value) {
    notes.unshift(`你已经压着${activeTradeRun.value.originName}→${activeTradeRun.value.destinationName}的货队，得先交割完这一趟。`)
  }

  if (focusedTradeShortage.value > 0) {
    notes.unshift(`现有灵石 ${player.value.money}，离这趟压货还差 ${focusedTradeShortage.value}。`)
  }

  if (!activeTradeRun.value && focusedTradeShortage.value === 0) {
    notes.unshift('眼下条件已齐，点下方按钮就能直接压货启程。')
  }

  return notes
})

const sortedMarkets = computed(() => {
  return Object.entries(market.value)
    .sort(([aId, aList], [bId, bList]) => {
      const av = aList.reduce((s, l) => s + l.price * l.quantity, 0)
      const bv = bList.reduce((s, l) => s + l.price * l.quantity, 0)
      return bv - av
    })
})

function getLocation(id: string) { return LOCATION_MAP.get(id) }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getLocationShort(id: string) { return LOCATION_MAP.get(id)?.short || id }
function itemOf(itemId: string) { return getItem(itemId)! }

function doStartTrade(destId: string) {
  if (startTradeRun(destId)) {
    focusedTradeRouteId.value = null
  }
}

function canStartTrade(route: TradeRoute) {
  return !activeTradeRun.value && route.affordable
}

function getTradeRouteActionLabel(route: TradeRoute) {
  return canStartTrade(route) ? '压货启程' : '查看压货条件'
}

async function showTradeConditions(destId: string) {
  focusedTradeRouteId.value = destId
  await nextTick()
  tradeConditionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function doTradeRouteAction(route: TradeRoute) {
  if (canStartTrade(route)) {
    doStartTrade(route.destinationId)
    return
  }

  void showTradeConditions(route.destinationId)
}

function doContinueTrade() {
  if (advanceTradeRun() !== 'none') tickWorld()
}

function doBuy(listingId: string) {
  buyListing(listingId)
}

function doTravel(locationId: string) {
  travelTo(locationId)
}
</script>
