import { ref } from 'vue'

/** 画面阶段：标题页或游戏中。 */
export type GamePhase = 'title' | 'playing'

const phase = ref<GamePhase>('title')

export function useGamePhase() {
  function enterGame() {
    phase.value = 'playing'
  }
  function returnToTitle() {
    phase.value = 'title'
  }
  return { phase, enterGame, returnToTitle }
}
