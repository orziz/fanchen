import { getContext } from '@/core/context'
import { MAX_INJURY } from '@/config/life'
import { bus } from '@/core/events'
import {
  RANKS, MODE_OPTIONS, ACTION_META, PROPERTY_DEFS,
  LOCATION_MAP, canUseItemDirectly, getItem, getItemUsageSummary,
  PLAYER_SECT_ENABLED,
  PLAYER_SECT_FROZEN_TEXT,
  getBreakthroughDisabledReason,
} from '@/config'
import { addPlayerMetric, addPlayerSkill } from '@/core/integerProgress'
import { clamp, round, sample, uid } from '@/utils'
import type { AssetState } from '@/types/game'
import { getKnowledgeLearnIssues, learnKnowledge } from '@/systems/knowledge'
import { gainHeartMasteryFromAction, getTechniqueLearnIssues, learnTechnique } from '@/systems/techniques'

const ASSET_EFFECT_KIND_MAP: Record<string, string> = { assetFarm: 'farm', assetWorkshop: 'workshop', assetShop: 'shop' }
const ASSET_KIND_LABELS: Record<string, string> = { farm: '田产', workshop: '工坊', shop: '铺面' }

function applyItemEffect(effect: Record<string, number>) {
  const ctx = getContext()
  if (effect.hp) ctx.adjustResource('hp', effect.hp, 'maxHp')
  if (effect.qi) ctx.adjustResource('qi', effect.qi, 'maxQi')
  if (effect.stamina) ctx.adjustResource('stamina', effect.stamina, 'maxStamina')
  if (effect.reputation) addPlayerMetric('reputation', effect.reputation)
  if (effect.breakthrough) addPlayerMetric('breakthrough', effect.breakthrough)
  if (effect.power) addPlayerMetric('power', effect.power)
  if (effect.insight) addPlayerMetric('insight', effect.insight)
  if (effect.charisma) addPlayerMetric('charisma', effect.charisma)
  if (effect.farming) addPlayerSkill('farming', effect.farming)
  if (effect.crafting) addPlayerSkill('crafting', effect.crafting)
  if (effect.trading) addPlayerSkill('trading', effect.trading)
}

function getAssetCollection(kind: string): AssetState[] {
  const ctx = getContext()
  return ctx.game.player.assets[`${kind}s` as keyof typeof ctx.game.player.assets] as AssetState[]
}

function getLocalPropertyForAssetKind(kind: string) {
  const ctx = getContext()
  const current = ctx.getCurrentLocation()
  return PROPERTY_DEFS
    .filter(p => p.kind === kind && p.locationTags?.some(tag => current.tags.includes(tag)))
    .sort((a, b) => (a.cost || 0) - (b.cost || 0))[0] || null
}

function claimAssetFromItem(item: ReturnType<typeof getItem>) {
  if (!item) return { handled: false }
  const ctx = getContext()
  const effectEntry = Object.entries(ASSET_EFFECT_KIND_MAP).find(([ek]) => item.effect?.[ek])
  if (!effectEntry) return { handled: false }
  const [effectKey, kind] = effectEntry
  const amount = Math.max(1, Math.floor(item.effect[effectKey] || 0))
  const property = getLocalPropertyForAssetKind(kind)
  if (!property) return { handled: true, success: false, message: `这里暂时不能把${item.name}落成${ASSET_KIND_LABELS[kind] || '资产'}，换到合适地点再用。` }
  if (!ctx.removeItemFromInventory(item.id, 1)) return { handled: true, success: false, message: `你手头已经没有${item.name}了。` }
  const current = ctx.getCurrentLocation()
  const collection = getAssetCollection(kind)
  const created: string[] = []
  for (let i = 0; i < amount; i++) {
    const asset: AssetState = {
      id: uid(kind), propertyId: property.id, locationId: current.id, kind, label: amount > 1 ? `${property.label}·${collection.length + 1}` : property.label,
      cropId: null, daysRemaining: 0, stock: 0, pendingIncome: 0, level: 1, managerNpcId: null, automationTargetId: null,
    }
    collection.push(asset)
    created.push(asset.label)
  }
  bus.emit('state:assets-changed', { kind })
  return { handled: true, success: true, message: `${item.name}兑成了${created.join('、')}，已经记在你名下。` }
}

export function checkRankGrowth() {
  getContext().updateDerivedStats()
}

