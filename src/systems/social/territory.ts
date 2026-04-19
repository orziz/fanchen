import { getContext } from '@/core/context'
import { FACTION_MAP, LOCATION_MAP } from '@/config'
import type { TerritoryEntry } from '@/types/game'
import { clamp, randomInt, round } from '@/utils'
import { isTradeHubLocation } from './faction'

function createTerritoryEntry(locationId: string): TerritoryEntry {
  const loc = LOCATION_MAP.get(locationId)
  if (!loc) {
    return {
      locationId,
      controllerId: null,
      incumbentId: null,
      playerInfluence: 0,
      stability: 24,
      prosperity: 24,
      tradeHeat: 12,
      localSupply: 30,
      needPressure: 24,
    }
  }
  return {
    locationId,
    controllerId: loc.factionIds?.[0] || null,
    incumbentId: loc.factionIds?.[0] || null,
    playerInfluence: 0,
    stability: 18
      + (loc.marketTier || 0) * 6
      + (loc.tags.includes('court') ? 12 : 0)
      + (loc.tags.includes('port') || loc.tags.includes('market') ? 6 : 0)
      + (loc.tags.includes('pass') ? 8 : 0),
    prosperity: 22
      + (loc.marketTier || 0) * 8
      + (loc.tags.includes('port') || loc.tags.includes('market') ? 8 : 0)
      + (loc.tags.includes('court') ? 5 : 0),
    tradeHeat: 10
      + (loc.marketTier || 0) * 7
      + (loc.tags.includes('port') || loc.tags.includes('market') ? 10 : 0)
      + (loc.tags.includes('pass') ? 8 : 0),
    localSupply: 28
      + (loc.marketTier || 0) * 5
      + (loc.tags.includes('wild') ? 10 : 0)
      + (loc.tags.includes('forge') ? 6 : 0)
      + (loc.tags.includes('cultivation') ? 4 : 0),
    needPressure: 24
      + (loc.tags.includes('town') ? 8 : 0)
      + (loc.tags.includes('court') ? 10 : 0)
      + (loc.tags.includes('pass') ? 8 : 0)
      + (loc.tags.includes('sect') ? 6 : 0),
  }
}

export function getTerritoryState(locationId: string): TerritoryEntry {
  const ctx = getContext()
  const defaults = createTerritoryEntry(locationId)
  if (!ctx.game.world.territories[locationId]) {
    ctx.game.world.territories[locationId] = defaults
    return ctx.game.world.territories[locationId]
  }
  const territory = ctx.game.world.territories[locationId]
  for (const key of Object.keys(defaults) as (keyof TerritoryEntry)[]) {
    if ((territory as any)[key] == null) (territory as any)[key] = defaults[key]
  }
  return territory
}

function getTerritoryControllerName(territory: TerritoryEntry) {
  const playerFaction = getContext().game.player.playerFaction
  if (territory.controllerId && playerFaction && territory.controllerId === playerFaction.id) return playerFaction.name
  return FACTION_MAP.get(territory.controllerId || '')?.name || '散户地头'
}

function getFactionLiquidFunds() {
  const playerFaction = getContext().game.player.playerFaction
  return (playerFaction?.treasury || 0) + getContext().game.player.money
}

function spendFactionLiquidFunds(amount: number): boolean {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction
  if (getFactionLiquidFunds() < amount) return false
  const treasurySpend = Math.min(playerFaction?.treasury || 0, amount)
  if (playerFaction) playerFaction.treasury -= treasurySpend
  ctx.game.player.money -= amount - treasurySpend
  return true
}

export function getPlayerFactionTerritories() {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction
  if (!playerFaction) return []
  return Object.values(ctx.game.world.territories || {}).map(territory => {
    const location = LOCATION_MAP.get(territory.locationId)
    if (!location) return null
    const isControlled = territory.controllerId === playerFaction.id
    if (!isControlled && territory.playerInfluence <= 0) return null
    return {
      ...territory,
      location,
      isControlled,
      controllerName: getTerritoryControllerName(territory),
    }
  }).filter(Boolean).sort((a: any, b: any) => Number(b.isControlled) - Number(a.isControlled) || b.playerInfluence - a.playerInfluence) as any[]
}

