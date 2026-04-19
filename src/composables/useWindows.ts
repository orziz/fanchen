import { reactive } from 'vue'
import { WINDOW_LAYOUT_KEY, LEGACY_WINDOW_LAYOUT_KEYS } from '@/config'

export const WINDOW_DOCK_ZONES = ['main', 'side', 'bottom'] as const
export type WindowDockZone = typeof WINDOW_DOCK_ZONES[number]

export interface WindowState {
  open: boolean
  left: number
  top: number
  z: number
  minimized: boolean
  dockSide: WindowDockZone | null
}

const WINDOW_IDS = ['map', 'journal', 'profile', 'command'] as const
export type WindowId = typeof WINDOW_IDS[number]
const LAYOUT_KEY = WINDOW_LAYOUT_KEY
let zCounter = 3
let layoutLoaded = false

const windows = reactive<Record<WindowId, WindowState>>({
  map: makeDefault('map'),
  journal: makeDefault('journal'),
  profile: makeDefault('profile'),
  command: makeDefault('command'),
})

function makeDefault(id: string): WindowState {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  if (id === 'map') return { open: true, left: Math.max(24, Math.round(vw * 0.08)), top: Math.max(92, Math.round(vh * 0.1)), z: 2, minimized: false, dockSide: null }
  if (id === 'profile') return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.36), 620) - 44), top: Math.max(120, Math.round(vh * 0.18)), z: 4, minimized: false, dockSide: 'side' }
  if (id === 'command') return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.42), 720) - 56), top: Math.max(116, Math.round(vh * 0.16)), z: 5, minimized: false, dockSide: 'bottom' }
  return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.34), 560) - 28), top: Math.max(104, Math.round(vh * 0.14)), z: 3, minimized: false, dockSide: 'main' }
}

function isValidDockZone(value: unknown): value is WindowDockZone {
  return typeof value === 'string' && WINDOW_DOCK_ZONES.includes(value as WindowDockZone)
}

function getDefaultDockSideFor(id: WindowId): WindowDockZone {
  if (id === 'journal') return 'main'
  if (id === 'profile') return 'side'
  return 'bottom'
}

function loadLayout() {
  if (layoutLoaded) return
  layoutLoaded = true
  try {
    const entry = [LAYOUT_KEY, ...LEGACY_WINDOW_LAYOUT_KEYS]
      .map(key => ({ key, raw: localStorage.getItem(key) }))
      .find(item => item.raw)
    if (!entry?.raw) return
    const parsed = JSON.parse(entry.raw)
    zCounter = Math.max(3, Number(parsed.zCounter) || 3)
    for (const id of WINDOW_IDS) {
      const saved = parsed.windows?.[id]
      if (saved) {
        Object.assign(windows[id], saved)
        windows[id].dockSide = isValidDockZone(saved.dockSide) ? saved.dockSide : getDefaultDockSideFor(id)
      }
    }
    if (entry.key !== LAYOUT_KEY) persistLayout()
  } catch { /* ignore */ }
}

function persistLayout() {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({
      zCounter,
      windows: Object.fromEntries(WINDOW_IDS.map(id => [id, { ...windows[id] }])),
    }))
    LEGACY_WINDOW_LAYOUT_KEYS.forEach(key => localStorage.removeItem(key))
  } catch { /* ignore */ }
}

export function useWindows() {
  loadLayout()

  function getWindow(id: WindowId) { return windows[id] }

  function bringToFront(id: WindowId) {
    zCounter++
    windows[id].z = zCounter
    persistLayout()
  }

  function openWindow(id: WindowId) {
    windows[id].open = true
    bringToFront(id)
  }

  function closeWindow(id: WindowId) {
    windows[id].open = false
    persistLayout()
  }

  function toggleWindow(id: WindowId) {
    windows[id].open ? closeWindow(id) : openWindow(id)
  }

  function toggleMinimize(id: WindowId) {
    if (!windows[id].open) openWindow(id)
    windows[id].minimized = !windows[id].minimized
    bringToFront(id)
  }

  function getDefaultDockSide(id: WindowId) {
    return getDefaultDockSideFor(id)
  }

  function toggleDock(id: WindowId) {
    if (!windows[id].open) windows[id].open = true
    windows[id].dockSide = windows[id].dockSide ? null : getDefaultDockSide(id)
    windows[id].minimized = false
    bringToFront(id)
  }

  function setDockSide(id: WindowId, dockSide: WindowDockZone | null) {
    windows[id].dockSide = dockSide
    if (dockSide && !windows[id].open) windows[id].open = true
    windows[id].minimized = false
    bringToFront(id)
  }

  function cycleDockSide(id: WindowId) {
    const current = windows[id].dockSide || getDefaultDockSide(id)
    const currentIndex = WINDOW_DOCK_ZONES.indexOf(current)
    const next = WINDOW_DOCK_ZONES[(currentIndex + 1) % WINDOW_DOCK_ZONES.length]
    setDockSide(id, next)
  }

  function closeTopWindow() {
    const open = WINDOW_IDS.filter(id => windows[id].open)
    if (!open.length) return
    open.sort((a, b) => (windows[b].z || 0) - (windows[a].z || 0))
    closeWindow(open[0])
  }

  function updatePosition(id: WindowId, left: number, top: number) {
    windows[id].left = left
    windows[id].top = top
    persistLayout()
  }

  return {
    windows, WINDOW_IDS,
    getWindow, openWindow, closeWindow, toggleWindow,
    toggleMinimize, toggleDock, setDockSide, cycleDockSide, bringToFront, closeTopWindow,
    updatePosition,
  }
}
