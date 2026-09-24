<template>
  <BookFrame title="山河" icon="map" :tabs="tabs" :tab="tab" body-class="legacy-skin" @update:tab="setBookTab('map', $event)">
    <MapPanel v-if="tab === 'map'" />
    <CombatPanel v-else-if="tab === 'realms'" />
    <WorldPanel v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import BookFrame from '@/components/books/BookFrame.vue'
import MapPanel from '@/components/panels/MapPanel.vue'
import CombatPanel from '@/components/panels/CombatPanel.vue'
import WorldPanel from '@/components/panels/WorldPanel.vue'
import { useBooks } from '@/composables/useBooks'

const { setBookTab, tabOf } = useBooks()
const tab = tabOf('map', 'map')
const tabs = [
  { id: 'map', label: '山河图' },
  { id: 'realms', label: '秘境' },
  { id: 'world', label: '天下' },
]
</script>
