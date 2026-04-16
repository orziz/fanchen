<template>
  <div class="map-panel-full">
    <div class="map-stage-full">
      <div class="window-toolbar map-toolbar">
        <div class="map-toolbar-copy">
          <p class="section-kicker">山河图</p>
          <h3>点击节点看详情，拖拽平移，滚轮缩放</h3>
        </div>
        <div class="map-toolbar-strip">
          <div class="map-overlay-bar map-overlay-summary">
            <div class="overlay-stat">
              <span>当前地点</span>
              <strong>{{ currentLocation.name }}</strong>
            </div>
            <div class="overlay-stat">
              <span>挂机模式</span>
              <strong>{{ getModeLabel(player.mode) }}</strong>
            </div>
            <div class="overlay-stat">
              <span>当前行动</span>
              <strong>{{ ACTION_META[player.action]?.label || player.action }}</strong>
            </div>
          </div>
          <div class="map-toolbar-tools">
            <div class="map-zoom-pill overlay-stat">
              <span>视图缩放</span>
              <strong>{{ zoomLabel }}</strong>
            </div>
            <div class="map-toolbar-actions">
              <button class="control-button" type="button" @click="handleZoom(-1)">缩小</button>
              <button class="control-button" type="button" @click="handleZoom(1)">放大</button>
              <button class="control-button ghost" type="button" @click="handleResetView">归中</button>
            </div>
          </div>
        </div>
      </div>
      <div class="canvas-shell">
        <div ref="mapContainerRef" class="map-pixi-container"></div>
      </div>
    </div>
    <section class="location-panel-side">
      <div class="window-toolbar location-toolbar">
        <div>
          <p class="section-kicker">行迹与门路</p>
          <h3>地脉详情</h3>
        </div>
      </div>
      <LocationDetail />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META } from '@/config'
import { useStage } from '@/composables/useStage'
import { getModeLabel } from '@/composables/useUIHelpers'
import { createGameMap, type GameMap } from '@/pixi/map'
import LocationDetail from './LocationDetail.vue'

const store = useGameStore()
const { player, currentLocation, selectedLocationId } = storeToRefs(store)
const { activeTab } = useStage()

const mapContainerRef = ref<HTMLElement | null>(null)
const zoomPercent = ref(100)
const zoomLabel = computed(() => {
  if (zoomPercent.value === 100) return '基准 100%'
  return zoomPercent.value > 100 ? `放大 ${zoomPercent.value}%` : `缩至 ${zoomPercent.value}%`
})
let gameMap: GameMap | null = null
let disposed = false

function focusSelectedLocation(preferClose = false) {
  const locationId = selectedLocationId.value
  if (!gameMap || !locationId) return
  const preferredScale = preferClose && locationId !== currentLocation.value.id ? 1.02 : undefined
  gameMap.focusOn(locationId, preferredScale)
}

onMounted(async () => {
  disposed = false
  const container = mapContainerRef.value
  if (!container) return

  const nextMap = await createGameMap({
    onViewportChange(value) {
      zoomPercent.value = value
    },
  })

  if (disposed) {
    nextMap.destroy()
    return
  }

  gameMap = nextMap

  if (!container.isConnected) {
    nextMap.destroy()
    if (gameMap === nextMap) gameMap = null
    return
  }

  await nextMap.mount(container)

  if (disposed) {
    nextMap.destroy()
    if (gameMap === nextMap) gameMap = null
    return
  }

  if (selectedLocationId.value) {
    focusSelectedLocation(true)
  }
})

watch(selectedLocationId, (locationId, previousId) => {
  if (!gameMap || !locationId || locationId === previousId) return
  focusSelectedLocation(true)
})

watch(activeTab, tab => {
  if (tab !== 'map' || !gameMap || !selectedLocationId.value) return
  focusSelectedLocation(true)
})

function handleZoom(direction: number) {
  gameMap?.zoomBy(direction)
}

function handleResetView() {
  gameMap?.resetView()
}

onUnmounted(() => {
  disposed = true
  const currentMap = gameMap
  gameMap = null
  currentMap?.destroy()
})
</script>