export function getPlayerFactionTerritoryTargets() {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction
  if (!playerFaction) return []
  const current = ctx.getCurrentLocation()
  const ids = new Set(getPlayerFactionTerritories().map((entry: any) => entry.locationId))
  ;[current.id, ...(current.neighbors || [])].forEach(id => ids.add(id))
  return [...ids].map(id => {
    const location = LOCATION_MAP.get(id)
    if (!location) return null
    const territory = getTerritoryState(id)
    const isControlled = territory.controllerId === playerFaction.id
    if (!isControlled && territory.playerInfluence <= 0 && !isTradeHubLocation(id) && !location.tags.includes('court') && !location.tags.includes('pass') && !location.tags.includes('sect')) return null
    return {
      ...territory,
      location,
      isControlled,
      controllerName: getTerritoryControllerName(territory),
    }
  }).filter(Boolean) as any[]
}

export function getPlayerTerritoryModifier(locationId: string) {
  const playerFaction = getContext().game.player.playerFaction
  if (!playerFaction) return 0
  const territory = getTerritoryState(locationId)
  if (territory.controllerId === playerFaction.id) return 0.08
  if (territory.playerInfluence >= 30) return 0.03
  return 0
}

export function getTerritorySecurity(locationId: string) {
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)
  const playerFaction = getContext().game.player.playerFaction
  let security = territory.stability
    - (location?.danger || 0) * 5
    + (location?.tags.includes('court') ? 12 : 0)
    + (location?.tags.includes('pass') ? 8 : 0)
    + (location?.tags.includes('market') || location?.tags.includes('port') ? 4 : 0)
    + territory.prosperity * 0.12
    + territory.localSupply * 0.08
    - territory.needPressure * 0.18
  if (playerFaction && territory.controllerId === playerFaction.id) {
    security += 8 + (playerFaction.branches?.watch || 0) * 3
  } else if (territory.playerInfluence >= 30) {
    security += 3
  }
  if (territory.tradeHeat >= 70 && territory.stability < 36) security -= 6
  return clamp(round(security), 8, 100)
}

export function getTerritoryTaxRate(locationId: string) {
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)
  const playerFaction = getContext().game.player.playerFaction
  const security = getTerritorySecurity(locationId)
  let taxRate = 0.028
    + (location?.marketTier || 0) * 0.012
    + (location?.tags.includes('court') ? 0.014 : 0)
    + (location?.tags.includes('pass') ? 0.01 : 0)
    + territory.tradeHeat * 0.0006
    + Math.max(0, territory.prosperity - 45) * 0.0004
    + territory.needPressure * 0.0005
    - territory.localSupply * 0.00025
  if (security < 35) taxRate += 0.014
  else if (security < 55) taxRate += 0.006
  if (playerFaction && territory.controllerId === playerFaction.id) {
    taxRate -= 0.015 + (playerFaction.branches?.watch || 0) * 0.002
  } else if (territory.playerInfluence >= 30) {
    taxRate -= 0.006
  }
  return clamp(round(taxRate, 3), 0.02, 0.22)
}

export function getTerritoryCommerceEffects(locationId: string) {
  const security = getTerritorySecurity(locationId)
  const taxRate = getTerritoryTaxRate(locationId)
  return {
    security,
    taxRate,
    tradeLossRate: clamp(round(Math.max(0, 48 - security) * 0.0024, 3), 0, 0.08),
    industryLossRate: clamp(round(Math.max(0, 42 - security) * 0.002, 3), 0, 0.06),
  }
}

