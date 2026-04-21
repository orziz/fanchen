import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { addPlayerSkill } from '@/core/integerProgress'
import { LOCATIONS, LOCATION_MAP, getItem } from '@/config'
import { randomFloat, sample, uid, findRoute, round } from '@/utils'
import { getTerritoryCommerceEffects } from './social'
import { travelTo } from './world'
import { recordMarketPurchase, recordPassiveTradeActivity, recordTradeArrival, recordTradeDeparture } from './worldEconomy'

/* ─── Constants ─── */

const TRADE_CARGO_LABELS: Record<string, string> = {
  herb: '药材货包', grain: '粮货担子', wood: '木料货排', ore: '矿货车板',
  cloth: '布匹行箱', relic: '奇货匣', fire: '火材箱', scroll: '残卷匣',
  pill: '丹药匣', ice: '寒材箱',
}

/* ─── Helpers ─── */

export function isTradeHub(location: { tags: string[] }): boolean {
  return ['market', 'port', 'town', 'pass'].some(tag => location.tags.includes(tag))
}

function getActiveTradeRun() {
  return getContext().game.player.tradeRun || null
}

/* ─── Route Options ─── */

export function getTradeRouteOptions(locationId?: string) {
  const ctx = getContext()
  const g = ctx.game
  const originId = locationId || g.player.locationId
  const origin = LOCATION_MAP.get(originId)
  if (!origin || !isTradeHub(origin)) return []

  return LOCATIONS
    .filter(dest => dest.id !== origin.id && isTradeHub(dest))
    .map(dest => {
      const path = findRoute(origin.id, dest.id)
      if (!path) return null
      const segments = Math.max(1, path.length - 1)
      const cargoLabel = TRADE_CARGO_LABELS[origin.marketBias] || `${origin.resource}货`
      const originTerritoryBonus = getPlayerTerritoryModifier(origin.id)
      const destTerritoryBonus = getPlayerTerritoryModifier(dest.id)
      const originCommerce = getTerritoryCommerceEffects(origin.id)
      const destCommerce = getTerritoryCommerceEffects(dest.id)
      const purchaseCost = Math.round((88 + origin.marketTier * 32 + segments * 22 + (origin.tags.includes('port') ? 14 : 0)) * (1 + originCommerce.taxRate * 0.55) * (1 - originTerritoryBonus * 0.35))
      const demandBonus = dest.marketBias === origin.marketBias ? 0.05 : 0.16
      const courtBonus = dest.tags.includes('court') ? 0.04 : 0
      const riskDiscount = destCommerce.tradeLossRate + Math.max(0, (80 - Math.min(originCommerce.security, destCommerce.security)) * 0.0012)
      const saleEstimate = Math.round(purchaseCost * (1.1 + segments * 0.05 + demandBonus * 0.6 + courtBonus + dest.marketTier * 0.025 + destTerritoryBonus * 0.7 + originTerritoryBonus * 0.3) * Math.max(0.78, 1 - destCommerce.taxRate * 0.48 - riskDiscount))
      return {
        id: `${origin.id}-${dest.id}`, originId: origin.id, originName: origin.name,
        destinationId: dest.id, destinationName: dest.name, cargoLabel, segments,
        purchaseCost, saleEstimate, profitEstimate: saleEstimate - purchaseCost,
        originSecurity: originCommerce.security,
        destinationSecurity: destCommerce.security,
        originTaxRate: originCommerce.taxRate,
        destinationTaxRate: destCommerce.taxRate,
        localStanding: ctx.getRegionStanding(dest.id),
        affordable: g.player.money >= purchaseCost,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.profitEstimate - a!.profitEstimate)
    .slice(0, 4) as Array<{
      id: string; originId: string; originName: string; destinationId: string; destinationName: string
      cargoLabel: string; segments: number; purchaseCost: number; saleEstimate: number; profitEstimate: number
      originSecurity: number; destinationSecurity: number; originTaxRate: number; destinationTaxRate: number
      localStanding: number; affordable: boolean
    }>
}

function getPlayerTerritoryModifier(locationId: string): number {
  const ctx = getContext()
  const pf = ctx.game.player.playerFaction
  if (!pf) return 0
  const t = ctx.game.world.territories[locationId]
  if (!t) return 0
  if (t.controllerId === pf.id) return 0.08
  if (t.playerInfluence >= 30) return 0.03
  return 0
}

/* ─── Trade Run ─── */

export function startTradeRun(destinationId: string): boolean {
  const ctx = getContext()
  const g = ctx.game
  const route = getTradeRouteOptions().find(r => r.destinationId === destinationId)
  if (!route) { ctx.appendLog('当前没有合适的跑商货路。', 'warn'); return false }
  if (getActiveTradeRun()) { ctx.appendLog('你已经压着一批货了，先把这一趟交割完。', 'warn'); return false }
  if (g.player.money < route.purchaseCost) { ctx.appendLog(`压货还差${route.purchaseCost - g.player.money}灵石。`, 'warn'); return false }

  g.player.money -= route.purchaseCost
  g.player.tradeRun = {
    id: route.id, originId: route.originId, originName: route.originName,
    destinationId: route.destinationId, destinationName: route.destinationName,
    cargoLabel: route.cargoLabel, purchaseCost: route.purchaseCost,
    saleEstimate: route.saleEstimate, segments: route.segments, startedDay: g.world.day,
  }
  recordTradeDeparture(route.originId, route.purchaseCost)
  ctx.adjustRegionStanding(route.originId, 0.8)
  ctx.appendLog(`你在${route.originName}压下${route.cargoLabel}，准备跑往${route.destinationName}。`, 'info')
  travelTo(route.destinationId)
  if (g.player.locationId === route.destinationId) {
    ctx.appendLog(`货队已抵达${route.destinationName}，可以立即交割。`, 'info')
  }
  return true
}

export function settleTradeRun(): boolean {
  const ctx = getContext()
  const g = ctx.game
  const run = getActiveTradeRun()
  if (!run) { ctx.appendLog('你手里暂时没有在途货路。', 'warn'); return false }
  if (g.player.locationId !== run.destinationId) { ctx.appendLog(`这批货要送到${run.destinationName}才好交割。`, 'warn'); return false }

  const localStanding = ctx.getRegionStanding(run.destinationId)
  const fluctuation = randomFloat(0.94, 1.12)
  const originCommerce = getTerritoryCommerceEffects(run.originId)
  const destCommerce = getTerritoryCommerceEffects(run.destinationId)
  const grossRevenue = Math.max(run.purchaseCost + 8, Math.round(run.saleEstimate * (1 + g.player.skills.trading * 0.008 + localStanding * 0.008) * fluctuation))
  const tariffCut = Math.max(0, Math.round(grossRevenue * Math.min(0.28, originCommerce.taxRate * 0.18 + destCommerce.taxRate * 0.56)))
  const routeLoss = Math.max(0, Math.round(grossRevenue * destCommerce.tradeLossRate))
  const revenue = Math.max(run.purchaseCost + 8, grossRevenue - tariffCut - routeLoss)
  const profit = revenue - run.purchaseCost

  recordTradeArrival(run.originId, run.destinationId, revenue)
  g.player.money += revenue
  addPlayerSkill('trading', 0.55 + run.segments * 0.06)
  g.player.stats.tradesCompleted += 2
  g.player.stats.tradeRoutesCompleted += 1
  ctx.adjustRegionStanding(run.originId, 0.5)
  ctx.adjustRegionStanding(run.destinationId, 1 + run.segments * 0.15)
  ctx.adjustFactionStanding(g.player.affiliationId, 1.1)
  const feeNotes = [tariffCut > 0 ? `税契抽走${tariffCut}灵石` : '', routeLoss > 0 ? `沿路折耗${routeLoss}灵石` : ''].filter(Boolean)
  ctx.appendLog(`你在${run.destinationName}交割${run.cargoLabel}，净赚${profit}灵石${feeNotes.length ? `（${feeNotes.join('，')}）` : ''}。`, 'loot')
  g.player.tradeRun = null
  return true
}

export function advanceTradeRun(): 'none' | 'traveling' | 'settled' {
  const run = getActiveTradeRun()
  if (!run) return 'none'
  if (getContext().game.player.locationId !== run.destinationId) {
    travelTo(run.destinationId, { consumeTime: false })
    if (getContext().game.player.locationId === run.destinationId) {
      return settleTradeRun() ? 'settled' : 'traveling'
    }
    return 'traveling'
  }
  return settleTradeRun() ? 'settled' : 'none'
}

export function maybeStartBestTradeRun(): boolean {
  const route = getTradeRouteOptions().find(r => r.affordable)
  if (!route) return false
  return startTradeRun(route.destinationId)
}

export function resolvePassiveTrade() {
  const ctx = getContext()
  const g = ctx.game
  const market = g.market[g.player.locationId] || []
  if (!market.length) return
  const listing = sample(market)
  const item = getItem(listing.itemId)
  if (!item) return
  const territoryBonus = getPlayerTerritoryModifier(g.player.locationId)
  const territory = getTerritoryCommerceEffects(g.player.locationId)
  const margin = Math.max(1, Math.round(listing.price * randomFloat(0.015, 0.04 + territoryBonus * 0.12) * Math.max(0.4, 1 - territory.taxRate * 0.6 - territory.tradeLossRate)))
  recordPassiveTradeActivity(g.player.locationId, margin)
  g.player.money += margin
  g.player.stats.tradesCompleted += 1
  addPlayerSkill('trading', 0.08)
  ctx.adjustRegionStanding(g.player.locationId, 0.35)
  ctx.adjustFactionStanding(g.player.affiliationId, 0.45)
  ctx.appendLog(`你顺手倒卖${item.name}，净赚${margin}灵石。`, 'info')
}

export function buyListing(listingId: string) {
  const ctx = getContext()
  const g = ctx.game
  const market = g.market[g.player.locationId] || []
  const listing = market.find(e => e.listingId === listingId)
  if (!listing) return
  if (g.player.money < listing.price) { ctx.appendLog('灵石不足，买不起这件货。', 'warn'); return }
  g.player.money -= listing.price
  ctx.addItemToInventory(listing.itemId, listing.quantity)
  recordMarketPurchase(g.player.locationId, listing.itemId, listing.quantity)
  g.player.stats.tradesCompleted += 1
  ctx.adjustRegionStanding(g.player.locationId, 0.4)
  ctx.appendLog(`你购入${getItem(listing.itemId)?.name || '货物'} x${listing.quantity}。`, 'loot')
  g.market[g.player.locationId] = market.filter(e => e !== listing)
}
