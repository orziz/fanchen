<template>
  <Transition name="scroll-in">
    <section v-if="view && view.stage !== 'fighting'" :key="view.id + view.stage" class="event-scroll" role="dialog" aria-modal="false" :aria-label="view.title">
      <header class="event-scroll__head">
        <span class="event-scroll__seal" aria-hidden="true">事</span>
        <h2 class="event-scroll__title">{{ view.title }}</h2>
      </header>

      <template v-if="view.stage === 'choose'">
        <p class="event-scroll__text">{{ view.text }}</p>
        <div class="event-scroll__choices">
          <button
            v-for="choice in view.choices"
            :key="choice.index"
            class="event-choice"
            :class="[`event-choice--${choice.kind}`, { 'is-blocked': Boolean(choice.issue) }]"
            type="button"
            :aria-disabled="Boolean(choice.issue)"
            :data-tip="choice.issue || undefined"
            @click="choose(choice.index, choice.issue)"
          >
            <span class="event-choice__key num" aria-hidden="true">{{ choice.index + 1 }}</span>
            <span class="event-choice__body">
              <strong>{{ choice.label }}</strong>
              <small v-if="choice.hint">{{ choice.hint }}</small>
            </span>
            <span class="event-choice__tags">
              <em v-for="tag in choice.tags" :key="tag" class="event-tag">{{ tag }}</em>
              <em v-if="choice.issue" class="event-tag event-tag--issue">{{ choice.issue }}</em>
            </span>
          </button>
        </div>
      </template>

      <template v-else-if="view.result">
        <div v-if="view.result.success !== null" class="event-scroll__verdict" :class="view.result.success ? 'is-success' : 'is-failure'">
          {{ view.result.success ? '成' : '未成' }}
        </div>
        <p class="event-scroll__text">{{ view.result.text }}</p>
        <ul v-if="view.result.gains.length" class="event-scroll__gains">
          <li v-for="gain in view.result.gains" :key="gain">{{ gain }}</li>
        </ul>
        <button ref="continueEl" class="ink-btn ink-btn--primary event-scroll__continue" type="button" @click="close">继续</button>
      </template>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { chooseLifeEventOption, closeLifeEvent, getEventView } from '@/systems/life/events'
import { sfx } from '@/audio/sfx'

const store = useGameStore()
const continueEl = ref<HTMLButtonElement | null>(null)

const view = computed(() => {
  void store.game.life.event?.stage
  void store.player.money
  void store.player.inventory.length
  return getEventView()
})

function choose(index: number, issue: string | null) {
  if (issue) {
    sfx.deny()
    return
  }
  sfx.action()
  chooseLifeEventOption(index)
}

function close() {
  sfx.page()
  closeLifeEvent()
}

watch(() => view.value?.result, async (result) => {
  if (!result) return
  if (result.success === true) sfx.chime()
  else if (result.success === false) sfx.hurt()
  await nextTick()
  continueEl.value?.focus({ preventScroll: true })
})

/** 数字键选选项，回车或空格看完结果。 */
function onKeydown(event: KeyboardEvent) {
  const current = view.value
  if (!current || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  if (current.stage === 'choose') {
    const choice = current.choices[Number(event.key) - 1]
    if (choice) {
      event.preventDefault()
      choose(choice.index, choice.issue)
    }
  } else if (current.stage === 'result' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>
