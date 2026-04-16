<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type CardTone = 'item' | 'market' | 'auction' | 'npc' | 'world' | 'combat'
type ClassName = string | string[] | Record<string, boolean>

const props = withDefaults(defineProps<{
  as?: string
  tone?: CardTone
  standout?: boolean
  muted?: boolean
  className?: ClassName
}>(), {
  as: 'div',
  tone: 'item',
  standout: false,
  muted: false,
})

const toneClassMap: Record<CardTone, string> = {
  item: 'item-card',
  market: 'market-card',
  auction: 'auction-card',
  npc: 'npc-card',
  world: 'world-card',
  combat: 'combat-card',
}

const classes = computed(() => [
  toneClassMap[props.tone],
  'ui-panel-card',
  `ui-panel-card--${props.tone}`,
  props.className,
  {
    standout: props.standout,
    'muted-card': props.muted,
  },
])
</script>