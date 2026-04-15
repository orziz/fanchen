<template>
  <!-- Map Window -->
  <aside
    class="floating-window map-window"
    :class="{ 'is-minimized': ws.map.minimized, 'is-docked': !!ws.map.dockSide }"
    :hidden="!ws.map.open"
    :style="windowStyle('map')"
    @pointerdown="bringToFront('map')"
  >
    <div class="window-header" @pointerdown.self="startDrag('map', $event)">
      <div>
        <p class="section-kicker">山河图</p>
        <h2>九州总图</h2>
      </div>
      <div class="window-actions">
        <button class="control-button ghost" type="button" @click="toggleMinimize('map')">{{ ws.map.minimized ? '展开' : '最小化' }}</button>
        <button class="control-button ghost" type="button" @click="toggleDock('map')">{{ ws.map.dockSide ? '取消停靠' : '停靠' }}</button>
        <button class="control-button" type="button" @click="closeWindow('map')">收起</button>
      </div>
    </div>
    <div v-show="!ws.map.minimized" class="window-body map-window-body">
      <section class="map-stage">
        <div class="window-toolbar">
          <div>
            <p class="section-kicker">远观九州</p>
            <h3>点击节点看详情，拖拽平移，滚轮缩放</h3>
          </div>
        </div>
        <div class="canvas-shell">
          <div ref="mapContainerRef" class="map-pixi-container"></div>
          <div class="canvas-overlay">
            <div class="overlay-stat">
              <span>当前地点</span>
              <strong>{{ currentLocation.name }}</strong>
            </div>
            <div class="overlay-stat">
              <span>挂机模式</span>
              <strong>{{ getModeLabel(player.mode) }}</strong>
            </div>
            <div class="overlay-stat wide">
              <span>当前行动</span>
              <strong>{{ ACTION_META[player.action]?.label || player.action }}</strong>
            </div>
          </div>
        </div>
      </section>
      <section class="location-panel">
        <div class="window-toolbar location-toolbar">
          <div>
            <p class="section-kicker">行迹与门路</p>
            <h3>地脉详情</h3>
          </div>
        </div>
        <LocationDetail />
      </section>
    </div>
  </aside>

  <!-- Journal Window -->
  <aside
    class="floating-window journal-window"
    :class="{ 'is-minimized': ws.journal.minimized, 'is-docked': !!ws.journal.dockSide }"
    :hidden="!ws.journal.open"
    :style="windowStyle('journal')"
    @pointerdown="bringToFront('journal')"
  >
    <div class="window-header" @pointerdown.self="startDrag('journal', $event)">
      <div>
        <p class="section-kicker">风闻</p>
        <h2>江湖纪事</h2>
      </div>
      <div class="window-actions">
        <button class="control-button ghost" type="button" @click="clearLog">清空</button>
        <button class="control-button ghost" type="button" @click="toggleMinimize('journal')">{{ ws.journal.minimized ? '展开' : '最小化' }}</button>
        <button class="control-button ghost" type="button" @click="toggleDock('journal')">{{ ws.journal.dockSide ? '取消停靠' : '停靠' }}</button>
        <button class="control-button" type="button" @click="closeWindow('journal')">收起</button>
      </div>
    </div>
    <div v-show="!ws.journal.minimized" class="window-body">
      <div class="window-scroll">
        <div class="log-list">
          <template v-if="log.length">
            <article v-for="(entry, i) in log" :key="i" :class="['log-item', entry.type]">
              <time>{{ entry.stamp }}</time>
              <div>{{ entry.text }}</div>
            </article>
          </template>
          <div v-else class="empty-state">江湖还很安静，新的故事即将开始。</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Profile Window -->
  <aside
    class="floating-window profile-window"
    :class="{ 'is-minimized': ws.profile.minimized, 'is-docked': !!ws.profile.dockSide }"
    :hidden="!ws.profile.open"
    :style="windowStyle('profile')"
    @pointerdown="bringToFront('profile')"
  >
    <div class="window-header" @pointerdown.self="startDrag('profile', $event)">
      <div>
        <p class="section-kicker">人物簿</p>
        <h2>生平与记录</h2>
      </div>
      <div class="window-actions">
        <button class="control-button ghost" type="button" @click="toggleMinimize('profile')">{{ ws.profile.minimized ? '展开' : '最小化' }}</button>
        <button class="control-button ghost" type="button" @click="toggleDock('profile')">{{ ws.profile.dockSide ? '取消停靠' : '停靠' }}</button>
        <button class="control-button" type="button" @click="closeWindow('profile')">收起</button>
      </div>
    </div>
    <div v-show="!ws.profile.minimized" class="window-body">
      <div class="window-scroll">
        <ProfileDetail />
      </div>
    </div>
  </aside>

  <!-- Command Window -->
  <aside
    class="floating-window command-window"
    :class="{ 'is-minimized': ws.command.minimized, 'is-docked': !!ws.command.dockSide }"
    :hidden="!ws.command.open"
    :style="windowStyle('command')"
    @pointerdown="bringToFront('command')"
  >
    <div class="window-header" @pointerdown.self="startDrag('command', $event)">
      <div>
        <p class="section-kicker">挂机策略</p>
        <h2>策略盘</h2>
      </div>
      <div class="window-actions">
        <button class="control-button ghost" type="button" @click="toggleMinimize('command')">{{ ws.command.minimized ? '展开' : '最小化' }}</button>
        <button class="control-button ghost" type="button" @click="toggleDock('command')">{{ ws.command.dockSide ? '取消停靠' : '停靠' }}</button>
        <button class="control-button" type="button" @click="closeWindow('command')">收起</button>
      </div>
    </div>
    <div v-show="!ws.command.minimized" class="window-body">
      <div class="window-scroll">
        <CommandDetail />
      </div>
    </div>
  </aside>

  <!-- Toast Stack -->
  <ToastStack />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META } from '@/config'
