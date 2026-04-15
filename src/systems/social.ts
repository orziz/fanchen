import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import {
  LOCATION_MAP, FACTIONS, FACTION_MAP, SECT_BUILDINGS, SECT_NAME_PARTS,
  SOCIAL_EVENT_TEMPLATES, SECT_EVENT_TEMPLATES, getItem,
} from '@/config'
import { sample, clamp, round, uid, randomInt } from '@/utils'
import type { RelationState, TerritoryEntry } from '@/types/game'

/* ═══════════════════ Constants ═══════════════════ */

const OFFICIAL_FACTION_TYPES = new Set(['court', 'bureau', 'garrison'])
const FACTION_LEAVE_REPUTATION_COST = 8
const FACTION_REJOIN_COOLDOWN_DAYS = 12
const OFFICIAL_PURSUIT_DAYS = 12
const FACTION_TYPE_LABELS: Record<string, string> = {
  village: '乡社', society: '行社', guild: '商帮', escort: '镖局',
  court: '官府', bureau: '转运司', garrison: '军府', order: '行院',
}
const PLAYER_FACTION_NAME_PARTS = {
  prefix: ['河埠', '听潮', '玄灯', '归帆', '雁行', '青禾', '云泽', '赤崖'],
  suffix: ['商社', '会盟', '行号', '驿团', '外局', '义行', '柜坊', '货盟'],
}
export const PLAYER_FACTION_BRANCHES: Record<string, { label: string; desc: string; baseCost: number }> = {
  caravan: { label: '商队线', desc: '扩车队、压货线和跨城分销。', baseCost: 180 },
  safehouse: { label: '货栈点', desc: '设栈屯货，减缓断供和路损。', baseCost: 140 },
  watch: { label: '耳目网', desc: '布置门路和线人，方便接单、疏通和护路。', baseCost: 160 },
}

/* ═══════════════════ Internal Helpers ═══════════════════ */

function createTask(ownerType: string, kind: string, payload: Record<string, unknown> = {}) {
  return { id: uid(`${ownerType}-${kind}`), ownerType, kind, ...payload }
}
function createFactionName() { return `${sample(PLAYER_FACTION_NAME_PARTS.prefix)}${sample(PLAYER_FACTION_NAME_PARTS.suffix)}` }
function createSectName() { return `${sample(SECT_NAME_PARTS.prefix)}${sample(SECT_NAME_PARTS.suffix)}` }

export function isOfficialFaction(factionOrId: any): boolean {
  const faction = typeof factionOrId === 'string' ? FACTION_MAP.get(factionOrId) : factionOrId
  return Boolean(faction && OFFICIAL_FACTION_TYPES.has(faction.type))
}
export function getFactionTypeLabel(type: string) { return FACTION_TYPE_LABELS[type] || '势力' }

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

/* ─── Territory helpers ─── */

function createTerritoryEntry(locationId: string): TerritoryEntry {
  const loc = LOCATION_MAP.get(locationId)
  if (!loc) return { locationId, controllerId: null, incumbentId: null, playerInfluence: 0, stability: 24 }
  return {
    locationId, controllerId: loc.factionIds?.[0] || null, incumbentId: loc.factionIds?.[0] || null,
    playerInfluence: 0,
    stability: 18 + (loc.marketTier || 0) * 6 + (loc.tags.includes('court') ? 12 : 0) + (loc.tags.includes('port') || loc.tags.includes('market') ? 6 : 0) + (loc.tags.includes('pass') ? 8 : 0),
  }
}

export function getTerritoryState(locationId: string): TerritoryEntry {
  const ctx = getContext()
  const defaults = createTerritoryEntry(locationId)
  if (!ctx.game.world.territories[locationId]) { ctx.game.world.territories[locationId] = defaults; return ctx.game.world.territories[locationId] }
  const t = ctx.game.world.territories[locationId]
  for (const key of Object.keys(defaults) as (keyof TerritoryEntry)[]) { if ((t as any)[key] == null) (t as any)[key] = defaults[key] }
  return t
}

function getTerritoryControllerName(territory: TerritoryEntry) {
  const pf = getContext().game.player.playerFaction
  if (territory.controllerId && pf && territory.controllerId === pf.id) return pf.name
  return FACTION_MAP.get(territory.controllerId || '')?.name || '散户地头'
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

/* ─── Faction standing ─── */

function checkAffiliationRankUp() {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId)
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
  const g = ctx.game
  if (!factionId) return 0
  const faction = FACTION_MAP.get(factionId)
  g.player.factionStanding[factionId] = round((g.player.factionStanding[factionId] || 0) + amount, 1)
  if (g.world.factions[factionId]) {
    g.world.factions[factionId].standing = g.player.factionStanding[factionId]
    g.world.factions[factionId].favor += amount * 0.25
  }
  if (faction) {
    if (isOfficialFaction(faction)) g.world.factionFavor.court += amount * 0.2
    else if (['guild', 'escort', 'village', 'society'].includes(faction.type)) g.world.factionFavor.merchants += amount * 0.18
    else if (faction.type === 'order') g.world.factionFavor.sect += amount * 0.12
  }
  checkAffiliationRankUp()
  return g.player.factionStanding[factionId]
}

/* ─── Liquid funds helpers ─── */
function getFactionLiquidFunds() { const pf = getContext().game.player.playerFaction; return (pf?.treasury || 0) + getContext().game.player.money }
function spendFactionLiquidFunds(amount: number): boolean {
  const ctx = getContext(); const pf = ctx.game.player.playerFaction
  if (getFactionLiquidFunds() < amount) return false
  const ts = Math.min(pf?.treasury || 0, amount); if (pf) pf.treasury -= ts
  ctx.game.player.money -= amount - ts; return true
}
function getPlayerFactionTotalCrew() { const pf = getContext().game.player.playerFaction; if (!pf) return 0; return Object.values(pf.crew || {}).reduce((s, v) => s + v, 0) + (pf.members?.length || 0) }

/* ═══════════════════ Relationships ═══════════════════ */

export function processRelationshipTick() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs.forEach(npc => {
    const rel = ctx.ensurePlayerRelation(npc.id)
    if (rel.role === 'partner' && Math.random() < 0.1) {
      g.player.breakthrough += 1.2; rel.affinity = clamp(rel.affinity + 1, -100, 100)
      if (Math.random() < 0.24) { const t = sample(SOCIAL_EVENT_TEMPLATES.filter(e => e.id === 'partner')); ctx.appendLog(t.text.split('{npc}').join(npc.name), t.type) }
    }
    if (rel.role === 'master' && Math.random() < 0.14) { g.player.cultivation += 0.6; rel.trust = clamp(rel.trust + 1, -100, 100) }
    if (rel.role === 'rival' && Math.random() < 0.12) {
      rel.rivalry = clamp(rel.rivalry + 2, 0, 100); g.player.reputation += 0.1
      if (Math.random() < 0.4) { const t = sample(SOCIAL_EVENT_TEMPLATES.filter(e => e.id === 'rival')); ctx.appendLog(t.text.split('{npc}').join(npc.name), t.type) }
    }
  })
}

