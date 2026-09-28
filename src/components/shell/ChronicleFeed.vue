<template>
  <section class="side-panel chronicle-feed" aria-label="纪事">
    <div class="chronicle-feed__tabs" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" class="chronicle-feed__tab" :class="{ 'is-active': current === tab.id }" role="tab" :aria-selected="current === tab.id" type="button" @click="current = tab.id">
        {{ tab.label }}<span class="num">{{ tab.count }}</span>
      </button>
    </div>
    <TransitionGroup name="feed" tag="ol" class="chronicle-feed__list">
      <li v-for="entry in entries" :key="entry.key" class="feed-entry" :class="`feed-entry--${entry.type}`">
        <GameIcon :name="entry.icon" class="feed-entry__icon" />
        <div class="feed-entry__body">
          <p class="feed-entry__text">{{ entry.text }}</p>
          <time class="feed-entry__stamp">{{ entry.stamp }}</time>
        </div>
      </li>
    </TransitionGroup>
    <p v-if="!entries.length" class="chronicle-feed__empty">{{ current === 'rumor' ? '还没听到什么传闻。' : '还没发生什么事。' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { log } = storeToRefs(store)

type FeedTab = 'self' | 'rumor'
const current = ref<FeedTab>('self')

const ICON_BY_TYPE: Record<string, string> = { loot: 'stone', warn: 'warning', action: 'chevronRight', npc: 'people', info: 'scroll' }

const tagged = computed(() => log.value.map((entry, index) => ({
  ...entry,
  key: `${log.value.length - index}:${entry.stamp}:${entry.text.length}`,
  icon: ICON_BY_TYPE[entry.type] || 'scroll',
})))

const tabs = computed(() => [
  { id: 'self' as const, label: '经历', count: tagged.value.filter(e => e.type !== 'npc').length },
  { id: 'rumor' as const, label: '传闻', count: tagged.value.filter(e => e.type === 'npc').length },
])

const entries = computed(() => tagged.value
  .filter(entry => (current.value === 'rumor' ? entry.type === 'npc' : entry.type !== 'npc'))
  .slice(0, 36))
</script>
