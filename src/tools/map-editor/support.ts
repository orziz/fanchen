import type { LocationData } from '@/config/world'

import { normalizeLocations } from '@/tools/shared/worldFile'

export type StatusTone = 'neutral' | 'success' | 'error'
export type ListFieldName = 'actions' | 'tags' | 'factionIds'

export interface MapView {
  scale: number
  offsetX: number
  offsetY: number
}

export interface ScreenPoint {
  x: number
  y: number
}

export interface SelectionBox {
  pointerId: number
  start: ScreenPoint
  current: ScreenPoint
}

export interface NodeDrag {
  id: string
  pointerId: number
  snapshot: LocationData[]
  moved: boolean
}

export interface ViewPan {
  pointerId: number
  start: ScreenPoint
  origin: MapView
}

export const VIEW_WIDTH = 1700
export const VIEW_HEIGHT = 920
export const MIN_SCALE = 0.62
export const MAX_SCALE = 2.4
const PAN_PADDING = 180
export const FORM_FIELD_NAMES = ['id', 'name', 'x', 'y', 'region', 'danger', 'marketBias', 'marketTier', 'aura', 'terrain', 'resource', 'realmId', 'desc'] as const

export function collectIssues(locations: LocationData[]) {
  const issues: string[] = []
  const byId = new Map<string, LocationData>()
  const duplicateIds = new Set<string>()

  locations.forEach((location) => {
    if (!location.id.trim()) issues.push('存在空白地点 id。')
    if (!location.name.trim()) issues.push(`${location.id || '未命名地点'} 缺少名称。`)
    if (byId.has(location.id)) duplicateIds.add(location.id)
    byId.set(location.id, location)
  })

  duplicateIds.forEach((id) => {
    issues.push(`地点 id ${id} 重复。`)
  })

  locations.forEach((location) => {
    if (!location.neighbors.length) issues.push(`${location.id} 当前没有连通路网。`)
    location.neighbors.forEach((neighborId) => {
      const neighbor = byId.get(neighborId)
      if (!neighbor) {
        issues.push(`${location.id} 指向了不存在的邻接地点 ${neighborId}。`)
        return
      }
      if (!neighbor.neighbors.includes(location.id)) {
        issues.push(`${location.id} -> ${neighborId} 缺少反向连线。`)
      }
    })
  })

  return Array.from(new Set(issues)).slice(0, 16)
}

export function createLocation(base: LocationData | null, existing: LocationData[]) {
  const id = createUniqueId(existing, 'new-location')
  return {
    id,
    name: '新地点',
    x: clamp((base?.x || VIEW_WIDTH / 2) + 40, 24, VIEW_WIDTH - 24),
    y: clamp((base?.y || VIEW_HEIGHT / 2) + 40, 24, VIEW_HEIGHT - 24),
    region: base?.region || '未定区域',
    danger: 1,
    marketBias: base?.marketBias || 'grain',
    marketTier: base?.marketTier || 0,
    aura: base?.aura || 20,
    terrain: base?.terrain || '未定地形',
    desc: '待补地点描述。',
    actions: ['meditate'],
    neighbors: [],
    resource: base?.resource || '待定资源',
    realmId: null,
    tags: [],
    factionIds: [],
  }
}

export function cloneLocations(locations: LocationData[]) {
  return locations.map((location) => ({
    ...location,
    actions: [...location.actions],
    neighbors: [...location.neighbors],
    tags: [...location.tags],
    factionIds: [...location.factionIds],
  }))
}

export function cloneView(view: MapView): MapView {
  return { ...view }
}

export function getDefaultView(): MapView {
  return clampView({ scale: 1, offsetX: 0, offsetY: 0 })
}

export function getLocationById(locations: LocationData[], locationId: string | null) {
  return locationId ? locations.find((location) => location.id === locationId) || null : null
}

export function setListField(location: LocationData, field: ListFieldName, values: string[]) {
  const next = uniqueStrings(values)
  if (field === 'actions') location.actions = next
  if (field === 'tags') location.tags = next
  if (field === 'factionIds') location.factionIds = next
}

export function getListField(location: LocationData, field: ListFieldName) {
  if (field === 'actions') return [...location.actions]
  if (field === 'tags') return [...location.tags]
  return [...location.factionIds]
}

export function toggleRoadLinks(locations: LocationData[], sourceIds: string[], targetId: string) {
  const uniqueSources = uniqueStrings(sourceIds.filter((sourceId) => sourceId !== targetId))
  const target = locations.find((location) => location.id === targetId)
  if (!target || !uniqueSources.length) return null

  const sources = uniqueSources
    .map((sourceId) => locations.find((location) => location.id === sourceId))
    .filter((location): location is LocationData => Boolean(location))

  if (!sources.length) return null
  const disconnect = sources.every((source) => source.neighbors.includes(targetId))

  sources.forEach((source) => {
    if (disconnect) {
      source.neighbors = source.neighbors.filter((neighborId) => neighborId !== targetId)
      return
    }
    source.neighbors = uniqueStrings([...source.neighbors, targetId])
  })

  if (disconnect) {
    target.neighbors = target.neighbors.filter((neighborId) => !uniqueSources.includes(neighborId))
  } else {
    target.neighbors = uniqueStrings([...target.neighbors, ...uniqueSources])
  }

  return disconnect ? 'disconnected' : 'connected'
}

