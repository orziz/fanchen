import type { ItemData, ManualCategory } from '../../config/items'

export type ItemBucket = 'materials' | 'equipment' | 'utility' | 'technique'

export interface EditableItem extends ItemData {
  bucket: ItemBucket
}

function escapeString(value: string) {
  return JSON.stringify(value)
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(4)))
}

function formatObjectKey(key: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : escapeString(key)
}

function formatEffect(effect: Record<string, number>) {
  const entries = Object.entries(effect)
  if (!entries.length) return '{}'
  return `{ ${entries.map(([key, value]) => `${formatObjectKey(key)}: ${formatNumber(value)}`).join(', ')} }`
}

function formatItem(item: EditableItem) {
  const fields = [
    `id: ${escapeString(item.id)}`,
    `name: ${escapeString(item.name)}`,
    `type: ${escapeString(item.type)}`,
    `rarity: ${escapeString(item.rarity)}`,
    `tier: ${formatNumber(item.tier)}`,
    `minRankIndex: ${formatNumber(item.minRankIndex)}`,
    `baseValue: ${formatNumber(item.baseValue)}`,
    `desc: ${escapeString(item.desc)}`,
    `effect: ${formatEffect(item.effect)}`,
  ]

  if (item.manualSkillId) fields.push(`manualSkillId: ${escapeString(item.manualSkillId)}`)
  if (item.knowledgeId) fields.push(`knowledgeId: ${escapeString(item.knowledgeId)}`)
  if (item.manualCategory) fields.push(`manualCategory: ${escapeString(item.manualCategory)}`)
  if (item.discoverOnly) fields.push('discoverOnly: true')
  if (item.directUse) fields.push('directUse: true')

  return `  { ${fields.join(', ')} },`
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeEffect(effect: Record<string, number>) {
  const normalizedEntries = Object.entries(effect || {})
    .map(([key, value]) => [key.trim(), toSafeNumber(value, Number.NaN)] as const)
    .filter(([key, value]) => key && Number.isFinite(value))

  return Object.fromEntries(normalizedEntries)
}

export function normalizeEditableItems(items: EditableItem[]) {
  const usedIds = new Set<string>()
  const normalized: EditableItem[] = []

  items.forEach((item) => {
    const id = item.id.trim()
    if (!id || usedIds.has(id)) return
    usedIds.add(id)

    normalized.push({
      ...item,
      id,
      name: item.name.trim(),
      type: item.type.trim(),
      rarity: item.rarity.trim(),
      tier: Math.max(0, Math.round(toSafeNumber(item.tier))),
      minRankIndex: Math.max(0, Math.round(toSafeNumber(item.minRankIndex))),
      baseValue: Math.max(0, Math.round(toSafeNumber(item.baseValue))),
      desc: item.desc.trim(),
      effect: normalizeEffect(item.effect),
      manualSkillId: item.manualSkillId?.trim() || undefined,
      knowledgeId: item.knowledgeId?.trim() || undefined,
      manualCategory: (item.manualCategory?.trim() || undefined) as ManualCategory | undefined,
      bucket: item.bucket,
      directUse: Boolean(item.directUse),
      discoverOnly: Boolean(item.discoverOnly),
    })
  })

  return normalized
}

function formatBucket(items: EditableItem[]) {
  if (!items.length) return '[]'
  return `[\n${items.map((item) => formatItem(item)).join('\n')}\n]`
}

export function serializeItemFile(items: EditableItem[]) {
  const normalized = normalizeEditableItems(items)
  const groups: Record<ItemBucket, EditableItem[]> = {
    materials: [],
    equipment: [],
    utility: [],
    technique: [],
  }

  normalized.forEach((item) => {
    groups[item.bucket].push(item)
  })

  return `import { KNOWLEDGE_ENTRIES } from './knowledge'

export type ManualCategory = 'heart' | 'spell' | 'knowledge'

export interface ItemData {
  id: string
  /** 名称 */
  name: string
  /** 类型 */
  type: string
  /** 稀有度 */
  rarity: string
  /** 品阶 */
  tier: number
  /** 最低可用等级索引 */
  minRankIndex: number
  /** 基础价值 */
  baseValue: number
  /** 描述 */
  desc: string
  /** 效果 */
  effect: Record<string, number>
  /** 手动技能ID */
  manualSkillId?: string
  /** 知识ID */
  knowledgeId?: string
  /** 手册分类 */
  manualCategory?: ManualCategory
  /** 仅可发现 */
  discoverOnly?: boolean
  /** 可直接使用 */
  directUse?: boolean
}

export const MATERIAL_RESOURCE_ITEMS: ItemData[] = ${formatBucket(groups.materials)}

export const EQUIPMENT_ITEMS: ItemData[] = ${formatBucket(groups.equipment)}

export const UTILITY_ITEMS: ItemData[] = ${formatBucket(groups.utility)}

export const TECHNIQUE_MANUAL_ITEMS: ItemData[] = ${formatBucket(groups.technique)}

export const KNOWLEDGE_MANUAL_ITEMS: ItemData[] = KNOWLEDGE_ENTRIES.map((knowledge) => ({
  id: knowledge.itemId,
  name: knowledge.name,
  type: 'manual',
  manualCategory: 'knowledge',
  rarity: knowledge.rarity,
  tier: knowledge.tier,
  minRankIndex: knowledge.minRankIndex,
  baseValue: knowledge.baseValue,
  desc: knowledge.desc,
  effect: knowledge.effect,
  knowledgeId: knowledge.id,
}))

export const ITEMS: ItemData[] = [
  ...MATERIAL_RESOURCE_ITEMS,
  ...EQUIPMENT_ITEMS,
  ...UTILITY_ITEMS,
  ...TECHNIQUE_MANUAL_ITEMS,
  ...KNOWLEDGE_MANUAL_ITEMS,
]

export const ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]))
export const DISTRIBUTABLE_ITEMS = ITEMS.filter((item) => !item.discoverOnly)
export const MANUAL_ITEM_MAP = new Map(
  ITEMS.filter((item) => item.manualSkillId).map((item) => [item.manualSkillId as string, item]),
)
export const KNOWLEDGE_ITEM_MAP = new Map(
  ITEMS.filter((item) => item.knowledgeId).map((item) => [item.knowledgeId as string, item]),
)

export function getItem(itemId: string): ItemData | undefined {
  return ITEM_MAP.get(itemId)
}

export function getManualItemBySkillId(skillId: string): ItemData | undefined {
  return MANUAL_ITEM_MAP.get(skillId)
}

export function getKnowledgeItemById(knowledgeId: string): ItemData | undefined {
  return KNOWLEDGE_ITEM_MAP.get(knowledgeId)
}

export function hasAssetClaimEffect(item: Pick<ItemData, 'effect'> | null | undefined) {
  if (!item) return false
  return Boolean(item.effect.assetFarm || item.effect.assetWorkshop || item.effect.assetShop)
}

export function canUseItemDirectly(item: ItemData | null | undefined) {
  if (!item) return false
  if (item.type === 'weapon' || item.type === 'armor' || item.type === 'manual') return true
  if (hasAssetClaimEffect(item)) return true
  return Boolean(item.directUse)
}

export function getItemUsageSummary(item: ItemData | null | undefined) {
  if (!item) return '当前没有直接使用效果'
  if (item.type === 'weapon' || item.type === 'armor') return '可直接装备'
  if (item.type === 'manual') {
    if (item.manualCategory === 'knowledge') return '用于研读学识札记'
    return '用于学习功法秘籍'
  }
  if (item.effect.assetFarm) return '可在合适地点落成田产'
  if (item.effect.assetWorkshop) return '可在城镇落成工坊'
  if (item.effect.assetShop) return '可在城镇落成铺面'
  if (item.directUse) {
    if (item.type === 'tool') return '可直接启用'
    return '可直接服用'
  }
  switch (item.type) {
    case 'paper':
      return '用于誊写秘籍与学识札记'
    case 'ink':
      return '用于誊写秘籍'
    case 'seed':
      return '用于田产种植'
    case 'wood':
    case 'ore':
    case 'cloth':
    case 'leather':
      return '用于制造、装订或经营'
    case 'herb':
    case 'grain':
      return '用于补给或制造'
    case 'relic':
    case 'ice':
    case 'fire':
    case 'scroll':
      return '用于高阶交易、悟道或配方'
    case 'sect':
      return '用于宗门相关玩法'
    case 'token':
      return '用于人情、关系或特殊剧情'
    case 'tool':
      return '用于探索或特定功能'
    default:
      return '当前没有直接使用效果'
  }
}
`
}