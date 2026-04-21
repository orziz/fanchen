import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { addPlayerMetric } from '@/core/integerProgress'
import type { PlayerState, TravelPlanState } from '@/types/game'
import {
  LOCATION_MAP, LOCATIONS, TRAVEL_EVENT_TEMPLATES, DISTRIBUTABLE_ITEMS, TIME_LABELS,
  ACTION_META, PLAYER_SECT_ENABLED, REALM_TEMPLATES, WORLD_EVENT_TEMPLATES,
} from '@/config'
import { sample, randomInt, fillTemplate, findRoute as resolveRoute, round } from '@/utils'
import { applyPassiveAction, attemptBreakthrough, revivePlayer } from './player'
import { autoCombatTick, maybeStartEncounter, startPursuitEncounter, challengeRealm } from './combat'
import { advanceTradeRun, resolvePassiveTrade, isTradeHub, maybeStartBestTradeRun } from './trade'
import { resolveAuctionVisit, resolveAuctionTurn, refreshMarketIfNeeded, maybeActivateRealm } from './auction'
import { hasActiveFactionPursuit, processRelationshipTick, processSectTick, processPlayerFactionTick, processFactionStatusTick, processTerritoryStatusTick } from './social'
import { meetNpcsAtLocation, processNpcLifeTick, runNpcAI } from './npc'
import { processIndustryTick } from './industry'
import { processWorldEconomyTick } from './worldEconomy'

/* ─── Travel Events ─── */

function triggerTravelEvent(location: ReturnType<typeof LOCATION_MAP.get>) {
  if (!location) return
  const ctx = getContext()
  const event = sample(TRAVEL_EVENT_TEMPLATES)
  if (event.kind === 'money') {
    const value = randomInt(12, 28)
    ctx.game.player.money += value
    ctx.appendLog(fillTemplate(event.text, { location: location.name, value }), 'loot')
    return
  }
  if (event.kind === 'item') {
    const pool = location.marketBias
      ? DISTRIBUTABLE_ITEMS.filter(i => i.tier <= (location.marketTier || 0) + 1 && (i.type === location.marketBias || Math.random() < 0.25))
      : DISTRIBUTABLE_ITEMS.filter(i => i.tier <= (location.marketTier || 0) + 1)
    const item = sample(pool.length ? pool : DISTRIBUTABLE_ITEMS)
    ctx.addItemToInventory(item.id, 1)
    ctx.appendLog(fillTemplate(event.text, { terrain: location.terrain, item: item.name }), 'loot')
    return
  }
  ctx.adjustResource('hp', -randomInt(4, 10), 'maxHp')
  ctx.adjustResource('qi', -randomInt(2, 8), 'maxQi')
  addPlayerMetric('breakthrough', 1.5)
  ctx.appendLog(event.text, 'warn')
}

function maybeTriggerFactionPursuit(source: 'travel' | 'hunt' | 'quest') {
  const ctx = getContext()
  const player = ctx.game.player
  if (!player.wantedByFactionId || !hasActiveFactionPursuit(player.wantedByFactionId) || ctx.game.combat.currentEnemy) return false
  const chance = source === 'travel' ? 0.34 : source === 'quest' ? 0.28 : 0.24
  if (Math.random() < chance) {
    startPursuitEncounter(player.wantedByFactionId, source)
    return true
  }
  return false
}

const YANPASS_CURFEW_HOURS = new Set([10, 11, 0, 1])

interface TravelOptions {
  advanceNow?: boolean
  consumeTime?: boolean
  pendingAction?: string | null
  silent?: boolean
}

interface TravelPreview {
  route: string[] | null
  segments: number
  viaIds: string[]
  blockedReason: string | null
  nextStopId: string | null
}

interface TravelAdvanceResult {
  moved: boolean
  arrived: boolean
  waiting: boolean
  pendingAction: string | null
}

function canUseYanpassFastTrack(player: PlayerState) {
  return player.affiliationId === 'yanpass-escort'
    || (player.factionStanding['yanpass-escort'] || 0) >= 6
    || Boolean(player.tradeRun)
    || Boolean(player.playerFaction?.branches.caravan)
}

