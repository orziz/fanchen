import type { Canvas2D } from '@/art/paint/brush'
import {
  CINNABAR, INK_DEEP, INK_LIGHT, INK_MID, PAPER, brushStroke, createLayerCanvas, inkBlob, paperGrain, shade, tintTowards,
} from '@/art/paint/brush'
import { paintFooting, paintGround } from '@/art/paint/ground'
import { paintBamboo, paintGrass, paintLotus, paintMaple, paintPine, paintReeds, paintRock, paintTree, paintWillow } from '@/art/paint/flora'
import { paintRidge, type Ridge, type RidgeStyle } from '@/art/paint/mountains'
import { paintWater, type WaterBand } from '@/art/paint/water'
import type { Point } from '@/art/paint/buildings'
import { createFbm, createRng, range } from '@/art/rng'
import type { SceneArchetype } from '@/art/scene/archetype'
import { paintSettlement } from '@/art/scene/settlements'

export interface SceneAnchors {
  heroY: number
  water: WaterBand | null
  lanterns: Point[]
  smoke: Point[]
  glow: { x: number; y: number; r: number } | null
  mistBands: number[]
}

export interface ComposedScene {
  width: number
  height: number
  far: HTMLCanvasElement
  mid: HTMLCanvasElement
  near: HTMLCanvasElement
  grain: HTMLCanvasElement
  anchors: SceneAnchors
}

export const HERO_GROUND_RATIO = 0.87

function farStyle(arch: SceneArchetype): RidgeStyle {
  switch (arch.relief) {
    case 'plain': return 'hills'
    case 'dunes': return 'dunes'
    case 'gorge':
    case 'volcanic':
    case 'cliffs': return 'peaks'
    default: return arch.relief
  }
}

function midStyle(arch: SceneArchetype): RidgeStyle {
  switch (arch.relief) {
    case 'plain': return 'plain'
    case 'karst': return 'karst'
    case 'snow': return 'snow'
    case 'cliffs': return 'cliffs'
    case 'dunes': return 'dunes'
    case 'hills': return 'hills'
    default: return 'peaks'
  }
}

function layer(width: number, height: number, seed: string): Canvas2D & { canvas: HTMLCanvasElement } {
  const canvas = createLayerCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx, w: canvas.width, h: canvas.height, u: canvas.height / 600, rng: createRng(seed) }
}

