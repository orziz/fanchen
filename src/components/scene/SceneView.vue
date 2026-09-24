<template>
  <div ref="rootEl" class="scene-view" :class="{ 'is-fighting': fighting, 'is-traveling': traveling }">
    <div :key="fx.shakeKey" class="scene-view__shaker" :class="{ 'is-shaking': fx.shakeKey > 0 }" :style="{ '--shake': fx.shakeStrength }">
      <canvas ref="canvasEl" class="scene-view__canvas" />
      <div class="scene-view__actors" :style="{ '--hero-light': heroLight }">
        <div class="scene-actor scene-actor--hero" :class="{ 'is-dueling': fighting }">
          <div class="scene-floats scene-floats--hero">
            <span v-for="item in heroFloats" :key="item.id" class="float-text" :class="`float-text--${item.tone}`">
              <GameIcon v-if="item.icon" :name="item.icon" />{{ item.text }}
            </span>
          </div>
          <HeroFigure :pose="pose" :motion="fx.heroMotion" />
        </div>
        <Transition name="enemy-in">
          <div v-if="enemy" :key="enemy.id" class="scene-actor scene-actor--enemy">
            <div class="scene-floats scene-floats--enemy">
              <span v-for="item in enemyFloats" :key="item.id" class="float-text" :class="`float-text--${item.tone}`">{{ item.text }}</span>
            </div>
            <EnemyFigure :shape="enemyShape" :boss="enemy.boss" :aura="enemyAura" :motion="fx.enemyMotion" />
          </div>
        </Transition>
      </div>
    </div>

    <LocationPlate />
    <slot />

    <Transition name="banner">
      <div v-if="fx.banner" :key="fx.banner.id" class="scene-banner" :class="`scene-banner--${fx.banner.kind}`">
        <strong class="scene-banner__title">{{ fx.banner.title }}</strong>
        <span v-if="fx.banner.subtitle" class="scene-banner__subtitle">{{ fx.banner.subtitle }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP } from '@/config'
import { resolveArchetype } from '@/art/scene/archetype'
import { resolveLight, resolveWeather } from '@/art/scene/palette'
import { SceneRenderer } from '@/art/scene/renderer'
import { poseForAction } from '@/art/figures/hero'
import { shapeForEnemy } from '@/art/figures/enemies'
import { useFx } from '@/composables/useFx'
import { useSettings } from '@/composables/useSettings'
import GameIcon from '@/components/common/GameIcon.vue'
import HeroFigure from '@/components/scene/HeroFigure.vue'
import EnemyFigure from '@/components/scene/EnemyFigure.vue'
import LocationPlate from '@/components/scene/LocationPlate.vue'

const store = useGameStore()
const { player, world, combat } = storeToRefs(store)
const settings = useSettings()
const { fx } = useFx()

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let renderer: SceneRenderer | null = null
let resizeObserver: ResizeObserver | null = null

const traveling = computed(() => Boolean(player.value.travelPlan))
const fighting = computed(() => Boolean(combat.value.currentEnemy))
const enemy = computed(() => combat.value.currentEnemy)
const pose = computed(() => poseForAction(player.value.action, traveling.value, fighting.value))
const enemyShape = computed(() => shapeForEnemy(enemy.value?.realmId || enemy.value?.templateId))
const enemyAura = computed(() => {
  const affixes = enemy.value?.affixIds || []
  if (affixes.includes('ember')) return 'rgba(200, 90, 50, 0.45)'
  if (affixes.includes('frostmail')) return 'rgba(130, 180, 220, 0.45)'
  if (affixes.includes('soul-drain')) return 'rgba(120, 190, 160, 0.4)'
  return enemy.value?.boss ? 'rgba(200, 160, 90, 0.4)' : 'rgba(110, 120, 130, 0.35)'
})

const heroFloats = computed(() => fx.floats.filter(f => f.target === 'hero'))
const enemyFloats = computed(() => fx.floats.filter(f => f.target === 'enemy'))

const heroLight = computed(() => {
  const light = resolveLight(world.value.hour, resolveWeather(world.value.weather))
  return (1 - light.night * 0.45).toFixed(2)
})

const sceneInput = computed(() => {
  const location = LOCATION_MAP.get(player.value.locationId) || LOCATION_MAP.get('qinghe')!
  return {
    key: location.id,
    archetype: resolveArchetype(location),
    hour: world.value.hour,
    weather: resolveWeather(world.value.weather),
    travel: traveling.value,
    heroEffect: (!fighting.value && !traveling.value && ['meditate', 'breakthrough'].includes(player.value.action) ? 'qi' : 'none') as 'qi' | 'none',
    reduceMotion: settings.reduceMotion,
  }
})

watch(sceneInput, input => renderer?.setInput(input))

watch(() => fx.flash, flash => {
  if (flash) renderer?.flash(flash.color, 260)
})

watch(() => fx.banner, banner => {
  if (banner?.kind === 'breakthrough') renderer?.burstQi()
})

onMounted(() => {
  if (!canvasEl.value) return
  renderer = new SceneRenderer(canvasEl.value)
  renderer.resize()
  renderer.setInput(sceneInput.value)
  renderer.start()
  resizeObserver = new ResizeObserver(() => renderer?.resize())
  if (rootEl.value) resizeObserver.observe(rootEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  renderer?.destroy()
  renderer = null
})
</script>
