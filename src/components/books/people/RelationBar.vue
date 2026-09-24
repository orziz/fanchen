<template>
  <div class="relation-bar" :class="{ 'is-negative-scale': negative }">
    <span class="relation-bar__label">{{ label }}</span>
    <div class="relation-bar__track">
      <span v-if="!negative" class="relation-bar__center" />
      <span class="relation-bar__fill" :class="{ 'is-neg': value < 0 }" :style="fillStyle" />
    </div>
    <span class="relation-bar__value num">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** 交情条：好感、信任、情缘以中线为零，左负右正；仇怨从零起算。 */
const props = withDefaults(defineProps<{ label: string; value: number; negative?: boolean }>(), { negative: false })

const fillStyle = computed(() => {
  const v = Math.max(-100, Math.min(100, props.value))
  if (props.negative) return { left: '0%', width: `${Math.max(0, v)}%` }
  return v >= 0 ? { left: '50%', width: `${v / 2}%` } : { left: `${50 + v / 2}%`, width: `${-v / 2}%` }
})
</script>
