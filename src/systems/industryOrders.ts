/**
 * 行会订单：按各地商气、缺口与地盘安危派生当日订单，交付后回写本地经济。
 */
import { getContext } from '@/core/context'
import { addPlayerMetric } from '@/core/integerProgress'
import { LOCATION_MAP, FACTION_MAP, getItem, type LocationData } from '@/config'
import { uid, clamp, round } from '@/utils'
import { isTradeHubLocation, adjustFactionStanding, getTerritorySecurity } from '@/systems/social'
import { getLocationEconomyOverview, recordContractDelivery } from '@/systems/worldEconomy'

const ORDER_ITEM_BY_BIAS: Record<string, string> = {
  grain: 'spirit-grain',
  herb: 'mist-herb',
  wood: 'timber',
  ore: 'scrap-iron',
  cloth: 'cloth-roll',
  pill: 'herb-paste',
  relic: 'cloth-roll',
  fire: 'scrap-iron',
  ice: 'mist-herb',
  scroll: 'cloth-roll',
}

type DynamicOrderSeed = {
  templateId: string
  locationId: string
  sourceKind: string
  title: string
  desc: string
  factionId: string
  factionName: string
  requirements: { itemId: string; quantity: number }[]
  rewardMoney: number
  rewardReputation: number
  standing: number
  score: number
}

function getOrderCargoItems(location: LocationData, kind: string) {
  const fallback = ORDER_ITEM_BY_BIAS[location.marketBias] || 'spirit-grain'
  if (kind === 'security') {
    if (location.tags.includes('forge') || location.tags.includes('pass')) return ['wood-spear', 'spirit-grain']
    if (location.tags.includes('sect') || location.tags.includes('cultivation')) return ['herb-paste', 'mist-herb']
    return ['cloth-roll', 'spirit-grain']
  }
  if (kind === 'turnover') {
    if (location.tags.includes('port') || location.tags.includes('market')) return ['cloth-roll', 'spirit-grain']
    if (location.tags.includes('forge')) return ['scrap-iron', 'timber']
    if (location.tags.includes('sect') || location.tags.includes('cultivation')) return ['mist-herb', 'herb-paste']
    return [fallback, fallback === 'cloth-roll' ? 'spirit-grain' : 'cloth-roll']
  }
  if (location.tags.includes('forge')) return [fallback, 'timber']
  if (location.tags.includes('sect') || location.tags.includes('cultivation')) return [fallback, 'mist-herb']
  if (location.tags.includes('port') || location.tags.includes('court')) return [fallback, 'cloth-roll']
  return [fallback, fallback === 'spirit-grain' ? 'cloth-roll' : 'spirit-grain']
}

function buildOrderRequirements(location: LocationData, kind: string, gap: number, tradeHeat: number) {
  const itemIds = [...new Set(getOrderCargoItems(location, kind))]
  const baseQuantity = kind === 'shortage'
    ? clamp(2 + Math.floor(Math.max(gap, 0) / 18), 2, 4)
    : kind === 'security'
      ? 2
      : clamp(2 + Math.floor(Math.max(tradeHeat - 30, 0) / 30), 2, 3)

  return itemIds.map((itemId, index) => {
    const item = getItem(itemId)
    const quantity = item?.type === 'weapon'
      ? 1
      : clamp(baseQuantity - index + Number(kind === 'shortage' && gap >= 24 && index === 0), 1, itemId === 'herb-paste' ? 2 : 4)
    return { itemId, quantity }
  })
}

function buildIndustryOrderSeed(location: LocationData): DynamicOrderSeed | null {
  const faction = FACTION_MAP.get(location.factionIds[0] || '')
  if (!faction) return null
  const overview = getLocationEconomyOverview(location.id)
  const security = getTerritorySecurity(location.id)
  const gap = overview.needPressure - overview.localSupply
  const pressure = Math.max(gap, overview.needPressure - 42)
  const traffic = overview.tradeHeat + overview.prosperity - Math.max(0, 55 - security)

  if (pressure < 10 && traffic < 52 && security >= 66) return null

  const kind = overview.tradeHeat >= 62 && security < 58
    ? 'security'
    : pressure >= 16 || overview.needPressure >= 60
      ? 'shortage'
      : 'turnover'
  const requirements = buildOrderRequirements(location, kind, gap, overview.tradeHeat)
  const goodsValue = requirements.reduce((sum, requirement) => sum + (getItem(requirement.itemId)?.baseValue || 18) * requirement.quantity, 0)
  const rewardMoney = Math.max(
    48,
    Math.round(goodsValue * (kind === 'security' ? 1.45 : kind === 'shortage' ? 1.35 : 1.28) + (location.marketTier || 0) * 18 + Math.max(0, gap) * 1.8 + Math.max(0, 56 - security)),
  )

  return {
    templateId: `dynamic-${location.id}-${kind}`,
    locationId: location.id,
    sourceKind: kind,
    title: kind === 'security'
      ? `${location.name}护路备械单`
      : kind === 'shortage'
        ? `${location.name}急补催交单`
        : `${location.name}转运滚货单`,
    desc: kind === 'security'
      ? `${location.name}近来${security < 46 ? '街面不稳' : '沿路紧张'}，${overview.heatLabel}。${faction.name}正在收备路货。`
      : kind === 'shortage'
        ? `${location.name}${overview.needLabel}，${overview.supplyLabel}。${faction.name}急着补库稳住周转。`
        : `${location.name}${overview.heatLabel}，${overview.prosperityLabel}。${faction.name}想趁市面热时把货路滚起来。`,
    factionId: faction.id,
    factionName: faction.name,
    requirements,
    rewardMoney,
    rewardReputation: kind === 'security' || overview.needPressure >= 68 || overview.tradeHeat >= 72 ? 2 : 1,
    standing: clamp(2 + (kind === 'security' ? 2 : 1) + Number((location.marketTier || 0) >= 2) + Number(pressure >= 28), 2, 6),
    score: kind === 'security'
      ? overview.tradeHeat + Math.max(0, 62 - security) * 1.4 + (location.marketTier || 0) * 10
      : kind === 'shortage'
        ? pressure * 1.8 + (location.marketTier || 0) * 8 + (isTradeHubLocation(location.id) ? 12 : 0)
        : traffic + (location.marketTier || 0) * 10 + (isTradeHubLocation(location.id) ? 10 : 0),
  }
}

