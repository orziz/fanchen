import type { Canvas2D } from '@/art/paint/brush'
import { PAPER, brushStroke, rgb, shade } from '@/art/paint/brush'
import { createFbm, range } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'
import type { Settlement } from '@/art/scene/archetype'

export interface GroundShape {
  /** 人物落脚处（画面正中）的地面高度 */
  heroY: number
  topAt(x: number): number
}

/** 近景地坪：正中平缓供人物站立，两侧微微隆起收住画面。 */
export function paintGround(c: Canvas2D, heroY: number, ink: RGB): GroundShape {
  const { ctx, w, h, u, rng } = c
  const noise = createFbm(rng, 5, 3)
  const topAt = (x: number) => {
    const t = x / w
    const edge = Math.pow(Math.abs(t - 0.5) * 2, 2.2)
    return heroY - edge * h * 0.1 + (noise(t) - 0.5) * h * 0.035 * (0.3 + edge)
  }
  const path = new Path2D()
  path.moveTo(0, h)
  for (let x = 0; x <= w; x += 3 * u) path.lineTo(x, topAt(x))
  path.lineTo(w, h)
  path.closePath()
  const grad = ctx.createLinearGradient(0, heroY - h * 0.1, 0, h)
  grad.addColorStop(0, rgb(shade(ink, 1.9), 0.92))
  grad.addColorStop(0.35, rgb(shade(ink, 1.4), 0.96))
  grad.addColorStop(1, rgb(shade(ink, 0.85), 1))
  ctx.fillStyle = grad
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  const strokes = Math.round(w / (2.5 * u))
  for (let i = 0; i < strokes; i += 1) {
    const x = rng() * w
    const y = topAt(x) + Math.pow(rng(), 1.5) * (h - topAt(x))
    const len = range(rng, 8, 30) * u
    brushStroke(c, x, y, x + len, y + range(rng, -1.5, 1.5) * u, range(rng, 0.6, 1.8) * u, shade(ink, 0.55), range(rng, 0.08, 0.26), 0.03)
  }
  ctx.restore()

  ctx.lineCap = 'round'
  for (let x = 0; x < w; x += 5 * u) {
    ctx.strokeStyle = rgb(shade(ink, 0.6), range(rng, 0.4, 0.8))
    ctx.lineWidth = range(rng, 1, 2.6) * u
    ctx.beginPath()
    ctx.moveTo(x, topAt(x))
    ctx.lineTo(x + 5 * u, topAt(x + 5 * u))
    ctx.stroke()
  }
  return { heroY, topAt }
}

/** 石台栏杆：山门、宗门的落脚处。 */
function paintTerrace(c: Canvas2D, heroY: number, stone: RGB, ink: RGB) {
  const { ctx, w, u } = c
  const left = w * 0.3
  const right = w * 0.7
  const depth = c.h * 0.05
  ctx.fillStyle = rgb(stone, 0.9)
  ctx.beginPath()
  ctx.moveTo(left, heroY)
  ctx.lineTo(right, heroY)
  ctx.lineTo(right + w * 0.04, heroY + depth)
  ctx.lineTo(left - w * 0.04, heroY + depth)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgb(ink, 0.5)
  ctx.lineWidth = 0.6 * u
  for (let k = 1; k < 4; k += 1) {
    const y = heroY + (depth * k) / 4
    ctx.beginPath()
    ctx.moveTo(left - (w * 0.04 * k) / 4, y)
    ctx.lineTo(right + (w * 0.04 * k) / 4, y)
    ctx.stroke()
  }
  const railY = heroY - c.h * 0.045
  ctx.strokeStyle = rgb(ink, 0.8)
  ctx.lineWidth = 1.4 * u
  for (const [x0, x1] of [[left, left + w * 0.09], [right - w * 0.09, right]]) {
    ctx.beginPath()
    ctx.moveTo(x0, railY)
    ctx.lineTo(x1, railY)
    ctx.stroke()
    for (let x = x0; x <= x1 + 0.1; x += w * 0.03) {
      ctx.beginPath()
      ctx.moveTo(x, railY - 2 * u)
      ctx.lineTo(x, heroY)
      ctx.stroke()
    }
  }
}

/** 土路：淡墨扫出的路面，两侧渐隐，几道车辙。 */
function paintRoad(c: Canvas2D, heroY: number, dirt: RGB, ink: RGB) {
  const { ctx, w, h, u, rng } = c
  const rows = Math.round((h - heroY) / (2 * u))
  for (let r = 0; r < rows; r += 1) {
    const t = r / rows
    const y = heroY - h * 0.008 + t * (h - heroY + h * 0.008)
    const half = w * (0.05 + t * 0.2)
    const g = ctx.createLinearGradient(w / 2 - half, 0, w / 2 + half, 0)
    g.addColorStop(0, rgb(dirt, 0))
    g.addColorStop(0.25, rgb(dirt, 0.34 - t * 0.12))
    g.addColorStop(0.75, rgb(dirt, 0.34 - t * 0.12))
    g.addColorStop(1, rgb(dirt, 0))
    ctx.fillStyle = g
    ctx.fillRect(w / 2 - half, y, half * 2, 2.2 * u)
  }
  for (let i = 0; i < 30; i += 1) {
    const t = rng()
    const y = heroY + t * (h - heroY)
    const half = w * (0.04 + t * 0.14)
    const x = w * 0.5 + range(rng, -half, half)
    brushStroke(c, x, y, x + range(rng, 4, 12) * u, y + range(rng, -0.5, 0.5) * u, 0.8 * u, ink, 0.22)
  }
}

/** 栈道木台：港埠的落脚处。 */
function paintDeck(c: Canvas2D, heroY: number, wood: RGB, ink: RGB) {
  const { ctx, w, h, u } = c
  ctx.fillStyle = rgb(wood, 0.85)
  ctx.beginPath()
  ctx.moveTo(w * 0.32, heroY)
  ctx.lineTo(w * 0.68, heroY)
  ctx.lineTo(w * 0.76, h)
  ctx.lineTo(w * 0.24, h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgb(ink, 0.45)
  ctx.lineWidth = 0.8 * u
  for (let k = 0; k < 7; k += 1) {
    const y = heroY + ((h - heroY) * k) / 7
    const t = k / 7
    ctx.beginPath()
    ctx.moveTo(w * (0.32 - 0.08 * t), y)
    ctx.lineTo(w * (0.68 + 0.08 * t), y)
    ctx.stroke()
  }
}

export function paintFooting(c: Canvas2D, settlement: Settlement, heroY: number, ink: RGB) {
  if (settlement === 'sect') paintTerrace(c, heroY, shade(PAPER, 0.78), ink)
  else if (settlement === 'port') paintDeck(c, heroY, shade(PAPER, 0.5), ink)
  else if (settlement !== 'none') paintRoad(c, heroY, shade(PAPER, 0.66), ink)
}