export function visitNpc(npcId: string) {
  const ctx = getContext(); const g = ctx.game; const npc = ctx.getNpc(npcId); if (!npc) return
  const rel = ctx.ensurePlayerRelation(npcId)
  if (npc.locationId !== g.player.locationId) { ctx.appendLog(`${npc.name}目前在${LOCATION_MAP.get(npc.locationId)!.name}，暂时见不到。`, 'warn'); return }
  const attitude = rel.affinity > 20 ? '坦诚' : rel.affinity > 0 ? '平和' : '疏离'
  const cost = 10 + Math.max(0, rel.rivalry > 10 ? 8 : 0)
  if (g.player.money < cost) { ctx.appendLog('灵石不够备礼，对方并不想多聊。', 'warn'); return }
  g.player.money -= cost
  ctx.adjustRelation(npcId, { affinity: npc.mood.kindness > 58 ? 5 : 2, trust: 3, romance: npc.mood.kindness > 70 ? 1 : 0, rivalry: rel.role === 'rival' ? -2 : 0 })
  ctx.appendLog(`你与${npc.name}在${LOCATION_MAP.get(npc.locationId)!.name}交谈，对方态度${attitude}。`, 'npc')
  if (Math.random() < 0.26) {
    const t = sample(SOCIAL_EVENT_TEMPLATES.filter(e => e.id === 'teaching' || e.id === 'gift'))
    ctx.appendLog(t.text.split('{npc}').join(npc.name), t.type)
    if (t.id === 'gift') ctx.addItemToInventory(sample(['mist-herb', 'spirit-grain', 'jade-spring']), 1)
    if (t.id === 'teaching') g.player.insight += 0.4
  }
}

/* ═══════════════════ Affiliation ═══════════════════ */

function getFactionSupplyProfile(faction: any) {
  if (!faction) return { itemId: 'spirit-grain', quantity: 2 }
  if (['guild', 'escort', 'bureau'].includes(faction.type)) return { itemId: 'cloth-roll', quantity: 2 }
  if (faction.type === 'order') return { itemId: 'mist-herb', quantity: 2 }
  return { itemId: 'spirit-grain', quantity: 3 }
}

function buildAffiliationSupplyTask(faction: any) { const s = getFactionSupplyProfile(faction); return createTask('affiliation', 'supply', { factionId: faction.id, title: `${faction.name}备货差使`, desc: `替${faction.name}补一笔常用资材，先把门内日用补齐。`, itemId: s.itemId, quantity: s.quantity, rewardMoney: 42 + faction.joinRequirement.money, rewardReputation: 1.2, rewardStanding: 2.6, rewardRegion: 0.8 }) }
function buildAffiliationPatrolTask(faction: any) { return createTask('affiliation', 'patrol', { factionId: faction.id, title: `${faction.name}值役巡查`, desc: `回${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}跑一趟值役，把门路站稳。`, staminaCost: isOfficialFaction(faction) ? 16 : 12, qiCost: isOfficialFaction(faction) ? 4 : 2, rewardMoney: 28 + faction.joinRequirement.rankIndex * 12, rewardReputation: 0.8, rewardStanding: 2.2, rewardRegion: 0.6 }) }
function buildAffiliationLiaisonTask(faction: any) { return createTask('affiliation', 'liaison', { factionId: faction.id, title: `${faction.name}疏通门路`, desc: `备一笔人情与路费，替${faction.name}去打点本地往来。`, moneyCost: 36 + faction.joinRequirement.money, standingNeed: isOfficialFaction(faction) ? 5 : 3, rewardMoney: 20, rewardReputation: 1.4, rewardStanding: 3.4, rewardRegion: 1.2 }) }

export function refreshAffiliationTasks(force = false) {
  const ctx = getContext(); const g = ctx.game; const faction = FACTION_MAP.get(g.player.affiliationId)
  if (!faction) { g.player.affiliationTasks = []; g.player.affiliationTaskDay = g.world.day; return [] }
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : []
  if (!force && g.player.affiliationTaskDay === g.world.day && tasks.length >= 2) return tasks
  g.player.affiliationTasks = [buildAffiliationSupplyTask(faction), buildAffiliationPatrolTask(faction), buildAffiliationLiaisonTask(faction)].sort(() => Math.random() - 0.5).slice(0, 2) as any[]
  g.player.affiliationTaskDay = g.world.day
  return g.player.affiliationTasks
}

export function getAffiliationTaskIssues(taskId: string): string[] {
  const ctx = getContext(); const g = ctx.game
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : []
  const task = tasks.find((e: any) => e.id === taskId) as any
  if (!task) return ['这份势力差使已经失效。']
  const faction = FACTION_MAP.get(task.factionId)
  if (!faction || g.player.affiliationId !== faction.id) return ['你当前已不在这方势力中。']
  const issues: string[] = []
  if (g.player.locationId !== faction.locationId) issues.push(`需先前往${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}`)
  if (task.kind === 'supply') { const cur = ctx.findInventoryEntry(task.itemId)?.quantity || 0; if (cur < task.quantity) issues.push(`缺少${getItem(task.itemId)?.name || task.itemId} ${task.quantity - cur}件`) }
  if (task.kind === 'patrol') { if (g.player.stamina < task.staminaCost) issues.push(`体力不足，还差${task.staminaCost - g.player.stamina}`); if (g.player.qi < task.qiCost) issues.push(`真气不足，还差${task.qiCost - g.player.qi}`) }
  if (task.kind === 'liaison') { const ls = ctx.getRegionStanding(faction.locationId); if (g.player.money < task.moneyCost) issues.push(`灵石不足，还差${task.moneyCost - g.player.money}`); if (ls < task.standingNeed) issues.push(`本地声望不足，还差${round(task.standingNeed - ls, 1)}`) }
  return issues
}
export function canCompleteAffiliationTask(taskId: string) { return getAffiliationTaskIssues(taskId).length === 0 }
export function explainAffiliationTask(taskId: string) { const i = getAffiliationTaskIssues(taskId); return i.length ? i.join('；') : '差使已经准备妥当。' }

