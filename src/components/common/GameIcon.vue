<template>
  <svg class="game-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from '@/art/icons'

const props = defineProps<{ name: IconName | string }>()
const path = computed(() => ICONS[props.name as IconName] || ICONS.misc)
</script>