export function locationsSignature(locations: LocationData[]) {
  return JSON.stringify(normalizeLocations(cloneLocations(locations)))
}

export function syncSelection(locationIds: string[], selectedIds: Set<string>, selectedId: string | null) {
  const available = new Set(locationIds)
  const filteredIds = [...selectedIds].filter((id) => available.has(id))
  const nextSelectedId = selectedId && available.has(selectedId) ? selectedId : filteredIds[0] || locationIds[0] || null
  const nextSelectedIds = filteredIds.length ? new Set(filteredIds) : new Set(nextSelectedId ? [nextSelectedId] : [])
  if (nextSelectedId && !nextSelectedIds.has(nextSelectedId)) nextSelectedIds.add(nextSelectedId)
  return { selectedIds: nextSelectedIds, selectedId: nextSelectedId }
}

export function safeInteger(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

export function parseListValue(value: string) {
  return value
    .split(/[\n,，]/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function clampView(view: MapView) {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE)
  const scaledWidth = VIEW_WIDTH * scale
  const scaledHeight = VIEW_HEIGHT * scale
  const nextView = { ...view, scale }

  if (scaledWidth + PAN_PADDING * 2 <= VIEW_WIDTH) {
    nextView.offsetX = (VIEW_WIDTH - scaledWidth) / 2
  } else {
    nextView.offsetX = clamp(nextView.offsetX, VIEW_WIDTH - scaledWidth - PAN_PADDING, PAN_PADDING)
  }

  if (scaledHeight + PAN_PADDING * 2 <= VIEW_HEIGHT) {
    nextView.offsetY = (VIEW_HEIGHT - scaledHeight) / 2
  } else {
    nextView.offsetY = clamp(nextView.offsetY, VIEW_HEIGHT - scaledHeight - PAN_PADDING, PAN_PADDING)
  }

  return nextView
}

export function getSvgPoint(event: MouseEvent | PointerEvent | WheelEvent, canvas: SVGSVGElement): ScreenPoint {
  const screenPoint = canvas.createSVGPoint()
  const screenCtm = canvas.getScreenCTM()

  screenPoint.x = event.clientX
  screenPoint.y = event.clientY

  if (screenCtm) {
    const mappedPoint = screenPoint.matrixTransform(screenCtm.inverse())
    return {
      x: mappedPoint.x,
      y: mappedPoint.y,
    }
  }

  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
  }
}

export function screenToWorld(point: ScreenPoint, view: MapView): ScreenPoint {
  return {
    x: (point.x - view.offsetX) / view.scale,
    y: (point.y - view.offsetY) / view.scale,
  }
}

export function worldToScreen(point: ScreenPoint, view: MapView): ScreenPoint {
  return {
    x: point.x * view.scale + view.offsetX,
    y: point.y * view.scale + view.offsetY,
  }
}

export function getBoxBounds(box: SelectionBox) {
  return {
    left: Math.min(box.start.x, box.current.x),
    top: Math.min(box.start.y, box.current.y),
    width: Math.abs(box.start.x - box.current.x),
    height: Math.abs(box.start.y - box.current.y),
  }
}

export function getSelectionFromBox(locations: LocationData[], box: SelectionBox, view: MapView) {
  const bounds = getBoxBounds(box)
  return locations
    .filter((location) => {
      const point = worldToScreen({ x: location.x, y: location.y }, view)
      return point.x >= bounds.left && point.x <= bounds.left + bounds.width && point.y >= bounds.top && point.y <= bounds.top + bounds.height
    })
    .map((location) => location.id)
}

export function getHighlightedNeighborIds(locations: LocationData[], selectedIds: Set<string>) {
  const neighbors = new Set<string>()
  selectedIds.forEach((locationId) => {
    const location = locations.find((entry) => entry.id === locationId)
    location?.neighbors.forEach((neighborId) => neighbors.add(neighborId))
  })
  return neighbors
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}

export function query<T extends Element>(selector: string) {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error(`missing_element:${selector}`)
  return node
}

function createUniqueId(existing: LocationData[], prefix: string) {
  let index = 1
  let candidate = `${prefix}-${index}`
  while (existing.some((location) => location.id === candidate)) {
    index += 1
    candidate = `${prefix}-${index}`
  }
  return candidate
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort()
}