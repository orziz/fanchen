import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { SAVE_BACKUP_KEY, SAVE_KEY } from '@/config'
import { gameStep } from '@/systems/autoplay'
import { setMode } from '@/systems/player'
import { joinFaction } from '@/systems/social/faction'

function mockStorage() {
  const data = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }).localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, String(value)) },
    removeItem: key => { data.delete(key) },
  }
  return data
}

describe('save import', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('rejects a file with broken player fields and leaves the current game and storage untouched', () => {
    const storage = mockStorage()
    const store = useGameStore()
    store.initializeGame()
    store.player.name = '林寒'
    store.saveGame(false)
    const primary = storage.get(SAVE_KEY)
    const backup = storage.get(SAVE_BACKUP_KEY)

    expect(() => store.importSave(JSON.stringify({ player: { name: null }, world: {}, npcs: [] }))).toThrow()
    expect(() => store.importSave(JSON.stringify({ player: { inventory: 'none' }, world: { day: 3 }, npcs: [] }))).toThrow()
    const exported = JSON.parse(store.exportSave())
    expect(() => store.importSave(JSON.stringify({ ...exported, log: [{ stamp: '', text: null, type: 'info' }] }))).toThrow()
    expect(() => store.importSave(JSON.stringify({ ...exported, npcs: [{ ...exported.npcs[0], name: 7 }] }))).toThrow()
    expect(() => store.importSave(JSON.stringify({ ...exported, player: { ...exported.player, rivalIds: 'none' } }))).toThrow()
    expect(() => store.importSave(JSON.stringify({ ...exported, player: { ...exported.player, factionCooldowns: 5 } }))).toThrow()
    expect(() => store.importSave(JSON.stringify({ ...exported, market: { qinghe: 'sold out' } }))).toThrow()

    expect(store.player.name).toBe('林寒')
    expect(storage.get(SAVE_KEY)).toBe(primary)
    expect(storage.get(SAVE_BACKUP_KEY)).toBe(backup)
  })

  it('accepts a save it exported itself after some play', () => {
    mockStorage()
    const store = useGameStore()
    store.initializeGame()
    store.story.activeStoryId = null
    store.story.presentation = null
    store.story.flags['tutorial.opening.active'] = false
    joinFaction('qinghe-commons')
    setMode('adventure')
    for (let i = 0; i < 24 * 4; i += 1) gameStep()
    store.player.name = '沈舟'
    store.player.money = 321
    const exported = store.exportSave()
    store.player.money = 0

    store.importSave(exported)

    expect(store.player.name).toBe('沈舟')
    expect(store.player.money).toBe(321)
  })
})
