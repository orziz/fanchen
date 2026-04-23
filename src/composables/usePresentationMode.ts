import { computed, ref } from 'vue'
import { SAVE_KEY } from '@/config'

export const UI_MODES = ['text', 'jianghu'] as const
export type UiMode = typeof UI_MODES[number]

const UI_MODE_STORAGE_KEY = `${SAVE_KEY}-ui-mode-v1`
const uiMode = ref<UiMode>('text')
let initialized = false

function isUiMode(value: unknown): value is UiMode {
  return typeof value === 'string' && UI_MODES.includes(value as UiMode)
}

function syncDocument(mode: UiMode) {
  if (typeof document === 'undefined') return
  document.body.dataset.uiMode = mode
}

function persist(mode: UiMode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

function applyUiMode(mode: UiMode) {
  uiMode.value = mode
  syncDocument(mode)
  persist(mode)
}

function ensureInitialized() {
  if (initialized) return
  initialized = true

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(UI_MODE_STORAGE_KEY)
      if (isUiMode(saved)) {
        uiMode.value = saved
      }
    } catch {
      /* ignore */
    }
  }

  syncDocument(uiMode.value)
}

export function usePresentationMode() {
  ensureInitialized()

  function setUiMode(mode: UiMode) {
    if (uiMode.value === mode) {
      syncDocument(mode)
      return
    }
    applyUiMode(mode)
  }

  function toggleUiMode() {
    applyUiMode(uiMode.value === 'text' ? 'jianghu' : 'text')
  }

  return {
    uiMode,
    isTextMode: computed(() => uiMode.value === 'text'),
    setUiMode,
    toggleUiMode,
  }
}