function canEnterJadegate(player: PlayerState) {
  return player.affiliationId === 'jadegate-courtyard'
    || (player.factionStanding['jadegate-courtyard'] || 0) >= 12
    || player.rankIndex >= 2
    || player.reputation >= 16
    || Boolean(player.sect)
}

function getPlayerTravelBlockReason(fromId: string, toId: string) {
  const ctx = getContext()
  const player = ctx.game.player
  if (toId === 'yanpass' && YANPASS_CURFEW_HOURS.has(ctx.game.world.hour) && !canUseYanpassFastTrack(player)) {
    return '雁回关夜里闭阖，没有边关门路或押货照验时会被拦在关外。'
  }
  if (toId === 'jadegate' && !canEnterJadegate(player)) {
    return '玉阙行院只认引荐和名望，当前门路还不够硬。'
  }
  if (fromId === 'snowpeak' && toId === 'jadegate' && player.rankIndex < 1) {
    return '寒魄峰往玉阙的山道灵压太重，至少得有练力底子。'
  }
  return null
}

function resolvePlayerRoute(startId: string, endId: string): TravelPreview {
  const route = resolveRoute(startId, endId, {
    canTraverse(fromId, toId) {
      return !getPlayerTravelBlockReason(fromId, toId)
    },
  })
  if (route) {
    return {
      route,
      segments: Math.max(1, route.length - 1),
      viaIds: route.slice(1, -1),
      blockedReason: null,
      nextStopId: route[1] || null,
    }
  }

  const staticRoute = resolveRoute(startId, endId)
  if (staticRoute) {
    for (let index = 0; index < staticRoute.length - 1; index += 1) {
      const reason = getPlayerTravelBlockReason(staticRoute[index], staticRoute[index + 1])
      if (reason) {
        return {
          route: null,
          segments: Math.max(1, staticRoute.length - 1),
          viaIds: staticRoute.slice(1, -1),
          blockedReason: reason,
          nextStopId: staticRoute[index + 1] || null,
        }
      }
    }
  }

  return {
    route: null,
    segments: 0,
    viaIds: [],
    blockedReason: null,
    nextStopId: null,
  }
}

function describeVia(viaIds: string[]) {
  return viaIds.map(id => LOCATION_MAP.get(id)?.short || id).join('、')
}

function resolveArrivalAction(token: string) {
  if (token.startsWith('realm:')) {
    challengeRealm(token.slice('realm:'.length))
    return
  }
  performAction(token)
}

function ensurePlayerTravelPlan(locationId: string, pendingAction: string | null = null, silent = false) {
  const ctx = getContext()
  const g = ctx.game
  if (locationId === g.player.locationId) {
    if (pendingAction) resolveArrivalAction(pendingAction)
    return false
  }

  const target = LOCATION_MAP.get(locationId)
  const current = ctx.getCurrentLocation()
  if (!target) return false

  if (g.player.travelPlan?.destinationId === locationId) {
    if (pendingAction) g.player.travelPlan.pendingAction = pendingAction
    ctx.selectedLocationId = locationId
    return true
  }

  const preview = resolvePlayerRoute(current.id, locationId)
  if (!preview.route) {
    if (!silent) {
      const reason = preview.blockedReason || `从${current.name}当前没有门路赶到${target.name}。`
      ctx.appendLog(reason, 'warn')
    }
    return false
  }

  g.player.travelPlan = {
    route: preview.route,
    destinationId: locationId,
    destinationName: target.name,
    nextIndex: 1,
    startedDay: g.world.day,
    pendingAction,
    pausedReason: null,
  }
  ctx.selectedLocationId = locationId
  if (!silent) {
    const via = describeVia(preview.viaIds)
    ctx.appendLog(via ? `你定下去${target.name}的路，准备经由${via}一路赶过去。` : `你朝${target.name}动身。`, 'info')
  }
  return true
}

function rebasePlayerTravelPlan(plan: TravelPlanState) {
  return ensurePlayerTravelPlan(plan.destinationId, plan.pendingAction, true)
}

