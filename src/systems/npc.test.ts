import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { getNpcRumorIssues } from '@/systems/npc'

describe('npc selectors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not consume gameplay randomness while checking rumor availability', () => {
    useGameStore()
    const random = vi.spyOn(Math, 'random')

    getNpcRumorIssues('teahouse')
    getNpcRumorIssues('tavern')

    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })
})
