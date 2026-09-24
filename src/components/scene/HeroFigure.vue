<template>
  <div class="hero-figure" :class="[`pose-${pose}`, `motion-${motion}`]" :style="{ '--pose-scale': figure.scale }">
    <div class="hero-figure__aura" aria-hidden="true" />
    <svg class="hero-figure__svg" :viewBox="`0 0 ${figure.viewBox[0]} ${figure.viewBox[1]}`" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <filter id="hero-ink-edge" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <ellipse class="hero-figure__shadow" :cx="figure.viewBox[0] / 2" :cy="figure.viewBox[1] - 1" :rx="figure.viewBox[0] * 0.42" ry="2.4" />
      <g filter="url(#hero-ink-edge)">
        <path v-for="(part, index) in figure.parts" :key="`${pose}-${index}`" :d="part.d" :class="[`fig-${part.cls}`, part.frame ? `frame-${part.frame}` : '']" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HERO_POSES, type HeroPose } from '@/art/figures/hero'

const props = withDefaults(defineProps<{
  pose: HeroPose
  motion?: 'idle' | 'attack' | 'hit' | 'surge'
}>(), { motion: 'idle' })

const figure = computed(() => HERO_POSES[props.pose])
</script>
