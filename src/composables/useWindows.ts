import { reactive, ref } from 'vue'
import { WINDOW_LAYOUT_KEY, LEGACY_WINDOW_LAYOUT_KEYS } from '@/config'

export interface WindowState {
  open: boolean
  left: number
  top: number
  z: number
  minimized: boolean
  dockSide: string | null
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
  if (id === 'profile') return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.36), 620) - 44), top: Math.max(120, Math.round(vh * 0.18)), z: 4, minimized: false, dockSide: null }
  if (id === 'command') return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.42), 720) - 56), top: Math.max(116, Math.round(vh * 0.16)), z: 5, minimized: false, dockSide: null }
  return { open: false, left: Math.max(24, vw - Math.min(Math.round(vw * 0.34), 560) - 28), top: Math.max(104, Math.round(vh * 0.14)), z: 3, minimized: false, dockSide: null }
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
      if (saved) Object.assign(windows[id], saved)
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
    return id === 'map' ? 'left' : 'right'
  }

  function toggleDock(id: WindowId) {
    if (!windows[id].open) windows[id].open = true
    windows[id].dockSide = windows[id].dockSide ? null : getDefaultDockSide(id)
    windows[id].minimized = false
    bringToFront(id)
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
    toggleMinimize, toggleDock, bringToFront, closeTopWindow,
    updatePosition,
  }
}