function advancePlayerTravelStep(): TravelAdvanceResult {
  const ctx = getContext()
  const g = ctx.game
  const plan = g.player.travelPlan
  if (!plan) {
    return { moved: false, arrived: false, waiting: false, pendingAction: null }
  }

  const current = ctx.getCurrentLocation()
  const expectedCurrentId = plan.route[Math.max(0, plan.nextIndex - 1)]
  if (expectedCurrentId && expectedCurrentId !== current.id) {
    const replanned = rebasePlayerTravelPlan(plan)
    if (!replanned || !g.player.travelPlan) {
      g.player.travelPlan = null
      return { moved: false, arrived: false, waiting: false, pendingAction: null }
    }
  }

  const activePlan = g.player.travelPlan
  if (!activePlan) return { moved: false, arrived: false, waiting: false, pendingAction: null }
  const nextStopId = activePlan.route[activePlan.nextIndex]
  if (!nextStopId) {
    const pendingAction = activePlan.pendingAction
    g.player.travelPlan = null
    return { moved: false, arrived: true, waiting: false, pendingAction }
  }

  const nextStop = LOCATION_MAP.get(nextStopId)
  if (!nextStop) {
    g.player.travelPlan = null
    return { moved: false, arrived: false, waiting: false, pendingAction: null }
  }

  const blockedReason = getPlayerTravelBlockReason(current.id, nextStopId)
  if (blockedReason) {
    if (activePlan.pausedReason !== blockedReason) {
      activePlan.pausedReason = blockedReason
      ctx.appendLog(`你赶到${current.name}附近后被拦下，往${nextStop.name}的路暂时走不通。${blockedReason}`, 'warn')
    }
    g.player.action = 'travel'
    return { moved: false, arrived: false, waiting: true, pendingAction: null }
  }

  activePlan.pausedReason = null
  g.player.locationId = nextStopId
  g.player.action = 'travel'
  meetNpcsAtLocation(nextStopId)
  const travelStaminaCost = ACTION_META.travel?.cost?.stamina ?? 6
  const travelQiCost = ACTION_META.travel?.cost?.qi ?? 3
  ctx.adjustResource('stamina', -travelStaminaCost, 'maxStamina')
  ctx.adjustResource('qi', -travelQiCost, 'maxQi')
  ctx.adjustRegionStanding(nextStopId, 0.25)
  bus.emit('state:location-changed', { locationId: nextStopId })

  const eventChance = 0.16 + nextStop.danger * 0.04
  if (Math.random() < eventChance) triggerTravelEvent(nextStop)
  maybeTriggerFactionPursuit('travel')

  activePlan.nextIndex += 1
  const arrived = activePlan.nextIndex >= activePlan.route.length
  if (arrived) {
    const pendingAction = activePlan.pendingAction
    g.player.travelPlan = null
    ctx.selectedLocationId = nextStopId
    g.player.action = sample(nextStop.actions)
    ctx.appendLog(`你沿着既定门路赶到${nextStop.name}。`, 'info')
    return {
      moved: true,
      arrived: true,
      waiting: false,
      pendingAction: g.combat.currentEnemy ? null : pendingAction,
    }
  }

  const remaining = activePlan.route.slice(activePlan.nextIndex).map(id => LOCATION_MAP.get(id)?.short || id).join('、')
  ctx.appendLog(`你先赶到${nextStop.name}落脚，去${activePlan.destinationName}还得继续经${remaining}。`, 'info')
  return { moved: true, arrived: false, waiting: false, pendingAction: null }
}

function consumePlayerTravelStep() {
  const ctx = getContext()
  const step = advancePlayerTravelStep()
  if (!step.moved && !step.waiting && !step.arrived) return false
  if (step.pendingAction) {
    resolveArrivalAction(step.pendingAction)
    return true
  }
  tickWorld()
  return true
}

/* ─── Travel ─── */

