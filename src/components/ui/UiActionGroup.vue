<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ActionGroupVariant = 'item' | 'market' | 'auction' | 'npc' | 'teaching' | 'combat' | 'quick'
type ClassName = string | string[] | Record<string, boolean>

const props = withDefaults(defineProps<{
  as?: string
  variant?: ActionGroupVariant
  className?: ClassName
}>(), {
  as: 'div',
  variant: 'item',
})

const variantClassMap: Record<ActionGroupVariant, string> = {
  item: 'item-actions',
  market: 'market-actions',
  auction: 'auction-actions',
  npc: 'npc-actions',
  teaching: 'teaching-actions',
  combat: 'combat-actions',
  quick: 'quick-actions',
}

const classes = computed(() => [
  'ui-action-group',
  `ui-action-group--${props.variant}`,
  variantClassMap[props.variant],
  props.className,
])
</script>