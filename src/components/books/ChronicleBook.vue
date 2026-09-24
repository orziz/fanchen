<template>
  <BookFrame title="纪事" icon="chronicle" :tabs="tabs" :tab="tab" @update:tab="setBookTab('chronicle', $event)">
    <section v-if="tab === 'story'" class="story-timeline">
      <article v-if="current" class="timeline-entry is-ongoing">
        <span class="timeline-entry__badge">{{ current.state }}</span>
        <h4>{{ current.title }}</h4>
        <p class="timeline-entry__speaker">{{ current.speaker }}</p>
        <p class="timeline-entry__text">{{ current.text }}</p>
        <button class="ink-btn ink-btn--primary ink-btn--small" type="button" @click="resume">继续</button>
      </article>
      <article v-for="entry in history" :key="entry.key" class="timeline-entry">
        <span class="timeline-entry__badge">{{ entry.stamp }}</span>
        <h4>{{ entry.title }}</h4>
        <p v-if="entry.speaker" class="timeline-entry__speaker">{{ entry.speaker }}</p>
        <p class="timeline-entry__text">{{ entry.text }}</p>
      </article>
      <p v-if="!current && !history.length" class="empty-note">尚无悬着的线头，江湖里多走动，自有际遇找上门来。</p>
    </section>

    <section v-else-if="tab === 'tasks'" class="task-sections">
      <h4 class="sheet__heading">门中差使</h4>
      <AffiliationTasks />
      <h4 class="sheet__heading">行会收货单</h4>
      <OrdersView />
    </section>

    <section v-else class="log-view">
      <div class="filter-chips">
        <button v-for="f in filters" :key="f.id" class="filter-chip" :class="{ 'is-active': filter === f.id }" type="button" @click="filter = f.id">{{ f.label }}<span class="num">{{ f.count }}</span></button>
      </div>
      <ol class="chronicle-log">
        <li v-for="entry in logEntries" :key="entry.key" class="feed-entry" :class="`feed-entry--${entry.type}`">
          <time class="feed-entry__stamp">{{ entry.stamp }}</time>
          <p class="feed-entry__text">{{ entry.text }}</p>
        </li>
      </ol>
    </section>
  </BookFrame>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { TIME_LABELS } from '@/config'
import { getActiveStoryScene, getSuspendedStoryScene, resumeSuspendedStory, showStoryOverlay } from '@/systems/story'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'
import BookFrame from '@/components/books/BookFrame.vue'
import AffiliationTasks from '@/components/books/faction/AffiliationTasks.vue'
import OrdersView from '@/components/books/industry/OrdersView.vue'

const store = useGameStore()
const { story, log } = storeToRefs(store)
const { setBookTab, tabOf } = useBooks()
const tab = tabOf('chronicle', 'story')

type LogFilter = 'all' | 'info' | 'loot' | 'warn' | 'npc'
const filter = ref<LogFilter>('all')

const current = computed(() => {
  void story.value.activeNodeId
  void story.value.suspended
  const active = getActiveStoryScene()
  if (active) return { title: active.title, speaker: active.speaker, text: active.text, state: story.value.presentation === 'overlay' ? '进行中' : '待续' }
  const suspended = getSuspendedStoryScene()
  return suspended ? { title: suspended.title, speaker: suspended.speaker, text: suspended.text, state: '已收起' } : null
})

const history = computed(() => story.value.history.slice(0, 16).map((entry, index) => ({
  key: `${entry.progressKey}-${entry.nodeId}-${index}`,
  title: entry.title,
  speaker: entry.speaker,
  text: entry.text,
  stamp: `第${entry.day}日 · ${TIME_LABELS[entry.hour] || ''}`,
})))

const tabs = computed(() => [
  { id: 'story', label: '剧情', badge: current.value ? '续' : '' },
  { id: 'tasks', label: '委托' },
  { id: 'log', label: '纪事', badge: log.value.length || '' },
])

const FILTER_LABELS: Record<LogFilter, string> = { all: '全部', info: '行止', loot: '收获', warn: '险讯', npc: '传闻' }
const filters = computed(() => (Object.keys(FILTER_LABELS) as LogFilter[]).map(id => ({
  id,
  label: FILTER_LABELS[id],
  count: id === 'all' ? log.value.length : log.value.filter(e => (id === 'info' ? e.type === 'info' || e.type === 'action' : e.type === id)).length,
})))

const logEntries = computed(() => log.value
  .map((entry, index) => ({ ...entry, key: `${log.value.length - index}:${entry.text.length}` }))
  .filter(entry => filter.value === 'all' || (filter.value === 'info' ? entry.type === 'info' || entry.type === 'action' : entry.type === filter.value)))

function resume() {
  sfx.page()
  if (getSuspendedStoryScene()) resumeSuspendedStory('overlay')
  else showStoryOverlay()
}
</script>
