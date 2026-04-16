<template>
  <div ref="rootRef" :class="['ui-card-head', headClass]">
    <p v-if="kicker || $slots.kicker" class="section-kicker ui-card-head__kicker">
      <slot name="kicker">{{ kicker }}</slot>
    </p>
    <div ref="bodyRef" :class="['ui-card-head__body', { 'ui-card-head__body--stacked': stackAside }]">
      <div ref="mainRef" :class="['ui-card-head__main', mainClass]">
        <component :is="titleTag" ref="titleRef" :class="['ui-card-head__title', titleClass]">
          <slot name="title">{{ title }}</slot>
        </component>
      </div>
      <div v-if="hasAside" ref="asideRef" :class="['ui-card-head__aside', asideClass]">
        <slot name="aside" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'

type ClassName = string | string[] | Record<string, boolean>

const props = withDefaults(defineProps<{
  kicker?: string
  title?: string
  titleTag?: string
  headClass?: ClassName
  mainClass?: ClassName
  titleClass?: ClassName
  asideClass?: ClassName
}>(), {
  kicker: '',
  title: '',
  titleTag: 'h3',
})

const slots = useSlots()
const hasAside = computed(() => Boolean(slots.aside))
const stackAside = ref(false)

const rootRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const asideRef = ref<HTMLElement | null>(null)

let resizeObserver: ResizeObserver | null = null
let rafId = 0

function syncAsideLayout() {
  if (!hasAside.value) {
    stackAside.value = false
    return
  }

  const mainEl = mainRef.value
  const bodyEl = bodyRef.value
  const titleEl = titleRef.value
  const asideEl = asideRef.value
  if (!bodyEl || !mainEl || !titleEl || !asideEl) return

  const availableWidth = bodyEl.clientWidth
  if (!availableWidth) return

  const previousWhiteSpace = titleEl.style.whiteSpace
  const previousMaxWidth = titleEl.style.maxWidth
  titleEl.style.whiteSpace = 'nowrap'
  titleEl.style.maxWidth = 'none'
  const titleWidth = Math.ceil(titleEl.scrollWidth)
  titleEl.style.whiteSpace = previousWhiteSpace
  titleEl.style.maxWidth = previousMaxWidth

  const gap = parseFloat(getComputedStyle(bodyEl).columnGap || getComputedStyle(bodyEl).gap || '0')
  stackAside.value = titleWidth + asideEl.offsetWidth + gap > availableWidth
}

function scheduleSync() {
  if (typeof window === 'undefined') return
  if (rafId) window.cancelAnimationFrame(rafId)
  rafId = window.requestAnimationFrame(() => {
    rafId = 0
    syncAsideLayout()
  })
}

onMounted(() => {
  nextTick(scheduleSync)
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => scheduleSync())
  ;[rootRef.value, bodyRef.value, mainRef.value, titleRef.value, asideRef.value].forEach((el) => {
    if (el) resizeObserver?.observe(el)
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (typeof window !== 'undefined' && rafId) {
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }
})
</script>