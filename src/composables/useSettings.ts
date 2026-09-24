import { computed, reactive, ref, watch } from 'vue'
import { SAVE_KEY } from '@/config'

export interface GameSettings {
  musicVolume: number
  sfxVolume: number
  muted: boolean
  reduceMotion: boolean
  showRumors: boolean
}

const SETTINGS_KEY = `${SAVE_KEY}-settings`

const DEFAULTS: GameSettings = {
  musicVolume: 0.55,
  sfxVolume: 0.7,
  muted: false,
  reduceMotion: false,
  showRumors: true,
}

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* 设置损坏时回到默认值 */
  }
  return { ...DEFAULTS }
}

const settings = reactive<GameSettings>(load())

watch(settings, () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* 浏览器禁止写入时只在本次会话生效 */
  }
}, { deep: true })

export function useSettings() {
  return settings
}

// 系统的“减弱动态效果”偏好，跟随系统设置实时变化。
const systemReducedMotion = ref(false)
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  systemReducedMotion.value = query.matches
  query.addEventListener?.('change', event => { systemReducedMotion.value = event.matches })
}
const reducedMotion = computed(() => settings.reduceMotion || systemReducedMotion.value)

/** 设置里的“减少动效”与系统偏好，任一打开即视为减少动效。 */
export function useReducedMotion() {
  return reducedMotion
}
