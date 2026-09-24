<template>
  <BookFrame title="行囊" icon="bag" :tabs="tabs" :tab="tab" @update:tab="setBookTab('bag', $event)">
    <BagItems v-if="tab === 'items'" />
    <BagSkills v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import BookFrame from '@/components/books/BookFrame.vue'
import BagItems from '@/components/books/bag/BagItems.vue'
import BagSkills from '@/components/books/bag/BagSkills.vue'
import { useBooks } from '@/composables/useBooks'

const { player } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('bag', 'items')
const tabs = computed(() => [
  { id: 'items', label: '物品', badge: player.value.inventory.reduce((sum, e) => sum + e.quantity, 0) },
  { id: 'skills', label: '修习', badge: Object.keys(player.value.learnedTechniques).length || '' },
])
</script>
