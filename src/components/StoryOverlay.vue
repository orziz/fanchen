<template>
  <div
    v-if="isVisible"
    ref="overlayElement"
    class="story-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="story-dialog-title"
    aria-describedby="story-dialog-summary"
    @keydown="handleKeydown"
  >
    <div class="story-overlay__backdrop" aria-hidden="true"></div>
    <section ref="panelElement" class="story-overlay__panel" tabindex="-1">
      <div class="story-overlay__head">
        <div>
          <p class="section-kicker">剧情面板</p>
          <h2 id="story-dialog-title">当前剧情</h2>
          <p id="story-dialog-summary" class="sr-only">完成当前剧情选择后可继续游戏。</p>
        </div>
        <button v-if="canClose" class="control-button ghost" type="button" @click="closeStory()">收起</button>
      </div>
      <StoryScene />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import StoryScene from '@/components/StoryScene.vue'
import { closeStory, getActiveStoryScene } from '@/systems/story'
import { canDismissStoryScene } from '@/systems/tutorial'

const store = useGameStore()
const { story } = storeToRefs(store)
const overlayElement = ref<HTMLElement | null>(null)
const panelElement = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const scene = computed(() => {
  story.value
  return getActiveStoryScene()
})

const isVisible = computed(() => Boolean(scene.value && story.value.presentation === 'overlay'))
const canClose = computed(() => canDismissStoryScene(story.value, scene.value))

function getFocusableElements() {
  if (!overlayElement.value) return []
  return Array.from(overlayElement.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  ))
}

function restoreFocus() {
  previouslyFocused?.focus({ preventScroll: true })
  previouslyFocused = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && canClose.value) {
    event.preventDefault()
    closeStory()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (!focusable.length) {
    event.preventDefault()
    panelElement.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(isVisible, async (visible) => {
  if (!visible) {
    restoreFocus()
    return
  }

  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  const firstChoice = overlayElement.value?.querySelector<HTMLElement>('.story-choice-button:not(:disabled)')
  ;(firstChoice || getFocusableElements()[0] || panelElement.value)?.focus()
})

onBeforeUnmount(restoreFocus)
</script>