export function getTravelPreview(targetId: string, originId = getContext().game.player.locationId): TravelPreview {
  if (targetId === originId) {
    return { route: [originId], segments: 0, viaIds: [], blockedReason: null, nextStopId: null }
  }
  return resolvePlayerRoute(originId, targetId)
}

export function travelTo(locationId: string, options: TravelOptions = {}) {
  const ctx = getContext()
  const g = ctx.game
  const pendingAction = options.pendingAction ?? null
  if (locationId === g.player.locationId) {
    if (pendingAction) resolveArrivalAction(pendingAction)
    return false
  }
  const planned = ensurePlayerTravelPlan(locationId, pendingAction, options.silent)
  if (!planned) return false
  if (options.advanceNow === false) return true

  const step = advancePlayerTravelStep()
  if (!step.moved) return step.waiting
  if (step.pendingAction) {
    resolveArrivalAction(step.pendingAction)
    return true
  }
  if (options.consumeTime !== false) tickWorld()
  return true
}

export function travelAndAct(locationId: string, action: string) {
  return travelTo(locationId, { pendingAction: action })
}

export function travelAndChallengeRealm(realmId: string) {
  const realm = REALM_TEMPLATES.find(entry => entry.id === realmId)
  if (!realm) return false
  if (getContext().game.player.locationId === realm.locationId) {
    challengeRealm(realmId)
    return true
  }
  return travelTo(realm.locationId, { pendingAction: `realm:${realmId}` })
}

export function currentLocationCanReach(targetId: string): boolean {
  const ctx = getContext()
  return Boolean(resolvePlayerRoute(ctx.getCurrentLocation().id, targetId).route)
}

/* ─── Auto Action Choice ─── */

