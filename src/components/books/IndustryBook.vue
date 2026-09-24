<template>
  <BookFrame title="营生" icon="industry" :tabs="tabs" :tab="tab" @update:tab="setBookTab('industry', $event)">
    <AssetsView v-if="tab === 'assets'" />
    <PropertiesView v-else-if="tab === 'properties'" />
    <OrdersView v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import BookFrame from '@/components/books/BookFrame.vue'
import AssetsView from '@/components/books/industry/AssetsView.vue'
import PropertiesView from '@/components/books/industry/PropertiesView.vue'
import OrdersView from '@/components/books/industry/OrdersView.vue'
import { useBooks } from '@/composables/useBooks'

const { player } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('industry', 'assets')
const tabs = computed(() => {
  const a = player.value.assets
  return [
    { id: 'assets', label: '名下产业', badge: a.farms.length + a.workshops.length + a.shops.length || '' },
    { id: 'properties', label: '可置办' },
    { id: 'orders', label: '行会单' },
  ]
})
</script>
