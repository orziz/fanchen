<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast-item', toast.type, 'visible']"
        >
          <span class="toast-badge">{{ badgeLabel(toast.type) }}</span>
          <div class="toast-text">{{ toast.text }}</div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'

interface Toast {
  id: number
  text: string
  type: string
}

const store = useGameStore()
const { feedback } = storeToRefs(store)
const toasts = ref<Toast[]>([])
let nextId = 0

function badgeLabel(type: string) {
  if (type === 'warn') return '提示'
  if (type === 'loot') return '收获'
  return '消息'
}

watch(feedback, (val) => {
  if (!val) return
  const id = nextId++
  toasts.value.push({ id, text: val.text, type: val.type })
  if (toasts.value.length > 4) toasts.value.shift()
  const duration = val.type === 'warn' ? 3200 : 2400
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
})
</script>
