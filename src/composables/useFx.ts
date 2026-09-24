import { reactive } from 'vue'

/** 表现层特效队列：飘字、横幅、屏幕震动与闪光，由场景组件消费。 */
export interface FloatText {
  id: number
  text: string
  tone: 'gain' | 'gold' | 'loss' | 'qi' | 'info' | 'crit'
  icon?: string
  target: 'hero' | 'enemy'
  born: number
}

export interface Banner {
  id: number
  kind: 'breakthrough' | 'breakthrough-fail' | 'arrival' | 'victory' | 'defeat' | 'unlock' | 'faction'
  title: string
  subtitle: string
}

let seq = 0

const fx = reactive({
  floats: [] as FloatText[],
  banner: null as Banner | null,
  shakeKey: 0,
  shakeStrength: 0,
  flash: null as null | { color: string; at: number },
  heroMotion: 'idle' as 'idle' | 'attack' | 'hit' | 'surge',
  enemyMotion: 'idle' as 'idle' | 'attack' | 'hit' | 'defeated',
})

let bannerTimer = 0
const motionTimers: Record<string, number> = {}

export function useFx() {
  function float(text: string, tone: FloatText['tone'] = 'gain', target: FloatText['target'] = 'hero', icon?: string) {
    const entry = { id: ++seq, text, tone, target, icon, born: performance.now() }
    fx.floats.push(entry)
    if (fx.floats.length > 14) fx.floats.splice(0, fx.floats.length - 14)
    window.setTimeout(() => {
      const index = fx.floats.indexOf(entry)
      if (index >= 0) fx.floats.splice(index, 1)
    }, 2200)
  }

  function banner(kind: Banner['kind'], title: string, subtitle = '', duration = 2600) {
    fx.banner = { id: ++seq, kind, title, subtitle }
    window.clearTimeout(bannerTimer)
    bannerTimer = window.setTimeout(() => { fx.banner = null }, duration)
  }

  function shake(strength = 1) {
    fx.shakeStrength = strength
    fx.shakeKey = ++seq
  }

  function flash(color = 'rgba(255, 244, 214, 0.8)') {
    fx.flash = { color, at: performance.now() }
  }

  function heroMotion(motion: typeof fx.heroMotion, duration = 420) {
    fx.heroMotion = motion
    window.clearTimeout(motionTimers.hero)
    motionTimers.hero = window.setTimeout(() => { fx.heroMotion = 'idle' }, duration)
  }

  function enemyMotion(motion: typeof fx.enemyMotion, duration = 420) {
    fx.enemyMotion = motion
    window.clearTimeout(motionTimers.enemy)
    if (motion !== 'defeated') motionTimers.enemy = window.setTimeout(() => { fx.enemyMotion = 'idle' }, duration)
  }

  return { fx, float, banner, shake, flash, heroMotion, enemyMotion }
}