export function chooseAutoAction(): string | null {
  const ctx = getContext()
  const g = ctx.game
  const location = ctx.getCurrentLocation()
  const mode = g.player.mode

  if (mode === 'manual') return null
  if (g.combat.currentEnemy) return g.combat.autoBattle ? 'combat' : null
  if (g.player.travelPlan) return null
  if (g.player.hp < g.player.maxHp * 0.42 || g.player.qi < g.player.maxQi * 0.32 || g.player.stamina < g.player.maxStamina * 0.18) return 'rest'
  if (g.player.breakthrough >= ctx.getNextBreakthroughNeed() * 0.92 && location.actions.includes('breakthrough')) return 'breakthrough'

  if (mode === 'cultivation') {
    if (location.aura < 42 && Math.random() < 0.34) {
      const better = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.aura - a.aura)[0]
      if (better && better.aura > location.aura) {
        travelTo(better.id, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('meditate') ? 'meditate' : location.actions[0]
  }
  if (mode === 'merchant') {
    if (g.player.tradeRun) {
      if (location.id !== g.player.tradeRun.destinationId) {
        travelTo(g.player.tradeRun.destinationId, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
      return 'trade'
    }
    if (!isTradeHub(location) && Math.random() < 0.42) {
      const target = ['anping', 'lantern', 'blackforge', 'reedbank', 'yanpass', 'yunze'].find(id => currentLocationCanReach(id))
      if (target) {
        travelTo(target, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('trade') ? 'trade' : location.actions[0]
  }
  if (mode === 'adventure') {
    if (location.danger < 4 && Math.random() < 0.36) {
      const riskier = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.danger - a.danger)[0]
      if (riskier && riskier.danger > location.danger) {
        travelTo(riskier.id, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('quest') ? 'quest' : location.actions.includes('hunt') ? 'hunt' : location.actions[0]
  }
  if (PLAYER_SECT_ENABLED && mode === 'sect' && g.player.sect) {
    if (!location.tags.includes('sect') && currentLocationCanReach('jadegate') && Math.random() < 0.3) {
      travelTo('jadegate', { advanceNow: false, consumeTime: false, silent: true })
      return null
    }
    return location.actions.includes('sect') ? 'sect' : 'meditate'
  }
  return ['meditate', 'trade', 'hunt', 'quest', 'train'].find(a => location.actions.includes(a)) || location.actions[0]
}

/* ─── Action Processing ─── */

function processActionKey(actionKey: string | null) {
  if (!actionKey) return
  const ctx = getContext()
  const g = ctx.game

  if (actionKey === 'combat') { g.player.action = 'combat'; autoCombatTick(); return }
  if (actionKey === 'breakthrough') { g.player.action = 'breakthrough'; attemptBreakthrough(); return }
  if (actionKey === 'sect') {
    applyPassiveAction('sect')
    if (PLAYER_SECT_ENABLED && g.player.sect) {
      g.player.sect.treasury += 8 + g.player.sect.buildings.market * 4
      g.player.sect.prestige = round(g.player.sect.prestige + 1)
    }
    return
  }

  applyPassiveAction(actionKey)

  if (actionKey === 'trade') {
    const tradeStatus = advanceTradeRun()
    if (tradeStatus === 'settled' || tradeStatus === 'traveling') return
    if (g.player.mode === 'merchant' && maybeStartBestTradeRun()) return
    resolvePassiveTrade()
    ctx.adjustFactionStanding(g.player.affiliationId, 1)
  }
  if (actionKey === 'auction') resolveAuctionVisit()
  if (['hunt', 'quest'].includes(actionKey)) {
    if (actionKey === 'quest') g.player.stats.questsFinished += 1
    ctx.adjustFactionStanding(g.player.affiliationId, actionKey === 'quest' ? 1.2 : 0.8)
    if (maybeTriggerFactionPursuit(actionKey as 'hunt' | 'quest')) return
    const started = maybeStartEncounter(actionKey)
    if (!started) {
      const pool = DISTRIBUTABLE_ITEMS.filter(i => i.tier <= (ctx.getCurrentLocation().marketTier || 0) + 1 && (i.type === ctx.getCurrentLocation().marketBias || Math.random() < 0.2))
      const item = sample(pool.length ? pool : DISTRIBUTABLE_ITEMS)
      if (Math.random() < 0.42) {
        ctx.addItemToInventory(item.id, 1)
        ctx.appendLog(`你在${ctx.getCurrentLocation().name}一带收获了${item.name}。`, 'loot')
      }
    } else {
      autoCombatTick()
    }
  }
}

export function performAction(actionKey: string) {
  const ctx = getContext()
  processActionKey(actionKey)
  tickWorld()
  ctx.updateDerivedStats()
}

/* ─── World Tick ─── */

export function tickWorld() {
  const ctx = getContext()
  const g = ctx.game
  g.world.subStep += 1
  if (g.world.subStep >= 2) {
    g.world.subStep = 0
    g.world.hour = (g.world.hour + 1) % TIME_LABELS.length
    if (g.world.hour === 0) {
      g.world.day += 1
      g.world.weather = sample(['晴', '微雨', '大风', '寒霜', '雾起', '雷暴'])
      g.world.omen = sample(['星辉平稳', '灵潮暗涌', '海雾倒卷', '宗门钟鸣', '赤霞流火', '北斗失位'])
    }
    resolveAuctionTurn()
    refreshMarketIfNeeded()
    maybeActivateRealm()
    processFactionStatusTick()
    processRelationshipTick()
    processSectTick()
    processPlayerFactionTick()
    processTerritoryStatusTick()
    processIndustryTick()
    processWorldEconomyTick()
    if (g.world.hour === 0) processNpcLifeTick()
  }
  runNpcAI()
}

/* ─── Game Step (main loop entry) ─── */

export function gameStep() {
  const ctx = getContext()
  const g = ctx.game
  if (g.player.travelPlan && !g.combat.currentEnemy && consumePlayerTravelStep()) {
    if (g.player.hp <= 0) revivePlayer()
    return
  }
  const action = chooseAutoAction()
  if (!action) {
    if (g.player.travelPlan && !g.combat.currentEnemy && consumePlayerTravelStep()) {
      if (g.player.hp <= 0) revivePlayer()
      return
    }
    if (g.player.mode === 'manual') {
      tickWorld()
      if (g.player.hp <= 0) revivePlayer()
    }
    return
  }
  performAction(action)
  if (g.player.hp <= 0) revivePlayer()
}