export function completeAffiliationTask(taskId: string) {
  const ctx = getContext(); const g = ctx.game
  const tasks = Array.isArray(g.player.affiliationTasks) ? g.player.affiliationTasks : [] as any[]
  const task = tasks.find((e: any) => e.id === taskId) as any
  if (!task || !canCompleteAffiliationTask(taskId)) { ctx.appendLog('这份势力差使眼下还接不稳。', 'warn'); return }
  if (task.kind === 'supply') ctx.removeItemFromInventory(task.itemId, task.quantity)
  if (task.kind === 'patrol') { ctx.adjustResource('stamina', -task.staminaCost, 'maxStamina'); ctx.adjustResource('qi', -task.qiCost, 'maxQi') }
  if (task.kind === 'liaison') g.player.money -= task.moneyCost
  g.player.money += task.rewardMoney; g.player.reputation += task.rewardReputation
  adjustFactionStanding(task.factionId, task.rewardStanding)
  ctx.adjustRegionStanding(FACTION_MAP.get(task.factionId)?.locationId || g.player.locationId, task.rewardRegion)
  g.player.stats.affiliationTasksCompleted += 1
  g.player.affiliationTasks = tasks.filter((e: any) => e.id !== taskId)
  ctx.appendLog(`你替${FACTION_MAP.get(task.factionId)?.name || '势力'}办妥"${task.title}"，门路更稳了。`, 'loot')
}

/* ─── Faction Joining ─── */

export function getFactionJoinIssues(factionId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const faction = FACTION_MAP.get(factionId)
  if (!faction) return ['这方势力暂时无法接触。']
  const issues: string[] = []
  if (g.player.affiliationId === factionId) issues.push('你已经在这方势力中')
  const cooldownDays = getFactionRejoinCooldownDays(factionId)
  if (cooldownDays > 0) issues.push(`还需等待${cooldownDays}天才能重返这方势力`)
  if (g.player.locationId !== faction.locationId) issues.push(`需前往${LOCATION_MAP.get(faction.locationId)?.name || faction.locationId}`)
  if (g.player.money < faction.joinRequirement.money) issues.push(`灵石不足，还差${faction.joinRequirement.money - g.player.money}`)
  if (g.player.reputation < faction.joinRequirement.reputation) issues.push(`声望不足，还差${round(faction.joinRequirement.reputation - g.player.reputation, 1)}`)
  if (g.player.rankIndex < faction.joinRequirement.rankIndex) issues.push(`境界不足，需要${ctx.getRankData()?.name || '更高境界'}`)
  return issues
}
export function canJoinFaction(factionId: string) { return getFactionJoinIssues(factionId).length === 0 }
export function explainFactionJoin(factionId: string) { const i = getFactionJoinIssues(factionId); return i.length ? i.join('；') : '条件齐备，可以加入。' }

export function joinFaction(factionId: string) {
  const ctx = getContext(); const g = ctx.game; const faction = FACTION_MAP.get(factionId)
  if (!faction || !canJoinFaction(factionId)) { ctx.appendLog('眼下还没有资格加入这方势力。', 'warn'); return }
  const prev = FACTION_MAP.get(g.player.affiliationId)
  g.player.affiliationId = factionId; g.player.affiliationRank = 0
  delete getFactionCooldownMap()[factionId]
  g.player.factionStanding[factionId] = Math.max(g.player.factionStanding[factionId] || 0, 8)
  ctx.adjustRegionStanding(faction.locationId, 2.4)
  refreshAffiliationTasks(true)
  if (g.world.factions[factionId]) { g.world.factions[factionId].joined = true; g.world.factions[factionId].standing = g.player.factionStanding[factionId] }
  if (prev && prev.id !== factionId) ctx.appendLog(`你离开了${prev.name}，转而投向${faction.name}。`, 'npc')
  g.player.title = `${faction.name}${faction.titles[0]}`
  ctx.appendLog(`你正式加入${faction.name}，身份为"${faction.titles[0]}"。`, 'loot')
}

export function leaveFaction() {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId || '')
  if (!faction) { ctx.appendLog('你当前并未投身任何势力。', 'warn'); return }

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

/* ═══════════════════ Territory ═══════════════════ */

export function getPlayerFactionTerritories() {
  const ctx = getContext(); const pf = ctx.game.player.playerFaction; if (!pf) return []
  return Object.values(ctx.game.world.territories || {}).map(t => {
    const loc = LOCATION_MAP.get(t.locationId); if (!loc) return null
    const ctrl = t.controllerId === pf.id
    if (!ctrl && t.playerInfluence <= 0) return null
    return { ...t, location: loc, isControlled: ctrl, controllerName: getTerritoryControllerName(t) }
  }).filter(Boolean).sort((a: any, b: any) => Number(b.isControlled) - Number(a.isControlled) || b.playerInfluence - a.playerInfluence) as any[]
}

export function getPlayerFactionTerritoryTargets() {
  const ctx = getContext(); const pf = ctx.game.player.playerFaction; if (!pf) return []
  const current = ctx.getCurrentLocation()
  const ids = new Set(getPlayerFactionTerritories().map((e: any) => e.locationId))
  ;[current.id, ...(current.neighbors || [])].forEach(id => ids.add(id))
  return [...ids].map(id => {
    const loc = LOCATION_MAP.get(id); if (!loc) return null
    const t = getTerritoryState(id)
    const ctrl = t.controllerId === pf.id
    if (!ctrl && t.playerInfluence <= 0 && !isTradeHubLocation(id) && !loc.tags.includes('court') && !loc.tags.includes('pass') && !loc.tags.includes('sect')) return null
    return { ...t, location: loc, isControlled: ctrl, controllerName: getTerritoryControllerName(t) }
  }).filter(Boolean) as any[]
}

export function getPlayerTerritoryModifier(locationId: string) {
  const pf = getContext().game.player.playerFaction; if (!pf) return 0
  const t = getTerritoryState(locationId)
  if (t.controllerId === pf.id) return 0.08; if (t.playerInfluence >= 30) return 0.03; return 0
}

function getTerritoryCampaignBaseCost(locationId: string) {
  const loc = LOCATION_MAP.get(locationId)
  return { money: 72 + (loc?.marketTier || 0) * 26 + (loc?.tags.includes('court') ? 18 : 0) + (loc?.tags.includes('pass') ? 12 : 0), supplies: 8 + (loc?.danger || 0) + (loc?.tags.includes('court') ? 4 : 0), stamina: 12 + (loc?.danger || 0) * 2, guardNeed: 2 + ((loc?.danger || 0) >= 4 ? 1 : 0), runnerNeed: 1 + (loc?.tags.includes('market') || loc?.tags.includes('port') ? 1 : 0) }
}

