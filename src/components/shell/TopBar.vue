<template>
  <header class="top-bar">
    <button class="top-bar__identity" type="button" data-tip="查看人物详情" @click="openBook('character')">
      <SealAvatar :name="player.name" variant="cinnabar" size="md" />
      <span class="top-bar__names">
        <strong class="top-bar__name">{{ player.name }}</strong>
        <span class="top-bar__title">{{ player.title }}</span>
      </span>
      <span class="realm-badge">{{ rankData.name }}</span>
    </button>

    <div class="top-bar__resources">
      <span v-for="res in resources" :key="res.key" class="resource-chip" :class="`resource-chip--${res.key}`" :data-tip="res.tip" :data-tip-title="res.label">
        <GameIcon :name="res.icon" />
        <span class="resource-chip__label">{{ res.label }}</span>
        <strong class="resource-chip__value num" :class="{ 'is-bump': bumped[res.key] }">{{ res.value }}</strong>
      </span>
    </div>

    <div class="top-bar__time" :data-tip="`${world.omen}`" data-tip-title="天象">
      <GameIcon :name="weatherIcon" />
      <span class="num">第{{ world.day }}日</span>
      <span class="top-bar__hour">{{ timeLabel }}</span>
      <span class="top-bar__weather">{{ world.weather }}</span>
    </div>

    <nav class="top-bar__books" aria-label="书册">
      <button
        v-for="book in books"
        :key="book.id"
        class="book-tab"
        :class="{ 'is-active': activeBook === book.id, 'is-locked': Boolean(book.lock) }"
        type="button"
        :aria-pressed="activeBook === book.id"
        :data-tip="book.lock || `${book.label}（${book.hotkey}）`"
        @click="selectBook(book.id, book.lock)"
      >
        <GameIcon :name="book.icon" />
        <span>{{ book.label }}</span>
      </button>
    </nav>

    <div class="top-bar__system">
      <button class="icon-btn" type="button" data-tip="存档" aria-label="存档" @click="save">
        <GameIcon name="save" />
      </button>
      <button class="icon-btn" type="button" data-tip="设置（Esc）" aria-label="设置" @click="$emit('settings')">
        <GameIcon name="settings" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { TIME_LABELS } from '@/config'
import { formatNumber } from '@/utils'
import { iconForWeather } from '@/art/icons'
import { BOOKS, BOOK_LOCK_TAB, useBooks, type BookId } from '@/composables/useBooks'
import { getStageTabLockReason } from '@/systems/tutorial'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'

defineEmits<{ settings: [] }>()

const store = useGameStore()
const { player, world, rankData, playerPower, playerInsight, story } = storeToRefs(store)
const { activeBook, openBook, toggleBook } = useBooks()

const timeLabel = computed(() => TIME_LABELS[world.value.hour] || '子时')
const weatherIcon = computed(() => iconForWeather(world.value.weather))

const resources = computed(() => [
  { key: 'money', label: '灵石', icon: 'stone', value: formatNumber(player.value.money), tip: '买卖、置业、入门都要用到的通货' },
  { key: 'fame', label: '声望', icon: 'fame', value: formatNumber(player.value.reputation), tip: '江湖名声，决定能投哪些门路、进哪些秘境' },
  { key: 'power', label: '战力', icon: 'power', value: formatNumber(Math.round(playerPower.value)), tip: '出手伤害的根本；境界、兵器与心法都会抬高' },
  { key: 'insight', label: '悟性', icon: 'insight', value: formatNumber(Math.round(playerInsight.value)), tip: '影响冲关成败、火候积累与术法威力' },
])

const bumped = reactive<Record<string, boolean>>({})
watch(() => resources.value.map(r => r.value), (next, prev) => {
  resources.value.forEach((res, i) => {
    if (prev && next[i] !== prev[i]) {
      bumped[res.key] = true
      window.setTimeout(() => { bumped[res.key] = false }, 500)
    }
  })
})

const books = computed(() => BOOKS.map(book => {
  const tab = BOOK_LOCK_TAB[book.id]
  return { ...book, lock: tab ? getStageTabLockReason(tab, story.value, player.value) : null }
}))

function selectBook(id: BookId, lock: string | null) {
  if (lock) {
    sfx.deny()
    store.appendLog(lock, 'warn')
    return
  }
  sfx.page()
  toggleBook(id)
}

function save() {
  store.saveGame(true)
  sfx.confirm()
}
</script>
