import type { GameState } from '@/types/game'
import { ORIGIN_MAP } from '@/config/origins'

export interface NewLifeOptions {
  name: string
  originId: string
}

/** 新一世的名号与出身：改名、加出身底子与随身物件，并记下出身旗标。 */
export function applyOrigin(state: GameState, options: NewLifeOptions, addItem: (itemId: string, quantity: number) => void) {
  const p = state.player
  const name = options.name.trim().slice(0, 6)
  if (name) p.name = name
  const origin = ORIGIN_MAP.get(options.originId)
  if (!origin) return
  const bonus = origin.bonus
  p.money += bonus.money || 0
  p.power += bonus.power || 0
  p.insight += bonus.insight || 0
  p.charisma += bonus.charisma || 0
  p.skills.farming += bonus.farming || 0
  p.skills.crafting += bonus.crafting || 0
  p.skills.trading += bonus.trading || 0
  origin.items.forEach(({ itemId, quantity }) => addItem(itemId, quantity))
  state.story.flags[`origin.${origin.id}`] = true
}

/** 导入的存档至少要有人物、世界与群像三块，才交给水合修复。 */
export function looksLikeSave(parsed: unknown): parsed is Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object') return false
  const record = parsed as Record<string, unknown>
  return Boolean(record.player && record.world && Array.isArray(record.npcs))
}
