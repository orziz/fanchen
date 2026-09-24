import type { SceneArchetype } from '@/art/scene/archetype'
import { composeScene, HERO_GROUND_RATIO, type ComposedScene } from '@/art/scene/compose'
import { ParticleField, createMistTexture, createStars } from '@/art/scene/effects'
import { resolveLight, rgb, type HourLight, type WeatherKind } from '@/art/scene/palette'

export type HeroEffect = 'none' | 'qi'

export interface SceneInput {
  key: string
  archetype: SceneArchetype
  hour: number
  weather: WeatherKind
  travel: boolean
  heroEffect: HeroEffect
  reduceMotion: boolean
}

const MAX_PIXELS = 3_400_000
const FRAME_MS = 1000 / 30
const FADE_MS = 1100

/** 场景画布：缓存分层山水，逐帧叠加天色、雾、粒子与光照。 */
export class SceneRenderer {
  private ctx: CanvasRenderingContext2D
  private input: SceneInput | null = null
  private composed: ComposedScene | null = null
  private cache = new Map<string, ComposedScene>()
  private mistCache = new Map<string, HTMLCanvasElement>()
  private stars: ReturnType<typeof createStars> = []
  private particles: ParticleField
  private fadeCanvas: HTMLCanvasElement | null = null
  private fadeStart = 0
  private raf = 0
  private last = 0
  private clock = 0
  private travelOffset = 0
  private flashUntil = 0
  private flashColor = 'rgba(255,255,255,0.8)'
  private nextBolt = 0
  private smokeTimer = 0
  private qiTimer = 0
  private running = false
  private dpr = 1

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.particles = new ParticleField(1, 1, 1)
  }

  get width() { return this.canvas.width }
  get height() { return this.canvas.height }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (rect.width * rect.height * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (rect.width * rect.height))
    const w = Math.round(rect.width * dpr)
    const h = Math.round(rect.height * dpr)
    if (w === this.canvas.width && h === this.canvas.height && this.composed) return
    this.dpr = dpr
    this.canvas.width = w
    this.canvas.height = h
    this.cache.clear()
    this.mistCache.clear()
    this.composed = null
    this.stars = createStars(w, h, 'sky')
    this.particles.resize(w, h, h / 600)
    if (this.input) this.ensureComposition(this.input, false)
    this.renderFrame(0)
  }

  setInput(input: SceneInput) {
    const previous = this.input
    this.input = input
    const changedScene = !previous || previous.key !== input.key || previous.travel !== input.travel
    if (changedScene) this.ensureComposition(input, Boolean(previous))
    if (input.reduceMotion || !this.running) this.renderFrame(0)
  }

  /** 屏幕闪光：雷电、破境。 */
  flash(color = 'rgba(255,255,255,0.85)', duration = 180) {
    this.flashColor = color
    this.flashUntil = performance.now() + duration
  }

  burstQi() {
    const h = this.canvas.height
    this.particles.emitQi(this.canvas.width / 2, h * HERO_GROUND_RATIO - h * 0.12, h * 0.04, true)
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      if (now - this.last < FRAME_MS) return
      const dt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      if (document.visibilityState !== 'visible') return
      this.renderFrame(this.input?.reduceMotion ? 0 : dt)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
    this.cache.clear()
    this.mistCache.clear()
  }

  private ensureComposition(input: SceneInput, fade: boolean) {
    const { width, height } = this.canvas
    if (width < 2 || height < 2) return
    if (fade && this.composed) {
      this.fadeCanvas = document.createElement('canvas')
      this.fadeCanvas.width = width
      this.fadeCanvas.height = height
      this.fadeCanvas.getContext('2d')!.drawImage(this.canvas, 0, 0)
      this.fadeStart = performance.now()
    }
    const cacheKey = `${input.key}:${input.travel ? 1 : 0}`
    let composed = this.cache.get(cacheKey)
    if (!composed) {
      composed = composeScene(input.archetype, width, height, input.travel)
      this.cache.set(cacheKey, composed)
      if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value as string)
    }
    this.composed = composed
    this.travelOffset = 0
  }

  private mistFor(light: HourLight, band: number) {
    const key = `${light.mist.map(Math.round).join(',')}:${band}`
    let mist = this.mistCache.get(key)
    if (!mist) {
      mist = createMistTexture(this.canvas.width, this.canvas.height * 0.22, light.mist, `mist:${band}`)
      this.mistCache.set(key, mist)
      if (this.mistCache.size > 8) this.mistCache.delete(this.mistCache.keys().next().value as string)
    }
    return mist
  }

  private drawTiled(image: CanvasImageSource, offset: number, y = 0, alpha = 1) {
    const { ctx } = this
    const w = this.canvas.width
    const x = ((offset % w) + w) % w
    ctx.globalAlpha = alpha
    ctx.drawImage(image, -x, y)
    if (x > 0) ctx.drawImage(image, w - x, y)
    ctx.globalAlpha = 1
  }

  private drawSky(light: HourLight) {
    const { ctx } = this
    const { width: W, height: H } = this.canvas
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75)
    sky.addColorStop(0, rgb(light.skyTop))
    sky.addColorStop(1, rgb(light.skyBottom))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    if (light.night > 0.3) {
      for (const s of this.stars) {
        const a = (0.3 + 0.5 * Math.sin(this.clock * 1.4 + s.phase) ** 2) * light.night
        ctx.fillStyle = `rgba(230,232,220,${a})`
        ctx.fillRect(s.x, s.y, s.r, s.r)
      }
    }
    if (light.celestial !== 'none') {
      const cx = light.cx * W
      const cy = light.cy * H
      const r = H * (light.celestial === 'moon' ? 0.035 : 0.045)
      const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 5)
      halo.addColorStop(0, rgb(light.celestialColor, light.celestial === 'moon' ? 0.28 : 0.35))
      halo.addColorStop(1, rgb(light.celestialColor, 0))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, r * 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgb(light.celestialColor, light.celestial === 'sun' && light.night < 0.1 ? 0.55 : 0.92)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawMist(light: HourLight, y: number, drift: number, band: number, alpha: number) {
    const mist = this.mistFor(light, band)
    this.drawTiled(mist, drift, y - mist.height * 0.55, alpha)
  }

  private drawGlow(composed: ComposedScene, light: HourLight) {
    const glow = composed.anchors.glow
    if (!glow || !this.input) return
    const { ctx } = this
    const pulse = 0.75 + 0.25 * Math.sin(this.clock * 0.8)
    const warm = this.input.archetype.warm > 0.4
    const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r)
    const color = warm ? '214,110,70' : '150,200,220'
    g.addColorStop(0, `rgba(${color},${(warm ? 0.3 : 0.26) * pulse * (0.6 + light.night * 0.6)})`)
    g.addColorStop(1, `rgba(${color},0)`)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = g
    ctx.fillRect(glow.x - glow.r, glow.y - glow.r, glow.r * 2, glow.r * 2)
    ctx.restore()
  }

  private drawLights(composed: ComposedScene, light: HourLight) {
    const { ctx } = this
    const { anchors } = composed
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    if (light.night > 0.35 && !this.input?.travel) {
      for (const [i, p] of anchors.lanterns.entries()) {
        const flicker = 0.8 + 0.2 * Math.sin(this.clock * 5 + i * 1.7)
        const r = this.canvas.height * 0.018
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4)
        g.addColorStop(0, `rgba(255,190,110,${0.7 * light.night * flicker})`)
        g.addColorStop(0.3, `rgba(220,120,60,${0.28 * light.night * flicker})`)
        g.addColorStop(1, 'rgba(220,120,60,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const water = anchors.water
    if (water && light.celestial !== 'none') {
      const x = light.cx * this.canvas.width
      const width = this.canvas.height * 0.05
      for (let y = water.top + 2; y < water.bottom; y += this.canvas.height * 0.008) {
        const k = (y - water.top) / (water.bottom - water.top)
        const wobble = Math.sin(this.clock * 2 + y * 0.08) * width * 0.4
        ctx.fillStyle = rgb(light.celestialColor, 0.16 * (1 - k))
        ctx.fillRect(x - width * (0.3 + k) + wobble, y, width * (0.6 + k * 2), this.canvas.height * 0.003)
      }
    }
    ctx.restore()
  }

  private renderFrame(dt: number) {
    const input = this.input
    const composed = this.composed
    if (!input || !composed) return
    const { ctx } = this
    const { width: W, height: H } = this.canvas
    const u = H / 600
    this.clock += dt
    const light = resolveLight(input.hour, input.weather)
    if (input.travel) this.travelOffset += dt * 36 * u
    const t = this.travelOffset

    ctx.globalCompositeOperation = 'source-over'
    this.drawSky(light)
    this.drawTiled(composed.far, t * 0.15)
    const fog = input.weather === 'fog' ? 1 : input.weather === 'drizzle' ? 0.6 : 0.35
    this.drawMist(light, composed.anchors.mistBands[0], this.clock * 6 * u + t * 0.3, 0, 0.55 + fog * 0.35)
    this.drawGlow(composed, light)
    this.drawTiled(composed.mid, t * 0.45)
    this.particles.drawBehind(ctx, light)
    this.drawMist(light, composed.anchors.mistBands[1], -this.clock * 9 * u + t * 0.6, 1, 0.35 + fog * 0.45)
    this.drawTiled(composed.near, t)

    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = rgb(light.tint)
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    if (input.weather === 'fog') this.drawMist(light, H * 0.5, this.clock * 4 * u, 2, 0.8)

    this.drawLights(composed, light)
    this.updateParticles(dt, input, composed, light)
    this.particles.drawFront(ctx, light)

    ctx.globalAlpha = 0.5
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(composed.grain, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    const vignette = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8)
    vignette.addColorStop(0, 'rgba(8,10,12,0)')
    vignette.addColorStop(1, 'rgba(8,10,12,0.55)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)

    const now = performance.now()
    if (now < this.flashUntil) {
      ctx.fillStyle = this.flashColor
      ctx.globalAlpha = (this.flashUntil - now) / 220
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    if (this.fadeCanvas) {
      const k = (now - this.fadeStart) / FADE_MS
      if (k >= 1) this.fadeCanvas = null
      else {
        ctx.globalAlpha = 1 - k * k
        ctx.drawImage(this.fadeCanvas, 0, 0)
        ctx.globalAlpha = 1
      }
    }
  }

  private updateParticles(dt: number, input: SceneInput, composed: ComposedScene, light: HourLight) {
    if (!dt) return
    const fireflies = input.archetype.flora.some(f => f === 'forest' || f === 'reeds' || f === 'lotus' || f === 'willow')
    this.particles.update(dt, input.weather, light, fireflies)
    this.smokeTimer -= dt
    if (this.smokeTimer <= 0 && !input.travel) {
      this.smokeTimer = 0.45
      for (const p of composed.anchors.smoke) this.particles.emitSmoke(p.x, p.y)
    }
    if (input.heroEffect === 'qi') {
      this.qiTimer -= dt
      if (this.qiTimer <= 0) {
        this.qiTimer = 0.12
        const H = this.canvas.height
        this.particles.emitQi(this.canvas.width / 2, H * HERO_GROUND_RATIO - H * 0.06, H * 0.06)
      }
    }
    if (input.weather === 'storm') {
      this.nextBolt -= dt
      if (this.nextBolt <= 0) {
        this.nextBolt = 4 + Math.random() * 7
        this.flash('rgba(230,236,255,0.75)', 220)
      }
    }
  }

  cssHeroGround() {
    return this.canvas.height / this.dpr * HERO_GROUND_RATIO
  }
}
