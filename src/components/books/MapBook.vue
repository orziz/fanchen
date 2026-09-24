<template>
  <BookFrame title="山河" icon="map" :tabs="tabs" :tab="tab" :body-class="tab === 'map' ? 'book__body--flush' : ''" @update:tab="setBookTab('map', $event)">
    <div v-if="tab === 'map'" class="map-book">
      <WorldMap class="map-book__map" />
      <LocationInfo class="map-book__info" />
    </div>
    <RealmList v-else-if="tab === 'realms'" />
    <WorldOverview v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import BookFrame from '@/components/books/BookFrame.vue'
import WorldMap from '@/components/books/map/WorldMap.vue'
import LocationInfo from '@/components/books/map/LocationInfo.vue'
import RealmList from '@/components/books/map/RealmList.vue'
import WorldOverview from '@/components/books/map/WorldOverview.vue'
import { useBooks } from '@/composables/useBooks'

const { world } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('map', 'map')
const tabs = computed(() => [
  { id: 'map', label: '山河图' },
  { id: 'realms', label: '秘境', badge: world.value.realm.activeRealmId ? '显' : '' },
  { id: 'world', label: '天下' },
])
</script>
