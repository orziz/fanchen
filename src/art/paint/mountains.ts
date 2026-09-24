import type { Canvas2D } from '@/art/paint/brush'
import { PAPER, brushStroke, inkDot, rgb, shade, tintTowards, CINNABAR, OCHRE } from '@/art/paint/brush'
import { createFbm, range, type Rng } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'

export type RidgeStyle = 'plain' | 'hills' | 'peaks' | 'karst' | 'snow' | 'cliffs' | 'dunes'

export interface RidgeSpec {
  style: RidgeStyle
  /** 山脚所在高度（像素），往下逐渐隐入雾中 */
  baseY: number
  /** 最高峰高出山脚的像素 */
  height: number
  ink: RGB
  alpha: number
  /** 山脚以下多少像素内淡出 */
  fade: number
  /** 皴擦密度 0..1 */
  texture: number
  /** 山脊远树密度 */
  trees?: number
  /** 暖色（赤崖、沙坂） */
  warm?: number
  /** 画面正中压低，给人物留出天光 */
  openCenter?: number
}

export interface Ridge {
  ys: Float32Array
  step: number
  topAt(x: number): number
}

interface Peak { c: number; w: number; h: number }

const STEP_UNITS = 2

function signedDelta(t: number, c: number) {
  return ((t - c + 1.5) % 1) - 0.5
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function makePeaks(rng: Rng, style: RidgeStyle): Peak[] {
  const count = style === 'karst' ? Math.round(range(rng, 7, 11))
    : style === 'cliffs' ? Math.round(range(rng, 2, 4))
      : style === 'dunes' ? Math.round(range(rng, 3, 5))
        : Math.round(range(rng, 3, 6))
  return Array.from({ length: count }, (_, i) => {
    const c = (i + range(rng, 0.15, 0.85)) / count
    if (style === 'karst') return { c, w: range(rng, 0.028, 0.06), h: range(rng, 0.42, 1) }
    if (style === 'snow') return { c, w: range(rng, 0.06, 0.13), h: range(rng, 0.55, 1) }
    if (style === 'cliffs') return { c, w: range(rng, 0.07, 0.16), h: range(rng, 0.5, 0.95) }
    if (style === 'dunes') return { c, w: range(rng, 0.12, 0.22), h: range(rng, 0.4, 0.9) }
    return { c, w: range(rng, 0.05, 0.12), h: range(rng, 0.45, 1) }
  })
}

function peakShape(style: RidgeStyle, delta: number, p: Peak) {
  const x = Math.abs(delta) / p.w
  if (style === 'karst') return x < 1 ? p.h * (1 - Math.pow(x, 1.45)) : 0
  if (style === 'snow') return p.h * Math.pow(Math.max(0, 1 - x), 1.35)
  if (style === 'cliffs') return p.h * (1 - smoothstep(0.72, 1, x))
  if (style === 'dunes') return p.h * Math.exp(-(x * x) * (delta < 0 ? 0.7 : 3.2))
  return p.h * Math.exp(-x * x * 1.6)
}

/** 生成一条可横向无缝平铺的山脊线。 */
export function computeRidge(c: Canvas2D, spec: RidgeSpec): Ridge {
  const step = STEP_UNITS * c.u
  const n = Math.ceil(c.w / step) + 1
  const ys = new Float32Array(n)
  const noise = createFbm(c.rng, spec.style === 'hills' || spec.style === 'plain' ? 4 : 7, 4)
  const peaks = spec.style === 'hills' || spec.style === 'plain' ? [] : makePeaks(c.rng, spec.style)
  const baseNoise = spec.style === 'karst' ? 0.22 : spec.style === 'dunes' ? 0.05 : 0.14
  for (let i = 0; i < n; i += 1) {
    const t = (i * step) / c.w
    const nv = noise(t)
    let h: number
    if (spec.style === 'plain') h = 0.12 + 0.4 * nv
    else if (spec.style === 'hills') h = 0.2 + 0.8 * smoothstep(0.2, 0.85, nv)
    else {
      let peakH = 0
      for (const p of peaks) peakH = Math.max(peakH, peakShape(spec.style, signedDelta(t, p.c), p))
      h = Math.max(peakH, nv * baseNoise * 1.6) + (nv - 0.5) * baseNoise * 0.5
    }
    if (spec.openCenter) h *= 1 - spec.openCenter * Math.exp(-(((t - 0.5) / 0.15) ** 2))
    ys[i] = spec.baseY - Math.max(0, Math.min(1.1, h)) * spec.height
  }
  return {
    ys,
    step,
    topAt(x: number) {
      const idx = Math.max(0, Math.min(n - 1, Math.round(x / step)))
      return ys[idx]
    },
  }
}

function ridgePath(c: Canvas2D, ridge: Ridge) {
  const path = new Path2D()
  path.moveTo(0, c.h)
  for (let i = 0; i < ridge.ys.length; i += 1) path.lineTo(i * ridge.step, ridge.ys[i])
  path.lineTo(c.w, c.h)
  path.closePath()
  return path
}

function bodyColor(spec: RidgeSpec): RGB {
  let color = spec.ink
  if (spec.style === 'snow') color = tintTowards(PAPER, spec.ink, 0.18)
  if (spec.warm) color = tintTowards(color, spec.style === 'dunes' ? OCHRE : CINNABAR, spec.warm * 0.55)
  return color
}

function paintBody(c: Canvas2D, ridge: Ridge, spec: RidgeSpec, path: Path2D) {
  const { ctx } = c
  let minY = spec.baseY
  for (const y of ridge.ys) minY = Math.min(minY, y)
  const color = bodyColor(spec)
  const grad = ctx.createLinearGradient(0, minY, 0, spec.baseY + spec.fade)
  grad.addColorStop(0, rgb(color, spec.alpha))
  grad.addColorStop(0.55, rgb(color, spec.alpha * (spec.style === 'snow' ? 0.9 : 0.78)))
  grad.addColorStop(1, rgb(color, 0))
  ctx.fillStyle = grad
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  paintWash(c, ridge, spec, color)
  if (spec.style === 'snow') paintSnowShadow(c, ridge, spec)
  ctx.restore()
}

/** 积墨：贴近山脊的淡墨晕团，与留白的亮斑，让山体浓淡不均。 */
function paintWash(c: Canvas2D, ridge: Ridge, spec: RidgeSpec, color: RGB) {
  const { ctx, rng, u } = c
  const dark = shade(color, spec.style === 'snow' ? 0.75 : 0.62)
  const count = Math.round(c.w / (22 * u))
  for (let i = 0; i < count; i += 1) {
    const x = rng() * c.w
    const top = ridge.topAt(x)
    const localH = spec.baseY - top
    if (localH < 6 * u) continue
    const y = top + range(rng, 0.05, 0.45) * localH
    const r = range(rng, 0.25, 0.7) * Math.min(localH, 80 * u) + 6 * u
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rgb(dark, range(rng, 0.08, 0.2) * spec.alpha))
    g.addColorStop(1, rgb(dark, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < count * 0.5; i += 1) {
    const x = rng() * c.w
    const top = ridge.topAt(x)
    const localH = spec.baseY - top
    if (localH < 10 * u) continue
    const y = top + range(rng, 0.35, 0.9) * localH
    const r = range(rng, 10, 40) * u
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(0,0,0,${range(rng, 0.08, 0.22)})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'source-over'
}

/** 雪山背光面：沿右坡垂直扫淡墨，亮面留白成雪。 */
function paintSnowShadow(c: Canvas2D, ridge: Ridge, spec: RidgeSpec) {
  const { ctx, u } = c
  const n = ridge.ys.length
  const shadow = shade(spec.ink, 0.9)
  for (let i = 1; i < n - 1; i += 1) {
    const slope = (ridge.ys[i + 1] - ridge.ys[i - 1]) / (2 * ridge.step)
    if (slope <= 0.02) continue
    const top = ridge.ys[i]
    const localH = spec.baseY - top
    const depth = localH * Math.min(0.85, 0.3 + slope * 0.5)
    const g = ctx.createLinearGradient(0, top, 0, top + depth)
    g.addColorStop(0, rgb(shadow, 0.34 * spec.alpha))
    g.addColorStop(1, rgb(shadow, 0))
    ctx.fillStyle = g
    ctx.fillRect(i * ridge.step, top, ridge.step + 0.5 * u, depth)
  }
}

/** 皴擦：沿坡向下的短笔，贴近山脊处更密更浓。雪山只在背光面落笔。 */
function paintTexture(c: Canvas2D, ridge: Ridge, spec: RidgeSpec) {
  const { rng, u } = c
  const n = ridge.ys.length
  const count = Math.round((spec.texture * c.w) / (2.4 * u))
  const strokeInk = spec.style === 'snow' ? shade(spec.ink, 0.7) : shade(bodyColor(spec), 0.55)
  for (let i = 0; i < count; i += 1) {
    const x = rng() * c.w
    const idx = Math.min(n - 1, Math.round(x / ridge.step))
    const top = ridge.ys[idx]
    const localH = spec.baseY - top
    if (localH < 5 * u) continue
    const slope = (ridge.ys[Math.min(n - 1, idx + 1)] - ridge.ys[Math.max(0, idx - 1)]) / (2 * ridge.step)
    if (spec.style === 'snow' && slope <= 0.05) continue
    const depthRatio = Math.pow(range(rng, 0.02, 1), 1.6)
    const y = top + depthRatio * localH * 0.75
    const len = range(rng, 5, 18) * u * (spec.style === 'cliffs' ? 1.6 : 1)
    const steep = Math.min(1.4, Math.abs(slope))
    const dirX = slope < 0 ? -1 : 1
    const dx = spec.style === 'cliffs' ? range(rng, -1, 1) * u : dirX * len * 0.55 / (1 + steep)
    const dy = len * (0.45 + 0.4 * steep)
    const alpha = range(rng, 0.06, 0.2) * (1 - depthRatio * 0.7) * (spec.style === 'snow' ? 1.8 : 1)
    brushStroke(c, x, y, x + dx, y + dy, range(rng, 0.5, 1.4) * u, strokeInk, alpha, range(rng, -0.18, 0.18))
  }
  if (spec.style === 'dunes') {
    for (let k = 1; k <= 5; k += 1) {
      c.ctx.strokeStyle = rgb(shade(bodyColor(spec), 0.7), 0.12)
      c.ctx.lineWidth = 0.8 * u
      c.ctx.beginPath()
      for (let i = 0; i < n; i += 2) {
        const y = ridge.ys[i] + k * 7 * u + Math.sin(i * 0.05 + k) * 2 * u
        if (i === 0) c.ctx.moveTo(0, y)
        else c.ctx.lineTo(i * ridge.step, y)
      }
      c.ctx.stroke()
    }
  }
}

function paintRidgeLine(c: Canvas2D, ridge: Ridge, spec: RidgeSpec) {
  const { ctx, rng, u } = c
  const color = spec.style === 'snow' ? shade(spec.ink, 0.8) : shade(bodyColor(spec), 0.6)
  const noise = createFbm(rng, 9, 3)
  ctx.lineCap = 'round'
  for (let i = 0; i < ridge.ys.length - 2; i += 2) {
    const t = (i * ridge.step) / c.w
    const k = noise(t)
    ctx.lineWidth = u * (0.5 + 1.8 * k * k)
    ctx.strokeStyle = rgb(color, Math.min(1, spec.alpha * (0.55 + 0.6 * k)))
    ctx.beginPath()
    ctx.moveTo(i * ridge.step, ridge.ys[i])
    ctx.lineTo((i + 1) * ridge.step, ridge.ys[i + 1])
    ctx.lineTo((i + 2) * ridge.step, ridge.ys[i + 2])
    ctx.stroke()
  }
}

function paintMossAndTrees(c: Canvas2D, ridge: Ridge, spec: RidgeSpec) {
  const { rng, u } = c
  const dark = shade(bodyColor(spec), 0.4)
  const mossCount = Math.round((spec.texture * c.w) / (20 * u))
  for (let i = 0; i < mossCount; i += 1) {
    const x = rng() * c.w
    const top = ridge.topAt(x)
    if (spec.baseY - top < 8 * u) continue
    inkDot(c, x, top + range(rng, 1, 5) * u, range(rng, 0.7, 2) * u, dark, range(rng, 0.35, 0.7) * spec.alpha)
  }
  const treeCount = Math.round(((spec.trees || 0) * c.w) / (9 * u))
  for (let i = 0; i < treeCount; i += 1) {
    const x = rng() * c.w
    const top = ridge.topAt(x) + range(rng, 0, 2) * u
    const h = range(rng, 3, 8) * u
    brushStroke(c, x, top, x + range(rng, -0.5, 0.5) * u, top - h, 0.8 * u, dark, 0.55 * spec.alpha)
    for (let b = 0; b < 3; b += 1) {
      const by = top - h * (0.3 + b * 0.22)
      const bw = h * (0.45 - b * 0.1)
      brushStroke(c, x - bw, by + u, x + bw, by, 0.9 * u, dark, 0.45 * spec.alpha)
    }
  }
}

/** 画一层山：山体、皴擦、脊线、苔点远树，山脚隐入雾中。返回山脊供后续放置楼阁与树。 */
export function paintRidge(c: Canvas2D, spec: RidgeSpec): Ridge {
  const { ctx } = c
  const ridge = computeRidge(c, spec)
  const path = ridgePath(c, ridge)
  paintBody(c, ridge, spec, path)
  ctx.save()
  ctx.clip(path)
  paintTexture(c, ridge, spec)
  ctx.restore()
  paintRidgeLine(c, ridge, spec)
  paintMossAndTrees(c, ridge, spec)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  const fade = ctx.createLinearGradient(0, spec.baseY - spec.height * 0.15, 0, spec.baseY + spec.fade)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, spec.baseY - spec.height * 0.15, c.w, c.h)
  ctx.restore()
  return ridge
}
