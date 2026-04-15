<template>
  <aside v-if="hasPinned" class="pin-rail">
    <!-- 江湖纪事 -->
    <div v-if="ws.journal.open" class="pin-card pin-card-journal">
      <div class="pin-card-head">
        <div>
          <p class="section-kicker">风闻</p>
          <h3>江湖纪事</h3>
        </div>
        <div class="pin-card-actions">
          <button class="control-button ghost" type="button" @click="store.clearLog()">清空</button>
          <button class="control-button ghost" type="button" @click="closeWindow('journal')">收</button>
        </div>
      </div>
      <div class="pin-card-body">
        <div class="log-list">
          <template v-if="log.length">
            <article v-for="(entry, i) in log" :key="i" :class="['log-item', entry.type]">
              <div class="log-item-head">
                <span :class="['log-kind', entry.type]">{{ getLogKindLabel(entry.type) }}</span>
                <time>{{ entry.stamp }}</time>
              </div>
              <div class="log-item-text">{{ entry.text }}</div>
            </article>
          </template>
          <div v-else class="empty-state">江湖还很安静，新的故事即将开始。</div>
        </div>
      </div>
    </div>

    <!-- 人物簿 -->
    <div v-if="ws.profile.open" class="pin-card pin-card-profile">
      <div class="pin-card-head">
        <div>
          <p class="section-kicker">人物簿</p>
          <h3>生平与记录</h3>
        </div>
        <button class="control-button ghost" type="button" @click="closeWindow('profile')">收</button>
      </div>
      <div class="pin-card-body">
        <ProfileDetail />
      </div>
    </div>

    <!-- 策略盘 -->
    <div v-if="ws.command.open" class="pin-card pin-card-command">
      <div class="pin-card-head">
        <div>
          <p class="section-kicker">挂机策略</p>
          <h3>策略盘</h3>
        </div>
        <button class="control-button ghost" type="button" @click="closeWindow('command')">收</button>
      </div>
      <div class="pin-card-body">
        <CommandDetail />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWindows } from '@/composables/useWindows'
import ProfileDetail from './ProfileDetail.vue'
import CommandDetail from './CommandDetail.vue'

const store = useGameStore()
const { log } = storeToRefs(store)
const { windows: ws, closeWindow } = useWindows()

const hasPinned = computed(() => ws.journal.open || ws.profile.open || ws.command.open)

function getLogKindLabel(type: string) {
  if (type === 'warn') return '险讯'
  if (type === 'loot') return '收获'
  if (type === 'npc') return '江湖'
  if (type === 'action') return '动作'
  return '纪事'
}
</script>
