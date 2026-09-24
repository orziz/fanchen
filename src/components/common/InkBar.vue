<template>
  <div class="ink-bar" :class="[`ink-bar--${tone}`, { 'is-compact': compact, 'is-low': isLow }]">
    <div v-if="label" class="ink-bar__head">
      <span class="ink-bar__label">
        <GameIcon v-if="icon" :name="icon" />
        {{ label }}
      </span>
      <span class="ink-bar__value num">{{ display }}</span>
    </div>
    <div class="ink-bar__track" role="progressbar" :aria-label="label" :aria-valuenow="value" :aria-valuemin="0" :aria-valuemax="max">
      <div v-if="marker !== null" class="ink-bar__marker" :style="{ left: `${markerPercent}%` }" />
      <div class="ink-bar__fill" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GameIcon from '@/components/common/GameIcon.vue'

const props = withDefaults(defineProps<{
  value: number
  max: number
  label?: string
  icon?: string
  tone?: 'hp' | 'qi' | 'stamina' | 'cultivation' | 'breakthrough' | 'enemy' | 'neutral'
  compact?: boolean
  marker?: number | null
  text?: string
}>(), { label: '', icon: '', tone: 'neutral', compact: false, marker: null, text: '' })

const percent = computed(() => (props.max > 0 ? Math.max(0, Math.min(100, (props.value / props.max) * 100)) : 0))
const markerPercent = computed(() => (props.max > 0 && props.marker !== null ? Math.max(0, Math.min(100, (props.marker / props.max) * 100)) : 0))
const isLow = computed(() => ['hp', 'qi', 'stamina'].includes(props.tone) && percent.value < 30)
const display = computed(() => props.text || `${Math.round(props.value)} / ${Math.round(props.max)}`)
</script>
