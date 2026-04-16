import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import {
  RANKS, MODE_OPTIONS, ACTION_META, ITEMS, PROPERTY_DEFS, SECT_BUILDINGS,
  LOCATION_MAP, getItem,
} from '@/config'
import { clamp, round, sample, uid } from '@/utils'
import type { AssetState } from '@/types/game'

const ASSET_EFFECT_KIND_MAP: Record<string, string> = { assetFarm: 'farm', assetWorkshop: 'workshop', assetShop: 'shop' }
const ASSET_KIND_LABELS: Record<string, string> = { farm: '田产', workshop: '工坊', shop: '铺面' }

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

export function maybeLearnFromManual() {
  const ctx = getContext()
  const manualId = ctx.game.player.equipment.manual
  if (!manualId) return
  const manual = getItem(manualId)
  if (!manual) return
  if (Math.random() < 0.08) ctx.game.player.insight += (manual.effect.insight || 2) * 0.05
}

export function checkRankGrowth() {
  const ctx = getContext()
  const p = ctx.game.player
  const nextRank = RANKS[p.rankIndex + 1]
  if (nextRank && p.cultivation >= nextRank.need * 0.78) {
    p.breakthrough = Math.max(p.breakthrough, nextRank.need * 0.24)
  }
  ctx.updateDerivedStats()
}

export function attemptBreakthrough(): boolean {
  const ctx = getContext()
  const p = ctx.game.player
  const nextRankIndex = p.rankIndex + 1
  if (nextRankIndex >= RANKS.length) { ctx.appendLog('你已站在当前境界的极处，只能继续温养根基。', 'info'); return false }
  const need = ctx.getNextBreakthroughNeed()
  if (p.breakthrough < need * 0.85) { ctx.appendLog('火候仍欠，贸然冲关只会徒耗真气。', 'warn'); return false }
  const location = ctx.getCurrentLocation()
  const successRate = clamp(p.breakthroughRate + location.aura / 520 + ctx.getPlayerInsight() / 760 + p.breakthrough / (need * 2.8), 0.1, 0.62)
  if (Math.random() < successRate) {
    p.rankIndex = nextRankIndex; p.breakthrough = Math.max(0, p.breakthrough - need * 0.7)
    p.reputation += 2 + nextRankIndex * 2; p.title = `${RANKS[nextRankIndex].name}境修士`
    ctx.appendLog(`灵机贯体，你成功踏入${RANKS[nextRankIndex].name}境。`, 'loot')
    ctx.updateDerivedStats()
    ctx.adjustResource('hp', p.maxHp, 'maxHp'); ctx.adjustResource('qi', p.maxQi, 'maxQi'); ctx.adjustResource('stamina', p.maxStamina, 'maxStamina')
    return true
  }
  p.breakthrough *= 0.68; ctx.adjustResource('hp', -12, 'maxHp'); ctx.adjustResource('qi', -16, 'maxQi')
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
    if (!ctx.removeItemFromInventory(itemId, 1)) return
    if (p.equipment.manual) ctx.addItemToInventory(p.equipment.manual, 1)
    p.equipment.manual = item.id
    ctx.appendLog(`你开始参悟${item.name}。`, 'info')
  } else {
    const assetClaim = claimAssetFromItem(item)
    if (assetClaim.handled) { ctx.appendLog(assetClaim.message!, assetClaim.success ? 'loot' : 'warn'); ctx.updateDerivedStats(); return }
    if (!ctx.removeItemFromInventory(itemId, 1)) return
    if (item.effect.hp) ctx.adjustResource('hp', item.effect.hp, 'maxHp')
    if (item.effect.qi) ctx.adjustResource('qi', item.effect.qi, 'maxQi')
    if (item.effect.stamina) ctx.adjustResource('stamina', item.effect.stamina, 'maxStamina')
    if (item.effect.reputation) p.reputation += item.effect.reputation
    if (item.effect.breakthrough) p.breakthrough += item.effect.breakthrough
    if (item.effect.power) p.power += item.effect.power
    if (item.effect.insight) p.insight += item.effect.insight
    if (item.effect.charisma) p.charisma += item.effect.charisma
    ctx.appendLog(`你使用了${item.name}。`, 'info')
  }
  ctx.updateDerivedStats()
}

export function stashManualToSect(itemId: string) {
  const ctx = getContext()
  const p = ctx.game.player
  if (!p.sect) { ctx.appendLog('你尚未建立宗门，无法入藏功法。', 'warn'); return }
  const item = getItem(itemId)
  if (!item || item.type !== 'manual') return
  if (!ctx.removeItemFromInventory(itemId, 1)) return
  p.sect.manualLibrary.push(itemId)
  ctx.appendLog(`${item.name}已收入宗门藏经阁。`, 'info')
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
  if (action.reward.cultivation) p.cultivation += action.reward.cultivation * cultivationBoost
  if (action.reward.qi) ctx.adjustResource('qi', action.reward.qi, 'maxQi')
  if (action.reward.hp) ctx.adjustResource('hp', action.reward.hp, 'maxHp')
  if (action.reward.money) p.money += Math.round(action.reward.money * (1 + p.reputation / 220))
  if (action.reward.reputation) p.reputation += round(action.reward.reputation, 1)
  if (action.reward.breakthrough) p.breakthrough += action.reward.breakthrough * (1 + ctx.getPlayerInsight() / 420)
  if (action.reward.power) p.power += action.reward.power * 0.08
  if (action.reward.market) p.stats.tradesCompleted += 1
  if (actionKey === 'meditate') { p.stats.meditationSessions += 1; ctx.adjustResource('hp', 1.5, 'maxHp') }
  if (actionKey === 'train') p.insight += 0.05
  maybeLearnFromManual()
  checkRankGrowth()
}
