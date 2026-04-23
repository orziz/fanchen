<template>
  <div>
    <div class="meter-label"><span>{{ label }}</span><span>{{ Math.round(value) }} / {{ Math.round(max) }}</span></div>
    <div class="meter-track"><div :class="['meter-fill', className]" :style="{ width: percent + '%' }"></div></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  max: number
  className?: string
}>()

const percent = computed(() => props.max > 0 ? Math.max(0, Math.min(100, (props.value / props.max) * 100)) : 0)
</script>
