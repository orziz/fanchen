import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { gameStep } from '@/systems/autoplay'
import { performAction } from '@/systems/world'
import { setMode } from '@/systems/player'

const TICKS_PER_DAY = 24

function runTicks(count: number) {
  const store = useGameStore()
  for (let i = 0; i < count; i += 1) {
    store.updateDerivedStats()
    gameStep()
    store.updateDerivedStats()
  }
}

describe('autoplay loop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores stamina when resting', () => {
    const store = useGameStore()
    store.player.stamina = 10

    expect(performAction('rest')).toBe(true)
    expect(store.player.stamina).toBeGreaterThan(10)
  })

  it('keeps cultivating instead of resting forever once stamina runs low', () => {
    const store = useGameStore()
    setMode('balanced')

    runTicks(TICKS_PER_DAY * 6)
    const midway = store.player.cultivation
    runTicks(TICKS_PER_DAY * 6)

    expect(store.player.cultivation).toBeGreaterThan(midway)
  })

  it.each(['merchant', 'adventure'])('keeps time moving in %s mode before the opening affiliation', (mode) => {
    const store = useGameStore()
    store.story.flags['tutorial.opening.active'] = true
    setMode(mode)
    const startDay = store.world.day

    runTicks(TICKS_PER_DAY * 2)

    expect(store.world.day).toBeGreaterThan(startDay)
    expect(store.player.locationId).toBe('qinghe')
    expect(store.log.filter(entry => entry.type === 'warn')).toHaveLength(0)
  })
})
