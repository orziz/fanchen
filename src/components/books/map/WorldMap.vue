<template>
  <div
    ref="root"
    class="world-map"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <svg class="world-map__svg" :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" role="img" aria-label="山河图">
      <defs>
        <radialGradient id="map-silk" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stop-color="#2c2821" />
          <stop offset="70%" stop-color="#1a1814" />
          <stop offset="100%" stop-color="#100f0c" />
        </radialGradient>
        <filter id="map-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0.85  0 0 0 0 0.8  0 0 0 0 0.68  0 0 0 0.09 0" />
        </filter>
        <filter id="map-brush" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
        </filter>
      </defs>

      <rect :x="frame.x" :y="frame.y" :width="frame.w" :height="frame.h" fill="url(#map-silk)" />
      <rect :x="frame.x" :y="frame.y" :width="frame.w" :height="frame.h" filter="url(#map-grain)" />

      <g class="map-terrain" aria-hidden="true">
        <path v-for="glyph in glyphs" :key="glyph.key" :d="glyph.d" :class="`map-glyph map-glyph--${glyph.kind}`" />
      </g>

      <g class="map-routes" filter="url(#map-brush)">
        <path v-for="edge in edges" :key="edge.key" :d="edge.d" class="map-route" :class="{ 'is-near': edge.near }" />
      </g>
      <path v-if="previewPath" :d="previewPath" class="map-route map-route--preview" />
      <path v-if="plannedPath" :d="plannedPath" class="map-route map-route--planned" />

      <g
        v-for="node in nodes"
        :key="node.id"
        class="map-node"
        :class="[`map-node--${node.kind}`, { 'is-current': node.id === currentId, 'is-selected': node.id === selectedId, 'is-realm': node.id === realmLocationId, 'is-dest': node.id === destinationId }]"
        :transform="`translate(${node.x} ${node.y})`"
        @click.stop="select(node.id)"
      >
        <circle class="map-node__hit" r="26" />
        <circle v-if="node.id === realmLocationId" class="map-node__realm" r="20" />
        <circle v-if="node.id === selectedId" class="map-node__ring" r="15" />
        <rect v-if="node.kind === 'city'" class="map-node__mark" x="-7" y="-7" width="14" height="14" rx="1.5" />
        <rect v-else-if="node.kind === 'town'" class="map-node__mark" x="-5" y="-5" width="10" height="10" rx="1" transform="rotate(45)" />
        <path v-else-if="node.kind === 'sect'" class="map-node__mark" d="M -8 5 L 0 -8 L 8 5 Z M -5 5 L -5 8 L 5 8 L 5 5" />
        <circle v-else class="map-node__mark" r="5" />
        <text class="map-node__label" :y="node.labelBelow || node.id === currentId ? 24 : -14">{{ node.name }}</text>
      </g>

      <g v-if="current" class="map-hero" :transform="`translate(${current.x} ${current.y})`" aria-hidden="true">
        <circle class="map-hero__pulse" r="12" />
        <path class="map-hero__pin" d="M 0 -30 C -7 -30 -10 -24 -10 -20 C -10 -14 0 -8 0 -8 C 0 -8 10 -14 10 -20 C 10 -24 7 -30 0 -30 Z" />
        <circle class="map-hero__dot" cy="-21" r="3.2" />
      </g>
    </svg>

    <div class="world-map__controls">
      <button class="icon-btn" type="button" aria-label="放大" data-tip="放大" @click="zoomAt(0.8)"><GameIcon name="plus" /></button>
      <button class="icon-btn" type="button" aria-label="缩小" data-tip="缩小" @click="zoomAt(1.25)"><GameIcon name="minus" /></button>
      <button class="icon-btn" type="button" aria-label="回到所在" data-tip="回到所在" @click="focusCurrent"><GameIcon name="target" /></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { resolveArchetype } from '@/art/scene/archetype'
import { createRng, hashString, range } from '@/art/rng'
import { getTravelPreview } from '@/systems/world'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import { useMapView } from '@/components/books/map/useMapView'

const store = useGameStore()
const { player, world, selectedLocationId } = storeToRefs(store)
const root = ref<HTMLElement | null>(null)

const PAD = 90
const xs = LOCATIONS.map(l => l.x)
const ys = LOCATIONS.map(l => l.y)
const bounds = { x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD, w: Math.max(...xs) - Math.min(...xs) + PAD * 2, h: Math.max(...ys) - Math.min(...ys) + PAD * 2 }
const frame = { x: bounds.x - bounds.w, y: bounds.y - bounds.h, w: bounds.w * 3, h: bounds.h * 3 }

const { viewBox, fit, zoomAt, centerOn, onWheel, onPointerDown, onPointerMove, onPointerUp, wasDrag } = useMapView(root, bounds)

function kindOf(tags: string[]) {
  if (tags.includes('sect')) return 'sect'
  if (tags.includes('city')) return 'city'
  if (tags.includes('town') || tags.includes('port') || tags.includes('market')) return 'town'
  return 'wild'
}

