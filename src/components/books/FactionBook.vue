<template>
  <BookFrame title="门路" icon="faction" :tabs="tabs" :tab="tab" @update:tab="setBookTab('faction', $event)">
    <FactionList v-if="tab === 'factions'" />
    <AffiliationTasks v-else-if="tab === 'tasks'" />
    <PlayerFactionView v-else-if="tab === 'own'" />
    <SectView v-else />
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { PLAYER_SECT_ENABLED } from '@/config'
import BookFrame from '@/components/books/BookFrame.vue'
import FactionList from '@/components/books/faction/FactionList.vue'
import AffiliationTasks from '@/components/books/faction/AffiliationTasks.vue'
import PlayerFactionView from '@/components/books/faction/PlayerFactionView.vue'
import SectView from '@/components/books/faction/SectView.vue'
import { useBooks } from '@/composables/useBooks'

const { player, currentAffiliation } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('faction', 'factions')
const tabs = computed(() => [
  { id: 'factions', label: '投势' },
  { id: 'tasks', label: '差使', badge: currentAffiliation.value ? player.value.affiliationTasks.length || '' : '' },
  { id: 'own', label: '自家势力' },
  ...(PLAYER_SECT_ENABLED || player.value.sect ? [{ id: 'sect', label: '宗门' }] : []),
])
</script>
