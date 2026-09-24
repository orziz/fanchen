import { describe, expect, it } from 'vitest'
import { createGameState } from '@/stores/game/factories'
import { hydrateGameState } from '@/stores/game/hydration'

describe('save hydration repair', () => {
  it('repairs an unknown player location', () => {
    const raw = createGameState()
    raw.player.locationId = 'missing-location'

    const hydrated = hydrateGameState(raw)

    expect(hydrated.player.locationId).toBe('qinghe')
  })

  it('restores a valid legacy rail story to the only supported overlay', () => {
    const raw = createGameState()
    raw.story.activeStoryId = 'opening-guidance'
    raw.story.activeNodeId = 'map'
    raw.story.activeProgressKey = 'opening-guidance:global'
    raw.story.presentation = 'rail'

    const hydrated = hydrateGameState(raw)

    expect(hydrated.story.activeStoryId).toBe('opening-guidance')
    expect(hydrated.story.activeNodeId).toBe('map')
    expect(hydrated.story.presentation).toBe('overlay')
  })

  it('clears an invalid active story instead of blocking the game loop', () => {
    const raw = createGameState()
    raw.story.activeStoryId = 'missing-story'
    raw.story.activeNodeId = 'missing-node'
    raw.story.activeProgressKey = 'missing-story:global'
    raw.story.presentation = 'overlay'

    const hydrated = hydrateGameState(raw)

    expect(hydrated.story.activeStoryId).toBeNull()
    expect(hydrated.story.activeNodeId).toBeNull()
    expect(hydrated.story.presentation).toBeNull()
  })
})
