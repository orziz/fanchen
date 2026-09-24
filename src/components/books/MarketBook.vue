<template>
  <BookFrame title="市集" icon="market" :tabs="tabs" :tab="tab" @update:tab="setBookTab('market', $event)">
    <ShopView v-if="tab === 'shop'" />
    <TradeRoutes v-else-if="tab === 'trade'" />
    <AuctionView v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import BookFrame from '@/components/books/BookFrame.vue'
import ShopView from '@/components/books/market/ShopView.vue'
import TradeRoutes from '@/components/books/market/TradeRoutes.vue'
import AuctionView from '@/components/books/market/AuctionView.vue'
import { useBooks } from '@/composables/useBooks'

const { player, auction } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('market', 'shop')
const tabs = computed(() => [
  { id: 'shop', label: '货架' },
  { id: 'trade', label: '行商', badge: player.value.tradeRun ? '途' : '' },
  { id: 'auction', label: '拍卖', badge: auction.value.length || '' },
])
</script>
