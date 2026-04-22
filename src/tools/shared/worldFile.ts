import type { LocationData } from '../../config/world'

function escapeString(value: string) {
  return JSON.stringify(value)
}

function toSafeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

function formatStringArray(values: string[]) {
  if (!values.length) return '[]'
  return `[${values.map((value) => escapeString(value)).join(', ')}]`
}

function formatLocation(location: LocationData) {
  return `  { id: ${escapeString(location.id)}, name: ${escapeString(location.name)}, x: ${location.x}, y: ${location.y}, region: ${escapeString(location.region)}, danger: ${location.danger}, marketBias: ${escapeString(location.marketBias)}, marketTier: ${location.marketTier}, aura: ${location.aura}, terrain: ${escapeString(location.terrain)}, desc: ${escapeString(location.desc)}, actions: ${formatStringArray(location.actions)}, neighbors: ${formatStringArray(location.neighbors)}, resource: ${escapeString(location.resource)}, realmId: ${location.realmId ? escapeString(location.realmId) : 'null'}, tags: ${formatStringArray(location.tags)}, factionIds: ${formatStringArray(location.factionIds)} },`
}

export function normalizeLocations(locations: LocationData[]) {
  const byId = new Map<string, LocationData>()

  locations.forEach((location) => {
    const id = location.id.trim()
    if (!id) return
    byId.set(id, {
      ...location,
      id,
      name: location.name.trim(),
      x: toSafeInteger(location.x),
      y: toSafeInteger(location.y),
      region: location.region.trim(),
      danger: Math.max(0, toSafeInteger(location.danger)),
      marketBias: location.marketBias.trim(),
      marketTier: Math.max(0, toSafeInteger(location.marketTier)),
      aura: Math.max(0, toSafeInteger(location.aura)),
      terrain: location.terrain.trim(),
      desc: location.desc.trim(),
      resource: location.resource.trim(),
      realmId: location.realmId?.trim() || null,
      actions: [...new Set(location.actions.map((entry) => entry.trim()).filter(Boolean))],
      neighbors: [...new Set(location.neighbors.map((entry) => entry.trim()).filter(Boolean))],
      tags: [...new Set(location.tags.map((entry) => entry.trim()).filter(Boolean))],
      factionIds: [...new Set(location.factionIds.map((entry) => entry.trim()).filter(Boolean))],
    })
  })

  byId.forEach((location) => {
    location.neighbors = location.neighbors.filter((neighborId) => neighborId !== location.id && byId.has(neighborId)).sort()
  })

  byId.forEach((location) => {
    location.neighbors.forEach((neighborId) => {
      const neighbor = byId.get(neighborId)
      if (!neighbor) return
      if (!neighbor.neighbors.includes(location.id)) {
        neighbor.neighbors.push(location.id)
        neighbor.neighbors.sort()
      }
    })
  })

  return Array.from(byId.values()).sort((left, right) => {
    if (left.y === right.y) return left.x - right.x
    return left.y - right.y
  })
}

export function serializeWorldFile(locations: LocationData[]) {
  const normalized = normalizeLocations(locations)
  const body = normalized.map((location) => formatLocation(location)).join('\n')

  return `export interface LocationData {
  id: string
  name: string
  x: number
  y: number
  region: string
  danger: number
  marketBias: string
  marketTier: number
  aura: number
  terrain: string
  desc: string
  actions: string[]
  /** 邻居地点ID */
  neighbors: string[]
  resource: string
  realmId: string | null
  tags: string[]
  /** 派系/势力ID */
  factionIds: string[]
}

function withBidirectionalNeighbors(locations: LocationData[]) {
  const neighborMap = new Map(locations.map(location => [location.id, [...location.neighbors]]))
  locations.forEach(location => {
    location.neighbors.forEach(neighborId => {
      const reverse = neighborMap.get(neighborId)
      if (reverse && !reverse.includes(location.id)) reverse.push(location.id)
    })
  })
  return locations.map(location => ({ ...location, neighbors: neighborMap.get(location.id) || [] }))
}

export const LOCATIONS: LocationData[] = withBidirectionalNeighbors([
${body}
])

export const LOCATION_MAP = new Map(LOCATIONS.map((loc) => [loc.id, loc]))

export function getLocation(locationId: string): LocationData | undefined {
  return LOCATION_MAP.get(locationId)
}
`
}