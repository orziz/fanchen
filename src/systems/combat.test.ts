import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { processBattleRound, startEncounter } from '@/systems/combat'

describe('combat rounds', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('takes a potion that restores health instead of food that only restores qi or stamina', () => {
    const store = useGameStore()
    const count = (id: string) => store.findInventoryEntry(id)?.quantity || 0
    store.addItemToInventory('mist-herb', 1)
    store.addItemToInventory('herb-paste', 1)
    const herbs = count('mist-herb')
    const pastes = count('herb-paste')
    startEncounter('hunt')

    processBattleRound('item')

    expect(count('herb-paste')).toBe(pastes - 1)
    expect(count('mist-herb')).toBe(herbs)
  })
})
