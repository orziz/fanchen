import { describe, expect, it } from 'vitest'
import { normalizeGameNumericState, resolveCarriedDelta } from '@/core/integerProgress'
import { createGameState } from '@/stores/game/factories'

describe('integer progress carry', () => {
  it('preserves a fractional reward across runtime normalization', () => {
    const game = createGameState()

    expect(resolveCarriedDelta(game, 'player.breakthrough', 0.3)).toBe(0)
    normalizeGameNumericState(game)
    expect(resolveCarriedDelta(game, 'player.breakthrough', 0.7)).toBe(1)
  })

  it('backfills a legacy decimal once without duplicating it', () => {
    const game = createGameState()
    game.player.reputation = 2.4

    normalizeGameNumericState(game)
    expect(game.player.reputation).toBe(2)
    normalizeGameNumericState(game)

    expect(resolveCarriedDelta(game, 'player.reputation', 0.6)).toBe(1)
  })

  it('keeps independent metric buckets isolated', () => {
    const game = createGameState()

    resolveCarriedDelta(game, 'player.power', 0.8)
    resolveCarriedDelta(game, 'player.insight', 0.3)

    expect(resolveCarriedDelta(game, 'player.power', 0.2)).toBe(1)
    expect(resolveCarriedDelta(game, 'player.insight', 0.7)).toBe(1)
  })
})
