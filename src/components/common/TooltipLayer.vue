<template>
  <div v-if="tip" class="tooltip-layer" :class="`is-${tip.placement}`" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }" role="tooltip">
    <strong v-if="tip.title" class="tooltip-layer__title">{{ tip.title }}</strong>
    <span class="tooltip-layer__text">{{ tip.text }}</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 全局提示层：任何带 data-tip（可选 data-tip-title）的元素，悬停或聚焦时显示墨色提示框，
 * 用来说明按钮为何不可用、数值从何而来。触屏上长按触发。
 */
interface TipState { text: string; title: string; x: number; y: number; placement: 'top' | 'bottom' }

const tip = ref<TipState | null>(null)
let current: HTMLElement | null = null
let pressTimer = 0

function findTarget(node: EventTarget | null) {
  let el = node as HTMLElement | null
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.tip) return el
    el = el.parentElement
  }
  return null
}

function show(el: HTMLElement) {
  current = el
  const rect = el.getBoundingClientRect()
  const placeBelow = rect.top < window.innerHeight * 0.3
  tip.value = {
    text: el.dataset.tip || '',
    title: el.dataset.tipTitle || '',
    x: Math.min(window.innerWidth - 12, Math.max(12, rect.left + rect.width / 2)),
    y: placeBelow ? rect.bottom + 8 : rect.top - 8,
    placement: placeBelow ? 'bottom' : 'top',
  }
}

function hide() {
  current = null
  tip.value = null
}

function onOver(event: Event) {
  const el = findTarget(event.target)
  if (el && el !== current) show(el)
  else if (!el && current) hide()
}

function onTouchStart(event: TouchEvent) {
  const el = findTarget(event.target)
  window.clearTimeout(pressTimer)
  if (!el) { hide(); return }
  pressTimer = window.setTimeout(() => show(el), 420)
}

function onTouchEnd() {
  window.clearTimeout(pressTimer)
  window.setTimeout(hide, 1600)
}

onMounted(() => {
  document.addEventListener('pointerover', onOver)
  document.addEventListener('focusin', onOver)
  document.addEventListener('pointerdown', hide)
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd)
  window.addEventListener('blur', hide)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerover', onOver)
  document.removeEventListener('focusin', onOver)
  document.removeEventListener('pointerdown', hide)
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('blur', hide)
})
</script>