export function getTerritoryCampaignIssues(locationId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; const t = getTerritoryState(locationId); const loc = LOCATION_MAP.get(locationId); const cost = getTerritoryCampaignBaseCost(locationId)
  if (!pf || !loc) return ['眼下还没有可争的地盘。']
  const issues: string[] = []
  if (g.player.locationId !== locationId) issues.push(`需先前往${loc.name}`)
  if (t.controllerId === pf.id) issues.push('这块地盘已经在你手里了')
  if (getFactionLiquidFunds() < cost.money) issues.push(`银钱不足，还差${cost.money - getFactionLiquidFunds()}`)
  if (pf.supplies < cost.supplies) issues.push(`补给不足，还差${cost.supplies - pf.supplies}`)
  if (g.player.stamina < cost.stamina) issues.push(`体力不足，还差${cost.stamina - g.player.stamina}`)
  if ((pf.crew?.guards || 0) < cost.guardNeed) issues.push(`护手不够，还差${cost.guardNeed - (pf.crew?.guards || 0)}`)
  if ((pf.crew?.runners || 0) < cost.runnerNeed) issues.push(`跑线人手不够，还差${cost.runnerNeed - (pf.crew?.runners || 0)}`)
  if (loc.tags.includes('court') && ctx.getRegionStanding(locationId) < 6) issues.push(`本地声望太浅，还差${round(6 - ctx.getRegionStanding(locationId), 1)}`)
  return issues
}
export function canLaunchTerritoryCampaign(id: string) { return getTerritoryCampaignIssues(id).length === 0 }
export function explainTerritoryCampaign(id: string) { const i = getTerritoryCampaignIssues(id); return i.length ? i.join('；') : '人手和银路都已备齐，可以争这条线。' }

export function launchTerritoryCampaign(locationId: string) {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction!; const t = getTerritoryState(locationId); const loc = LOCATION_MAP.get(locationId)!; const cost = getTerritoryCampaignBaseCost(locationId)
  if (!canLaunchTerritoryCampaign(locationId)) { ctx.appendLog('这条地盘眼下还抢不下来。', 'warn'); return }
  spendFactionLiquidFunds(cost.money); pf.supplies = Math.max(0, pf.supplies - cost.supplies); ctx.adjustResource('stamina', -cost.stamina, 'maxStamina')
  const nearby = getPlayerFactionTerritories().filter((e: any) => e.isControlled && e.location.neighbors.includes(locationId)).length
  const power = pf.level * 9 + (pf.crew?.guards || 0) * 5 + (pf.crew?.runners || 0) * 2 + (pf.crew?.brokers || 0) * 2 + (pf.branches?.watch || 0) * 6 + (pf.branches?.caravan || 0) * 3 + nearby * 6 + (pf.members?.length || 0) * 1.5 + ctx.getRegionStanding(locationId) * 1.3
  const defense = t.stability + (loc.marketTier || 0) * 7 + (loc.tags.includes('court') ? 14 : 0) + (loc.tags.includes('pass') ? 8 : 0) + (t.controllerId && t.controllerId !== pf.id ? 8 : 0)
  const delta = power + randomInt(-14, 14) - defense
  if (delta >= 0) {
    t.playerInfluence = clamp(t.playerInfluence + 18 + Math.max(4, Math.round(delta * 0.45)), 0, 100); t.stability = clamp(t.stability - 6, 10, 120)
    pf.influence += 3.6; pf.prestige += 2.4; ctx.adjustRegionStanding(locationId, 1.2)
    if (t.playerInfluence >= 60) { t.controllerId = pf.id; t.playerInfluence = Math.max(t.playerInfluence, 64); ctx.appendLog(`你在${loc.name}压住了地头，把这条门路正式夺进了${pf.name}手里。`, 'loot') }
    else ctx.appendLog(`你在${loc.name}撬开了一道口子，${pf.name}已经插手这条线。`, 'loot')
    return
  }
  t.playerInfluence = clamp(t.playerInfluence + Math.max(0, 4 + delta), 0, 100); t.stability = clamp(t.stability + 4, 10, 120)
  pf.prestige = Math.max(0, pf.prestige - 0.8)
  ctx.appendLog(`你在${loc.name}试着争路，却被${getTerritoryControllerName(t)}压了回来。`, 'warn')
}

export function getTerritoryStabilizeIssues(locationId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; const t = getTerritoryState(locationId); const loc = LOCATION_MAP.get(locationId)
  if (!pf || !loc) return ['眼下没有可稳固的地盘。']
  const issues: string[] = []; const mc = 38 + (loc.marketTier || 0) * 12; const sc = 5 + (loc.tags.includes('pass') ? 2 : 0)
  if (g.player.locationId !== locationId) issues.push(`需先前往${loc.name}`)
  if (t.controllerId !== pf.id && t.playerInfluence <= 0) issues.push('你在这里还没有站住脚')
  if (getFactionLiquidFunds() < mc) issues.push(`银钱不足，还差${mc - getFactionLiquidFunds()}`)
  if (pf.supplies < sc) issues.push(`补给不足，还差${sc - pf.supplies}`)
  return issues
}
export function canStabilizeTerritory(id: string) { return getTerritoryStabilizeIssues(id).length === 0 }
export function explainStabilizeTerritory(id: string) { const i = getTerritoryStabilizeIssues(id); return i.length ? i.join('；') : '门路已经铺住，可以继续压稳。' }

export function stabilizeTerritory(locationId: string) {
  const pf = getContext().game.player.playerFaction!; const t = getTerritoryState(locationId); const loc = LOCATION_MAP.get(locationId)!
  if (!canStabilizeTerritory(locationId)) { getContext().appendLog('这块地盘眼下还稳不下来。', 'warn'); return }
  const mc = 38 + (loc.marketTier || 0) * 12; const sc = 5 + (loc.tags.includes('pass') ? 2 : 0)
  spendFactionLiquidFunds(mc); pf.supplies = Math.max(0, pf.supplies - sc)
  t.playerInfluence = clamp(t.playerInfluence + 12 + (pf.branches?.watch || 0) * 2, 0, 100); t.stability = clamp(t.stability + 8, 10, 120)
  if (t.controllerId !== pf.id && t.playerInfluence >= 60) { t.controllerId = pf.id; getContext().appendLog(`你把${loc.name}的人情、货路和地头一并压稳，正式立住了${pf.name}的旗。`, 'loot'); return }
  getContext().appendLog(`你在${loc.name}又压实了一层门路，${pf.name}的根脚更深了。`, 'info')
}

/* ═══════════════════ Player Faction ═══════════════════ */

export function getCreatePlayerFactionIssues(): string[] {
  const g = getContext().game; const issues: string[] = []
  if (g.player.playerFaction) issues.push('你已经有自家势力了')
  if (g.player.rankIndex < 1) issues.push('至少要有练力修为，才能扛住初期摊子')
  if (g.player.reputation < 22) issues.push(`声望不足，还差${round(22 - g.player.reputation, 1)}`)
  if (g.player.money < 900) issues.push(`灵石不足，还差${900 - g.player.money}`)
  return issues
}
export function canCreatePlayerFaction() { return getCreatePlayerFactionIssues().length === 0 }
export function explainCreatePlayerFaction() { const i = getCreatePlayerFactionIssues(); return i.length ? i.join('；') : '已经够资格拉起自己的势力了。' }

