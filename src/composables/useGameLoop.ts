import { onBeforeUnmount, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { gameStep } from '@/systems/autoplay'
import { AUTO_SAVE_INTERVAL, LOOP_INTERVALS } from '@/config'
import { useGamePhase } from '@/composables/useGamePhase'

const paused = ref(false)
const holdReasons = ref(new Set<string>())

/**
 * 世界时钟：游戏中才走；暂停、剧情遮罩、设置面板、页面隐藏或“手动操作”时停。
 * 交战时回合加快，让一场厮杀在十几秒内打完。
 */
export function useGameLoop() {
  const store = useGameStore()
  const { phase } = useGamePhase()
  let timer = 0
  let saveTimer = 0

  function canTick() {
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible'
    const storyBlocking = Boolean(store.story.activeStoryId && store.story.presentation === 'overlay')
    return phase.value === 'playing'
      && store.initialized
      && !paused.value
      && holdReasons.value.size === 0
      && visible
      && !storyBlocking
      && store.player.mode !== 'manual'
  }

  function interval() {
    const base = LOOP_INTERVALS[store.speed] ?? LOOP_INTERVALS[1]
    return store.combat.currentEnemy ? Math.max(260, Math.round(base * 0.55)) : base
  }

  function schedule() {
    window.clearTimeout(timer)
    timer = window.setTimeout(tick, interval())
  }

  function tick() {
    if (canTick()) {
      store.updateDerivedStats()
      gameStep()
      store.updateDerivedStats()
    }
    schedule()
  }

  function startAutoSave() {
    window.clearInterval(saveTimer)
    saveTimer = window.setInterval(() => {
      if (phase.value === 'playing' && store.initialized) store.saveGame(false)
    }, AUTO_SAVE_INTERVAL)
  }

  watch(() => store.speed, schedule)
  watch(phase, value => { if (value === 'playing') schedule() })

  schedule()
  startAutoSave()

  onBeforeUnmount(() => {
    window.clearTimeout(timer)
    window.clearInterval(saveTimer)
  })

  return { paused }
}

/** 其他界面借此暂停时钟（如设置面板），release 后恢复。 */
export function useClock() {
  function togglePause() { paused.value = !paused.value }
  function resume() { paused.value = false }
  function hold(reason: string) {
    const next = new Set(holdReasons.value)
    next.add(reason)
    holdReasons.value = next
  }
  function release(reason: string) {
    const next = new Set(holdReasons.value)
    next.delete(reason)
    holdReasons.value = next
  }
  return { paused, togglePause, resume, hold, release }
}
