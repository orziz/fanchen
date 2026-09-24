<template>
  <div class="game-screen">
    <main class="game-screen__stage">
      <SceneView>
        <CombatHud />
      </SceneView>
    </main>
    <TopBar @settings="$emit('settings')" />
    <CharacterCard class="game-screen__left" />
    <aside class="game-screen__right">
      <ObjectiveCard @strategy="strategyOpen = true" />
      <ChronicleFeed />
    </aside>
    <ActionDock :paused="paused" :strategy-open="strategyOpen" @toggle-pause="togglePause" @toggle-strategy="strategyOpen = !strategyOpen" @resume="resume" />
    <StrategyPopover v-if="strategyOpen" @close="strategyOpen = false" />
    <BookHost />
    <StoryOverlay />
    <ToastStack />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { BOOKS, BOOK_LOCK_TAB, useBooks } from '@/composables/useBooks'
import { useClock } from '@/composables/useGameLoop'
import { getStageTabLockReason } from '@/systems/tutorial'
import { sfx } from '@/audio/sfx'
import TopBar from '@/components/shell/TopBar.vue'
import CharacterCard from '@/components/shell/CharacterCard.vue'
import ObjectiveCard from '@/components/shell/ObjectiveCard.vue'
import ChronicleFeed from '@/components/shell/ChronicleFeed.vue'
import ActionDock from '@/components/shell/ActionDock.vue'
import StrategyPopover from '@/components/shell/StrategyPopover.vue'
import SceneView from '@/components/scene/SceneView.vue'
import CombatHud from '@/components/scene/CombatHud.vue'
import BookHost from '@/components/books/BookHost.vue'
import StoryOverlay from '@/components/StoryOverlay.vue'
import ToastStack from '@/components/ToastStack.vue'

const props = defineProps<{ modalOpen?: boolean }>()
const emit = defineEmits<{ settings: [] }>()

const store = useGameStore()
const { activeBook, closeBook, toggleBook } = useBooks()
const { paused, togglePause, resume } = useClock()
const strategyOpen = ref(false)

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

/** 快捷键：Esc 合书或开设置，空格暂停，字母键翻开对应书册。 */
function onKeydown(event: KeyboardEvent) {
  // 设置等弹窗开着时，按键交给弹窗自己处理。
  if (props.modalOpen || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
  if (store.story.activeStoryId && store.story.presentation === 'overlay') return
  if (event.key === 'Escape') {
    if (strategyOpen.value) strategyOpen.value = false
    else if (activeBook.value) closeBook()
    else emit('settings')
    event.preventDefault()
    return
  }
  if (event.key === ' ') {
    togglePause()
    sfx.confirm()
    event.preventDefault()
    return
  }
  const book = BOOKS.find(entry => entry.hotkey.toLowerCase() === event.key.toLowerCase())
  if (!book) return
  const lockTab = BOOK_LOCK_TAB[book.id]
  const lock = lockTab ? getStageTabLockReason(lockTab, store.story, store.player) : null
  if (lock) {
    sfx.deny()
    return
  }
  sfx.page()
  toggleBook(book.id)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>
