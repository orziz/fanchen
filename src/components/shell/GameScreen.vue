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
      <ObjectiveCard />
      <LocalPanel />
      <ChronicleFeed />
    </aside>
    <ActionDock />
    <EventScroll />
    <LifeEndDialog v-if="store.game.life.ended" />
    <BookHost />
    <StoryOverlay />
    <ToastStack />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { OPEN_BOOKS, BOOK_LOCK_TAB, useBooks } from '@/composables/useBooks'
import { getStageTabLockReason } from '@/systems/tutorial'
import { sfx } from '@/audio/sfx'
import TopBar from '@/components/shell/TopBar.vue'
import CharacterCard from '@/components/shell/CharacterCard.vue'
import ObjectiveCard from '@/components/shell/ObjectiveCard.vue'
import ChronicleFeed from '@/components/shell/ChronicleFeed.vue'
import ActionDock from '@/components/shell/ActionDock.vue'
import LocalPanel from '@/components/shell/LocalPanel.vue'
import LifeEndDialog from '@/components/shell/LifeEndDialog.vue'
import EventScroll from '@/components/scene/EventScroll.vue'
import SceneView from '@/components/scene/SceneView.vue'
import CombatHud from '@/components/scene/CombatHud.vue'
import BookHost from '@/components/books/BookHost.vue'
import StoryOverlay from '@/components/StoryOverlay.vue'
import ToastStack from '@/components/ToastStack.vue'

const props = defineProps<{ modalOpen?: boolean }>()
const emit = defineEmits<{ settings: [] }>()

const store = useGameStore()
const { activeBook, closeBook, toggleBook } = useBooks()

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

/** 快捷键：Esc 合书或开设置，字母键翻开对应书册。 */
function onKeydown(event: KeyboardEvent) {
  // 设置等弹窗开着时，按键交给弹窗自己处理；按住不放的连发只认第一下。
  if (props.modalOpen || event.repeat || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
  if (store.story.activeStoryId && store.story.presentation === 'overlay') return
  if (event.key === 'Escape') {
    if (activeBook.value) closeBook()
    else emit('settings')
    event.preventDefault()
    return
  }
  const book = OPEN_BOOKS.find(entry => entry.hotkey.toLowerCase() === event.key.toLowerCase())
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
