import type { Rng } from '@/art/rng'
import { range } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'
import { rgb } from '@/art/scene/palette'

/** 一张画布的绘制上下文；u 为随画布高度缩放的笔触单位（高 600 像素时为 1）。 */
export interface Canvas2D {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  u: number
  rng: Rng
}

export const INK_DEEP: RGB = [18, 21, 25]
export const INK_MID: RGB = [52, 60, 68]
export const INK_LIGHT: RGB = [104, 114, 122]
export const PAPER: RGB = [222, 218, 206]
export const CINNABAR: RGB = [176, 62, 48]
export const OCHRE: RGB = [150, 104, 62]
export const JADE: RGB = [94, 142, 124]

export { rgb }

export function shade(color: RGB, k: number): RGB {
  return [color[0] * k, color[1] * k, color[2] * k]
}

export function tintTowards(color: RGB, target: RGB, t: number): RGB {
  return [color[0] + (target[0] - color[0]) * t, color[1] + (target[1] - color[1]) * t, color[2] + (target[2] - color[2]) * t]
}

/** 一笔枯湿变化的短线：两端细、中段粗，模拟毛笔提按。 */
export function brushStroke(
  c: Canvas2D,
  x0: number, y0: number, x1: number, y1: number,
  width: number, color: RGB, alpha: number, bend = 0,
) {
  const { ctx } = c
  const mx = (x0 + x1) / 2 + (y1 - y0) * bend
  const my = (y0 + y1) / 2 - (x1 - x0) * bend
  ctx.strokeStyle = rgb(color, alpha)
  ctx.lineCap = 'round'
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx, my, x1, y1)
  ctx.stroke()
  ctx.lineWidth = width * 0.45
  ctx.strokeStyle = rgb(color, alpha * 0.6)
  ctx.beginPath()
  ctx.moveTo(x0 + width * 0.3, y0 + width * 0.3)
  ctx.quadraticCurveTo(mx + width * 0.4, my + width * 0.4, x1, y1)
  ctx.stroke()
}

/** 墨点（苔点、远树）。 */
export function inkDot(c: Canvas2D, x: number, y: number, r: number, color: RGB, alpha: number) {
  const { ctx } = c
  ctx.fillStyle = rgb(color, alpha)
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * range(c.rng, 0.6, 1), range(c.rng, 0, Math.PI), 0, Math.PI * 2)
  ctx.fill()
}

/** 不规则墨团：用噪声扰动的椭圆，作树冠、岩石。 */
export function inkBlob(
  c: Canvas2D, x: number, y: number, rx: number, ry: number,
  color: RGB, alpha: number, roughness = 0.22, points = 18,
) {
  const { ctx, rng } = c
  ctx.fillStyle = rgb(color, alpha)
  ctx.beginPath()
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2
    const k = 1 + range(rng, -roughness, roughness)
    const px = x + Math.cos(a) * rx * k
    const py = y + Math.sin(a) * ry * k
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

/** 宣纸纤维：极淡的随机短纹，叠在整幅上。 */
export function paperGrain(c: Canvas2D, density = 1, alpha = 0.035) {
  const { ctx, w, h, rng, u } = c
  const count = Math.round((w * h) / 2600 * density)
  ctx.lineWidth = 0.6 * u
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w
    const y = rng() * h
    const len = range(rng, 2, 7) * u
    const a = range(rng, 0, Math.PI)
    const light = rng() < 0.5
    ctx.strokeStyle = light ? `rgba(255,255,250,${alpha})` : `rgba(0,0,0,${alpha})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
}

export function createLayerCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}