function buildPlayerFactionRouteMission(pf: any) { return createTask('playerFaction', 'route', { title: '押下一条货线', desc: `给${pf.name}的商队拨一笔压货银，先把新货线滚起来。`, moneyCost: 92, suppliesCost: 6, runnerNeed: 2, rewardTreasury: 118, rewardSupplies: 10, rewardInfluence: 2.8, rewardPrestige: 1.4 }) }
function buildPlayerFactionRecruitMission(pf: any) { const roles = ['runners', 'guards', 'brokers']; const role = roles[randomInt(0, roles.length - 1)]; const labels: Record<string, string> = { runners: '脚夫和跑线手', guards: '押队护手', brokers: '掮客和账房' }; return createTask('playerFaction', 'recruit', { title: `添募${labels[role]}`, desc: `给${pf.name}再添一批${labels[role]}，让摊子不只靠你一人撑。`, role, moneyCost: 68, rewardCrew: 1, rewardInfluence: 1.8, rewardPrestige: 1.2 }) }
function buildPlayerFactionOfficeMission(pf: any) { return createTask('playerFaction', 'office', { title: '打点本地门路', desc: `借官面或地头去给${pf.name}打点一圈，把下一段路走顺。`, moneyCost: 54, standingNeed: 6, rewardInfluence: 4.2, rewardPrestige: 2.2, rewardRegion: 1.4, rewardSupplies: 4 }) }

export function refreshPlayerFactionMissions(force = false) {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; if (!pf) return []
  const missions = Array.isArray(pf.missions) ? pf.missions : [] as any[]
  if (!force && pf.missionDay === g.world.day && missions.length >= 3) return missions
  pf.missions = [buildPlayerFactionRouteMission(pf), buildPlayerFactionRecruitMission(pf), buildPlayerFactionOfficeMission(pf)] as any[]
  pf.missionDay = g.world.day; return pf.missions
}

export function createPlayerFaction() {
  const ctx = getContext(); const g = ctx.game
  if (!canCreatePlayerFaction()) { ctx.appendLog('现在还扛不起自建势力的盘子。', 'warn'); return }
  const name = createFactionName(); g.player.money -= 900
  g.player.playerFaction = ctx.createInitialPlayerFaction(name)
  g.player.playerFaction!.foundedDay = g.world.day; g.player.playerFaction!.headquartersLocationId = g.player.locationId
  g.player.playerFaction!.treasury = 180; g.player.playerFaction!.supplies = 42; g.player.playerFaction!.influence = 8
  const t = getTerritoryState(g.player.locationId); t.playerInfluence = Math.max(t.playerInfluence, 28)
  if (!t.controllerId) t.controllerId = g.player.playerFaction!.id
  refreshPlayerFactionMissions(true)
  ctx.appendLog(`你在${ctx.getCurrentLocation().name}拉起了自己的势力"${name}"。`, 'loot')
}

export function upgradePlayerFactionBranch(branchKey: string) {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; const branch = PLAYER_FACTION_BRANCHES[branchKey]
  if (!pf || !branch) { ctx.appendLog('眼下还没有可升级的势力支线。', 'warn'); return }
  const lvl = pf.branches[branchKey as keyof typeof pf.branches] || 0; const cost = branch.baseCost * (lvl + 1)
  if (g.player.money < cost) { ctx.appendLog(`扩充${branch.label}需要${cost}灵石。`, 'warn'); return }
  g.player.money -= cost; (pf.branches as any)[branchKey] = lvl + 1; pf.prestige += 2 + lvl; pf.influence += 1.2 + lvl * 0.4
  ctx.appendLog(`你的势力把${branch.label}扩到了 ${lvl + 1} 级。`, 'loot')
}

export function getRecruitFactionMemberIssues(npcId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; const npc = ctx.getNpc(npcId); const rel = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前不在江湖册录中。']
  const issues: string[] = []
  if (!pf) issues.push('你尚未拉起自己的势力')
  if (pf?.members.includes(npcId)) issues.push('对方已经是你势力中的骨干了')
  if (npc.locationId !== g.player.locationId) issues.push('人不在眼前，暂时谈不成')
  if (rel.affinity < 16) issues.push(`好感不足，还差${16 - rel.affinity}`)
  if (rel.trust < 14) issues.push(`信任不足，还差${14 - rel.trust}`)
  if (g.player.money < 36) issues.push(`安家与盘缠还差${36 - g.player.money}灵石`)
  return issues
}
export function canRecruitFactionMember(id: string) { return getRecruitFactionMemberIssues(id).length === 0 }
export function explainRecruitFactionMember(id: string) { const i = getRecruitFactionMemberIssues(id); return i.length ? i.join('；') : '对方已经愿意来你帐下做事。' }

export function recruitFactionMember(npcId: string) {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction!; const npc = ctx.getNpc(npcId)!
  if (!canRecruitFactionMember(npcId)) { ctx.appendLog('这位江湖人暂时还不愿替你做事。', 'warn'); return }
  g.player.money -= 36; pf.members.push(npcId); pf.influence += 1.8; pf.prestige += 1
  npc.factionId = pf.id; npc.lastEvent = `投到${pf.name}门下做事`
  ctx.adjustRelation(npcId, { affinity: 4, trust: 6 }); g.player.stats.factionMembersRecruited += 1
  ctx.appendLog(`${npc.name}改投${pf.name}，成了你麾下的骨干。`, 'loot')
}

export function getPlayerFactionMissionIssues(missionId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction
  const missions = Array.isArray(pf?.missions) ? pf!.missions : [] as any[]
  const mission = missions.find((e: any) => e.id === missionId) as any
  if (!pf || !mission) return ['这份势力任务已经失效。']
  const issues: string[] = []
  if (mission.kind === 'route') {
    if (!isTradeHubLocation(g.player.locationId)) issues.push('要在市镇、港口或驿路上才能压这条货线')
    if (g.player.money < mission.moneyCost) issues.push(`灵石不足，还差${mission.moneyCost - g.player.money}`)
    if ((pf.supplies || 0) < mission.suppliesCost) issues.push(`补给不足，还差${mission.suppliesCost - pf.supplies}`)
    if ((pf.crew?.runners || 0) < mission.runnerNeed) issues.push(`脚夫不够，还差${mission.runnerNeed - (pf.crew?.runners || 0)}`)
  }
  if (mission.kind === 'recruit') { if (g.player.money < mission.moneyCost) issues.push(`招募本钱不足，还差${mission.moneyCost - g.player.money}`) }
  if (mission.kind === 'office') {
    if (!getGovernmentOfficeName(g.player.locationId)) issues.push('要在有官衙驻点的地方才能打点')
    if (g.player.money < mission.moneyCost) issues.push(`打点银不足，还差${mission.moneyCost - g.player.money}`)
    if (ctx.getRegionStanding(g.player.locationId) < mission.standingNeed) issues.push(`本地声望不足，还差${round(mission.standingNeed - ctx.getRegionStanding(g.player.locationId), 1)}`)
  }
  return issues
}
export function canCompletePlayerFactionMission(id: string) { return getPlayerFactionMissionIssues(id).length === 0 }
export function explainPlayerFactionMission(id: string) { const i = getPlayerFactionMissionIssues(id); return i.length ? i.join('；') : '这份势力差事已经铺好了。' }