function createIndustryOrder(seed: DynamicOrderSeed) {
  return {
    id: uid(`order-${seed.templateId}`),
    templateId: seed.templateId,
    locationId: seed.locationId,
    sourceKind: seed.sourceKind,
    title: seed.title,
    desc: seed.desc,
    factionId: seed.factionId,
    factionName: seed.factionName,
    requirements: seed.requirements.map((requirement) => ({ ...requirement })),
    rewardMoney: seed.rewardMoney,
    rewardReputation: seed.rewardReputation,
    standing: seed.standing,
  }
}

function buildDynamicIndustryOrders(excludedTemplateIds: string[] = []) {
  const excluded = new Set(excludedTemplateIds)
  return Array.from(LOCATION_MAP.values())
    .map(buildIndustryOrderSeed)
    .filter((seed): seed is DynamicOrderSeed => Boolean(seed) && !excluded.has(seed.templateId))
    .sort((left, right) => right.score - left.score || left.locationId.localeCompare(right.locationId))
    .slice(0, 3)
    .map(createIndustryOrder)
}

export function refreshIndustryOrders(force = false) {
  const g = getContext().game
  const orders = Array.isArray(g.world.industryOrders) ? g.world.industryOrders : []
  const hasDynamicShape = orders.every((order: any) => typeof order.locationId === 'string' && typeof order.sourceKind === 'string')
  if (!force && g.world.industryOrderDay === g.world.day && orders.length >= 3 && hasDynamicShape) return orders
  if (g.world.industryOrderDay === g.world.day && hasDynamicShape && orders.length > 0) {
    const replenished = buildDynamicIndustryOrders(orders.map((order: any) => order.templateId)).slice(0, Math.max(0, 3 - orders.length))
    g.world.industryOrders = [...orders, ...replenished] as any[]
    return g.world.industryOrders
  }
  g.world.industryOrders = buildDynamicIndustryOrders() as any[]; g.world.industryOrderDay = g.world.day
  return g.world.industryOrders
}

export function getIndustryOrderIssues(orderId: string): string[] {
  const ctx = getContext(); const orders = Array.isArray(ctx.game.world.industryOrders) ? ctx.game.world.industryOrders : [] as any[]
  const order = orders.find((e: any) => e.id === orderId) as any; if (!order) return ['这张订单已经失效。']
  return order.requirements.flatMap((r: any) => { const cur = ctx.findInventoryEntry(r.itemId)?.quantity || 0; if (cur >= r.quantity) return []; return [`缺少${getItem(r.itemId)?.name || r.itemId} ${r.quantity - cur}件`] })
}
export function canFulfillIndustryOrder(id: string) { return getIndustryOrderIssues(id).length === 0 }
export function explainIndustryOrder(id: string) { const i = getIndustryOrderIssues(id); return i.length ? i.join('；') : '货物齐备，可以交付。' }

export function fulfillIndustryOrder(orderId: string) {
  const ctx = getContext(); const g = ctx.game; const orders = Array.isArray(g.world.industryOrders) ? g.world.industryOrders : [] as any[]
  const order = orders.find((e: any) => e.id === orderId) as any; if (!order) return
  if (!canFulfillIndustryOrder(orderId)) { ctx.appendLog('你手头货不够，还交不了这笔订单。', 'warn'); return }
  order.requirements.forEach((r: any) => ctx.removeItemFromInventory(r.itemId, r.quantity))
  recordContractDelivery(order.locationId || FACTION_MAP.get(order.factionId || '')?.locationId || g.player.locationId, order.requirements, order.rewardMoney)
  g.player.money += order.rewardMoney
  addPlayerMetric('reputation', order.rewardReputation)
  adjustFactionStanding(order.factionId, order.standing || 0)
  g.world.industryOrders = orders.filter((e: any) => e.id !== orderId) as any[]
  ctx.appendLog(`你完成了${order.factionName}的"${order.title}"，入账${order.rewardMoney}灵石。`, 'loot')
  if ((g.world.industryOrders as any[]).length === 0) refreshIndustryOrders(true)
}