/** 峡谷两壁：近处陡崖夹出一线天，内缘浓、外缘淡，斧劈皴，崖脚隐入雾中。 */
function paintGorgeWalls(c: Canvas2D, ink: typeof INK_MID) {
  const { ctx, w, h, u, rng } = c
  for (const side of [-1, 1]) {
    const edge = createFbm(rng, 3, 4)
    const reach = w * range(rng, 0.16, 0.22)
    const innerAt = (y: number) => {
      const t = y / h
      const bulge = Math.sin(t * Math.PI) * 0.35 + 0.65
      return reach * bulge * (0.75 + edge(t) * 0.5)
    }
    const xAt = (y: number) => (side < 0 ? innerAt(y) : w - innerAt(y))
    const outer = side < 0 ? 0 : w
    const path = new Path2D()
    path.moveTo(outer, 0)
    for (let y = 0; y <= h; y += 4 * u) path.lineTo(xAt(y), y)
    path.lineTo(outer, h)
    path.closePath()
    const grad = ctx.createLinearGradient(outer, 0, side < 0 ? reach * 1.2 : w - reach * 1.2, 0)
    grad.addColorStop(0, `rgba(${ink.join(',')}, 0.5)`)
    grad.addColorStop(1, `rgba(${shade(ink, 0.7).join(',')}, 0.95)`)
    ctx.fillStyle = grad
    ctx.fill(path)
    ctx.save()
    ctx.clip(path)
    for (let i = 0; i < 160; i += 1) {
      const y = range(rng, 0, h * 0.9)
      const x = xAt(y) - side * range(rng, 2, reach * 0.8)
      const len = range(rng, 8, 26) * u
      brushStroke(c, x, y, x - side * len * 0.35, y + len, range(rng, 1, 3.2) * u, shade(ink, 0.45), range(rng, 0.15, 0.4), 0.1 * side)
    }
    ctx.restore()
    ctx.strokeStyle = `rgba(${shade(ink, 0.4).join(',')}, 0.8)`
    ctx.lineCap = 'round'
    for (let y = 0; y < h * 0.9; y += 6 * u) {
      ctx.lineWidth = range(rng, 1, 3) * u
      ctx.beginPath()
      ctx.moveTo(xAt(y), y)
      ctx.lineTo(xAt(y + 6 * u), y + 6 * u)
      ctx.stroke()
    }
    for (let k = 0; k < 3; k += 1) {
      const y = h * range(rng, 0.2, 0.6)
      paintPine(c, xAt(y) + side * -2 * u, y, h * range(rng, 0.05, 0.09), shade(ink, 0.6), -side * 0.6)
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  const fade = ctx.createLinearGradient(0, h * 0.7, 0, h * 0.95)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, h * 0.7, w, h * 0.3)
  ctx.restore()
}

/** 悬浮山石：秘境异象。 */
function paintFloatingRocks(c: Canvas2D, ink: typeof INK_MID) {
  const { w, h, rng, u } = c
  for (let i = 0; i < 4; i += 1) {
    const x = w * range(rng, 0.3, 0.7)
    const y = h * range(rng, 0.2, 0.45)
    const r = range(rng, 8, 20) * u
    inkBlob(c, x, y, r * 1.4, r * 0.55, ink, 0.8, 0.3, 14)
    for (let k = 0; k < 3; k += 1) brushStroke(c, x + range(rng, -r, r), y + r * 0.4, x + range(rng, -r, r), y + r * range(rng, 1.4, 2.6), 0.6 * u, ink, 0.3)
  }
}

function paintFields(c: Canvas2D, top: number, bottom: number) {
  const { ctx, w, u } = c
  for (let k = 0; k < 7; k += 1) {
    const y0 = top + ((bottom - top) * k) / 7
    const y1 = top + ((bottom - top) * (k + 1)) / 7
    ctx.fillStyle = `rgba(${shade(PAPER, k % 2 ? 0.62 : 0.72).join(',')}, 0.35)`
    ctx.fillRect(0, y0, w, y1 - y0)
    ctx.strokeStyle = 'rgba(40,46,52,0.25)'
    ctx.lineWidth = 0.6 * u
    ctx.beginPath()
    ctx.moveTo(0, y1)
    ctx.lineTo(w, y1)
    ctx.stroke()
  }
}

function paintMidFlora(c: Canvas2D, arch: SceneArchetype, groundY: number, water: WaterBand | null) {
  const { w, rng, h } = c
  const base = water ? water.top + 2 * c.u : groundY
  const count = arch.flora.includes('forest') ? 26 : 8
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w
    const size = h * range(rng, 0.05, arch.flora.includes('forest') ? 0.11 : 0.07)
    if (arch.flora.includes('maple') && rng() < 0.5) paintMaple(c, x, base, size, INK_MID)
    else if (arch.flora.includes('willow') && rng() < 0.4) paintWillow(c, x, base, size * 1.2, INK_MID)
    else if (arch.flora.includes('pine') || arch.flora.includes('forest')) paintPine(c, x, base, size * 1.3, INK_MID, range(rng, -0.2, 0.2))
    else if (rng() < 0.4) paintTree(c, x, base, size, INK_MID)
  }
  if (water && arch.flora.includes('lotus')) {
    for (let i = 0; i < 14; i += 1) paintLotus(c, w * rng(), range(rng, water.top + 10 * c.u, water.bottom - 4 * c.u), range(rng, 5, 11) * c.u, INK_MID)
  }
}

function paintNearFlora(c: Canvas2D, arch: SceneArchetype, heroY: number, topAt: (x: number) => number) {
  const { w, h, rng } = c
  const side = rng() < 0.5 ? -1 : 1
  const edgeX = side < 0 ? w * range(rng, 0.03, 0.09) : w * range(rng, 0.91, 0.97)
  const other = side < 0 ? w * range(rng, 0.88, 0.96) : w * range(rng, 0.04, 0.12)
  const flora = arch.flora
  if (flora.includes('pine') || flora.includes('forest')) paintPine(c, edgeX, topAt(edgeX) + h * 0.03, h * range(rng, 0.5, 0.62), INK_DEEP, -side * range(rng, 0.2, 0.45))
  else if (flora.includes('willow')) paintWillow(c, edgeX, topAt(edgeX) + h * 0.02, h * 0.5, INK_DEEP)
  else if (flora.includes('maple')) paintMaple(c, edgeX, topAt(edgeX) + h * 0.02, h * 0.42, INK_DEEP)
  else if (flora.includes('bamboo')) paintBamboo(c, edgeX, topAt(edgeX) + h * 0.03, h * 0.55, INK_DEEP)
  if (flora.includes('bamboo')) paintBamboo(c, other, topAt(other) + h * 0.03, h * 0.45, INK_DEEP)
  else if (flora.includes('reeds')) paintReeds(c, other, topAt(other) + h * 0.02, h * 0.2, INK_DEEP, 2)
  else paintRock(c, other, topAt(other) + h * 0.02, w * range(rng, 0.06, 0.1), INK_DEEP)
  if (flora.includes('reeds')) paintReeds(c, edgeX + side * -w * 0.1, topAt(edgeX) + h * 0.02, h * 0.16, INK_DEEP, 1.4)
  for (let i = 0; i < 14; i += 1) {
    const x = rng() * w
    if (Math.abs(x - w / 2) < w * 0.08) continue
    paintGrass(c, x, topAt(x) + 2 * c.u, h * range(rng, 0.015, 0.035), INK_DEEP)
  }
  if (heroY) paintGrass(c, w * 0.5 + h * 0.07, heroY + 2 * c.u, h * 0.02, INK_DEEP)
}

