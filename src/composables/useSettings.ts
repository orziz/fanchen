import { reactive, watch } from 'vue'
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
