<template>
  <BookFrame title="纪事" icon="chronicle" :tabs="tabs" :tab="tab" body-class="legacy-skin" @update:tab="setBookTab('chronicle', $event)">
    <StoryTaskPanel v-if="tab === 'story'" />
    <ol v-else class="chronicle-log">
      <li v-for="(entry, index) in log" :key="`${log.length - index}`" class="feed-entry" :class="`feed-entry--${entry.type}`">
        <time class="feed-entry__stamp">{{ entry.stamp }}</time>
        <p class="feed-entry__text">{{ entry.text }}</p>
      </li>
    </ol>
  </BookFrame>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import BookFrame from '@/components/books/BookFrame.vue'
import StoryTaskPanel from '@/components/panels/StoryTaskPanel.vue'
import { useBooks } from '@/composables/useBooks'

const { log } = storeToRefs(useGameStore())
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('chronicle', 'story')
const tabs = [
  { id: 'story', label: '剧情委托' },
  { id: 'log', label: '纪事' },
]
</script>
