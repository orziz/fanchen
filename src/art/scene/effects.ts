import { createRng, range } from '@/art/rng'
import type { HourLight, RGB, WeatherKind } from '@/art/scene/palette'
import { rgb } from '@/art/scene/palette'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  seed: number
}

/** 雾带：可平铺的柔和云团，按雾色缓存。 */
export function createMistTexture(width: number, height: number, color: RGB, seed: string) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')!
  const rng = createRng(seed)
  const puffs = Math.round(width / (height * 0.35))
  for (let i = 0; i < puffs; i += 1) {
    const x = rng() * width
    const y = height * range(rng, 0.35, 0.7)
    const rx = height * range(rng, 0.5, 1.3)
    const ry = height * range(rng, 0.18, 0.4)
    for (const ox of [-width, 0, width]) {
      ctx.save()
      ctx.translate(x + ox, y)
      ctx.scale(rx / ry, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry)
      g.addColorStop(0, rgb(color, range(rng, 0.25, 0.45)))
      g.addColorStop(1, rgb(color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, ry, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  return canvas
}

export function createStars(width: number, height: number, seed: string) {
  const rng = createRng(`${seed}:stars`)
  return Array.from({ length: Math.round((width * height) / 9000) }, () => ({
    x: rng() * width,
    y: rng() * height * 0.5,
    r: range(rng, 0.4, 1.4),
    phase: rng() * Math.PI * 2,
  }))
}

/** 天气与氛围粒子：雨、雪、风、萤火、真气、炊烟。 */
export class ParticleField {
  private rain: Particle[] = []
  private snow: Particle[] = []
  private leaves: Particle[] = []
  private motes: Particle[] = []
  private smoke: Particle[] = []
  private qi: Particle[] = []
  private rng = createRng('particles')

  constructor(private width: number, private height: number, private u: number) {}

  resize(width: number, height: number, u: number) {
    this.width = width
    this.height = height
    this.u = u
    this.rain = []
    this.snow = []
    this.leaves = []
    this.motes = []
  }

  /** 清空一切在飞的粒子（切到静止画面时用）。 */
  clear() {
    this.rain = []
    this.snow = []
    this.leaves = []
    this.motes = []
    this.smoke = []
    this.qi = []
  }

  private ensure(list: Particle[], count: number, spawn: () => Particle) {
    while (list.length < count) list.push(spawn())
    if (list.length > count) list.length = count
  }

  update(dt: number, weather: WeatherKind, light: HourLight, fireflies: boolean) {
    const { width: W, height: H, u, rng } = this
    const area = (W * H) / (1000 * 600)
    const wind = weather === 'wind' ? 1 : weather === 'storm' ? 0.7 : 0.15
    this.ensure(this.rain, weather === 'drizzle' ? Math.round(160 * area) : weather === 'storm' ? Math.round(420 * area) : 0, () => ({
      x: rng() * W, y: rng() * H, vx: -wind * 260 * u, vy: range(rng, 700, 980) * u, size: range(rng, 10, 22) * u, life: 1, seed: rng(),
    }))
    this.ensure(this.snow, weather === 'frost' ? Math.round(140 * area) : 0, () => ({
      x: rng() * W, y: rng() * H, vx: -20 * u, vy: range(rng, 24, 60) * u, size: range(rng, 0.8, 2.4) * u, life: 1, seed: rng() * 10,
    }))
    this.ensure(this.leaves, weather === 'wind' ? Math.round(18 * area) : 0, () => ({
      x: W + rng() * W * 0.3, y: rng() * H * 0.9, vx: -range(rng, 160, 320) * u, vy: range(rng, -20, 40) * u, size: range(rng, 1.6, 3.4) * u, life: 1, seed: rng() * 10,
    }))
    this.ensure(this.motes, fireflies && light.night > 0.5 ? Math.round(26 * area) : 0, () => ({
      x: rng() * W, y: H * range(rng, 0.55, 0.9), vx: range(rng, -8, 8) * u, vy: range(rng, -6, 6) * u, size: range(rng, 1, 2) * u, life: 1, seed: rng() * 10,
    }))
    for (const p of this.rain) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.y > H) { p.y = -p.size; p.x = rng() * W * 1.2 }
      if (p.x < -20) p.x += W
    }
    for (const p of this.snow) {
      p.seed += dt
      p.x += (p.vx + Math.sin(p.seed * 1.3) * 18 * u) * dt
      p.y += p.vy * dt
      if (p.y > H) { p.y = -4; p.x = rng() * W }
      if (p.x < -4) p.x += W
    }
    for (const p of this.leaves) {
      p.seed += dt * 3
      p.x += p.vx * dt
      p.y += (p.vy + Math.sin(p.seed) * 30 * u) * dt
      if (p.x < -10) { p.x = W + rng() * 40; p.y = rng() * H * 0.9 }
    }
    for (const p of this.motes) {
      p.seed += dt
      p.x += (p.vx + Math.sin(p.seed * 0.7) * 6 * u) * dt
      p.y += (p.vy + Math.cos(p.seed * 0.9) * 5 * u) * dt
      if (p.x < 0) p.x += W
      if (p.x > W) p.x -= W
    }
    this.smoke = this.smoke.filter(p => (p.life -= dt / 6) > 0)
    for (const p of this.smoke) {
      p.x += (p.vx + wind * 14 * u) * dt
      p.y += p.vy * dt
      p.size += 5 * u * dt
    }
    this.qi = this.qi.filter(p => (p.life -= dt / p.seed) > 0)
    for (const p of this.qi) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.985
    }
  }

  emitSmoke(x: number, y: number) {
    const { rng, u } = this
    this.smoke.push({ x, y, vx: range(rng, -3, 3) * u, vy: -range(rng, 10, 18) * u, size: range(rng, 3, 6) * u, life: 1, seed: 0 })
  }

  emitQi(x: number, y: number, spread: number, burst = false) {
    const { rng, u } = this
    const count = burst ? 60 : 1
    for (let i = 0; i < count; i += 1) {
      const a = burst ? rng() * Math.PI * 2 : -Math.PI / 2 + range(rng, -0.5, 0.5)
      const speed = burst ? range(rng, 60, 220) * u : range(rng, 12, 28) * u
      this.qi.push({
        x: x + range(rng, -spread, spread), y: y + (burst ? 0 : range(rng, -spread * 0.2, spread * 0.3)),
        vx: Math.cos(a) * speed * (burst ? 1 : 0.3), vy: Math.sin(a) * speed, size: range(rng, 1, 2.6) * u, life: 1, seed: range(rng, 1.4, 3),
      })
    }
  }

  drawBehind(ctx: CanvasRenderingContext2D, light: HourLight) {
    for (const p of this.smoke) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      const tone = light.night > 0.5 ? 70 : 150
      g.addColorStop(0, `rgba(${tone},${tone},${tone + 6},${0.28 * p.life})`)
      g.addColorStop(1, `rgba(${tone},${tone},${tone + 6},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawFront(ctx: CanvasRenderingContext2D, light: HourLight) {
    const { u } = this
    if (this.rain.length) {
      ctx.strokeStyle = light.night > 0.5 ? 'rgba(170,184,200,0.28)' : 'rgba(60,66,74,0.28)'
      ctx.lineWidth = 0.8 * u
      ctx.beginPath()
      for (const p of this.rain) {
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.018, p.y - p.size)
      }
      ctx.stroke()
    }
    if (this.snow.length) {
      ctx.fillStyle = 'rgba(236,240,244,0.8)'
      for (const p of this.snow) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (this.leaves.length) {
      ctx.fillStyle = 'rgba(30,34,38,0.7)'
      for (const p of this.leaves) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.seed)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.motes) {
      const a = 0.35 + 0.35 * Math.sin(p.seed * 3)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5)
      g.addColorStop(0, `rgba(220,210,140,${a})`)
      g.addColorStop(1, 'rgba(220,210,140,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const p of this.qi) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
      g.addColorStop(0, `rgba(236,214,150,${0.75 * p.life})`)
      g.addColorStop(0.5, `rgba(150,210,190,${0.3 * p.life})`)
      g.addColorStop(1, 'rgba(150,210,190,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}
