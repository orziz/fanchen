export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function sample<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, digits = 0): number {
  const ratio = 10 ** digits
  return Math.round(value * ratio) / ratio
}

export function formatNumber(value: number | string): string {
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function ensureArray<T>(value: T[] | null | undefined | unknown): T[] {
  return Array.isArray(value) ? value : []
}

export function fillTemplate(text: string, payload: Record<string, string | number>): string {
  return Object.entries(payload).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  )
}

export interface MapGlow {
  x: number; y: number; radius: number
}
export interface MapStroke {
  x: number; y: number; cpX: number; cpY: number; endX: number; endY: number; width: number
}
export interface MapTexture {
  glows: MapGlow[]; strokes: MapStroke[]
}

export function buildMapTexture(): MapTexture {
  return {
    glows: Array.from({ length: 26 }, () => ({
      x: randomInt(0, 1120),
      y: randomInt(0, 560),
      radius: randomInt(42, 128),
    })),
    strokes: Array.from({ length: 22 }, () => ({
      x: randomInt(0, 1120),
      y: randomInt(0, 560),
      cpX: randomInt(-80, 80),
      cpY: randomInt(-54, 54),
      endX: randomInt(-150, 150),
      endY: randomInt(-60, 60),
      width: randomInt(1, 3),
    })),
  }
}

import { LOCATION_MAP } from '@/config'

export interface FindRouteOptions {
  canTraverse?: (fromId: string, toId: string, nextPath: string[]) => boolean
}

export function findRoute(startId: string, endId: string, options: FindRouteOptions = {}): string[] | null {
  if (startId === endId) return [startId]
  const queue: string[][] = [[startId]]
  const visited = new Set([startId])
  while (queue.length) {
    const path = queue.shift()!
    const last = path[path.length - 1]
    const location = LOCATION_MAP.get(last)
    if (!location) continue
    for (const neighborId of location.neighbors) {
      if (visited.has(neighborId)) continue
      const nextPath = [...path, neighborId]
      if (options.canTraverse && !options.canTraverse(last, neighborId, nextPath)) continue
      if (neighborId === endId) return nextPath
      visited.add(neighborId)
      queue.push(nextPath)
    }
  }
  return null
}
