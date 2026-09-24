import type { GameState } from '@/types/game'
import { RANKS } from '@/config'
import { ORIGIN_MAP } from '@/config/origins'
import { createGameState } from '@/stores/game/factories'

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

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const allFinite = (value: unknown) => isRecord(value) && Object.values(value).every(entry => Number.isFinite(entry))
const everyEntry = (list: unknown, check: (entry: Record<string, unknown>) => boolean) => Array.isArray(list) && list.every(entry => isRecord(entry) && check(entry))
const everyRecord = (dict: unknown) => isRecord(dict) && Object.values(dict).every(isRecord)

/**
 * 与新档同名的字段一旦出现，类型就得对得上：数字要是有限数、对象不能是数组或空值；
 * 新档里可为空的位放宽，只拒绝数组。只看这一层，缺的字段由水合补齐。
 */
function fieldsConform(value: unknown, template: unknown) {
  if (!isRecord(value) || !isRecord(template)) return false
  return Object.keys(template).every(key => {
    const expected = template[key]
    const actual = value[key]
    if (actual === undefined) return true
    if (expected === null) return !Array.isArray(actual)
    if (Array.isArray(expected)) return Array.isArray(actual)
    if (typeof expected === 'number') return Number.isFinite(actual)
    if (isRecord(expected)) return isRecord(actual)
    return typeof actual === typeof expected
  })
}

/**
 * 水合只按字段合并、不管类型，导入的文件还要再过一道形状关：各块字段的类型要与新档一致，
 * 界面会逐条读取的集合（纪事、群像、行囊、产业、人情、功法、地盘、市集）里每一项也得读得动。
 */
export function isPlayableSave(state: GameState, template: GameState = createGameState()) {
  if (!fieldsConform(state, template)) return false
  if ((['player', 'world', 'combat', 'story'] as const).some(section => !fieldsConform(state[section], template[section]))) return false
  const p = state.player
  if (!p.name.trim() || !Number.isInteger(p.rankIndex) || p.rankIndex < 0 || p.rankIndex >= RANKS.length) return false
  if (!allFinite(p.skills) || !allFinite(p.stats)) return false
  if (!everyEntry(p.inventory, entry => typeof entry.itemId === 'string' && Number.isFinite(entry.quantity))) return false
  if (!['farms', 'workshops', 'shops'].every(kind => everyEntry((p.assets as unknown as Record<string, unknown>)[kind], asset => typeof asset.id === 'string'))) return false
  if (![p.relations, p.learnedTechniques, state.world.territories, state.world.factions].every(everyRecord)) return false
  if (!isRecord(state.market) || !Object.values(state.market).every(Array.isArray)) return false
  if (!everyEntry(state.log, entry => typeof entry.text === 'string' && typeof entry.type === 'string')) return false
  return everyEntry(state.npcs, npc => typeof npc.id === 'string' && typeof npc.name === 'string' && typeof npc.locationId === 'string' && Number.isFinite(npc.rankIndex))
}
