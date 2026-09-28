import { onBeforeUnmount, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { AUTO_SAVE_INTERVAL } from '@/config'
import { useGamePhase } from '@/composables/useGamePhase'
import { bus } from '@/core/events'
import { autoCombatTick } from '@/systems/combat'

/** 自动出招的回合间隔：一场厮杀十来秒打完，看得清每一招。 */
const COMBAT_ROUND_MS = 700

const holdReasons = ref(new Set<string>())

/**
 * 时间只在玩家做事时流动，这里不再推进世界；
 * 只负责两件事：交战时替玩家自动出招，以及定时与做完事后存档。
 */
export function useGameLoop() {
  const store = useGameStore()
  const { phase } = useGamePhase()
  let combatTimer = 0
  let saveTimer = 0

  function canFight() {
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible'
    return phase.value === 'playing' && holdReasons.value.size === 0 && visible
      && Boolean(store.combat.currentEnemy) && store.combat.autoBattle
  }

  function scheduleCombat() {
    window.clearTimeout(combatTimer)
    if (!store.combat.currentEnemy) return
    combatTimer = window.setTimeout(() => {
      if (canFight()) autoCombatTick()
      scheduleCombat()
    }, COMBAT_ROUND_MS)
  }

  function saveSoon() {
    if (phase.value === 'playing' && store.initialized) store.saveGame(false)
  }

  watch(() => store.combat.currentEnemy?.id, scheduleCombat)
  watch(() => store.combat.autoBattle, scheduleCombat)

  const offDone = bus.on('life:activity-done', saveSoon)
  const offEnded = bus.on('life:ended', saveSoon)
  saveTimer = window.setInterval(saveSoon, AUTO_SAVE_INTERVAL)
  scheduleCombat()

  onBeforeUnmount(() => {
    window.clearTimeout(combatTimer)
    window.clearInterval(saveTimer)
    offDone()
    offEnded()
  })
}

/** 其他界面借此暂停自动出招（如设置面板），release 后恢复。 */
export function useClock() {
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
  return { hold, release }
}
