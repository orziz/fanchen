<template>
  <p class="panel-intro">市集货架随时辰轮转。压货、跑城、交割和踩线，才是把商路滚活的正经做法。</p>

  <div class="summary-grid">
    <div class="summary-box"><span>当前商技</span><strong>{{ round(player.skills.trading, 1) }}</strong></div>
    <div class="summary-box"><span>本地声望</span><strong>{{ round(store.getRegionStanding(), 1) }}</strong></div>
    <div class="summary-box"><span>在途货路</span><strong>{{ activeTradeRun ? `${activeTradeRun.originName}→${activeTradeRun.destinationName}` : '暂无' }}</strong></div>
  </div>

  <!-- Active trade run -->
  <div v-if="activeTradeRun" class="combat-card standout">
    <div class="auction-top">
      <div>
        <p class="section-kicker">当前货队</p>
        <h3 class="auction-title">{{ activeTradeRun.cargoLabel }}</h3>
        <p class="auction-meta">{{ activeTradeRun.originName }} → {{ activeTradeRun.destinationName }} · 压货 {{ activeTradeRun.purchaseCost }} · 预估到手 {{ activeTradeRun.saleEstimate }}</p>
      </div>
      <span class="rarity rare">{{ currentLocation.id === activeTradeRun.destinationId ? '已到站' : '在途' }}</span>
    </div>
    <div class="auction-actions">
      <button class="item-button" @click="doContinueTrade">
        {{ currentLocation.id === activeTradeRun.destinationId ? '交割货队' : `继续前往${activeTradeRun.destinationName}` }}
      </button>
    </div>
  </div>

  <!-- Trade routes -->
  <h3 class="subsection-title">跑商货路</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="tradeRoutes.length">
      <div v-for="route in tradeRoutes" :key="route.destinationId" :class="['item-card', { 'muted-card': !route.affordable }]">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ route.originName }} → {{ route.destinationName }}</h3>
            <p class="item-meta">{{ route.cargoLabel }} · {{ route.segments }} 段路程 · 到站预估 {{ route.saleEstimate }}</p>
          </div>
          <span class="rarity uncommon">净利约 {{ route.profitEstimate }}</span>
        </div>
        <p class="item-meta">压货 {{ route.purchaseCost }} 灵石</p>
        <div class="item-actions">
          <button class="item-button" :disabled="!route.affordable || !!activeTradeRun" @click="doStartTrade(route.destinationId)">
            {{ route.affordable ? '压货启程' : '查看压货条件' }}
          </button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">当前地点没有成形的大宗货路。</div>
  </div>

  <!-- Markets by location -->
  <h3 class="subsection-title">各地市集</h3>
  <div v-for="[locationId, listings] in sortedMarkets" :key="locationId">
    <h3 class="subsection-title">{{ getLocationName(locationId) }}</h3>
    <p class="panel-intro">灵气 {{ getLocation(locationId)?.aura }}，偏好 {{ getMarketBiasLabel(getLocation(locationId)?.marketBias || '') }}，特产 {{ getLocation(locationId)?.resource }}。</p>
    <div class="market-grid">
      <template v-if="listings.length">
        <div v-for="listing in listings.slice(0, 6)" :key="listing.listingId" class="market-card">
          <div class="market-top">
            <div>
              <h3 class="market-title">{{ itemOf(listing.itemId).name }} x{{ listing.quantity }}</h3>
              <p class="market-meta">{{ itemOf(listing.itemId).desc }}</p>
            </div>
            <span :class="['rarity', RARITY_META[itemOf(listing.itemId).rarity].color]">{{ listing.price }} 灵石</span>
          </div>
          <p class="market-meta">卖家：{{ listing.seller }}</p>
          <div class="market-actions">
            <button v-if="locationId === currentLocation.id" class="item-button" @click="doBuy(listing.listingId)">立即购入</button>
            <button v-else class="item-button" @click="doTravel(locationId)">前往{{ getLocationShort(locationId) }}</button>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">暂无货品。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, LOCATION_MAP, getItem } from '@/config'
import { round } from '@/utils'
import { getMarketBiasLabel } from '@/composables/useUIHelpers'
import { getTradeRouteOptions, startTradeRun, advanceTradeRun, buyListing } from '@/systems/trade'
import { travelTo, tickWorld } from '@/systems/world'

const store = useGameStore()
const { player, market, currentLocation } = storeToRefs(store)

const activeTradeRun = computed(() => player.value.tradeRun)

const tradeRoutes = computed(() => getTradeRouteOptions(currentLocation.value.id))

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
  if (startTradeRun(destId)) tickWorld()
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
