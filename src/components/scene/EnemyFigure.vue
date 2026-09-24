<template>
  <div class="enemy-figure" :class="[`shape-${shape}`, `motion-${motion}`, { 'is-boss': boss }]" :style="{ '--enemy-scale': figure.scale * (boss ? 1.35 : 1), '--enemy-float': figure.float, '--enemy-aura': aura }">
    <div class="enemy-figure__aura" aria-hidden="true" />
    <svg class="enemy-figure__svg" :viewBox="`0 0 ${figure.viewBox[0]} ${figure.viewBox[1]}`" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g filter="url(#hero-ink-edge)">
        <path v-for="(part, index) in figure.parts" :key="`${shape}-${index}`" :d="part.d" :class="`enemy-${part.cls}`" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ENEMY_FIGURES, type EnemyShape } from '@/art/figures/enemies'

const props = withDefaults(defineProps<{
  shape: EnemyShape
  boss?: boolean
  aura?: string
  motion?: 'idle' | 'attack' | 'hit' | 'defeated'
}>(), { boss: false, aura: 'rgba(120, 140, 150, 0.35)', motion: 'idle' })

const figure = computed(() => ENEMY_FIGURES[props.shape])
</script>