export function completePlayerFactionMission(missionId: string) {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction!
  const missions = Array.isArray(pf?.missions) ? pf.missions : [] as any[]
  const mission = missions.find((e: any) => e.id === missionId) as any
  if (!mission || !canCompletePlayerFactionMission(missionId)) { ctx.appendLog('这份自家势力任务眼下还接不稳。', 'warn'); return }
  g.player.money -= mission.moneyCost || 0
  if (mission.suppliesCost) pf.supplies = Math.max(0, pf.supplies - mission.suppliesCost)
  if (mission.kind === 'recruit') { (pf.crew as any)[mission.role] = ((pf.crew as any)[mission.role] || 0) + mission.rewardCrew; g.player.stats.factionMembersRecruited += mission.rewardCrew }
  pf.treasury += mission.rewardTreasury || 0; pf.supplies = clamp(pf.supplies + (mission.rewardSupplies || 0), 0, 180)
  pf.influence += mission.rewardInfluence || 0; pf.prestige += mission.rewardPrestige || 0
  if (mission.rewardRegion) ctx.adjustRegionStanding(g.player.locationId, mission.rewardRegion)
  g.player.stats.factionTasksCompleted += 1; pf.missions = missions.filter((e: any) => e.id !== missionId) as any[]
  ctx.appendLog(`你替${pf.name}办妥"${mission.title}"，摊子又往外伸了一截。`, 'loot')
}

export function processPlayerFactionTick() {
  const ctx = getContext(); const g = ctx.game; const pf = g.player.playerFaction; if (!pf) return
  if (pf.eventCooldown > 0) pf.eventCooldown -= 1
  refreshPlayerFactionMissions(g.world.hour === 0)
  if (g.world.hour !== 0) return
  const crew = pf.crew || { runners: 0, guards: 0, brokers: 0 }
  const branchTotal = Object.values(pf.branches || {}).reduce((s, v) => s + v, 0)
  const upkeep = (crew.runners || 0) * 2 + (crew.guards || 0) * 2 + (crew.brokers || 0) + branchTotal * 2
  const revenue = 6 + (crew.brokers || 0) * 5 + (pf.branches.caravan || 0) * 7 + (pf.members?.length || 0) * 3
  const supplyDelta = 3 + (pf.branches.safehouse || 0) * 3 - Math.max(1, Math.round(upkeep * 0.35))
  let territoryRevenue = 0; let controlledCount = 0
  Object.values(g.world.territories || {}).forEach(t => {
    const loc = LOCATION_MAP.get(t.locationId); if (!loc) return
    const watchCover = (pf.branches.watch || 0) + Math.floor((crew.guards || 0) / 2)
    if (t.controllerId === pf.id) {
      controlledCount += 1
      territoryRevenue += 4 + (loc.marketTier || 0) * 3 + (isTradeHubLocation(loc.id) ? 3 : 1) + (loc.tags.includes('pass') ? 2 : 0)
      t.playerInfluence = clamp(t.playerInfluence - Math.max(1, Math.round(4 - watchCover * 0.35)), 0, 100)
      t.stability = clamp(t.stability + 1 + (pf.branches.watch || 0), 10, 120)
      if (t.playerInfluence < 38) { t.controllerId = t.incumbentId || null; ctx.appendLog(`${pf.name}在${loc.name}的脚跟松了，这条线又被地头势力夺了回去。`, 'warn') }
      return
    }
    if (t.playerInfluence > 0) { const fade = Math.max(1, Math.round(t.stability / 40) - Math.floor((pf.branches.watch || 0) / 2)); t.playerInfluence = clamp(t.playerInfluence - fade, 0, 100) }
  })
  pf.treasury += Math.max(0, revenue - upkeep) + territoryRevenue
  pf.supplies = clamp(pf.supplies + supplyDelta, 0, 180)
  pf.influence += 0.6 + (pf.branches.watch || 0) * 0.5 + controlledCount * 0.4; pf.prestige += controlledCount * 0.25
  if (pf.supplies <= 10) { pf.prestige = Math.max(0, pf.prestige - 1); ctx.appendLog(`${pf.name}补给吃紧，手下人做事开始慢了。`, 'warn') }
  if (pf.prestige >= pf.level * 16) { pf.level += 1; ctx.appendLog(`${pf.name}的势力盘子越滚越稳，升到了 ${pf.level} 级。`, 'loot') }
}

/* ═══════════════════ Sect ═══════════════════ */

function getSectMissions(): any[] { const sect = getContext().game.player.sect; if (!sect) return []; sect.missions = Array.isArray(sect.missions) ? sect.missions : []; return sect.missions }

function buildSectGranaryMission(sect: any) { return createTask('sect', 'granary', { title: '补宗门粮库', desc: `给${sect.name}补一批口粮和药草，门内杂役与弟子才能安稳过日子。`, grainNeed: 3, herbNeed: 1, rewardFood: 22, rewardTreasury: 18, rewardPrestige: 2.4, rewardReputation: 0.8 }) }
function buildSectLectureMission(sect: any) { return createTask('sect', 'lecture', { title: '开一场讲经课', desc: `抽时间给${sect.name}门下开讲经课，稳住门风也带一带弟子。`, qiCost: 10, discipleNeed: 1, rewardPrestige: 3.4, rewardTreasury: 16, rewardTeaching: 1.6 }) }
function buildSectRecruitMission(sect: any) { return createTask('sect', 'recruit', { title: '招募外门弟子', desc: `拿一笔安置银去招一批外门新丁，让${sect.name}真正像个宗门。`, moneyCost: 88, reputationNeed: 40, rewardOuter: 1, rewardPrestige: 2.8, rewardFood: 6 }) }

export function refreshSectMissions(force = false) {
  const ctx = getContext(); const sect = ctx.game.player.sect; if (!sect) return []
  const missions = getSectMissions()
  if (!force && sect.missionDay === ctx.game.world.day && missions.length >= 3) return missions
  sect.missions = [buildSectGranaryMission(sect), buildSectLectureMission(sect), buildSectRecruitMission(sect)] as any[]
  sect.missionDay = ctx.game.world.day; return sect.missions
}

