import { getContext } from '@/core/context'
import { DISTRIBUTABLE_ITEMS, LOCATION_MAP, getItem, type LocationData } from '@/config'
import type { MarketListing, NpcState, TerritoryEntry } from '@/types/game'
import { clamp, randomFloat, randomInt, round, uid } from '@/utils'
import { getTerritoryState } from '@/systems/social/territory'

const BASIC_MARKET_TYPES = new Set(['grain', 'herb', 'wood', 'ore', 'cloth', 'pill'])
const CULTIVATION_MARKET_TYPES = new Set(['pill', 'scroll', 'ice', 'fire'])
const SINGLE_LISTING_TYPES = new Set(['manual', 'weapon', 'armor', 'deed', 'permit', 'sect', 'tool', 'token'])

function getBaseProsperity(location: LocationData) {
  return 22
    + (location.marketTier || 0) * 8
    + (location.tags.includes('port') || location.tags.includes('market') ? 8 : 0)
    + (location.tags.includes('court') ? 5 : 0)
}

function getBaseTradeHeat(location: LocationData) {
  return 10
    + (location.marketTier || 0) * 7
    + (location.tags.includes('port') || location.tags.includes('market') ? 10 : 0)
    + (location.tags.includes('pass') ? 8 : 0)
}

function getBaseLocalSupply(location: LocationData) {
  return 28
    + (location.marketTier || 0) * 5
    + (location.tags.includes('wild') ? 10 : 0)
    + (location.tags.includes('forge') ? 6 : 0)
    + (location.tags.includes('cultivation') ? 4 : 0)
}

function getBaseNeedPressure(location: LocationData) {
  return 24
    + (location.tags.includes('town') ? 8 : 0)
    + (location.tags.includes('court') ? 10 : 0)
    + (location.tags.includes('pass') ? 8 : 0)
    + (location.tags.includes('sect') ? 6 : 0)
}

function normalizeEconomyValue(value: number, min = 0, max = 100) {
  return clamp(round(value), min, max)
}

function getEconomyState(locationId: string): TerritoryEntry {
  return getTerritoryState(locationId)
}

function getEconomyBand(value: number, labels: [string, string, string, string]) {
  if (value <= 22) return labels[0]
  if (value <= 48) return labels[1]
  if (value <= 72) return labels[2]
  return labels[3]
}

function getFlowStrength(value: number, base = 1) {
  return clamp(round(Math.sqrt(Math.max(1, value)) * 0.7 + base), 1, 18)
}

function nudgeEconomy(locationId: string, deltas: Partial<Record<'prosperity' | 'tradeHeat' | 'localSupply' | 'needPressure', number>>) {
  const territory = getEconomyState(locationId)
  territory.prosperity = normalizeEconomyValue(territory.prosperity + (deltas.prosperity || 0))
  territory.tradeHeat = normalizeEconomyValue(territory.tradeHeat + (deltas.tradeHeat || 0))
  territory.localSupply = normalizeEconomyValue(territory.localSupply + (deltas.localSupply || 0))
  territory.needPressure = normalizeEconomyValue(territory.needPressure + (deltas.needPressure || 0))
  return territory
}

function getImportedBiases(location: LocationData, territory: TerritoryEntry) {
  const types = new Set<string>()
  if (territory.tradeHeat >= 20 || location.tags.includes('market') || location.tags.includes('port')) {
    location.neighbors.forEach((neighborId) => {
      const neighbor = LOCATION_MAP.get(neighborId)
      if (neighbor?.marketBias) types.add(neighbor.marketBias)
    })
  }
  if (location.tags.includes('port') || location.tags.includes('pass')) {
    types.add('grain')
    types.add('cloth')
    types.add('ore')
  }
  if (location.tags.includes('cultivation') || location.tags.includes('sect')) {
    types.add('pill')
  }
  return types
}

function getListingWeight(item: typeof DISTRIBUTABLE_ITEMS[number], location: LocationData, territory: TerritoryEntry, importedBiases: Set<string>) {
  let weight = 0.5

  if (item.type === location.marketBias) {
    weight += 2.2 + territory.localSupply / 18
  } else if (importedBiases.has(item.type)) {
    weight += 1.1 + territory.tradeHeat / 35
  }

  if (BASIC_MARKET_TYPES.has(item.type)) {
    weight += 0.4 + territory.needPressure / 55
  }
  if (location.tags.includes('cultivation') && CULTIVATION_MARKET_TYPES.has(item.type)) {
    weight += 1.4 + territory.prosperity / 45
  }
  if (location.tags.includes('forge') && ['ore', 'wood', 'weapon', 'armor'].includes(item.type)) {
    weight += 1.2
  }
  if (location.tags.includes('port') && ['relic', 'cloth', 'grain'].includes(item.type)) {
    weight += 1.1
  }
  if (location.tags.includes('court') && ['cloth', 'grain', 'token'].includes(item.type)) {
    weight += 0.8
  }
  if (location.tags.includes('wild') && BASIC_MARKET_TYPES.has(item.type) && item.type !== location.marketBias) {
    weight -= 0.25
  }
  if (item.rarity === 'epic') weight += territory.prosperity / 80 - 0.5
  if (item.rarity === 'legendary') weight += territory.prosperity / 100 - 0.9

  return Math.max(0.12, round(weight, 2))
}

