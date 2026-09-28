import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { SAVE_KEY } from '@/config'
import { chineseNumber, formatDate } from '@/config/calendar'
import { RETIRED_SAVE_KEY, readLifeSave } from '@/stores/game/hydration'
import { breakthroughIssue } from '@/systems/life/cultivation'
import { chooseLifeEventOption, closeLifeEvent } from '@/systems/life/events'
import { passDays } from '@/systems/life/time'
import { botRun } from '@/testing/lifeBot'

function mockStorage() {
  const data = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }).localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, String(value)) },
    removeItem: key => { data.delete(key) },
  }
  return data
}

describe('凡尘一世', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('writes dates and numbers the way the calendar reads', () => {
    expect(formatDate(1)).toBe('第一年 · 春 · 三月上旬')
    expect(formatDate(1 + 300)).toBe('第二年 · 春 · 正月上旬')
    expect(chineseNumber(16)).toBe('十六')
    expect(chineseNumber(105)).toBe('一百〇五')
  })

  it('opens a new life on the opening scroll and closes it cleanly', () => {
    mockStorage()
    const store = useGameStore()
    store.initializeGame()
    expect(store.game.life.event?.eventId).toBe('opening')

    chooseLifeEventOption(0)
    expect(store.game.life.event?.stage).toBe('result')
    closeLifeEvent()

    expect(store.game.life.event).toBeNull()
    expect(store.player.equipment.weapon).toBe('wood-spear')
  })

  it('charges board at the turn of each month and makes a broke player go hungry', () => {
    const store = useGameStore()
    store.player.money = 30
    passDays(30, 'idle')
    expect(store.player.money).toBeLessThan(30)

    store.player.money = 0
    store.player.injury = 0
    passDays(30, 'idle')
    expect(store.player.injury).toBe(1)
  })

  it('refuses to open the sense-qi realm without a heart method or thin qi', () => {
    const store = useGameStore()
    store.player.rankIndex = 1
    store.player.cultivation = 999
    const thick = { name: '寒溪坞', aura: 40, actions: ['meditate'] }
    const thin = { name: '青禾镇', aura: 20, actions: ['meditate'] }

    expect(breakthroughIssue(store.player, thick)).toContain('心法')
    store.player.learnedTechniques['heart-apprentice'] = { skillId: 'heart-apprentice', stage: 1, mastery: 0, learnedDay: 1 }
    store.player.equipment.heart = 'heart-apprentice'
    expect(breakthroughIssue(store.player, thin)).toContain('灵气')
    expect(breakthroughIssue(store.player, thick)).toBeNull()
  })

  it('archives a save from the old idle game instead of loading it', () => {
    const storage = mockStorage()
    const old = JSON.stringify({ player: { name: '旧人' }, world: { day: 40 }, npcs: [], migrationFlags: { saveVersion: 2 } })
    storage.set(SAVE_KEY, old)

    expect(readLifeSave()).toBeNull()
    expect(storage.get(RETIRED_SAVE_KEY)).toBe(old)
    expect(storage.get(SAVE_KEY)).toBeUndefined()
  })

  it('lets a determined player go from nothing to the jade courtyard without getting stuck', () => {
    mockStorage()
    const store = useGameStore()
    store.initializeGame()

    const joined = botRun(2500, () => store.game.life.goalsDone.includes('trial'))

    expect(joined).toBe(true)
    expect(store.player.rankIndex).toBeGreaterThanOrEqual(2)
    expect(store.player.affiliationId).toBe('jadegate-courtyard')
    expect(store.game.life.ended).toBeNull()
  }, 60_000)
})
