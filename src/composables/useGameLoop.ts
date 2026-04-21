import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { gameStep } from '@/systems/world'
import { LOOP_INTERVALS, AUTO_SAVE_INTERVAL } from '@/config'

export function useGameLoop() {
  const store = useGameStore()
  const { speed } = storeToRefs(store)
  const running = ref(true)

  let loopTimer: ReturnType<typeof setInterval> | null = null
  let saveTimer: ReturnType<typeof setInterval> | null = null

  function tick() {
    if (!running.value) return
    store.updateDerivedStats()
    gameStep()
    store.updateDerivedStats()
  }

  function startLoop() {
    stopLoop()
    const interval = LOOP_INTERVALS[speed.value] ?? LOOP_INTERVALS[1]
    loopTimer = setInterval(tick, interval)
  }

  function stopLoop() {
    if (loopTimer !== null) {
      clearInterval(loopTimer)
      loopTimer = null
    }
  }

  function startAutoSave() {
    stopAutoSave()
    saveTimer = setInterval(() => store.saveGame(false), AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave() {
    if (saveTimer !== null) {
      clearInterval(saveTimer)
      saveTimer = null
    }
  }

  watch(speed, () => {
    if (running.value) startLoop()
  })

  onMounted(() => {
    store.initializeGame()
    startLoop()
    startAutoSave()
  })

  onUnmounted(() => {
    stopLoop()
    stopAutoSave()
  })

  return { running, speed }
}