function pickWeightedItem(entries: Array<{ item: typeof DISTRIBUTABLE_ITEMS[number]; weight: number }>) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return entries[0]?.item || null
  let roll = Math.random() * totalWeight
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry.item
  }
  return entries[entries.length - 1]?.item || null
}

function getListingQuantity(item: typeof DISTRIBUTABLE_ITEMS[number], location: LocationData, territory: TerritoryEntry, importedBiases: Set<string>) {
  const quantityMax = SINGLE_LISTING_TYPES.has(item.type) ? 1 : 3
  let quantity = randomInt(1, quantityMax)
  if (item.type === location.marketBias && quantityMax > 1) quantity += Math.floor(territory.localSupply / 35)
  if (importedBiases.has(item.type) && quantityMax > 1 && territory.tradeHeat >= 55) quantity += 1
  if (BASIC_MARKET_TYPES.has(item.type) && territory.needPressure >= 65) quantity -= 1
  return clamp(quantity, 1, quantityMax + 1)
}

function getPriceMultiplier(item: typeof DISTRIBUTABLE_ITEMS[number], location: LocationData, territory: TerritoryEntry, importedBiases: Set<string>) {
  let modifier = randomFloat(0.92, 1.12) + location.marketTier * 0.035

  if (item.type === location.marketBias) modifier -= territory.localSupply * 0.0045
  if (BASIC_MARKET_TYPES.has(item.type)) modifier += territory.needPressure * 0.0038 - territory.localSupply * 0.0015
  if (importedBiases.has(item.type) && item.type !== location.marketBias) modifier += Math.max(0, territory.needPressure - 30) * 0.0025 - territory.tradeHeat * 0.001
  if (location.tags.includes('cultivation') && CULTIVATION_MARKET_TYPES.has(item.type)) modifier += 0.08
  if (location.tags.includes('port') && item.type === 'relic') modifier += 0.12
  if (territory.stability < 40) modifier += (40 - territory.stability) * 0.003
  if (territory.tradeHeat > 60) modifier += (territory.tradeHeat - 60) * 0.0012

  return clamp(round(modifier, 3), 0.48, 2.4)
}

export function getLocationEconomyOverview(locationId: string) {
  const location = LOCATION_MAP.get(locationId)
  const territory = getEconomyState(locationId)
  if (!location) {
    return {
      prosperity: territory.prosperity,
      tradeHeat: territory.tradeHeat,
      localSupply: territory.localSupply,
      needPressure: territory.needPressure,
      prosperityLabel: '商气未明',
      heatLabel: '商热未明',
      supplyLabel: '本货未明',
      needLabel: '外需未明',
      summary: '局势未明',
    }
  }

  const prosperityLabel = getEconomyBand(territory.prosperity, ['市道萧索', '买卖平稳', '街肆热络', '商气鼎沸'])
  const heatLabel = getEconomyBand(territory.tradeHeat, ['商路冷清', '人货缓行', '货路繁忙', '商旅奔涌'])
  const supplyLabel = getEconomyBand(territory.localSupply, ['本货断供', '本货偏紧', '本货充足', '本货堆仓'])
  const needLabel = getEconomyBand(territory.needPressure, ['外需宽缓', '外需渐紧', '外货吃紧', '四方抢货'])

  return {
    prosperity: territory.prosperity,
    tradeHeat: territory.tradeHeat,
    localSupply: territory.localSupply,
    needPressure: territory.needPressure,
    prosperityLabel,
    heatLabel,
    supplyLabel,
    needLabel,
    summary: `${prosperityLabel} · ${supplyLabel} · ${needLabel}`,
  }
}

export function recordTradeDeparture(originId: string, cargoValue: number) {
  const flow = getFlowStrength(cargoValue)
  nudgeEconomy(originId, {
    prosperity: flow * 0.4,
    tradeHeat: flow * 1.2,
    localSupply: -flow * 0.9,
    needPressure: flow * 0.22,
  })
}

