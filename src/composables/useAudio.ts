import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { audio } from '@/audio/engine'
import { music, type MusicMood } from '@/audio/music'
import { ambience } from '@/audio/ambience'
import { resolveWeather } from '@/art/scene/palette'
import { useSettings } from '@/composables/useSettings'
import { useGamePhase } from '@/composables/useGamePhase'

/** 声音总控：首次点击解锁，按画面阶段、时辰、战斗与天气切换琴曲心境和环境声。 */
export function useAudio() {
  const store = useGameStore()
  const settings = useSettings()
  const { phase } = useGamePhase()

  const mood = computed<MusicMood>(() => {
    if (phase.value === 'title') return 'title'
    if (store.combat.currentEnemy) return 'combat'
    const hour = store.world.hour
    return hour <= 2 || hour >= 10 ? 'night' : 'day'
  })

  function applyVolumes() {
    audio.setVolumes(settings.musicVolume, settings.sfxVolume, settings.muted)
  }

  function unlock() {
    const first = !audio.ctx
    audio.unlock()
    if (first && audio.ctx) {
      applyVolumes()
      music.setMood(mood.value)
      music.start()
      ambience.set(resolveWeather(store.world.weather), phase.value === 'playing')
    }
  }

  watch(() => [settings.musicVolume, settings.sfxVolume, settings.muted], applyVolumes)
  watch(mood, value => music.setMood(value))
  watch(() => [store.world.weather, phase.value] as const, ([weather, current]) => {
    ambience.set(resolveWeather(weather), current === 'playing')
  })

  function onVisibility() {
    if (!audio.ctx) return
    if (document.visibilityState === 'hidden') void audio.ctx.suspend()
    else void audio.ctx.resume()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    document.removeEventListener('visibilitychange', onVisibility)
    music.stop()
  })

  return { thunder: () => ambience.thunder() }
}
