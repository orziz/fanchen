<template>
  <component :is="as" :class="['ui-pill-row', 'inline-list', className]">
    <slot />
  </component>
</template>

<script setup lang="ts">
type ClassName = string | string[] | Record<string, boolean>

withDefaults(defineProps<{
  as?: string
  className?: ClassName
}>(), {
  as: 'div',
})
</script>