export function recordTradeArrival(originId: string, destinationId: string, revenue: number) {
  const destination = LOCATION_MAP.get(destinationId)
  const originBias = LOCATION_MAP.get(originId)?.marketBias || ''
  const flow = getFlowStrength(revenue)
  nudgeEconomy(destinationId, {
    prosperity: flow * 0.55 + (destination?.tags.includes('port') ? 1 : 0),
    tradeHeat: flow * 1.35,
    localSupply: destination?.marketBias === originBias ? flow * 0.35 : flow * 0.12,
    needPressure: -flow * 0.85,
  })
}

export function recordPassiveTradeActivity(locationId: string, margin: number) {
  const flow = getFlowStrength(margin, 0.4) * 0.45
  nudgeEconomy(locationId, {
    prosperity: flow * 0.35,
    tradeHeat: flow * 0.8,
    needPressure: -flow * 0.18,
  })
}

export function recordMarketPurchase(locationId: string, itemId: string, quantity: number) {
  const item = getItem(itemId)
  const location = LOCATION_MAP.get(locationId)
  if (!item || !location) return
  const flow = Math.max(0.8, quantity * 0.8)
  nudgeEconomy(locationId, {
    prosperity: flow * 0.12,
    tradeHeat: flow * 0.4,
    localSupply: item.type === location.marketBias ? -flow * 0.9 : -flow * 0.3,
    needPressure: BASIC_MARKET_TYPES.has(item.type) ? flow * 0.5 : flow * 0.2,
  })
}

export function recordNpcEconomicAction(npc: NpcState, action: string, locationId = npc.locationId) {
  const location = LOCATION_MAP.get(locationId)
  if (!location) return
  if (action === 'trade') {
    nudgeEconomy(locationId, { prosperity: 0.9, tradeHeat: 1.8, localSupply: 0.6, needPressure: -0.4 })
    return
  }
  if (action === 'hunt' || action === 'quest') {
    nudgeEconomy(locationId, { prosperity: 0.4, tradeHeat: 0.5, localSupply: 1.1, needPressure: -0.2 })
    return
  }
  if (action === 'meditate') {
    nudgeEconomy(locationId, { prosperity: 0.3, tradeHeat: 0.2, needPressure: 0.6 })
    return
  }
  if (action === 'sect' || action === 'train') {
    nudgeEconomy(locationId, { prosperity: 0.35, tradeHeat: 0.4, needPressure: 0.35 })
  }
}

export function recordHarvestOutput(locationId: string, itemId: string, quantity: number) {
  const item = getItem(itemId)
  const location = LOCATION_MAP.get(locationId)
  if (!item || !location) return
  const flow = Math.max(1, quantity)
  nudgeEconomy(locationId, {
    prosperity: flow * 0.18,
    tradeHeat: flow * 0.08,
    localSupply: item.type === location.marketBias ? flow * 1.1 : flow * 0.25,
    needPressure: -flow * 0.45,
  })
}

export function recordWorkshopCycle(locationId: string, inputItemIds: string[], outputItemId: string, quantity: number) {
  const outputItem = getItem(outputItemId)
  const location = LOCATION_MAP.get(locationId)
  if (!location) return
  const inputCount = inputItemIds.map(itemId => getItem(itemId)?.type).filter(Boolean).length
  const flow = Math.max(1, quantity + inputCount * 0.5)
  nudgeEconomy(locationId, {
    prosperity: flow * 0.28,
    tradeHeat: flow * 0.2,
    localSupply: outputItem?.type === location.marketBias ? flow * 0.2 : -inputCount * 0.12,
    needPressure: inputCount * 0.22,
  })
}

export function recordShopTurnover(locationId: string, income: number, stockSpent: number) {
  const flow = getFlowStrength(income, 0.2)
  nudgeEconomy(locationId, {
    prosperity: flow * 0.3,
    tradeHeat: flow * 0.7,
    localSupply: -stockSpent * 0.6,
    needPressure: stockSpent * 0.32,
  })
}

export function recordContractDelivery(locationId: string, deliveredItems: Array<{ itemId: string; quantity: number }>, payout = 0) {
  const location = LOCATION_MAP.get(locationId)
  if (!location) return
  let supplyDelta = 0
  let needDelta = 0
  let cargoValue = 0

  deliveredItems.forEach(({ itemId, quantity }) => {
    const item = getItem(itemId)
    if (!item) return
    const flow = Math.max(0.8, quantity * Math.max(1, item.baseValue / 16))
    cargoValue += item.baseValue * quantity
    supplyDelta += item.type === location.marketBias ? flow * 0.95 : flow * 0.55
    needDelta -= BASIC_MARKET_TYPES.has(item.type) ? flow * 1.05 : flow * 0.7
  })

  const turnover = getFlowStrength(Math.max(payout, cargoValue), 0.5)
  nudgeEconomy(locationId, {
    prosperity: turnover * 0.24,
    tradeHeat: turnover * 0.58,
    localSupply: supplyDelta,
    needPressure: needDelta,
  })
}

