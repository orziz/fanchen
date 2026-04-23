import { getContext } from '@/core/context'
import { addPlayerMetric } from '@/core/integerProgress'
import { FACTION_MAP, LOCATION_MAP, getItem } from '@/config'
import { syncOpeningTutorialState } from '@/systems/tutorial'
import { clamp } from '@/utils'
import { getLocationEconomyOverview, recordContractDelivery, recordPassiveTradeActivity } from '@/systems/worldEconomy'
import {
  FACTION_LEAVE_REPUTATION_COST,
  FACTION_REJOIN_COOLDOWN_DAYS,
  FACTION_TYPE_LABELS,
  OFFICIAL_FACTION_TYPES,
  OFFICIAL_PURSUIT_DAYS,
  createTask,
} from '@/systems/social/shared'

export function isOfficialFaction(factionOrId: any): boolean {
  const faction = typeof factionOrId === 'string' ? FACTION_MAP.get(factionOrId) : factionOrId
  return Boolean(faction && OFFICIAL_FACTION_TYPES.has(faction.type))
}

export function getFactionTypeLabel(type: string) {
  return FACTION_TYPE_LABELS[type] || '势力'
}

export function isTradeHubLocation(locationId: string) {
  const loc = LOCATION_MAP.get(locationId)
  return Boolean(loc && ['market', 'port', 'town', 'pass'].some(t => loc.tags.includes(t)))
}

export function getLocationOfficialFactions(locationId?: string) {
  const ctx = getContext()
  const loc = LOCATION_MAP.get(locationId || ctx.game.player.locationId)
  if (!loc?.factionIds?.length) return [] as any[]
  return loc.factionIds.map(id => FACTION_MAP.get(id)).filter(f => f && isOfficialFaction(f))
}

export function getGovernmentOfficeName(locationId?: string) {
  return getLocationOfficialFactions(locationId)[0]?.name || ''
}

function getFactionCooldownMap() {
  const player = getContext().game.player
  player.factionCooldowns = player.factionCooldowns || {}
  return player.factionCooldowns
}

function clearExpiredFactionStatuses() {
  const ctx = getContext()
  const player = ctx.game.player
  const cooldownMap = getFactionCooldownMap()
  Object.keys(cooldownMap).forEach(factionId => {
    if ((cooldownMap[factionId] || 0) <= ctx.game.world.day) delete cooldownMap[factionId]
  })
  if (player.wantedByFactionId && player.wantedUntilDay <= ctx.game.world.day) {
    const factionName = FACTION_MAP.get(player.wantedByFactionId)?.name || '原势力'
    player.wantedByFactionId = null
    player.wantedUntilDay = 0
    ctx.appendLog(`${factionName}对你的追缉逐渐平息。`, 'info')
  }
}

export function processFactionStatusTick() {
  clearExpiredFactionStatuses()
}

export function getFactionRejoinCooldownDays(factionId: string) {
  const ctx = getContext()
  const untilDay = getFactionCooldownMap()[factionId] || 0
  return untilDay > ctx.game.world.day ? untilDay - ctx.game.world.day : 0
}

export function hasActiveFactionPursuit(factionId?: string | null) {
  const ctx = getContext()
  const player = ctx.game.player
  if (!player.wantedByFactionId || player.wantedUntilDay <= ctx.game.world.day) return false
  return factionId ? player.wantedByFactionId === factionId : true
}

function checkAffiliationRankUp() {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId || '')
  if (!faction) return
  const standing = g.player.factionStanding[faction.id] || 0
  const nextRank = standing >= 80 ? 3 : standing >= 45 ? 2 : standing >= 18 ? 1 : 0
  if (nextRank <= g.player.affiliationRank) return
  g.player.affiliationRank = nextRank
  g.player.title = `${faction.name}${faction.titles[nextRank]}`
  ctx.appendLog(`你在${faction.name}中的身份升为"${faction.titles[nextRank]}"。`, 'loot')
}

export function adjustFactionStanding(factionId: string, amount: number) {
  const ctx = getContext()
  if (!factionId) return 0
  const standing = ctx.adjustFactionStanding(factionId, amount)
  checkAffiliationRankUp()
  return standing
}

