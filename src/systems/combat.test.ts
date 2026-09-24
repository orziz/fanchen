import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { processBattleRound, startEncounter } from '@/systems/combat'
import { performCombatRound } from '@/systems/world'

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

  it('lets the world move on by one step for every round fought by hand', () => {
    const store = useGameStore()
    startEncounter('hunt')
    store.combat.currentEnemy!.hp = store.combat.currentEnemy!.maxHp = 9999
    const steps = () => store.world.day * 24 + store.world.hour * 2 + store.world.subStep

    const before = steps()
    expect(performCombatRound('defend')).toBe(true)
    expect(performCombatRound('attack')).toBe(true)

    expect(steps()).toBe(before + 2)
  })
})
