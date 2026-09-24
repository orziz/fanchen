import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { getActionUnavailableReason, performAction } from '@/systems/world'

describe('world action dispatch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('rejects an action that the current location does not provide', () => {
    const store = useGameStore()
    const subStep = store.world.subStep

    expect(getActionUnavailableReason('quest')).toContain('青禾镇')
    expect(performAction('quest')).toBe(false)
    expect(store.world.subStep).toBe(subStep)
  })

  it('runs rest through the shared action path and advances time once', () => {
    const store = useGameStore()
    store.player.hp = 20

    expect(performAction('rest')).toBe(true)
    expect(store.player.hp).toBeGreaterThan(20)
    expect(store.world.subStep).toBe(1)
  })

  it('blocks background actions while an overlay story is active', () => {
    const store = useGameStore()
    store.story.activeStoryId = 'opening-guidance'
    store.story.activeNodeId = 'wake'
    store.story.activeProgressKey = 'opening-guidance:global'
    store.story.presentation = 'overlay'

    expect(performAction('meditate')).toBe(false)
    expect(store.world.subStep).toBe(0)
  })

  it('rejects an underprepared breakthrough without consuming time', () => {
    const store = useGameStore()
    store.player.locationId = 'danjing'
    store.player.cultivation = 0
    store.player.breakthrough = 200

    expect(getActionUnavailableReason('breakthrough')).toContain('修为底子')
    expect(performAction('breakthrough')).toBe(false)
    expect(store.world.subStep).toBe(0)
  })
})