export function processTerritoryStatusTick() {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction
  if (ctx.game.world.hour !== 0) return

  Object.keys(ctx.game.world.territories || {}).forEach((locationId) => {
    const territory = getTerritoryState(locationId)
    const location = LOCATION_MAP.get(locationId)
    if (!location) return

    let drift = (location.tags.includes('court') ? 1 : 0)
      + (location.tags.includes('pass') ? 1 : 0)
      - Math.max(0, location.danger - 2)

    if (playerFaction && territory.controllerId === playerFaction.id) {
      drift += 2 + (playerFaction.branches?.watch || 0)
      const taxIncome = Math.max(0, Math.round(getTerritoryTaxRate(locationId) * (18 + (location.marketTier || 0) * 22)))
      playerFaction.treasury += taxIncome
    } else if (territory.playerInfluence >= 30) {
      drift += 1
    }

    const standing = ctx.getRegionStanding(locationId)
    if (standing >= 8) drift += 1
    else if (standing <= -4) drift -= 1

    if (territory.prosperity >= 60) drift += 1
    if (territory.localSupply >= 62) drift += 1
    if (territory.needPressure >= 68) drift -= 2
    if (territory.tradeHeat >= 72 && getTerritorySecurity(locationId) < 40) drift -= 2

    territory.stability = clamp(round(territory.stability + drift + randomInt(-2, 2)), 8, 120)
  })
}

function getTerritoryCampaignBaseCost(locationId: string) {
  const location = LOCATION_MAP.get(locationId)
  return {
    money: 72 + (location?.marketTier || 0) * 26 + (location?.tags.includes('court') ? 18 : 0) + (location?.tags.includes('pass') ? 12 : 0),
    supplies: 8 + (location?.danger || 0) + (location?.tags.includes('court') ? 4 : 0),
    stamina: 12 + (location?.danger || 0) * 2,
    guardNeed: 2 + ((location?.danger || 0) >= 4 ? 1 : 0),
    runnerNeed: 1 + (location?.tags.includes('market') || location?.tags.includes('port') ? 1 : 0),
  }
}

export function getTerritoryCampaignIssues(locationId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)
  const cost = getTerritoryCampaignBaseCost(locationId)
  if (!playerFaction || !location) return ['眼下还没有可争的地盘。']
  const issues: string[] = []
  if (g.player.locationId !== locationId) issues.push(`需先前往${location.name}`)
  if (territory.controllerId === playerFaction.id) issues.push('这块地盘已经在你手里了')
  if (getFactionLiquidFunds() < cost.money) issues.push(`银钱不足，还差${cost.money - getFactionLiquidFunds()}`)
  if (playerFaction.supplies < cost.supplies) issues.push(`补给不足，还差${cost.supplies - playerFaction.supplies}`)
  if (g.player.stamina < cost.stamina) issues.push(`体力不足，还差${cost.stamina - g.player.stamina}`)
  if ((playerFaction.crew?.guards || 0) < cost.guardNeed) issues.push(`护手不够，还差${cost.guardNeed - (playerFaction.crew?.guards || 0)}`)
  if ((playerFaction.crew?.runners || 0) < cost.runnerNeed) issues.push(`跑线人手不够，还差${cost.runnerNeed - (playerFaction.crew?.runners || 0)}`)
  if (location.tags.includes('court') && ctx.getRegionStanding(locationId) < 6) issues.push(`本地声望太浅，还差${Math.ceil(6 - ctx.getRegionStanding(locationId))}`)
  return issues
}

export function canLaunchTerritoryCampaign(locationId: string) {
  return getTerritoryCampaignIssues(locationId).length === 0
}

export function explainTerritoryCampaign(locationId: string) {
  const issues = getTerritoryCampaignIssues(locationId)
  return issues.length ? issues.join('；') : '人手和银路都已备齐，可以争这条线。'
}