export function getSectMissionIssues(missionId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const sect = g.player.sect; const mission = getSectMissions().find((e: any) => e.id === missionId) as any
  if (!sect || !mission) return ['这份宗门差使已经失效。']
  const issues: string[] = []
  if (mission.kind === 'granary') { const grain = ctx.findInventoryEntry('spirit-grain')?.quantity || 0; const herb = ctx.findInventoryEntry('mist-herb')?.quantity || 0; if (grain < mission.grainNeed) issues.push(`粗灵米还差${mission.grainNeed - grain}`); if (herb < mission.herbNeed) issues.push(`雾心草还差${mission.herbNeed - herb}`) }
  if (mission.kind === 'lecture') { if (sect.disciples.length < mission.discipleNeed) issues.push('门下还没有能听课的亲传弟子'); if (!sect.manualLibrary.length) issues.push('藏经阁暂无可开的经课'); if (g.player.qi < mission.qiCost) issues.push(`真气不足，还差${mission.qiCost - g.player.qi}`); if (!LOCATION_MAP.get(g.player.locationId)?.tags.includes('sect')) issues.push('最好回到行院或宗门据点开课') }
  if (mission.kind === 'recruit') { if (g.player.money < mission.moneyCost) issues.push(`安置银不足，还差${mission.moneyCost - g.player.money}`); if (g.player.reputation < mission.reputationNeed) issues.push(`声望不足，还差${round(mission.reputationNeed - g.player.reputation, 1)}`) }
  return issues
}
export function canCompleteSectMission(id: string) { return getSectMissionIssues(id).length === 0 }
export function explainSectMission(id: string) { const i = getSectMissionIssues(id); return i.length ? i.join('；') : '这份宗门差使可以着手处理。' }

export function completeSectMission(missionId: string) {
  const ctx = getContext(); const g = ctx.game; const sect = g.player.sect!; const missions = getSectMissions(); const mission = missions.find((e: any) => e.id === missionId) as any
  if (!mission || !canCompleteSectMission(missionId)) { ctx.appendLog('这份宗门差使眼下还办不成。', 'warn'); return }
  if (mission.kind === 'granary') { ctx.removeItemFromInventory('spirit-grain', mission.grainNeed); ctx.removeItemFromInventory('mist-herb', mission.herbNeed) }
  if (mission.kind === 'lecture') { ctx.adjustResource('qi', -mission.qiCost, 'maxQi'); sect.teachings.forEach((t: any) => { t.progress += mission.rewardTeaching }) }
  if (mission.kind === 'recruit') { g.player.money -= mission.moneyCost; sect.outerDisciples += mission.rewardOuter }
  sect.food = clamp(sect.food + (mission.rewardFood || 0), 0, 240); sect.treasury += mission.rewardTreasury || 0; sect.prestige += mission.rewardPrestige || 0
  g.player.reputation += mission.rewardReputation || 0; g.player.stats.sectTasksCompleted += 1
  sect.missions = missions.filter((e: any) => e.id !== missionId) as any[]
  ctx.appendLog(`你替${sect.name}办妥"${mission.title}"，宗门根基更稳了。`, 'loot')
}

export function createSect() {
  const ctx = getContext(); const g = ctx.game
  if (g.player.sect) { ctx.appendLog('你已经建立了自己的宗门。', 'warn'); return }
  if (g.player.rankIndex < 4) { ctx.appendLog('你还只是江湖中人，离自立宗门差得太远。', 'warn'); return }
  if (!ctx.findInventoryEntry('sect-banner')) { ctx.appendLog('建宗至少要备好一面宗门旗幡。', 'warn'); return }
  if (g.player.reputation < 68 || g.player.money < 3800) { ctx.appendLog('建宗需要筑基以上名望、足够灵石和真正的立宗资格。', 'warn'); return }
  const name = createSectName(); g.player.money -= 3800; ctx.removeItemFromInventory('sect-banner', 1)
  g.player.sect = ctx.createInitialSect(name); g.player.sect!.foundedDay = g.world.day; g.player.sect!.treasury = 420
  g.player.sect!.manualLibrary = g.player.inventory.filter(e => getItem(e.itemId)?.type === 'manual').slice(0, 1).map(e => e.itemId)
  refreshSectMissions(true); g.player.reputation += 6
  ctx.appendLog(`你正式开宗立门，宗门"${name}"就此开宗。`, 'loot')
}

export function upgradeSectBuilding(buildingKey: string) {
  const ctx = getContext(); const g = ctx.game
  if (!g.player.sect) { ctx.appendLog('你尚未建立宗门。', 'warn'); return }
  const building = SECT_BUILDINGS[buildingKey as keyof typeof SECT_BUILDINGS]; if (!building) return
  const lvl = g.player.sect.buildings[buildingKey as keyof typeof g.player.sect.buildings] || 0; const cost = building.baseCost * (lvl + 1)
  if (g.player.money < cost) { ctx.appendLog(`升级${building.label}需要${cost}灵石。`, 'warn'); return }
  g.player.money -= cost; (g.player.sect.buildings as any)[buildingKey] = lvl + 1; g.player.sect.prestige += 2 + lvl
  ctx.appendLog(`${building.label}升至 ${lvl + 1} 级。`, 'info')
}

/* ─── Disciple, Master, Partner, Rival ─── */

export function getRecruitDiscipleIssues(npcId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const npc = ctx.getNpc(npcId); const rel = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前不在江湖册录中。']
  const issues: string[] = []
  if (!g.player.sect) issues.push('你尚未建立宗门')
  if (g.player.sect?.disciples.includes(npcId)) issues.push('对方已经是门下弟子')
  if (rel.affinity < 24) issues.push(`好感不足，还差${24 - rel.affinity}`)
  if (rel.trust < 18) issues.push(`信任不足，还差${18 - rel.trust}`)
  if (npc.rankIndex > g.player.rankIndex + 1) issues.push('对方修为过高，暂时不愿屈就')
  return issues
}
export function canRecruitDisciple(id: string) { return getRecruitDiscipleIssues(id).length === 0 }
export function explainRecruitDisciple(id: string) { const i = getRecruitDiscipleIssues(id); return i.length ? i.join('；') : '缘分已到，可以收入门墙。' }

export function recruitDisciple(npcId: string) {
  const ctx = getContext(); const npc = ctx.getNpc(npcId)!
  if (!canRecruitDisciple(npcId)) { ctx.appendLog('对方还没有认可到愿意入你门墙的程度。', 'warn'); return }
  ctx.game.player.sect!.disciples.push(npcId); npc.masterId = 'player'; npc.sectId = ctx.game.player.sect!.id
  ctx.adjustRelation(npcId, { role: 'apprentice', affinity: 8, trust: 10 }); ctx.game.player.sect!.prestige += 3
  ctx.appendLog(`${npc.name}正式拜入${ctx.game.player.sect!.name}，成为门下弟子。`, 'loot')
}

