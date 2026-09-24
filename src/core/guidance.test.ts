import { describe, expect, it } from 'vitest'
import { resolveGuidance, type GuidanceInput } from '@/core/guidance'

const BASE_INPUT: GuidanceInput = {
  tutorialObjective: null,
  activeStoryTitle: null,
  enemyName: null,
  travelDestination: null,
  hpPercent: 100,
  qiPercent: 100,
  staminaPercent: 100,
  breakthroughReady: false,
  canBreakthrough: false,
  affiliationName: '青禾乡社',
  tradeDestination: null,
  activeRealmName: null,
  currentModeLabel: '维生求进',
  locationName: '青禾镇',
}

describe('current guidance', () => {
  it('keeps the opening tutorial above every other suggestion', () => {
    const result = resolveGuidance({
      ...BASE_INPUT,
      tutorialObjective: '先听路人把眼前这条活路说清',
      enemyName: '山匪',
    })

    expect(result.target).toBe('story')
    expect(result.kicker).toBe('入世指引')
  })

  it('prioritizes active combat before travel and economy', () => {
    const result = resolveGuidance({
      ...BASE_INPUT,
      enemyName: '拦路修士',
      travelDestination: '雁回关',
      tradeDestination: '灯海古港',
    })

    expect(result.target).toBe('combat')
  })

  it('directs an exhausted player to the shared rest command', () => {
    const result = resolveGuidance({ ...BASE_INPUT, staminaPercent: 18 })

    expect(result.target).toBe('rest')
    expect(result.tone).toBe('danger')
  })

  it('routes a breakthrough-ready player to the map when the location is unsuitable', () => {
    const result = resolveGuidance({ ...BASE_INPUT, breakthroughReady: true })

    expect(result.target).toBe('map')
    expect(result.kicker).toBe('寻找灵地')
  })

  it('falls back to the strategy panel when no urgent state exists', () => {
    const result = resolveGuidance(BASE_INPUT)

    expect(result.target).toBe('command')
  })
})
