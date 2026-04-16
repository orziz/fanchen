<template>
  <component :is="as" :class="classes">
    <slot>{{ label }}</slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type PillVariant = 'tag' | 'trait' | 'route' | 'rarity' | 'timer' | 'command-chip' | 'command-pill'
type PillTone =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'current'
  | 'route'
  | 'cooldown'
  | 'warning'
  | 'active'
  | 'good'
  | 'steady'
  | 'warn'
  | 'recommended'

type ClassName = string | string[] | Record<string, boolean>

const props = withDefaults(defineProps<{
  as?: string
  label?: string | number
  variant?: PillVariant
  tone?: PillTone | string | ''
  className?: ClassName
}>(), {
  as: 'span',
  label: '',
  variant: 'tag',
  tone: '',
})

const variantClassMap: Record<PillVariant, string> = {
  tag: 'tag',
  trait: 'trait-chip',
  route: 'route-pill',
  rarity: 'rarity',
  timer: 'auction-timer',
  'command-chip': 'command-chip',
  'command-pill': 'command-pill',
}

const toneClassMap: Partial<Record<PillTone, string>> = {
  current: 'current-chip',
  route: 'route-chip',
  cooldown: 'cooldown-chip',
  warning: 'warning-chip',
}

const classes = computed(() => [
  'ui-pill',
  `ui-pill--${props.variant}`,
  variantClassMap[props.variant],
  props.className,
  props.tone,
  props.tone ? toneClassMap[props.tone] : '',
])
</script>