const SUPPLY_ITEM_BY_BIAS: Record<string, string> = {
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

function getAffiliationWorldSignals(faction: any) {
  const ctx = getContext()
  const location = LOCATION_MAP.get(faction.locationId)
  const overview = getLocationEconomyOverview(faction.locationId)
  const territory = ctx.game.world.territories[faction.locationId]
  const security = clamp(Math.round(
    (territory?.stability ?? 24)
      - (location?.danger || 0) * 5
      + (location?.tags.includes('court') ? 12 : 0)
      + (location?.tags.includes('pass') ? 8 : 0)
      + (isTradeHubLocation(faction.locationId) ? 4 : 0)
      + overview.prosperity * 0.12
      + overview.localSupply * 0.08
      - overview.needPressure * 0.18,
  ), 8, 100)
  return {
    location,
    overview,
    security,
    pressure: overview.needPressure - overview.localSupply,
  }
}

function getFactionSupplyProfile(faction: any, pressure: number, location?: { marketBias?: string; tags: string[] } | null) {
  if (!faction) return { itemId: 'spirit-grain', quantity: 2 }
  if (location?.tags.includes('sect') || faction.type === 'order') {
    const itemId = pressure >= 18 ? 'herb-paste' : 'mist-herb'
    return { itemId, quantity: itemId === 'herb-paste' ? 1 + Number(pressure >= 26) : clamp(2 + Math.floor(Math.max(pressure, 0) / 22), 2, 4) }
  }
  if (location?.tags.includes('forge') || location?.tags.includes('pass')) {
    return { itemId: pressure >= 18 ? 'scrap-iron' : 'timber', quantity: clamp(2 + Math.floor(Math.max(pressure, 0) / 20), 2, 4) }
  }
  if (location?.tags.includes('port') || location?.tags.includes('court')) {
    return { itemId: pressure >= 14 ? 'cloth-roll' : 'spirit-grain', quantity: clamp(2 + Math.floor(Math.max(pressure, 0) / 22), 2, 4) }
  }
  const itemId = SUPPLY_ITEM_BY_BIAS[location?.marketBias || ''] || 'spirit-grain'
  return {
    itemId,
    quantity: itemId === 'herb-paste'
      ? clamp(1 + Math.floor(Math.max(pressure, 0) / 26), 1, 2)
      : clamp(2 + Math.floor(Math.max(pressure, 0) / 18), 2, 5),
  }
}

function buildAffiliationSupplyTask(faction: any) {
  const { location, overview, pressure } = getAffiliationWorldSignals(faction)
  const supply = getFactionSupplyProfile(faction, pressure, location)
  const item = getItem(supply.itemId)
  const urgency = Math.max(16, pressure + Math.max(0, overview.needPressure - 42))
  return createTask('affiliation', 'supply', {
    factionId: faction.id,
    sourceLocationId: faction.locationId,
    worldHint: `${overview.needLabel} · ${overview.supplyLabel}`,
    urgency,
    title: `${faction.name}${urgency >= 28 ? '急补备库' : '备货差使'}`,
    desc: `${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}${overview.needLabel}，${overview.supplyLabel}，先替${faction.name}把周转物资补齐。`,
    itemId: supply.itemId,
    quantity: supply.quantity,
    rewardMoney: Math.max(36, supply.quantity * (item?.baseValue || 14) + 24 + (location?.marketTier || 0) * 10 + Math.max(0, pressure)),
    rewardReputation: 1,
    rewardStanding: clamp(2 + Math.floor(Math.max(0, pressure) / 18) + Number(isOfficialFaction(faction)), 2, 5),
    rewardRegion: urgency >= 28 ? 2 : 1,
  })
}

function buildAffiliationPatrolTask(faction: any) {
  const { location, overview, security } = getAffiliationWorldSignals(faction)
  const unrest = Math.max(0, 58 - security)
  return createTask('affiliation', 'patrol', {
    factionId: faction.id,
    sourceLocationId: faction.locationId,
    worldHint: `${overview.heatLabel} · 街面${security < 50 ? '未稳' : '尚稳'}`,
    urgency: unrest + overview.tradeHeat,
    title: `${faction.name}${overview.tradeHeat >= 60 ? '护路巡查' : '值役巡查'}`,
    desc: `回${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}压一圈地头。那边近来${overview.heatLabel}，${security < 46 ? '街面未稳' : security < 62 ? '人心略浮' : '门路正忙'}。`,
    staminaCost: 10 + (location?.danger || 0) * 2 + Math.ceil(unrest / 9),
    qiCost: (isOfficialFaction(faction) ? 2 : 1) + Math.ceil(unrest / 20),
    rewardMoney: 24 + (location?.marketTier || 0) * 14 + unrest * 2,
    rewardReputation: 1,
    rewardStanding: clamp(2 + Math.floor(unrest / 14) + Number(overview.tradeHeat >= 60), 2, 5),
    rewardRegion: security < 50 ? 2 : 1,
  })
}

function buildAffiliationLiaisonTask(faction: any) {
  const { location, overview } = getAffiliationWorldSignals(faction)
  const traffic = overview.tradeHeat + overview.prosperity
  const standingNeed = clamp((isOfficialFaction(faction) ? 4 : 2) + (location?.marketTier || 0) + Number(overview.tradeHeat >= 60), 2, 10)
  return createTask('affiliation', 'liaison', {
    factionId: faction.id,
    sourceLocationId: faction.locationId,
    worldHint: `${overview.heatLabel} · ${overview.prosperityLabel}`,
    urgency: traffic + (isTradeHubLocation(faction.locationId) ? 8 : 0),
    title: `${faction.name}${isTradeHubLocation(faction.locationId) ? '商路疏通' : '往来疏通'}`,
    desc: `${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}${overview.heatLabel}，${overview.prosperityLabel}。备一笔路费人情，替${faction.name}把来往门路走顺。`,
    moneyCost: 32 + (location?.marketTier || 0) * 14 + Math.max(0, Math.round(traffic / 6)),
    standingNeed,
    rewardMoney: 16 + (location?.marketTier || 0) * 10 + Math.round(traffic / 4),
    rewardReputation: 2,
    rewardStanding: clamp(2 + Math.floor(traffic / 55) + Number(isOfficialFaction(faction)), 2, 5),
    rewardRegion: isTradeHubLocation(faction.locationId) ? 2 : 1,
  })
}

export function refreshAffiliationTasks(force = false) {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId || '')
  if (!faction) {
    g.player.affiliationTasks = []
    g.player.affiliationTaskDay = g.world.day
    return []
  }
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : []
  const hasDynamicShape = tasks.every((task: any) => typeof task.sourceLocationId === 'string')
  if (!force && g.player.affiliationTaskDay === g.world.day && tasks.length >= 2 && hasDynamicShape) return tasks
  g.player.affiliationTasks = [
    buildAffiliationSupplyTask(faction),
    buildAffiliationPatrolTask(faction),
    buildAffiliationLiaisonTask(faction),
  ].sort((left: any, right: any) => Number(right.urgency || 0) - Number(left.urgency || 0)).slice(0, 2) as any[]
  g.player.affiliationTaskDay = g.world.day
  return g.player.affiliationTasks
}