import { getModeLabel } from '@/composables/useUIHelpers'
import { useWindows, type WindowId } from '@/composables/useWindows'
import { createGameMap, type GameMap } from '@/pixi/map'
import LocationDetail from './LocationDetail.vue'
import ProfileDetail from './ProfileDetail.vue'
import CommandDetail from './CommandDetail.vue'
import ToastStack from './ToastStack.vue'

const store = useGameStore()
const { player, currentLocation, log } = storeToRefs(store)
const {
  windows: ws, closeWindow, toggleMinimize, toggleDock, bringToFront,
} = useWindows()

const mapContainerRef = ref<HTMLElement | null>(null)
let gameMap: GameMap | null = null

// Drag state
let dragState: { windowId: WindowId; offsetX: number; offsetY: number } | null = null

function windowStyle(id: WindowId) {
  const w = ws[id]
  return w.open ? {
    display: 'flex',
    left: `${w.left}px`,
    top: `${w.top}px`,
    zIndex: 50 + (w.z || 1),
  } : { display: 'none' }
}

function startDrag(id: WindowId, event: PointerEvent) {
  if (event.button !== 0) return
  bringToFront(id)
  dragState = { windowId: id, offsetX: event.clientX - ws[id].left, offsetY: event.clientY - ws[id].top }
  document.body.classList.add('dragging-window')
}

function onPointerMove(event: PointerEvent) {
  if (!dragState) return
  const w = ws[dragState.windowId]
  w.left = Math.max(12, Math.min(window.innerWidth - 60, event.clientX - dragState.offsetX))
  w.top = Math.max(12, Math.min(window.innerHeight - 60, event.clientY - dragState.offsetY))
}

function onPointerUp() {
  if (!dragState) return
  dragState = null
  document.body.classList.remove('dragging-window')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    const { closeTopWindow } = useWindows()
    closeTopWindow()
  }
}

function clearLog() {
  store.clearLog()
}

onMounted(async () => {
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('keydown', onKeydown)
  if (mapContainerRef.value) {
    gameMap = await createGameMap()
    await gameMap.mount(mapContainerRef.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('keydown', onKeydown)
  gameMap?.destroy()
  gameMap = null
})
</script>
