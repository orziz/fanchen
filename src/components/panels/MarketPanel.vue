<template>
  <p class="panel-intro">这里现在只分两件事来看：一边盯跑商货路，一边只看一处市集的货架，不再把整圈地界一次摊满。</p>

  <UiMetricGrid :items="tradeSummaryItems" />

  <div class="panel-section-nav">
    <button
      v-for="section in marketSections"
      :key="section.key"
      :class="['panel-section-button', { active: activeMarketSection === section.key }]"
      type="button"
      @click="activeMarketSection = section.key"
    >
      <span>{{ section.label }}</span>
      <strong class="panel-section-button__count">{{ section.count }}</strong>
    </button>
  </div>
  <p class="panel-section-copy">{{ activeMarketSectionMeta.desc }}</p>

  <!-- Active trade run -->
  <template v-if="activeMarketSection === 'trade'">
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
        <p class="item-meta">压货 {{ route.purchaseCost }} 灵石 · 起货税 {{ formatPercent(route.originTaxRate) }} · 落地治安 {{ route.destinationSecurity }}</p>
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
        <button class="item-button" :disabled="!focusedTradeReady" :title="focusedTradeNotes.join('；')" @click="doStartTrade(focusedTradeRoute.destinationId)">
          {{ focusedTradeReady ? '条件已齐，立即压货' : '条件未齐，暂不能压货' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </div>
  </template>

  <!-- Markets by location -->
  <template v-if="activeMarketSection === 'market'">
    <div v-if="marketLocationOptions.length" class="panel-section-nav panel-section-nav--compact">
      <button
        v-for="location in marketLocationOptions"
        :key="location.id"
        :class="['panel-section-button', { active: visibleMarketLocationId === location.id }]"
        type="button"
        @click="selectedMarketLocationId = location.id"
      >
        <span>{{ location.label }}</span>
        <strong class="panel-section-button__count">{{ location.count }}</strong>
      </button>
    </div>

    <template v-if="selectedMarketEntry">
      <h3 class="subsection-title">{{ getLocationName(selectedMarketEntry.locationId) }}</h3>
      <p class="panel-intro">灵气 {{ getLocation(selectedMarketEntry.locationId)?.aura }}，偏好 {{ getMarketBiasLabel(getLocation(selectedMarketEntry.locationId)?.marketBias || '') }}，特产 {{ getLocation(selectedMarketEntry.locationId)?.resource }}，{{ getEconomyHeat(selectedMarketEntry.locationId) }}，{{ getEconomySummary(selectedMarketEntry.locationId) }}。</p>
      <div class="market-grid">
        <template v-if="selectedMarketEntry.listings.length">
          <UiPanelCard v-for="listing in selectedMarketEntry.listings.slice(0, 6)" :key="listing.listingId" tone="market">
          <UiCardHeader :title="`${itemOf(listing.itemId).name} x${listing.quantity}`" title-class="market-title">
            <template #aside>
              <UiPill variant="rarity" :tone="RARITY_META[itemOf(listing.itemId).rarity].color">{{ listing.price }} 灵石</UiPill>
            </template>
          </UiCardHeader>
          <p class="market-meta">{{ itemOf(listing.itemId).desc }}</p>
          <p class="market-meta">卖家：{{ listing.seller }}</p>
          <UiActionGroup variant="market">
            <button v-if="selectedMarketEntry.locationId === currentLocation.id" class="item-button" @click="doBuy(listing.listingId)">立即购入</button>
            <button v-else class="item-button" @click="doTravel(selectedMarketEntry.locationId)">前往{{ getLocationShort(selectedMarketEntry.locationId) }}</button>
          </UiActionGroup>
        </UiPanelCard>
        </template>
        <div v-else class="empty-state">这一地的货架眼下是空的。</div>
      </div>
    </template>
    <div v-else class="empty-state">各地货架暂时都还没摆出来。</div>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, LOCATION_MAP, getItem } from '@/config'
import { formatNumber } from '@/utils'
import { getMarketBiasLabel } from '@/composables/useUIHelpers'
import { getTradeRouteOptions, startTradeRun, advanceTradeRun, buyListing } from '@/systems/trade'
import { travelTo, tickWorld } from '@/systems/world'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player, market, currentLocation } = storeToRefs(store)

const activeTradeRun = computed(() => player.value.tradeRun)
const currentEconomy = computed(() => getLocationEconomyOverview(currentLocation.value.id))
type MarketSectionKey = 'trade' | 'market'

const activeMarketSection = ref<MarketSectionKey>('trade')
const selectedMarketLocationId = ref(currentLocation.value.id)

const tradeSummaryItems = computed(() => [
  { label: '当前商技', value: formatNumber(player.value.skills.trading) },
  { label: '本地声望', value: formatNumber(store.getRegionStanding()) },
  { label: '本地商气', value: currentEconomy.value.prosperityLabel },
  { label: '外货局势', value: currentEconomy.value.needLabel },
  {
    label: '在途货路',
    value: activeTradeRun.value ? `${activeTradeRun.value.originName}→${activeTradeRun.value.destinationName}` : '暂无',
  },
])

const marketSections = computed(() => ([
  {
    key: 'trade' as const,
    label: '跑商',
    count: tradeRoutes.value.length + (activeTradeRun.value ? 1 : 0),
    desc: activeTradeRun.value
      ? '先盯在途货队和下一条要压的货路。'
      : '这里只看货路、压货条件和在途货队，不混进各地货架。',
  },
  {
    key: 'market' as const,
    label: '市集',
    count: sortedMarkets.value.length,
    desc: '各地货架改成一地一看，先挑地点，再看这一地有什么货。',
  },
]))

const activeMarketSectionMeta = computed(() =>
  marketSections.value.find(section => section.key === activeMarketSection.value) || marketSections.value[0]
)

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
    `${focusedTradeRoute.value.originName}起货税约 ${formatPercent(focusedTradeRoute.value.originTaxRate)}，${focusedTradeRoute.value.destinationName}当前治安 ${focusedTradeRoute.value.destinationSecurity}、税赋 ${formatPercent(focusedTradeRoute.value.destinationTaxRate)}。`,
    `目的地当前本地声望 ${formatNumber(focusedTradeRoute.value.localStanding)}，会继续影响这条货路后续滚动收益。`,
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

const marketLocationOptions = computed(() =>
  sortedMarkets.value.map(([locationId, listings]) => ({
    id: locationId,
    label: locationId === currentLocation.value.id ? `${getLocationShort(locationId)} · 当前` : getLocationShort(locationId),
    count: listings.length,
  }))
)

const visibleMarketLocationId = computed(() => {
  const match = marketLocationOptions.value.find(location => location.id === selectedMarketLocationId.value)
  return match?.id || marketLocationOptions.value[0]?.id || null
})

const selectedMarketEntry = computed(() => {
  if (!visibleMarketLocationId.value) return null
  const entry = sortedMarkets.value.find(([locationId]) => locationId === visibleMarketLocationId.value)
  if (!entry) return null
  return {
    locationId: entry[0],
    listings: entry[1],
  }
})

function getLocation(id: string) { return LOCATION_MAP.get(id) }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getLocationShort(id: string) { return LOCATION_MAP.get(id)?.short || id }
function getEconomySummary(id: string) { return getLocationEconomyOverview(id).summary }
function getEconomyHeat(id: string) { return getLocationEconomyOverview(id).heatLabel }
function itemOf(itemId: string) { return getItem(itemId)! }
function formatPercent(value: number) { return `${Math.round(value * 100)}%` }

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
  activeMarketSection.value = 'trade'
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