export function consumeItem(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  const item = getItem(itemId)
  if (!item) return
  if ((item.type === 'weapon' || item.type === 'armor') && item.minRankIndex > p.rankIndex) {
    ctx.appendLog(`${item.name}需${RANKS[Math.min(item.minRankIndex, RANKS.length - 1)].name}以上的根基才驾驭得住。`, 'warn')
    return
  }
  if (item.type === 'weapon') {
    if (!ctx.removeItemFromInventory(itemId, 1)) return
    if (p.equipment.weapon) ctx.addItemToInventory(p.equipment.weapon, 1)
    p.equipment.weapon = item.id
    ctx.appendLog(`你装备了${item.name}。`, 'info')
  } else if (item.type === 'armor') {
    if (!ctx.removeItemFromInventory(itemId, 1)) return
    if (p.equipment.armor) ctx.addItemToInventory(p.equipment.armor, 1)
    p.equipment.armor = item.id
    ctx.appendLog(`你换上了${item.name}。`, 'info')
  } else if (item.type === 'manual') {
    const skillId = item.manualSkillId
    if (skillId) {
      const issues = getTechniqueLearnIssues(skillId)
      if (issues.length) { ctx.appendLog(issues[0], 'warn'); return }
      if (!ctx.removeItemFromInventory(itemId, 1)) return
      learnTechnique(skillId, { sourceText: item.name })
    } else if (item.knowledgeId) {
      const issues = getKnowledgeLearnIssues(item.knowledgeId)
      if (issues.length) { ctx.appendLog(issues[0], 'warn'); return }
      if (!ctx.removeItemFromInventory(itemId, 1)) return
      learnKnowledge(item.knowledgeId, { sourceText: item.name })
    } else {
      ctx.appendLog('这册秘籍暂时无法识别对应内容。', 'warn')
      return
    }
  } else {
    const assetClaim = claimAssetFromItem(item)
    if (assetClaim.handled) { ctx.appendLog(assetClaim.message!, assetClaim.success ? 'loot' : 'warn'); ctx.updateDerivedStats(); return }
    if (!canUseItemDirectly(item)) {
      ctx.appendLog(`${item.name}当前不能直接使用；${getItemUsageSummary(item)}。`, 'warn')
      return
    }
    if (!ctx.removeItemFromInventory(itemId, 1)) return
    applyItemEffect(item.effect)
    ctx.appendLog(`你使用了${item.name}。`, 'info')
  }
  ctx.updateDerivedStats()
}

export function stashManualToSect(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  if (!PLAYER_SECT_ENABLED) { ctx.appendLog(PLAYER_SECT_FROZEN_TEXT, 'warn'); return }
  if (!p.sect) { ctx.appendLog('你尚未建立宗门，无法入藏功法。', 'warn'); return }
  const item = getItem(itemId)
  const skillId = item?.manualSkillId
  if (!item || item.type !== 'manual' || !skillId) return
  if (p.sect.skillLibrary.includes(skillId)) { ctx.appendLog('宗门藏经阁中已有这门功法。', 'warn'); return }
  if (!ctx.removeItemFromInventory(itemId, 1)) return
  p.sect.skillLibrary.push(skillId)
  ctx.appendLog(`${item.name}已收入宗门藏经阁，可供后续传功。`, 'info')
}

/** 就地出售一件物品能换得的灵石：当地偏好此类货时收价更高。 */
export function getItemSellPrice(itemId: string) {
  const item = getItem(itemId)
  if (!item) return 0
  const location = getContext().getCurrentLocation()
  return Math.round(item.baseValue * (location.marketBias === item.type ? 0.96 : 0.72))
}

export function sellItem(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  const entry = ctx.findInventoryEntry(itemId)
  const item = getItem(itemId)
  if (!entry || !item) return
  const location = ctx.getCurrentLocation()
  const price = getItemSellPrice(itemId)
  ctx.removeItemFromInventory(itemId, 1)
  p.money += price; p.stats.tradesCompleted += 1
  ctx.adjustRegionStanding(location.id, 0.4)
  ctx.appendLog(`你将${item.name}出售给${location.name}商人，获得${price}灵石。`, 'info')
}

/** 打输了不会死：被人救下或自己爬起来，带一级伤，身上的钱也丢一成。 */
export function revivePlayer() {
  const ctx = getContext()
  const p = ctx.game.player
  p.injury = Math.min(MAX_INJURY, (p.injury || 0) + 1)
  ctx.updateDerivedStats()
  p.hp = Math.max(1, Math.round(p.maxHp * 0.35)); p.qi = Math.round(p.maxQi * 0.5)
  const lost = Math.floor(p.money * 0.1)
  p.money -= lost
  ctx.appendLog(lost ? `你被打得爬不起来，好不容易捡回一条命，身上丢了${lost}灵石，还带了伤。` : '你被打得爬不起来，好不容易捡回一条命，还带了伤。', 'warn')
}

