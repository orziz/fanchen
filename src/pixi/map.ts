/**
 * PixiJS 8 map renderer — replaces old Canvas 2D map.
 * Framework-agnostic: depends only on config + getContext().
 */
import { Application, Graphics, Text, TextStyle, Container, FederatedPointerEvent } from 'pixi.js'
import { LOCATIONS, LOCATION_MAP, type LocationData } from '@/config'
import { clamp } from '@/utils'
import { getContext } from '@/core/context'
import { bus } from '@/core/events'

/* ─── Constants ─── */
const VIEW_MARGIN_X = 132
const VIEW_MARGIN_Y = 108
const MIN_SCALE = 0.72
const MAX_SCALE = 1.92
const PAN_PADDING = 54
const NODE_HIT_RADIUS = 24

/* ─── Types ─── */
interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
}

export interface GameMap {
  /** Mount renderer into target element (replaces children) */
  mount(container: HTMLElement): Promise<void>
  /** Full redraw */
  render(): void
  /** Center on a location */
  focusOn(locationId: string, scale?: number): void
  /** Reset to fit-all view */
  resetView(): void
  /** Destroy the renderer and free resources */
  destroy(): void
}

/* ─── Create the map renderer ─── */
export async function createGameMap(): Promise<GameMap> {
  const app = new Application()

  let viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 }
  let canvasWidth = 1440
  let canvasHeight = 720

  /* ─── Layers ─── */
  const worldLayer = new Container()
  const routeGraphics = new Graphics()
  const nodeContainer = new Container()
  const trailGraphics = new Graphics()
  const labelContainer = new Container()

  worldLayer.addChild(routeGraphics, nodeContainer, trailGraphics, labelContainer)

  /* ─── Viewport Helpers ─── */
  function getViewportBounds() {
    return LOCATIONS.reduce(
      (b, l) => ({
        minX: Math.min(b.minX, l.x),
        maxX: Math.max(b.maxX, l.x),
        minY: Math.min(b.minY, l.y),
        maxY: Math.max(b.maxY, l.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    )
  }

  function computeFitViewport(): Viewport {
    const bounds = getViewportBounds()
    const contentW = bounds.maxX - bounds.minX + VIEW_MARGIN_X * 2
    const contentH = bounds.maxY - bounds.minY + VIEW_MARGIN_Y * 2
    const fitScale = clamp(Math.min(canvasWidth / contentW, canvasHeight / contentH), MIN_SCALE, 1)
    return clampVP({
      scale: fitScale,
      offsetX: (canvasWidth - contentW * fitScale) / 2 - (bounds.minX - VIEW_MARGIN_X) * fitScale,
      offsetY: (canvasHeight - contentH * fitScale) / 2 - (bounds.minY - VIEW_MARGIN_Y) * fitScale,
    })
  }

  function clampVP(vp: Viewport): Viewport {
    const sw = canvasWidth * vp.scale
    const sh = canvasHeight * vp.scale
    if (sw <= canvasWidth) vp.offsetX = (canvasWidth - sw) / 2
    else vp.offsetX = clamp(vp.offsetX, canvasWidth - sw - PAN_PADDING, PAN_PADDING)
    if (sh <= canvasHeight) vp.offsetY = (canvasHeight - sh) / 2
    else vp.offsetY = clamp(vp.offsetY, canvasHeight - sh - PAN_PADDING, PAN_PADDING)
    return vp
  }

  function applyViewport() {
    worldLayer.position.set(viewport.offsetX, viewport.offsetY)
    worldLayer.scale.set(viewport.scale)
  }

  /* ─── Drawing ─── */
  function drawBackground() {
    const bg = new Graphics()
    bg.rect(0, 0, canvasWidth, canvasHeight).fill(0x0d1714)
    // We draw a simple dark background at stage level
    // The atmospheric gradient is handled in the world layer
    app.stage.addChildAt(bg, 0)
  }

  function drawRoutes() {
    routeGraphics.clear()
    LOCATIONS.forEach(loc => {
      loc.neighbors.forEach(nId => {
        if (loc.id > nId) return
        const t = LOCATION_MAP.get(nId)
        if (!t) return
        const midX = (loc.x + t.x) / 2 + (t.y - loc.y) * 0.08
        const midY = (loc.y + t.y) / 2 - (t.x - loc.x) * 0.05
        routeGraphics
          .moveTo(loc.x, loc.y)
          .quadraticCurveTo(midX, midY, t.x, t.y)
          .stroke({ width: 2, color: 0xf2d6a2, alpha: 0.26 })
      })
    })
  }

  const nodeGraphicsMap = new Map<string, { circle: Graphics; label: Text }>()

  const labelStyle = new TextStyle({
    fontFamily: 'STKaiti, KaiTi, serif',
    fontSize: 16,
    fontWeight: '600',
    fill: 'rgba(250, 243, 228, 0.9)',
  })
  const labelStyleCurrent = new TextStyle({
    fontFamily: 'STKaiti, KaiTi, serif',
    fontSize: 20,
    fontWeight: '700',
    fill: 'rgba(250, 243, 228, 0.9)',
  })

  function buildNodes() {
    nodeContainer.removeChildren()
    labelContainer.removeChildren()
    nodeGraphicsMap.clear()

    LOCATIONS.forEach(loc => {
      const circle = new Graphics()
      circle.eventMode = 'static'
      circle.cursor = 'pointer'
      // Hit area is the visible circle + some margin
      circle.hitArea = { contains: (x: number, y: number) => Math.hypot(x - loc.x, y - loc.y) < NODE_HIT_RADIUS }
      circle.on('pointertap', () => {
        const ctx = getContext()
        ctx.selectedLocationId = loc.id
        bus.emit('map:location-selected', loc.id)
        render()
      })
      nodeContainer.addChild(circle)

      const label = new Text({ text: loc.short, style: labelStyle })
      label.anchor.set(0.5, 1)
      label.position.set(loc.x, loc.y - 24)
      labelContainer.addChild(label)

      nodeGraphicsMap.set(loc.id, { circle, label })
    })
  }

  function updateNodes() {
    const ctx = getContext()
    const currentId = ctx.game.player.locationId
    const selectedId = ctx.selectedLocationId
    const activeRealmId = ctx.game.world.realm.activeRealmId

    LOCATIONS.forEach(loc => {
      const entry = nodeGraphicsMap.get(loc.id)
      if (!entry) return
      const { circle, label } = entry

      const isCurrent = loc.id === currentId
      const isSelected = loc.id === selectedId
      const isRealmHot = Boolean(loc.realmId && loc.realmId === activeRealmId)
      const radius = isCurrent ? 18 : isSelected ? 15 : 12

      const glowColor = isRealmHot ? 0xb45c47 : isCurrent ? 0x7fb294 : isSelected ? 0xf2d6a2 : 0x7db2c8
      const glowAlpha = isRealmHot ? 0.58 : isCurrent ? 0.65 : isSelected ? 0.55 : 0.34
      const fillColor = isRealmHot ? 0xb45c47 : isCurrent ? 0x7fb294 : isSelected ? 0xf2d6a2 : 0x7db2c8

      circle.clear()
      // Glow
      circle
        .circle(loc.x, loc.y, radius * 2.8)
        .fill({ color: glowColor, alpha: glowAlpha * 0.4 })
      // Node
      circle
        .circle(loc.x, loc.y, radius)
        .fill(fillColor)
        .stroke({ width: 2.5, color: 0xffffff, alpha: 0.6 })

      label.style = isCurrent ? labelStyleCurrent : labelStyle
      label.position.set(loc.x, loc.y - radius - 12)
    })
  }

  function drawPlayerTrail() {
    trailGraphics.clear()
    const ctx = getContext()
    const current = LOCATION_MAP.get(ctx.game.player.locationId)
    if (!current) return
    trailGraphics
      .circle(current.x, current.y, 34)
      .stroke({ width: 2, color: 0x7fb294, alpha: 0.7 })
  }

  function render() {
    updateNodes()
    drawPlayerTrail()
    applyViewport()
  }

  /* ─── Interaction ─── */
  let dragStart: { x: number; y: number; ox: number; oy: number } | null = null

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * canvasWidth
    const cy = ((e.clientY - rect.top) / rect.height) * canvasHeight
    const factor = e.deltaY < 0 ? 1.08 : 0.92
    const nextScale = clamp(viewport.scale * factor, MIN_SCALE, MAX_SCALE)
    const wx = (cx - viewport.offsetX) / viewport.scale
    const wy = (cy - viewport.offsetY) / viewport.scale
    viewport.scale = nextScale
    viewport.offsetX = cx - wx * nextScale
    viewport.offsetY = cy - wy * nextScale
    viewport = clampVP(viewport)
    applyViewport()
  }

  function onDragStart(e: FederatedPointerEvent) {
    const gp = e.global
    dragStart = { x: gp.x, y: gp.y, ox: viewport.offsetX, oy: viewport.offsetY }
  }

  function onDragMove(e: FederatedPointerEvent) {
    if (!dragStart) return
    const gp = e.global
    viewport.offsetX = dragStart.ox + (gp.x - dragStart.x)
    viewport.offsetY = dragStart.oy + (gp.y - dragStart.y)
    viewport = clampVP(viewport)
    applyViewport()
  }

  function onDragEnd() {
    dragStart = null
  }

  /* ─── Public API ─── */
  async function mount(container: HTMLElement) {
    await app.init({
      width: canvasWidth,
      height: canvasHeight,
      background: 0x0d1714,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })

    // Resize canvas to fill container
    const canvas = app.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.innerHTML = ''
    container.appendChild(canvas)

    canvasWidth = app.screen.width
    canvasHeight = app.screen.height

    // Stage setup
    drawBackground()
    app.stage.addChild(worldLayer)

    // Build static elements
    drawRoutes()
    buildNodes()

    // Viewport
    viewport = computeFitViewport()
    applyViewport()
    render()

    // Interactions
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', onDragStart)
    app.stage.on('pointermove', onDragMove)
    app.stage.on('pointerup', onDragEnd)
    app.stage.on('pointerupoutside', onDragEnd)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // Bus listeners
    bus.on('state:location-changed', () => render())
    bus.on('game:loaded', () => render())
    bus.on('game:reset', () => render())
  }

  function focusOn(locationId: string, scale?: number) {
    const loc = LOCATION_MAP.get(locationId)
    if (!loc) return
    const s = clamp(scale ?? viewport.scale, MIN_SCALE, MAX_SCALE)
    viewport.scale = s
    viewport.offsetX = canvasWidth / 2 - loc.x * s
    viewport.offsetY = canvasHeight / 2 - loc.y * s
    viewport = clampVP(viewport)
    applyViewport()
    render()
  }

  function resetView() {
    viewport = computeFitViewport()
    applyViewport()
    render()
  }

  function destroy() {
    app.destroy(true, { children: true })
  }

  return { mount, render, focusOn, resetView, destroy }
}
