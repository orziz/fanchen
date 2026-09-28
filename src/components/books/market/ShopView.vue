<template>
  <div class="shop-view">
    <nav class="shop-view__places" aria-label="各地货架">
      <button v-for="place in places" :key="place.id" class="filter-chip" :class="{ 'is-active': place.id === placeId }" type="button" @click="pickPlace(place.id)">
        {{ place.name }}<span v-if="place.here" class="tag tag--jade">此地</span><span class="num">{{ place.count }}</span>
      </button>
    </nav>

    <section class="shop-view__stock">
      <header class="shop-view__head">
        <h4 class="sheet__heading">{{ placeName }}货架</h4>
        <p class="sheet__note">{{ economyLine }}</p>
      </header>
      <div v-if="listings.length" class="listing-grid">
        <article v-for="listing in listings" :key="listing.listingId" class="listing-card" :class="`rarity--${listing.item.rarity}`">
          <span class="listing-card__icon"><GameIcon :name="listing.icon" /></span>
          <div class="listing-card__body">
            <strong>{{ listing.item.name }}<span v-if="listing.quantity > 1" class="num"> ×{{ listing.quantity }}</span></strong>
            <span>{{ listing.item.desc }}</span>
            <span class="listing-card__seller">{{ listing.seller }}</span>
          </div>
          <div class="listing-card__buy">
            <span class="listing-card__price num"><GameIcon name="stone" />{{ listing.price }}</span>
            <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': !listing.reason }" type="button" :aria-disabled="Boolean(listing.reason)" :data-tip="listing.reason || undefined" @click="buy(listing.listingId, listing.reason)">购入</button>
          </div>
        </article>
      </div>
      <p v-else class="empty-note">货架空着，过几个时辰再来。</p>
      <button v-if="!isHere" class="ink-btn" type="button" @click="goThere"><GameIcon name="travel" />前往{{ placeName }}</button>
    </section>

    <aside class="shop-view__sell">
      <h4 class="sheet__heading">就地出货</h4>
      <p class="sheet__note">{{ currentLocation.name }}偏收{{ biasLabel }}，同类货收价更高。</p>
      <ul v-if="sellables.length" class="sell-list">
        <li v-for="entry in sellables" :key="entry.itemId" :class="`rarity--${entry.item.rarity}`">
          <GameIcon :name="entry.icon" />
          <span class="sell-list__name">{{ entry.item.name }}<span class="num"> ×{{ entry.quantity }}</span></span>
          <span class="sell-list__price num" :class="{ 'is-favored': entry.favored }">{{ entry.price }}</span>
          <button class="ink-btn ink-btn--small" type="button" @click="sell(entry.itemId)">卖</button>
        </li>
      </ul>
      <p v-else class="empty-note">行囊里没有可出手的货。</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, getItem } from '@/config'
import { iconForItemType } from '@/art/icons'
import { getMarketBiasLabel } from '@/composables/useUIHelpers'
import { buyListing } from '@/systems/trade'
import { getItemSellPrice, sellItem } from '@/systems/player'
import { startTravel } from '@/systems/life/activities'
import { useBooks } from '@/composables/useBooks'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, market, currentLocation } = storeToRefs(store)
const placeId = ref(currentLocation.value.id)

const places = computed(() => Object.entries(market.value)
  .map(([id, list]) => ({ id, name: LOCATION_MAP.get(id)?.name || id, count: list.length, here: id === currentLocation.value.id }))
  .sort((a, b) => Number(b.here) - Number(a.here) || b.count - a.count))

const isHere = computed(() => placeId.value === currentLocation.value.id)
const placeName = computed(() => LOCATION_MAP.get(placeId.value)?.name || '')
const economyLine = computed(() => {
  const economy = getLocationEconomyOverview(placeId.value)
  const location = LOCATION_MAP.get(placeId.value)
  return `${economy.prosperityLabel} · ${economy.heatLabel} · 特产${location?.resource || ''}`
})

const listings = computed(() => (market.value[placeId.value] || []).flatMap(listing => {
  const item = getItem(listing.itemId)
  if (!item) return []
  const reason = !isHere.value ? `需身在${placeName.value}` : player.value.money < listing.price ? `灵石还差 ${listing.price - player.value.money}` : ''
  return [{ ...listing, item, icon: iconForItemType(item.type), reason }]
}))

const biasLabel = computed(() => getMarketBiasLabel(currentLocation.value.marketBias))

const sellables = computed(() => {
  void currentLocation.value.id
  return player.value.inventory.flatMap(entry => {
    const item = getItem(entry.itemId)
    if (!item) return []
    return [{ ...entry, item, icon: iconForItemType(item.type), price: getItemSellPrice(entry.itemId), favored: item.type === currentLocation.value.marketBias }]
  }).sort((a, b) => b.price - a.price)
})

function pickPlace(id: string) {
  sfx.page()
  placeId.value = id
}

function buy(listingId: string, reason: string) {
  if (reason) {
    sfx.deny()
    return
  }
  sfx.coin()
  buyListing(listingId)
}

function sell(itemId: string) {
  sfx.coin()
  sellItem(itemId)
}

const { closeBook } = useBooks()

function goThere() {
  sfx.confirm()
  closeBook()
  startTravel(placeId.value)
}
</script>