export function createDynamicMarketListings(location: LocationData): MarketListing[] {
  const territory = getEconomyState(location.id)
  const importedBiases = getImportedBiases(location, territory)
  const listings: MarketListing[] = []
  const allowedTier = Math.max(0, location.marketTier + Math.floor(territory.prosperity / 45))
  const amount = clamp(Math.round(5 + territory.prosperity / 28 + territory.tradeHeat / 45 - territory.needPressure / 80), 4, 9)

  for (let index = 0; index < amount; index += 1) {
    const pool = DISTRIBUTABLE_ITEMS.filter((item) => {
      if (item.tier > allowedTier + (Math.random() < 0.22 ? 1 : 0)) return false
      if (['legendary', 'epic'].includes(item.rarity) && allowedTier < 4) return false
      if (['deed', 'permit', 'sect'].includes(item.type) && !location.tags.some(tag => ['town', 'market', 'port', 'forge', 'sect'].includes(tag))) return false
      return true
    })
    const weightedPool = pool.map(item => ({ item, weight: getListingWeight(item, location, territory, importedBiases) }))
    const item = pickWeightedItem(weightedPool)
    if (!item) continue
    const quantity = getListingQuantity(item, location, territory, importedBiases)
    const priceMultiplier = getPriceMultiplier(item, location, territory, importedBiases)
    listings.push({
      listingId: uid(`market-${location.id}`),
      itemId: item.id,
      quantity,
      price: Math.max(10, Math.round(item.baseValue * priceMultiplier)),
      seller: location.tags.includes('port') ? '远航脚商' : location.tags.includes('court') ? '官行货柜' : location.tags.includes('forge') ? '工盟货栈' : '本地商会',
    })
  }

  return listings
}

export function processWorldEconomyTick() {
  const ctx = getContext()
  if (ctx.game.world.hour !== 0) return

  Object.values(ctx.game.world.territories || {}).forEach((territory) => {
    const location = LOCATION_MAP.get(territory.locationId)
    if (!location) return

    const before = getLocationEconomyOverview(location.id)
    const prosperityBase = getBaseProsperity(location)
    const tradeHeatBase = getBaseTradeHeat(location)
    const localSupplyBase = getBaseLocalSupply(location)
    const needPressureBase = getBaseNeedPressure(location)

    territory.tradeHeat = normalizeEconomyValue(
      territory.tradeHeat * 0.82
        + tradeHeatBase * 0.18
        + territory.prosperity * 0.04
        - territory.needPressure * 0.03,
    )
    territory.localSupply = normalizeEconomyValue(
      territory.localSupply
        + (localSupplyBase - territory.localSupply) * 0.22
        + territory.tradeHeat * 0.02
        - territory.needPressure * 0.03,
    )
    territory.needPressure = normalizeEconomyValue(
      territory.needPressure
        + (needPressureBase - territory.needPressure) * 0.2
        + Math.max(0, 48 - territory.localSupply) * 0.12
        - territory.tradeHeat * 0.04,
    )
    territory.prosperity = normalizeEconomyValue(
      territory.prosperity
        + (prosperityBase - territory.prosperity) * 0.18
        + territory.tradeHeat * 0.06
        + territory.localSupply * 0.04
        - territory.needPressure * 0.08
        - Math.max(0, 36 - territory.stability) * 0.1,
    )

    if (territory.needPressure >= 80 && territory.stability < 28) {
      territory.prosperity = normalizeEconomyValue(territory.prosperity - 5)
      territory.localSupply = normalizeEconomyValue(territory.localSupply - 4)
      if (ctx.game.player.playerFaction && territory.controllerId === ctx.game.player.playerFaction.id) {
        territory.playerInfluence = normalizeEconomyValue(territory.playerInfluence - 3)
      }
    }

    const after = getLocationEconomyOverview(location.id)
    if (location.id !== ctx.game.player.locationId) return
    if (before.needPressure < 72 && territory.needPressure >= 72) {
      ctx.appendLog(`${location.name}外货骤紧，街上商人开始争抢来路稳的货。`, 'warn')
      return
    }
    if (before.localSupply > 20 && territory.localSupply <= 20) {
      ctx.appendLog(`${location.name}本地货色断得快，坊间价签立刻抬了起来。`, 'warn')
      return
    }
    if (before.prosperity < 74 && territory.prosperity >= 74) {
      ctx.appendLog(`${location.name}商气骤起，往来脚商与柜坊一下都活了。`, 'info')
      return
    }
    if (before.summary !== after.summary && after.needPressure >= 78) {
      ctx.appendLog(`${location.name}${after.summary}。`, 'warn')
    }
  })
}