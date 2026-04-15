/**
 * PixiJS 8 map renderer — replaces old Canvas 2D map.
 * Framework-agnostic: depends only on config + getContext().
 */
import { Application, Container, FederatedPointerEvent, Graphics, Text, TextStyle } from 'pixi.js'
import { LOCATIONS, LOCATION_MAP } from '@/config'
import { clamp } from '@/utils'
import { getContext } from '@/core/context'
import { bus } from '@/core/events'

const VIEW_MARGIN_X = 132
const VIEW_MARGIN_Y = 108
const MIN_SCALE = 0.78
const MAX_SCALE = 2.18
const PAN_PADDING = 42
const NODE_HIT_RADIUS = 24
const ZOOM_STEP = 1.14

interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
}

interface WorldBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface GameMap {
  mount(container: HTMLElement): Promise<void>
  render(): void
  focusOn(locationId: string, scale?: number): void
  resetView(): void
  zoomBy(step: number): void
  destroy(): void
}

export interface GameMapOptions {
  onViewportChange?: (zoomPercent: number) => void
}

interface InternalApplication extends Application {
  _cancelResize?: (() => void) | null
}

export async function createGameMap(options: GameMapOptions = {}): Promise<GameMap> {
  const app = new Application()

  let viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 }
  let canvasWidth = 1440
  let canvasHeight = 720
  let dragStart: { x: number; y: number; ox: number; oy: number } | null = null
  let mountedContainer: HTMLElement | null = null
  let wheelTarget: HTMLCanvasElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let hasInteracted = false
  let initialized = false
  let destroyed = false
  let appDisposed = false

  const unsubscribers: Array<() => void> = []
  const backgroundGraphics = new Graphics()
  const worldLayer = new Container()
  const routeGraphics = new Graphics()
  const nodeContainer = new Container()
  const trailGraphics = new Graphics()
  const labelContainer = new Container()

  worldLayer.addChild(routeGraphics, nodeContainer, trailGraphics, labelContainer)

  const worldBounds = LOCATIONS.reduce<WorldBounds>(
    (bounds, location) => ({
      left: Math.min(bounds.left, location.x - VIEW_MARGIN_X),
      top: Math.min(bounds.top, location.y - VIEW_MARGIN_Y),
      width: Math.max(bounds.width, location.x + VIEW_MARGIN_X),
      height: Math.max(bounds.height, location.y + VIEW_MARGIN_Y),
    }),
    { left: Infinity, top: Infinity, width: -Infinity, height: -Infinity },
  )

  worldBounds.width -= worldBounds.left
  worldBounds.height -= worldBounds.top

  const nodeGraphicsMap = new Map<string, { circle: Graphics; label: Text }>()

  const labelStyle = new TextStyle({
    fontFamily: 'STKaiti, KaiTi, Kaiti SC, FangSong, serif',
    fontSize: 15,
    fontWeight: '700',
    fill: 0x5b4d3b,
    stroke: { color: 0xf7f0e3, width: 3 },
  })
  const labelStyleSelected = new TextStyle({
    fontFamily: 'STKaiti, KaiTi, Kaiti SC, FangSong, serif',
    fontSize: 16,
    fontWeight: '700',
    fill: 0xa67821,
    stroke: { color: 0xfbf6ea, width: 3 },
  })
  const labelStyleCurrent = new TextStyle({
    fontFamily: 'STKaiti, KaiTi, Kaiti SC, FangSong, serif',
    fontSize: 18,
    fontWeight: '700',
    fill: 0x356a55,
    stroke: { color: 0xfbf6ea, width: 3.5 },
  })

  function getFitScale() {
    return clamp(Math.min(canvasWidth / worldBounds.width, canvasHeight / worldBounds.height), MIN_SCALE, 1.04)
  }

  function emitViewportChange() {
    const fitScale = getFitScale()
    const relativeScale = fitScale > 0 ? viewport.scale / fitScale : 1
    options.onViewportChange?.(Math.round(relativeScale * 100))
  }

  function computeFitViewport(): Viewport {
    const fitScale = getFitScale()
    return clampViewport({
      scale: fitScale,
      offsetX: (canvasWidth - worldBounds.width * fitScale) / 2 - worldBounds.left * fitScale,
      offsetY: (canvasHeight - worldBounds.height * fitScale) / 2 - worldBounds.top * fitScale,
    })
  }

  function clampViewport(nextViewport: Viewport): Viewport {
    const scaledWidth = worldBounds.width * nextViewport.scale
    const scaledHeight = worldBounds.height * nextViewport.scale

    if (scaledWidth + PAN_PADDING * 2 <= canvasWidth) {
      nextViewport.offsetX = (canvasWidth - scaledWidth) / 2 - worldBounds.left * nextViewport.scale
    } else {
      const minOffsetX = canvasWidth - PAN_PADDING - (worldBounds.left + worldBounds.width) * nextViewport.scale
      const maxOffsetX = PAN_PADDING - worldBounds.left * nextViewport.scale
      nextViewport.offsetX = clamp(nextViewport.offsetX, minOffsetX, maxOffsetX)
    }

    if (scaledHeight + PAN_PADDING * 2 <= canvasHeight) {
      nextViewport.offsetY = (canvasHeight - scaledHeight) / 2 - worldBounds.top * nextViewport.scale
    } else {
      const minOffsetY = canvasHeight - PAN_PADDING - (worldBounds.top + worldBounds.height) * nextViewport.scale
      const maxOffsetY = PAN_PADDING - worldBounds.top * nextViewport.scale
      nextViewport.offsetY = clamp(nextViewport.offsetY, minOffsetY, maxOffsetY)
    }

    return nextViewport
  }

  function applyViewport() {
    worldLayer.position.set(viewport.offsetX, viewport.offsetY)
    worldLayer.scale.set(viewport.scale)
    emitViewportChange()
  }

  function drawBackground() {
    backgroundGraphics.clear()
    backgroundGraphics.rect(0, 0, canvasWidth, canvasHeight).fill(0xf3ecde)
    backgroundGraphics.circle(canvasWidth * 0.16, canvasHeight * 0.24, Math.max(canvasWidth, canvasHeight) * 0.22).fill({ color: 0xe4ce97, alpha: 0.18 })
    backgroundGraphics.circle(canvasWidth * 0.84, canvasHeight * 0.16, Math.max(canvasWidth, canvasHeight) * 0.2).fill({ color: 0xb7ccd0, alpha: 0.18 })
    backgroundGraphics.circle(canvasWidth * 0.56, canvasHeight * 0.88, Math.max(canvasWidth, canvasHeight) * 0.28).fill({ color: 0xd8c48a, alpha: 0.14 })
    backgroundGraphics.roundRect(16, 16, canvasWidth - 32, canvasHeight - 32, 28)
      .fill({ color: 0xfaf5ea, alpha: 0.9 })
      .stroke({ width: 1.5, color: 0xe3d6bf, alpha: 0.9 })

    for (let index = 0; index < 4; index += 1) {
      const y = canvasHeight * (0.24 + index * 0.16)
      backgroundGraphics
        .moveTo(42, y)
        .bezierCurveTo(canvasWidth * 0.24, y - 16, canvasWidth * 0.68, y + 22, canvasWidth - 42, y - 8)
        .stroke({ width: 1, color: 0xd8c8a9, alpha: 0.24 })
    }
  }

  function drawRoutes() {
    routeGraphics.clear()
    LOCATIONS.forEach(location => {
      location.neighbors.forEach(neighborId => {
        if (location.id > neighborId) return
        const neighbor = LOCATION_MAP.get(neighborId)
        if (!neighbor) return
        const midX = (location.x + neighbor.x) / 2 + (neighbor.y - location.y) * 0.08
        const midY = (location.y + neighbor.y) / 2 - (neighbor.x - location.x) * 0.05
        routeGraphics
          .moveTo(location.x, location.y)
          .quadraticCurveTo(midX, midY, neighbor.x, neighbor.y)
          .stroke({ width: 5, color: 0xffffff, alpha: 0.06 })
        routeGraphics
          .moveTo(location.x, location.y)
          .quadraticCurveTo(midX, midY, neighbor.x, neighbor.y)
          .stroke({ width: 2.2, color: 0xae8b55, alpha: 0.36 })
      })
    })
  }

  function buildNodes() {
    nodeContainer.removeChildren()
    labelContainer.removeChildren()
    nodeGraphicsMap.clear()

    LOCATIONS.forEach(location => {
      const circle = new Graphics()
      circle.eventMode = 'static'
      circle.cursor = 'pointer'
      circle.hitArea = { contains: (x: number, y: number) => Math.hypot(x - location.x, y - location.y) < NODE_HIT_RADIUS }
      circle.on('pointertap', () => {
        const context = getContext()
        context.selectedLocationId = location.id
        bus.emit('map:location-selected', location.id)
        render()
      })
      nodeContainer.addChild(circle)

      const label = new Text({ text: location.name, style: labelStyle })
      label.anchor.set(0.5, 1)
      label.position.set(location.x, location.y - 24)
      labelContainer.addChild(label)

      nodeGraphicsMap.set(location.id, { circle, label })
    })
  }

  function updateNodes() {
    const context = getContext()
    const currentId = context.game.player.locationId
    const selectedId = context.selectedLocationId
    const activeRealmId = context.game.world.realm.activeRealmId

    LOCATIONS.forEach(location => {
      const entry = nodeGraphicsMap.get(location.id)
      if (!entry) return

      const { circle, label } = entry
      const isCurrent = location.id === currentId
      const isSelected = location.id === selectedId
      const isRealmHot = Boolean(location.realmId && location.realmId === activeRealmId)
      const radius = isCurrent ? 18 : isSelected ? 15 : 12
      const fillColor = isRealmHot ? 0xb56f4c : isCurrent ? 0x4d8b70 : isSelected ? 0xc99a44 : 0x76a2b4
      const glowColor = isRealmHot ? 0xc7805e : isCurrent ? 0x73b291 : isSelected ? 0xdcb66f : 0x9fbcca

      circle.clear()
      circle.circle(location.x, location.y, radius * 2.9).fill({ color: glowColor, alpha: isCurrent ? 0.24 : isSelected ? 0.2 : 0.14 })
      circle.circle(location.x, location.y, radius * 1.45).fill({ color: 0xf8f2e5, alpha: isCurrent ? 0.96 : 0.84 }).stroke({ width: 2.5, color: fillColor, alpha: 0.76 })
      circle.circle(location.x, location.y, radius).fill({ color: fillColor, alpha: isCurrent ? 0.98 : 0.92 })
      if (isCurrent) {
        circle.circle(location.x, location.y, radius + 8).stroke({ width: 2, color: 0x4d8b70, alpha: 0.34 })
      }

      label.style = isCurrent ? labelStyleCurrent : isSelected ? labelStyleSelected : labelStyle
      label.position.set(location.x, location.y - radius - 12)
      label.alpha = isCurrent ? 1 : isSelected ? 0.98 : 0.86
    })
  }

  function drawPlayerTrail() {
    trailGraphics.clear()
    const current = LOCATION_MAP.get(getContext().game.player.locationId)
    if (!current) return
    trailGraphics.circle(current.x, current.y, 34).stroke({ width: 2, color: 0x4d8b70, alpha: 0.36 })
  }

  function render() {
    updateNodes()
    drawPlayerTrail()
    applyViewport()
  }

  function zoomAt(factor: number, anchorX = canvasWidth / 2, anchorY = canvasHeight / 2) {
    const nextScale = clamp(viewport.scale * factor, MIN_SCALE, MAX_SCALE)
    if (nextScale === viewport.scale) return
    const worldX = (anchorX - viewport.offsetX) / viewport.scale
    const worldY = (anchorY - viewport.offsetY) / viewport.scale
    viewport.scale = nextScale
    viewport.offsetX = anchorX - worldX * nextScale
    viewport.offsetY = anchorY - worldY * nextScale
    viewport = clampViewport(viewport)
    hasInteracted = true
    applyViewport()
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect()
    const anchorX = ((event.clientX - rect.left) / rect.width) * canvasWidth
    const anchorY = ((event.clientY - rect.top) / rect.height) * canvasHeight
    zoomAt(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, anchorX, anchorY)
  }

  function onDragStart(event: FederatedPointerEvent) {
    const point = event.global
    dragStart = { x: point.x, y: point.y, ox: viewport.offsetX, oy: viewport.offsetY }
  }

  function onDragMove(event: FederatedPointerEvent) {
    if (!dragStart) return
    const point = event.global
    viewport.offsetX = dragStart.ox + (point.x - dragStart.x)
    viewport.offsetY = dragStart.oy + (point.y - dragStart.y)
    viewport = clampViewport(viewport)
    hasInteracted = true
    applyViewport()
  }

  function onDragEnd() {
    dragStart = null
  }

  function resizeToContainer(container: HTMLElement, forceFit = false) {
    if (destroyed) return
    const nextWidth = Math.max(320, Math.round(container.clientWidth || 0))
    const nextHeight = Math.max(260, Math.round(container.clientHeight || 0))
    if (!nextWidth || !nextHeight) return
    if (nextWidth === canvasWidth && nextHeight === canvasHeight && !forceFit) return

    const worldCenter = viewport.scale > 0
      ? {
          x: (canvasWidth / 2 - viewport.offsetX) / viewport.scale,
          y: (canvasHeight / 2 - viewport.offsetY) / viewport.scale,
        }
      : {
          x: worldBounds.left + worldBounds.width / 2,
          y: worldBounds.top + worldBounds.height / 2,
        }

    canvasWidth = nextWidth
    canvasHeight = nextHeight
    app.renderer.resize(nextWidth, nextHeight)
    app.stage.hitArea = app.screen
    drawBackground()

    if (!hasInteracted || forceFit) {
      viewport = computeFitViewport()
    } else {
      viewport.offsetX = canvasWidth / 2 - worldCenter.x * viewport.scale
      viewport.offsetY = canvasHeight / 2 - worldCenter.y * viewport.scale
      viewport = clampViewport(viewport)
    }

    render()
  }

  function destroyApp() {
    if (appDisposed || !initialized) return
    appDisposed = true

    const internalApp = app as InternalApplication
    if (typeof internalApp._cancelResize !== 'function') {
      internalApp._cancelResize = () => {}
    }

    app.stage.off('pointerdown', onDragStart)
    app.stage.off('pointermove', onDragMove)
    app.stage.off('pointerup', onDragEnd)
    app.stage.off('pointerupoutside', onDragEnd)
    app.destroy(true, { children: true })
  }

  async function mount(container: HTMLElement) {
    if (destroyed) return
    mountedContainer = container
    canvasWidth = Math.max(360, Math.round(container.clientWidth || 1440))
    canvasHeight = Math.max(320, Math.round(container.clientHeight || 720))

    await app.init({
      width: canvasWidth,
      height: canvasHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    initialized = true

    if (destroyed || !container.isConnected) {
      destroyApp()
      return
    }

    const canvas = app.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'

    container.innerHTML = ''
    container.appendChild(canvas)

    app.stage.addChild(backgroundGraphics)
    app.stage.addChild(worldLayer)

    drawBackground()
    drawRoutes()
    buildNodes()

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', onDragStart)
    app.stage.on('pointermove', onDragMove)
    app.stage.on('pointerup', onDragEnd)
    app.stage.on('pointerupoutside', onDragEnd)

    wheelTarget = canvas
    canvas.addEventListener('wheel', onWheel, { passive: false })

    resizeObserver = new ResizeObserver(() => {
      if (mountedContainer && !destroyed) resizeToContainer(mountedContainer)
    })
    resizeObserver.observe(container)

    unsubscribers.push(bus.on('state:location-changed', () => render()))
    unsubscribers.push(bus.on('game:loaded', () => render()))
    unsubscribers.push(bus.on('game:reset', () => render()))

    resizeToContainer(container, true)
  }

  function focusOn(locationId: string, scale?: number) {
    const location = LOCATION_MAP.get(locationId)
    if (!location) return
    viewport.scale = clamp(scale ?? Math.max(viewport.scale, 1), MIN_SCALE, MAX_SCALE)
    viewport.offsetX = canvasWidth / 2 - location.x * viewport.scale
    viewport.offsetY = canvasHeight / 2 - location.y * viewport.scale
    viewport = clampViewport(viewport)
    hasInteracted = true
    applyViewport()
  }

  function resetView() {
    hasInteracted = false
    viewport = computeFitViewport()
    render()
  }

  function zoomBy(step: number) {
    if (!step) return
    const factor = step > 0 ? Math.pow(ZOOM_STEP, step) : Math.pow(1 / ZOOM_STEP, Math.abs(step))
    zoomAt(factor)
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    dragStart = null
    resizeObserver?.disconnect()
    resizeObserver = null
    if (wheelTarget) {
      wheelTarget.removeEventListener('wheel', onWheel)
      wheelTarget = null
    }
    unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
    mountedContainer = null
    destroyApp()
  }

  return { mount, render, focusOn, resetView, zoomBy, destroy }
}