/**
 * 按原型绘出远、中、近三层与宣纸纹理层。每层横向可平铺，赶路时据此做视差卷动。
 * travel 为真时撤去大体量建筑，只留山水与路。
 */
export function composeScene(arch: SceneArchetype, width: number, height: number, travel = false): ComposedScene {
  const seed = `${arch.seed}${travel ? ':road' : ''}`
  const settlement = travel ? 'none' : arch.settlement
  const warm = arch.warm
  const far = layer(width, height, `${seed}:far`)
  const mid = layer(width, height, `${seed}:mid`)
  const near = layer(width, height, `${seed}:near`)
  const grain = layer(width, height, `${seed}:grain`)
  const H = far.h

  const farInk = tintTowards(INK_LIGHT, PAPER, 0.28)
  const farRidge: Ridge = paintRidge(far, {
    style: farStyle(arch), baseY: H * 0.58, height: H * (arch.relief === 'plain' ? 0.14 : arch.relief === 'karst' ? 0.34 : 0.3),
    ink: farInk, alpha: 0.62, fade: H * 0.1, texture: 0.35, trees: 0.15, warm, openCenter: 0.15,
  })
  paintRidge(far, {
    style: farStyle(arch), baseY: H * 0.64, height: H * (arch.relief === 'plain' ? 0.1 : 0.22),
    ink: tintTowards(INK_LIGHT, INK_MID, 0.3), alpha: 0.72, fade: H * 0.09, texture: 0.5, trees: 0.3, warm,
  })
  if (arch.mystic) paintFloatingRocks(far, shade(INK_MID, 1.2))

  const groundY = H * 0.77
  if (arch.relief === 'gorge') {
    paintRidge(mid, { style: 'peaks', baseY: H * 0.74, height: H * 0.12, ink: INK_MID, alpha: 0.7, fade: H * 0.06, texture: 0.6, trees: 0.4, warm })
  } else {
    paintRidge(mid, {
      style: midStyle(arch), baseY: groundY, height: H * (arch.relief === 'plain' ? 0.06 : arch.relief === 'karst' ? 0.22 : 0.16),
      ink: INK_MID, alpha: 0.86, fade: H * 0.05, texture: 0.7, trees: 0.45, warm, openCenter: 0.25,
    })
  }
  if (arch.fields && arch.water !== 'sea') paintFields(mid, H * 0.78, H * 0.86)
  const water = paintWater(mid, arch.water, tintTowards(PAPER, INK_LIGHT, 0.12))
  paintMidFlora(mid, arch, groundY, water)
  const settlementAnchors = paintSettlement(mid, { ...arch, settlement }, groundY, water, farRidge)
  if (arch.relief === 'gorge') paintGorgeWalls(mid, shade(INK_MID, 0.85))

  const heroY = H * HERO_GROUND_RATIO
  const ground = paintGround(near, heroY, arch.warm > 0.4 ? tintTowards(INK_DEEP, CINNABAR, arch.warm * 0.25) : INK_DEEP)
  paintFooting(near, settlement, heroY, INK_DEEP)
  paintNearFlora(near, arch, heroY, ground.topAt)

  paperGrain(grain, 1.2, 0.05)

  const glow = arch.mystic
    ? { x: width * 0.5, y: H * 0.46, r: H * 0.3 }
    : arch.relief === 'volcanic' || arch.warm > 0.6 ? { x: width * 0.5, y: H * 0.7, r: H * 0.35 } : null

  return {
    width: far.w,
    height: H,
    far: far.canvas,
    mid: mid.canvas,
    near: near.canvas,
    grain: grain.canvas,
    anchors: {
      heroY,
      water,
      lanterns: settlementAnchors.lanterns,
      smoke: settlementAnchors.smoke,
      glow,
      mistBands: [H * 0.6, H * 0.74],
    },
  }
}