export function getAffiliationTaskIssues(taskId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : []
  const task = tasks.find((entry: any) => entry.id === taskId) as any
  if (!task) return ['这份势力差使已经失效。']
  const faction = FACTION_MAP.get(task.factionId)
  if (!faction || g.player.affiliationId !== faction.id) return ['你当前已不在这方势力中。']
  const taskLocationId = task.sourceLocationId || faction.locationId
  const issues: string[] = []
  if (g.player.locationId !== taskLocationId) issues.push(`需先前往${LOCATION_MAP.get(taskLocationId)?.name || taskLocationId}`)
  if (task.kind === 'supply') {
    const current = ctx.findInventoryEntry(task.itemId)?.quantity || 0
    if (current < task.quantity) issues.push(`缺少${getItem(task.itemId)?.name || task.itemId} ${task.quantity - current}件`)
  }
  if (task.kind === 'patrol') {
    if (g.player.stamina < task.staminaCost) issues.push(`体力不足，还差${task.staminaCost - g.player.stamina}`)
    if (g.player.qi < task.qiCost) issues.push(`真气不足，还差${task.qiCost - g.player.qi}`)
  }
  if (task.kind === 'liaison') {
    const standing = ctx.getRegionStanding(faction.locationId)
    if (g.player.money < task.moneyCost) issues.push(`灵石不足，还差${task.moneyCost - g.player.money}`)
    if (standing < task.standingNeed) issues.push(`本地声望不足，还差${Math.ceil(task.standingNeed - standing)}`)
  }
  return issues
}

export function canCompleteAffiliationTask(taskId: string) {
  return getAffiliationTaskIssues(taskId).length === 0
}

export function explainAffiliationTask(taskId: string) {
  const issues = getAffiliationTaskIssues(taskId)
  return issues.length ? issues.join('；') : '差使已经准备妥当。'
}

export function completeAffiliationTask(taskId: string) {
  const ctx = getContext()
  const g = ctx.game
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : [] as any[]
  const task = tasks.find((entry: any) => entry.id === taskId) as any
  if (!task || !canCompleteAffiliationTask(taskId)) {
    ctx.appendLog('这份势力差使眼下还接不稳。', 'warn')
    return
  }
  if (task.kind === 'supply') ctx.removeItemFromInventory(task.itemId, task.quantity)
  if (task.kind === 'patrol') {
    ctx.adjustResource('stamina', -task.staminaCost, 'maxStamina')
    ctx.adjustResource('qi', -task.qiCost, 'maxQi')
  }
  if (task.kind === 'liaison') g.player.money -= task.moneyCost
  const taskLocationId = task.sourceLocationId || FACTION_MAP.get(task.factionId)?.locationId || g.player.locationId
  if (task.kind === 'supply') recordContractDelivery(taskLocationId, [{ itemId: task.itemId, quantity: task.quantity }], task.rewardMoney)
  if (task.kind === 'patrol') {
    const territory = g.world.territories[taskLocationId]
    if (territory) territory.stability = clamp(territory.stability + 4 + Math.ceil((task.rewardStanding || 0) / 2), 8, 120)
  }
  if (task.kind === 'liaison') recordPassiveTradeActivity(taskLocationId, (task.moneyCost || 0) + task.rewardMoney)
  g.player.money += task.rewardMoney
  addPlayerMetric('reputation', task.rewardReputation)
  adjustFactionStanding(task.factionId, task.rewardStanding)
  ctx.adjustRegionStanding(taskLocationId, task.rewardRegion)
  g.player.stats.affiliationTasksCompleted += 1
  g.player.affiliationTasks = tasks.filter((entry: any) => entry.id !== taskId)
  ctx.appendLog(`你替${FACTION_MAP.get(task.factionId)?.name || '势力'}办妥"${task.title}"，门路更稳了。`, 'loot')
}

