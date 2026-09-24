import type { Canvas2D } from '@/art/paint/brush'
import { INK_MID, brushStroke, rgb, shade } from '@/art/paint/brush'
import { createFbm, range } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'
import type { Water } from '@/art/scene/archetype'

export interface WaterBand {
  top: number
  bottom: number
}

function wavyEdge(c: Canvas2D, base: number, amp: number, period: number) {
  const noise = createFbm(c.rng, period, 3)
  return (x: number) => base + (noise(x / c.w) - 0.5) * amp * 2
}

/** 水面留白，只以几道横纹与岸线示意；返回水面上下沿供倒影、船只使用。 */
export function paintWater(c: Canvas2D, kind: Water, surface: RGB): WaterBand | null {
  if (kind === 'none') return null
  const { ctx, w, h, u, rng } = c
  const top = kind === 'sea' ? h * 0.6 : kind === 'lake' ? h * 0.66 : kind === 'marsh' ? h * 0.72 : h * 0.7
  const bottom = kind === 'sea' ? h * 0.88 : kind === 'lake' ? h * 0.82 : h * 0.8
  const topEdge = kind === 'sea' ? () => top : wavyEdge(c, top, 6 * u, 5)
  const bottomEdge = wavyEdge(c, bottom, 10 * u, 4)
  const step = 4 * u

  const path = new Path2D()
  path.moveTo(0, topEdge(0))
  for (let x = step; x <= w + step; x += step) path.lineTo(x, topEdge(x))
  for (let x = w + step; x >= -step; x -= step) path.lineTo(x, bottomEdge(x))
  path.closePath()

  const grad = ctx.createLinearGradient(0, top, 0, bottom)
  grad.addColorStop(0, rgb(surface, kind === 'sea' ? 0.95 : 0.88))
  grad.addColorStop(1, rgb(shade(surface, 0.86), 0.9))
  ctx.fillStyle = grad
  ctx.fill(path)

  ctx.save()
  ctx.clip(path)
  const rippleInk = shade(INK_MID, 1.2)
  const rippleCount = Math.round((w * (bottom - top)) / (260 * u * u))
  for (let i = 0; i < rippleCount; i += 1) {
    const y = top + Math.pow(rng(), 0.8) * (bottom - top)
    const depth = (y - top) / (bottom - top)
    const x = rng() * w
    const len = range(rng, 6, 26) * u * (0.5 + depth)
    brushStroke(c, x, y, x + len, y + range(rng, -0.4, 0.4) * u, (0.5 + depth * 0.7) * u, rippleInk, range(rng, 0.06, 0.18), 0.02)
  }
  if (kind === 'marsh') {
    for (let i = 0; i < 9; i += 1) {
      const x = rng() * w
      const y = range(rng, top + 8 * u, bottom - 4 * u)
      ctx.fillStyle = rgb(shade(surface, 0.72), 0.5)
      ctx.beginPath()
      ctx.ellipse(x, y, range(rng, 18, 60) * u, range(rng, 2, 5) * u, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  const bankInk = shade(INK_MID, 0.7)
  ctx.lineCap = 'round'
  for (let x = 0; x < w; x += 6 * u) {
    const y = bottomEdge(x)
    ctx.strokeStyle = rgb(bankInk, range(rng, 0.25, 0.55))
    ctx.lineWidth = range(rng, 0.8, 2.2) * u
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 6 * u, bottomEdge(x + 6 * u))
    ctx.stroke()
  }
  if (kind === 'sea') {
    ctx.strokeStyle = rgb(shade(surface, 0.7), 0.5)
    ctx.lineWidth = 0.8 * u
    ctx.beginPath()
    ctx.moveTo(0, top)
    ctx.lineTo(w, top)
    ctx.stroke()
  }
  return { top, bottom }
}

/** 远帆：一叶扁舟，舱篷与桨。 */
export function paintBoat(c: Canvas2D, x: number, y: number, size: number, ink: RGB, sail = false) {
  const { ctx, u } = c
  ctx.fillStyle = rgb(ink, 0.9)
  ctx.beginPath()
  ctx.moveTo(x - size, y - size * 0.18)
  ctx.quadraticCurveTo(x, y + size * 0.28, x + size, y - size * 0.22)
  ctx.lineTo(x + size * 0.7, y - size * 0.05)
  ctx.quadraticCurveTo(x, y + size * 0.1, x - size * 0.75, y - size * 0.04)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - size * 0.35, y - size * 0.02)
  ctx.quadraticCurveTo(x - size * 0.05, y - size * 0.42, x + size * 0.3, y - size * 0.04)
  ctx.closePath()
  ctx.fill()
  if (sail) {
    ctx.strokeStyle = rgb(ink, 0.85)
    ctx.lineWidth = 0.9 * u
    ctx.beginPath()
    ctx.moveTo(x + size * 0.1, y - size * 0.05)
    ctx.lineTo(x + size * 0.1, y - size * 1.5)
    ctx.stroke()
    ctx.fillStyle = rgb(shade(ink, 1.6), 0.75)
    ctx.beginPath()
    ctx.moveTo(x + size * 0.14, y - size * 1.45)
    ctx.quadraticCurveTo(x + size * 0.75, y - size * 0.95, x + size * 0.16, y - size * 0.25)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = rgb(ink, 0.7)
  ctx.lineWidth = 0.7 * u
  ctx.beginPath()
  ctx.moveTo(x + size * 0.6, y - size * 0.1)
  ctx.lineTo(x + size * 1.15, y + size * 0.35)
  ctx.stroke()
}