export function launchTerritoryCampaign(locationId: string) {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction!
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)!
  const cost = getTerritoryCampaignBaseCost(locationId)
  if (!canLaunchTerritoryCampaign(locationId)) {
    ctx.appendLog('这条地盘眼下还抢不下来。', 'warn')
    return
  }
  spendFactionLiquidFunds(cost.money)
  playerFaction.supplies = Math.max(0, playerFaction.supplies - cost.supplies)
  ctx.adjustResource('stamina', -cost.stamina, 'maxStamina')
  const nearby = getPlayerFactionTerritories().filter((entry: any) => entry.isControlled && entry.location.neighbors.includes(locationId)).length
  const power = playerFaction.level * 9
    + (playerFaction.crew?.guards || 0) * 5
    + (playerFaction.crew?.runners || 0) * 2
    + (playerFaction.crew?.brokers || 0) * 2
    + (playerFaction.branches?.watch || 0) * 6
    + (playerFaction.branches?.caravan || 0) * 3
    + nearby * 6
    + (playerFaction.members?.length || 0) * 1.5
    + ctx.getRegionStanding(locationId) * 1.3
  const defense = territory.stability
    + (location.marketTier || 0) * 7
    + (location.tags.includes('court') ? 14 : 0)
    + (location.tags.includes('pass') ? 8 : 0)
    + (territory.controllerId && territory.controllerId !== playerFaction.id ? 8 : 0)
  const delta = power + randomInt(-14, 14) - defense
  if (delta >= 0) {
    territory.playerInfluence = clamp(territory.playerInfluence + 18 + Math.max(4, Math.round(delta * 0.45)), 0, 100)
    territory.stability = clamp(territory.stability - 6, 10, 120)
    playerFaction.influence = round(playerFaction.influence + 3.6, 4)
    playerFaction.prestige = round(playerFaction.prestige + 2.4, 4)
    ctx.adjustRegionStanding(locationId, 1.2)
    if (territory.playerInfluence >= 60) {
      territory.controllerId = playerFaction.id
      territory.playerInfluence = Math.max(territory.playerInfluence, 64)
      ctx.appendLog(`你在${location.name}压住了地头，把这条门路正式夺进了${playerFaction.name}手里。`, 'loot')
    } else {
      ctx.appendLog(`你在${location.name}撬开了一道口子，${playerFaction.name}已经插手这条线。`, 'loot')
    }
    return
  }
  territory.playerInfluence = clamp(territory.playerInfluence + Math.max(0, 4 + delta), 0, 100)
  territory.stability = clamp(territory.stability + 4, 10, 120)
  playerFaction.prestige = round(Math.max(0, playerFaction.prestige - 0.8), 4)
  ctx.appendLog(`你在${location.name}试着争路，却被${getTerritoryControllerName(territory)}压了回来。`, 'warn')
}

export function getTerritoryStabilizeIssues(locationId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)
  if (!playerFaction || !location) return ['眼下没有可稳固的地盘。']
  const issues: string[] = []
  const moneyCost = 38 + (location.marketTier || 0) * 12
  const suppliesCost = 5 + (location.tags.includes('pass') ? 2 : 0)
  if (g.player.locationId !== locationId) issues.push(`需先前往${location.name}`)
  if (territory.controllerId !== playerFaction.id && territory.playerInfluence <= 0) issues.push('你在这里还没有站住脚')
  if (getFactionLiquidFunds() < moneyCost) issues.push(`银钱不足，还差${moneyCost - getFactionLiquidFunds()}`)
  if (playerFaction.supplies < suppliesCost) issues.push(`补给不足，还差${suppliesCost - playerFaction.supplies}`)
  return issues
}

export function canStabilizeTerritory(locationId: string) {
  return getTerritoryStabilizeIssues(locationId).length === 0
}

export function explainStabilizeTerritory(locationId: string) {
  const issues = getTerritoryStabilizeIssues(locationId)
  return issues.length ? issues.join('；') : '门路已经铺住，可以继续压稳。'
}

export function stabilizeTerritory(locationId: string) {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction!
  const territory = getTerritoryState(locationId)
  const location = LOCATION_MAP.get(locationId)!
  if (!canStabilizeTerritory(locationId)) {
    ctx.appendLog('这块地盘眼下还稳不下来。', 'warn')
    return
  }
  const moneyCost = 38 + (location.marketTier || 0) * 12
  const suppliesCost = 5 + (location.tags.includes('pass') ? 2 : 0)
  spendFactionLiquidFunds(moneyCost)
  playerFaction.supplies = Math.max(0, playerFaction.supplies - suppliesCost)
  territory.playerInfluence = clamp(territory.playerInfluence + 12 + (playerFaction.branches?.watch || 0) * 2, 0, 100)
  territory.stability = clamp(territory.stability + 8, 10, 120)
  if (territory.controllerId !== playerFaction.id && territory.playerInfluence >= 60) {
    territory.controllerId = playerFaction.id
    ctx.appendLog(`你把${location.name}的人情、货路和地头一并压稳，正式立住了${playerFaction.name}的旗。`, 'loot')
    return
  }
  ctx.appendLog(`你在${location.name}又压实了一层门路，${playerFaction.name}的根脚更深了。`, 'info')
}