export function getFactionJoinIssues(factionId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(factionId)
  if (!faction) return ['这方势力暂时无法接触。']
  const issues: string[] = []
  if (g.player.affiliationId === factionId) issues.push('你已经在这方势力中')
  const cooldownDays = getFactionRejoinCooldownDays(factionId)
  if (cooldownDays > 0) issues.push(`还需等待${cooldownDays}天才能重返这方势力`)
  if (g.player.locationId !== faction.locationId) issues.push(`需前往${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}`)
  if (g.player.money < faction.joinRequirement.money) issues.push(`灵石不足，还差${faction.joinRequirement.money - g.player.money}`)
  if (g.player.reputation < faction.joinRequirement.reputation) issues.push(`声望不足，还差${Math.ceil(faction.joinRequirement.reputation - g.player.reputation)}`)
  if (g.player.rankIndex < faction.joinRequirement.rankIndex) issues.push(`境界不足，需要${ctx.getRankData()?.name || '更高境界'}`)
  return issues
}

export function canJoinFaction(factionId: string) {
  return getFactionJoinIssues(factionId).length === 0
}

export function explainFactionJoin(factionId: string) {
  const issues = getFactionJoinIssues(factionId)
  return issues.length ? issues.join('；') : '条件齐备，可以加入。'
}

export function joinFaction(factionId: string) {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(factionId)
  if (!faction || !canJoinFaction(factionId)) {
    ctx.appendLog('眼下还没有资格加入这方势力。', 'warn')
    return
  }
  const previous = FACTION_MAP.get(g.player.affiliationId || '')
  g.player.affiliationId = factionId
  g.player.affiliationRank = 0
  delete getFactionCooldownMap()[factionId]
  g.player.factionStanding[factionId] = Math.max(g.player.factionStanding[factionId] || 0, 8)
  ctx.adjustRegionStanding(faction.locationId, 2.4)
  refreshAffiliationTasks(true)
  if (g.world.factions[factionId]) {
    g.world.factions[factionId].joined = true
    g.world.factions[factionId].standing = g.player.factionStanding[factionId]
  }
  if (previous && previous.id !== factionId) ctx.appendLog(`你离开了${previous.name}，转而投向${faction.name}。`, 'npc')
  g.player.title = `${faction.name}${faction.titles[0]}`
  ctx.appendLog(`你正式加入${faction.name}，身份为"${faction.titles[0]}"。`, 'loot')
  syncOpeningTutorialState({ announce: true })
}

export function leaveFaction() {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId || '')
  if (!faction) {
    ctx.appendLog('你当前并未投身任何势力。', 'warn')
    return
  }

  g.player.reputation = Math.max(0, g.player.reputation - FACTION_LEAVE_REPUTATION_COST)
  g.player.affiliationId = null
  g.player.affiliationRank = 0
  g.player.affiliationTasks = []
  g.player.affiliationTaskDay = g.world.day
  g.player.title = `${ctx.getRankData(g.player.rankIndex).name}境修士`
  g.player.factionStanding[faction.id] = Math.min(g.player.factionStanding[faction.id] || 0, -12)
  getFactionCooldownMap()[faction.id] = g.world.day + FACTION_REJOIN_COOLDOWN_DAYS

  if (g.world.factions[faction.id]) {
    g.world.factions[faction.id].joined = false
    g.world.factions[faction.id].standing = g.player.factionStanding[faction.id]
  }

  if (isOfficialFaction(faction)) {
    g.player.wantedByFactionId = faction.id
    g.player.wantedUntilDay = g.world.day + OFFICIAL_PURSUIT_DAYS
    ctx.appendLog(`你脱离了${faction.name}，声望受损，且接下来${OFFICIAL_PURSUIT_DAYS}天仍可能遭遇追缉。`, 'warn')
    return
  }

  ctx.appendLog(`你退出了${faction.name}，声望受损，且${FACTION_REJOIN_COOLDOWN_DAYS}天内不得重返。`, 'warn')
}