const nodes = LOCATIONS.map(location => {
  const above = LOCATIONS.some(other => other.id !== location.id && Math.abs(other.x - location.x) < 60 && other.y < location.y && location.y - other.y < 42)
  return { id: location.id, name: location.name, x: location.x, y: location.y, kind: kindOf(location.tags), labelBelow: above }
})

/** 路网：每对相邻地点一条略带弯折的墨线，弯度由两地编号决定，每次打开都一样。 */
const edgeList = (() => {
  const seen = new Set<string>()
  const list: { key: string; a: string; b: string; d: string }[] = []
  for (const location of LOCATIONS) {
    for (const neighborId of location.neighbors) {
      const key = [location.id, neighborId].sort().join('|')
      const other = LOCATION_MAP.get(neighborId)
      if (seen.has(key) || !other) continue
      seen.add(key)
      const bend = ((hashString(key) % 100) / 100 - 0.5) * 0.35
      const mx = (location.x + other.x) / 2 - (other.y - location.y) * bend
      const my = (location.y + other.y) / 2 + (other.x - location.x) * bend
      list.push({ key, a: location.id, b: neighborId, d: `M ${location.x} ${location.y} Q ${mx} ${my} ${other.x} ${other.y}` })
    }
  }
  return list
})()

const edgeByPair = new Map(edgeList.map(edge => [edge.key, edge]))

const currentId = computed(() => player.value.locationId)
const selectedId = computed(() => selectedLocationId.value)
const current = computed(() => LOCATION_MAP.get(currentId.value) || null)
const destinationId = computed(() => player.value.travelPlan?.destinationId || null)
const realmLocationId = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id)?.locationId || null : null
})

const edges = computed(() => edgeList.map(edge => ({ ...edge, near: edge.a === currentId.value || edge.b === currentId.value })))

function pathThrough(route: string[]) {
  const parts: string[] = []
  for (let i = 0; i < route.length - 1; i += 1) {
    const key = [route[i], route[i + 1]].sort().join('|')
    const edge = edgeByPair.get(key)
    if (!edge) continue
    if (edge.a === route[i]) parts.push(edge.d)
    else {
      const a = LOCATION_MAP.get(edge.a)!
      const b = LOCATION_MAP.get(edge.b)!
      const q = edge.d.split('Q ')[1].split(' ')
      parts.push(`M ${b.x} ${b.y} Q ${q[0]} ${q[1]} ${a.x} ${a.y}`)
    }
  }
  return parts.join(' ')
}

const plannedPath = computed(() => {
  const plan = player.value.travelPlan
  if (!plan) return ''
  return pathThrough(plan.route.slice(Math.max(0, plan.nextIndex - 1)))
})

const previewPath = computed(() => {
  if (!selectedId.value || selectedId.value === currentId.value || selectedId.value === destinationId.value) return ''
  void world.value.hour
  const preview = getTravelPreview(selectedId.value)
  return preview.route ? pathThrough(preview.route) : ''
})

/** 地貌小符号：山、水、林，环绕地点点缀。 */
const glyphs = (() => {
  const list: { key: string; d: string; kind: string }[] = []
  for (const location of LOCATIONS) {
    const arch = resolveArchetype(location)
    const rng = createRng(`map:${location.id}`)
    const mountain = ['peaks', 'karst', 'snow', 'cliffs', 'gorge', 'volcanic'].includes(arch.relief)
    const count = mountain ? 3 : 2
    for (let i = 0; i < count; i += 1) {
      const angle = range(rng, 0, Math.PI * 2)
      const dist = range(rng, 26, 44)
      const x = location.x + Math.cos(angle) * dist
      const y = location.y + Math.sin(angle) * dist * 0.7 + 6
      if (mountain) {
        const s = range(rng, 0.8, 1.3)
        list.push({ key: `${location.id}m${i}`, kind: arch.relief === 'snow' ? 'snow' : 'mountain', d: `M ${x - 11 * s} ${y} L ${x - 4 * s} ${y - 11 * s} L ${x} ${y - 6 * s} L ${x + 5 * s} ${y - 14 * s} L ${x + 12 * s} ${y} Z` })
      } else if (arch.water !== 'none') {
        list.push({ key: `${location.id}w${i}`, kind: 'water', d: `M ${x - 12} ${y} q 4 -3 8 0 t 8 0 t 8 0` })
      } else if (arch.flora.includes('forest') || arch.flora.includes('pine')) {
        list.push({ key: `${location.id}t${i}`, kind: 'tree', d: `M ${x} ${y} L ${x} ${y - 9} M ${x - 5} ${y - 4} L ${x} ${y - 10} L ${x + 5} ${y - 4}` })
      } else {
        list.push({ key: `${location.id}h${i}`, kind: 'hill', d: `M ${x - 10} ${y} Q ${x} ${y - 9} ${x + 10} ${y}` })
      }
    }
  }
  return list
})()

function select(id: string) {
  if (wasDrag()) return
  sfx.page()
  selectedLocationId.value = id
}

function focusCurrent() {
  if (current.value) centerOn(current.value.x, current.value.y, bounds.w * 0.55)
}

onMounted(() => {
  fit()
  if (current.value) centerOn(current.value.x, current.value.y, bounds.w * 0.7)
})
</script>
