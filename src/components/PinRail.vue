<template>
  <aside v-if="hasPinned" class="pin-rail">
    <div v-if="ws.journal.open" class="pin-card pin-card-journal">
      <UiCardHeader kicker="风闻" title="江湖纪事" head-class="pin-card-head pin-card-head--actions">
        <template #aside>
          <div class="pin-card-actions">
            <button class="control-button ghost" type="button" @click="store.clearLog()">清空</button>
            <button class="control-button ghost" type="button" @click="closeWindow('journal')">收</button>
          </div>
        </template>
      </UiCardHeader>
      <div class="pin-card-body">
        <div v-if="log.length" class="pin-card-filter-row">
          <button
            v-for="filter in logFilters"
            :key="filter.id"
            :class="['pin-card-filter-chip', { active: selectedLogFilter === filter.id }]"
            type="button"
            @click="selectedLogFilter = filter.id"
          >
            <span>{{ filter.label }}</span>
            <strong>{{ filter.count }}</strong>
          </button>
        </div>
        <div class="log-list">
          <template v-if="filteredLog.length">
            <article v-for="(entry, i) in filteredLog" :key="`${selectedLogFilter}-${i}-${entry.stamp}`" :class="['log-item', entry.type]">
              <div class="log-item-head">
                <span :class="['log-kind', entry.type]">{{ getLogKindLabel(entry.type) }}</span>
                <time>{{ entry.stamp }}</time>
              </div>
              <div class="log-item-text">{{ entry.text }}</div>
            </article>
          </template>
          <div v-else class="empty-state">这一类纪事眼下还没写进册里。</div>
        </div>
      </div>
    </div>

    <div v-if="ws.profile.open" class="pin-card pin-card-profile">
      <UiCardHeader kicker="人物簿" title="生平与记录" head-class="pin-card-head pin-card-head--actions">
        <template #aside>
          <div class="pin-card-actions">
            <button class="control-button ghost" type="button" @click="closeWindow('profile')">收</button>
          </div>
        </template>
      </UiCardHeader>
      <div class="pin-card-body">
        <ProfileDetail />
      </div>
    </div>

    <div v-if="ws.command.open" class="pin-card pin-card-command">
      <UiCardHeader kicker="挂机策略" title="策略盘" head-class="pin-card-head pin-card-head--actions">
        <template #aside>
          <div class="pin-card-actions">
            <button class="control-button ghost" type="button" @click="closeWindow('command')">收</button>
          </div>
        </template>
      </UiCardHeader>
      <div class="pin-card-body">
        <CommandDetail />
      </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWindows } from '@/composables/useWindows'
import ProfileDetail from './ProfileDetail.vue'
import CommandDetail from './CommandDetail.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'

const store = useGameStore()
const { log } = storeToRefs(store)
const { windows: ws, closeWindow } = useWindows()

type LogFilter = 'all' | 'info' | 'loot' | 'warn' | 'npc' | 'action'

const LOG_FILTER_LABELS: Record<LogFilter, string> = {
  all: '全部',
  info: '纪事',
  loot: '收获',
  warn: '险讯',
  npc: '江湖',
  action: '动作',
}

const selectedLogFilter = ref<LogFilter>('all')

const hasPinned = computed(() => ws.journal.open || ws.profile.open || ws.command.open)
const logFilters = computed(() => {
  const entries: LogFilter[] = ['all', 'info', 'loot', 'warn', 'npc', 'action']
  return entries.map((id) => ({
    id,
    label: LOG_FILTER_LABELS[id],
    count: id === 'all' ? log.value.length : log.value.filter(entry => entry.type === id).length,
  }))
})
const filteredLog = computed(() => {
  if (selectedLogFilter.value === 'all') return log.value
  return log.value.filter(entry => entry.type === selectedLogFilter.value)
})

function getLogKindLabel(type: string) {
  if (type === 'warn') return '险讯'
  if (type === 'loot') return '收获'
  if (type === 'npc') return '江湖'
  if (type === 'action') return '动作'
  return '纪事'
}
</script>
