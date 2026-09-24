<template>
  <BookFrame title="市集" icon="market" :tabs="tabs" :tab="tab" body-class="legacy-skin" @update:tab="setBookTab('market', $event)">
    <MarketPanel v-if="tab === 'shop'" />
    <AuctionPanel v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import BookFrame from '@/components/books/BookFrame.vue'
import MarketPanel from '@/components/panels/MarketPanel.vue'
import AuctionPanel from '@/components/panels/AuctionPanel.vue'
import { useBooks } from '@/composables/useBooks'

const { setBookTab, tabOf } = useBooks()
const tab = tabOf('market', 'shop')
const tabs = [
  { id: 'shop', label: '商铺' },
  { id: 'auction', label: '拍卖' },
]
</script>
