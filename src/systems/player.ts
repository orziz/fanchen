import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import {
  RANKS, MODE_OPTIONS, ACTION_META, PROPERTY_DEFS,
  LOCATION_MAP, canUseItemDirectly, getItem, getItemUsageSummary,
  getBreakthroughDisabledReason,
  getBreakthroughReadyNeed,
} from '@/config'
import { clamp, round, sample, uid } from '@/utils'
import type { AssetState } from '@/types/game'
import { getKnowledgeLearnIssues, learnKnowledge } from './knowledge'
import { gainHeartMasteryFromAction, getTechniqueLearnIssues, learnTechnique } from './techniques'

const ASSET_EFFECT_KIND_MAP: Record<string, string> = { assetFarm: 'farm', assetWorkshop: 'workshop', assetShop: 'shop' }
const ASSET_KIND_LABELS: Record<string, string> = { farm: '田产', workshop: '工坊', shop: '铺面' }

function applyItemEffect(effect: Record<string, number>) {
  const ctx = getContext()
  const player = ctx.game.player
  if (effect.hp) ctx.adjustResource('hp', effect.hp, 'maxHp')
  if (effect.qi) ctx.adjustResource('qi', effect.qi, 'maxQi')
  if (effect.stamina) ctx.adjustResource('stamina', effect.stamina, 'maxStamina')
  if (effect.reputation) player.reputation = round(player.reputation + effect.reputation, 4)
  if (effect.breakthrough) player.breakthrough = round(player.breakthrough + effect.breakthrough, 4)
  if (effect.power) player.power = round(player.power + effect.power, 4)
  if (effect.insight) player.insight = round(player.insight + effect.insight, 4)
  if (effect.charisma) player.charisma = round(player.charisma + effect.charisma, 4)
  if (effect.farming) player.skills.farming = round(player.skills.farming + effect.farming, 4)
  if (effect.crafting) player.skills.crafting = round(player.skills.crafting + effect.crafting, 4)
  if (effect.trading) player.skills.trading = round(player.skills.trading + effect.trading, 4)
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

export function setMode(modeId: string) {
  const ctx = getContext()
  if (!MODE_OPTIONS.find(m => m.id === modeId)) return
  ctx.game.player.mode = modeId
  bus.emit('state:player-mode', { mode: modeId })
  ctx.appendLog(`挂机模式切换为"${MODE_OPTIONS.find(m => m.id === modeId)?.label || modeId}"。`, 'info')
}

export function checkRankGrowth() {
  getContext().updateDerivedStats()
}

export function attemptBreakthrough(): boolean {
  const ctx = getContext()
  const p = ctx.game.player
  const nextRankIndex = p.rankIndex + 1
  if (nextRankIndex >= RANKS.length) { ctx.appendLog('你已站在当前境界的极处，只能继续温养根基。', 'info'); return false }
  const need = ctx.getNextBreakthroughNeed()
  const location = ctx.getCurrentLocation()
  if (p.breakthrough < getBreakthroughReadyNeed(need)) {
    ctx.appendLog(getBreakthroughDisabledReason({
      hasNextRank: true,
      nextBreakthroughNeed: need,
      cultivation: p.cultivation,
      breakthrough: p.breakthrough,
      rankIndex: p.rankIndex,
      aura: location.aura,
    }), 'warn')
    return false
  }
  const successRate = clamp(p.breakthroughRate + location.aura / 520 + ctx.getPlayerInsight() / 760 + p.breakthrough / (need * 2.8), 0.1, 0.62)
  if (Math.random() < successRate) {
    p.rankIndex = nextRankIndex; p.breakthrough = round(Math.max(0, p.breakthrough - need * 0.7), 4)
    p.reputation = round(p.reputation + 2 + nextRankIndex * 2, 4); p.title = `${RANKS[nextRankIndex].name}境修士`
    ctx.appendLog(`灵机贯体，你成功踏入${RANKS[nextRankIndex].name}境。`, 'loot')
    ctx.updateDerivedStats()
    ctx.adjustResource('hp', p.maxHp, 'maxHp'); ctx.adjustResource('qi', p.maxQi, 'maxQi'); ctx.adjustResource('stamina', p.maxStamina, 'maxStamina')
    return true
  }
  p.breakthrough = round(p.breakthrough * 0.68, 4); ctx.adjustResource('hp', -12, 'maxHp'); ctx.adjustResource('qi', -16, 'maxQi')
  ctx.appendLog('冲关受挫，经脉震荡，需要重新稳固根基。', 'warn')
  return false
}

export function consumeItem(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  const item = getItem(itemId)
  if (!item) return
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
  if (!p.sect) { ctx.appendLog('你尚未建立宗门，无法入藏功法。', 'warn'); return }
  const item = getItem(itemId)
  const skillId = item?.manualSkillId
  if (!item || item.type !== 'manual' || !skillId) return
  if (p.sect.skillLibrary.includes(skillId)) { ctx.appendLog('宗门藏经阁中已有这门功法。', 'warn'); return }
  if (!ctx.removeItemFromInventory(itemId, 1)) return
  p.sect.skillLibrary.push(skillId)
  ctx.appendLog(`${item.name}已收入宗门藏经阁，可供后续传功。`, 'info')
}

export function sellItem(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  const entry = ctx.findInventoryEntry(itemId)
  const item = getItem(itemId)
  if (!entry || !item) return
  const location = ctx.getCurrentLocation()
  const price = Math.round(item.baseValue * (location.marketBias === item.type ? 0.96 : 0.72))
  ctx.removeItemFromInventory(itemId, 1)
  p.money += price; p.stats.tradesCompleted += 1
  ctx.adjustRegionStanding(location.id, 0.4)
  ctx.appendLog(`你将${item.name}出售给${location.name}商人，获得${price}灵石。`, 'info')
}

export function revivePlayer() {
  const ctx = getContext()
  const p = ctx.game.player
  p.hp = Math.round(p.maxHp * 0.64); p.qi = Math.round(p.maxQi * 0.58); p.stamina = Math.round(p.maxStamina * 0.7)
  p.money = Math.max(0, p.money - 48)
  ctx.appendLog('你在濒危中被路人救下，损失部分灵石后重整旗鼓。', 'warn')
}

export function applyPassiveAction(actionKey: string) {
  const ctx = getContext()
  const p = ctx.game.player
  const action = ACTION_META[actionKey]
  if (!action) return
  p.action = actionKey
  const costMultiplier = 1 + ctx.getCurrentLocation().danger * 0.03
  const cultivationBoost = 1 + (p.cultivationBonus || 0) + ctx.getCurrentLocation().aura / 520
  if (action.cost.stamina) ctx.adjustResource('stamina', -action.cost.stamina * costMultiplier, 'maxStamina')
  if (action.cost.qi) ctx.adjustResource('qi', -action.cost.qi * costMultiplier, 'maxQi')
  if (p.stamina <= 5) {
    ctx.adjustResource('stamina', 12, 'maxStamina'); ctx.adjustResource('qi', 6, 'maxQi')
    ctx.appendLog('你感到疲惫，于是短暂歇息恢复精力。', 'info'); return
  }
  if (action.reward.cultivation) p.cultivation = round(p.cultivation + action.reward.cultivation * cultivationBoost, 4)
  if (action.reward.qi) ctx.adjustResource('qi', action.reward.qi, 'maxQi')
  if (action.reward.hp) ctx.adjustResource('hp', action.reward.hp, 'maxHp')
  if (action.reward.money) p.money += Math.round(action.reward.money * (1 + p.reputation / 220))
  if (action.reward.reputation) p.reputation = round(p.reputation + action.reward.reputation, 4)
  if (action.reward.breakthrough) p.breakthrough = round(p.breakthrough + action.reward.breakthrough * (1 + ctx.getPlayerInsight() / 420), 4)
  if (action.reward.power) p.power = round(p.power + action.reward.power * 0.08, 4)
  if (action.reward.market) p.stats.tradesCompleted += 1
  if (actionKey === 'meditate') { p.stats.meditationSessions += 1; ctx.adjustResource('hp', 1.5, 'maxHp') }
  if (actionKey === 'train') p.insight = round(p.insight + 0.05, 4)
  gainHeartMasteryFromAction(actionKey)
  checkRankGrowth()
}