export function getMasterBondIssues(npcId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const npc = ctx.getNpc(npcId); const rel = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前无法结成师承。']
  const issues: string[] = []
  if (g.player.masterId || rel.role === 'master') issues.push('你已经有师承了')
  if (npc.rankIndex < g.player.rankIndex + 1) issues.push('对方修为还不足以收你为徒')
  if (rel.affinity < 18) issues.push(`好感不足，还差${18 - rel.affinity}`)
  if (rel.trust < 22) issues.push(`信任不足，还差${22 - rel.trust}`)
  return issues
}
export function canBecomeMaster(id: string) { return getMasterBondIssues(id).length === 0 }
export function explainMasterBond(id: string) { const i = getMasterBondIssues(id); return i.length ? i.join('；') : '对方已经愿意收你入门。' }

export function becomeMasterBond(npcId: string) {
  const ctx = getContext(); const npc = ctx.getNpc(npcId)!
  if (!canBecomeMaster(npcId)) { ctx.appendLog('对方还未到愿意收你入门的地步。', 'warn'); return }
  ctx.game.player.masterId = npcId; npc.apprenticeIds = npc.apprenticeIds || []
  if (!npc.apprenticeIds.includes('player')) npc.apprenticeIds.push('player')
  ctx.adjustRelation(npcId, { role: 'master', affinity: 6, trust: 8 })
  ctx.appendLog(`${npc.name}收你为门下弟子，今后可获更多指点。`, 'loot')
}

export function getPartnerBondIssues(npcId: string): string[] {
  const ctx = getContext(); const g = ctx.game; const npc = ctx.getNpc(npcId); const rel = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前无法结成道侣。']
  const issues: string[] = []
  if (g.player.partnerId || rel.role === 'partner') issues.push('你已经有道侣了')
  if (rel.affinity < 36) issues.push(`好感不足，还差${36 - rel.affinity}`)
  if (rel.trust < 32) issues.push(`信任不足，还差${32 - rel.trust}`)
  if (rel.romance < 26) issues.push(`情缘不足，还差${26 - rel.romance}`)
  return issues
}
export function canBecomePartner(id: string) { return getPartnerBondIssues(id).length === 0 }
export function explainPartnerBond(id: string) { const i = getPartnerBondIssues(id); return i.length ? i.join('；') : '水到渠成，可以结为道侣。' }

export function becomePartner(npcId: string) {
  const ctx = getContext(); const npc = ctx.getNpc(npcId)!
  if (!canBecomePartner(npcId)) { ctx.appendLog('你们之间的情分还未到水到渠成的程度。', 'warn'); return }
  ctx.game.player.partnerId = npcId; npc.partnerId = 'player'
  ctx.adjustRelation(npcId, { role: 'partner', affinity: 8, trust: 8, romance: 10 })
  if (ctx.findInventoryEntry('bond-token')) ctx.removeItemFromInventory('bond-token', 1)
  ctx.appendLog(`你与${npc.name}互许道心，正式结为道侣。`, 'loot')
}

export function declareRival(npcId: string) {
  const ctx = getContext(); const npc = ctx.getNpc(npcId); if (!npc) return
  const rel = ctx.ensurePlayerRelation(npcId); rel.role = 'rival'; rel.rivalry = clamp(rel.rivalry + 28, 0, 100); rel.affinity = clamp(rel.affinity - 18, -100, 100)
  if (!ctx.game.player.rivalIds.includes(npcId)) ctx.game.player.rivalIds.push(npcId)
  ctx.appendLog(`你与${npc.name}彻底撕破脸，今后必有争斗。`, 'warn')
}

export function assignTeaching(npcId: string, manualId: string) {
  const ctx = getContext(); const g = ctx.game
  if (!g.player.sect) { ctx.appendLog('你尚未建立宗门，无法传功。', 'warn'); return }
  if (!g.player.sect.disciples.includes(npcId)) { ctx.appendLog('只有宗门弟子才能接受正式传功。', 'warn'); return }
  if (!g.player.sect.manualLibrary.includes(manualId)) { ctx.appendLog('该功法尚未收入藏经阁。', 'warn'); return }
  const existing = g.player.sect.teachings.find(t => t.npcId === npcId)
  if (existing) { existing.manualId = manualId; existing.progress = 0 }
  else g.player.sect.teachings.push({ npcId, manualId, progress: 0 })
  ctx.appendLog(`你安排${ctx.getNpc(npcId)?.name || '弟子'}研习${getItem(manualId)?.name || '功法'}。`, 'info')
}

export function processSectTick() {
  const ctx = getContext(); const g = ctx.game; if (!g.player.sect) return
  const sect = g.player.sect
  if (sect.eventCooldown > 0) sect.eventCooldown -= 1
  refreshSectMissions(g.world.hour === 0)
  sect.teachings.forEach(teaching => {
    const npc = ctx.getNpc(teaching.npcId); if (!npc) return
    teaching.progress += 1 + sect.buildings.library * 0.5
    if (teaching.progress >= 4) {
      teaching.progress = 0; npc.cultivation += 10 + sect.buildings.dojo * 3; sect.prestige += 1; g.player.stats.disciplesTaught += 1
      if (Math.random() < 0.32) { const t = sample(SECT_EVENT_TEMPLATES.filter(e => e.id === 'teaching-progress')); ctx.appendLog(t.text.split('{npc}').join(npc.name), t.type) }
    }
  })
  if (g.world.hour === 0) {
    const dw = sect.disciples.length + (sect.outerDisciples || 0) * 0.5
    const tribute = 4 + sect.buildings.market * 3 + Math.round(dw * 3)
    const foodDelta = 4 + sect.buildings.hall * 2 - Math.max(2, Math.round(dw))
    sect.treasury += tribute; sect.food = clamp(sect.food + foodDelta, 0, 240)
    if (tribute > 0) { const t = sample(SECT_EVENT_TEMPLATES.filter(e => e.id === 'tribute')); ctx.appendLog(t.text.split('{value}').join(String(tribute)), t.type) }
    if (sect.food <= 8) { sect.prestige = Math.max(0, sect.prestige - 1.2); ctx.appendLog(`${sect.name}粮草紧张，门内人心略有浮动。`, 'warn') }
    if (sect.prestige >= sect.level * 18) { sect.level += 1; ctx.appendLog(`${sect.name}名望提升，宗门升至 ${sect.level} 级。`, 'loot') }
  }
}
