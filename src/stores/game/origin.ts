import type { GameState } from '@/types/game'
import { RANKS } from '@/config'
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
  return Boolean(record.player && typeof record.player === 'object' && record.world && typeof record.world === 'object' && Array.isArray(record.npcs))
}

const PLAYER_NUMBERS = [
  'rankIndex', 'cultivation', 'breakthrough', 'money', 'reputation', 'insight', 'power', 'charisma',
  'qi', 'hp', 'stamina', 'maxQi', 'maxHp', 'maxStamina',
] as const

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const allFinite = (record: Record<string, unknown>) => Object.values(record).every(value => Number.isFinite(value))

/**
 * 水合只按字段合并、不管类型，导入的文件还要再过一道形状关：
 * 人物数值、行囊、技艺、统计、产业、世界时间与群像都得是游戏读得动的样子。
 */
export function isPlayableSave(state: GameState) {
  const p = state.player
  const w = state.world
  if (!isRecord(p) || typeof p.name !== 'string' || !p.name.trim()) return false
  if (PLAYER_NUMBERS.some(key => !Number.isFinite(p[key]))) return false
  if (!Number.isInteger(p.rankIndex) || p.rankIndex < 0 || p.rankIndex >= RANKS.length) return false
  if (!Array.isArray(p.inventory) || !p.inventory.every(entry => isRecord(entry) && typeof entry.itemId === 'string' && Number.isFinite(entry.quantity))) return false
  if (!isRecord(p.skills) || !allFinite(p.skills) || !isRecord(p.stats) || !allFinite(p.stats)) return false
  if (!isRecord(p.assets) || !['farms', 'workshops', 'shops'].every(kind => Array.isArray(p.assets[kind as keyof typeof p.assets]))) return false
  if (!isRecord(w) || !Number.isFinite(w.day) || !Number.isFinite(w.hour)) return false
  if (!Array.isArray(state.npcs) || !state.npcs.every(npc => isRecord(npc) && typeof npc.id === 'string' && typeof npc.name === 'string')) return false
  return Array.isArray(state.log)
}
