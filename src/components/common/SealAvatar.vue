<template>
  <span class="seal-avatar" :class="[`seal-avatar--${variant}`, `seal-avatar--${size}`]" :style="{ '--seal-hue': hue }" aria-hidden="true">
    <span class="seal-avatar__glyph">{{ glyph }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hashString } from '@/art/rng'

const props = withDefaults(defineProps<{
  name: string
  seed?: string
  variant?: 'cinnabar' | 'ink' | 'jade'
  size?: 'sm' | 'md' | 'lg'
}>(), { seed: '', variant: 'ink', size: 'md' })

const glyph = computed(() => props.name.trim().charAt(0) || '无')
const hue = computed(() => `${hashString(props.seed || props.name) % 360}`)
</script>
