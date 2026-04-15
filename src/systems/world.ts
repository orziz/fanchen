import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import {
  LOCATION_MAP, LOCATIONS, TRAVEL_EVENT_TEMPLATES, ITEMS, TIME_LABELS,
  ACTION_META, WORLD_EVENT_TEMPLATES,
} from '@/config'
import { sample, randomInt, fillTemplate } from '@/utils'
import { applyPassiveAction, attemptBreakthrough, revivePlayer } from './player'
import { autoCombatTick, maybeStartEncounter, startEncounter } from './combat'
import { advanceTradeRun, resolvePassiveTrade, isTradeHub, maybeStartBestTradeRun } from './trade'
import { resolveAuctionVisit, resolveAuctionTurn, refreshMarketIfNeeded, maybeActivateRealm } from './auction'
import { processRelationshipTick, processSectTick, processPlayerFactionTick } from './social'
import { processNpcLifeTick, runNpcAI } from './npc'
import { processIndustryTick } from './industry'

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
      ? ITEMS.filter(i => i.tier <= (location.marketTier || 0) + 1 && (i.type === location.marketBias || Math.random() < 0.25))
      : ITEMS.filter(i => i.tier <= (location.marketTier || 0) + 1)
    const item = sample(pool.length ? pool : ITEMS)
    ctx.addItemToInventory(item.id, 1)
    ctx.appendLog(fillTemplate(event.text, { terrain: location.terrain, item: item.name }), 'loot')
    return
  }
  ctx.adjustResource('hp', -randomInt(4, 10), 'maxHp')
  ctx.adjustResource('qi', -randomInt(2, 8), 'maxQi')
  ctx.game.player.breakthrough += 1.5
  ctx.appendLog(event.text, 'warn')
}

/* ─── Travel ─── */

export function travelTo(locationId: string) {
  const ctx = getContext()
  const g = ctx.game
  if (locationId === g.player.locationId) return
  const current = ctx.getCurrentLocation()
  const target = LOCATION_MAP.get(locationId)
  if (!target) return
  const path = ctx.findRoute(current.id, locationId)
  if (!path) { ctx.appendLog(`从${current.name}无法直接前往${target.name}。`, 'warn'); return }
  const segments = Math.max(1, path.length - 1)
  const via = path.slice(1, -1).map(id => LOCATION_MAP.get(id)!.short).join('、')
  g.player.locationId = locationId
  g.player.action = sample(target.actions)
  ctx.adjustResource('stamina', -6 * segments, 'maxStamina')
  ctx.adjustResource('qi', -3 * segments, 'maxQi')
  ctx.adjustRegionStanding(locationId, 0.3 + segments * 0.1)
  ctx.selectedLocationId = locationId
  bus.emit('state:location-changed', { locationId })
  ctx.appendLog(via ? `你踏上旅途，经由${via}抵达${target.name}。` : `你踏上旅途，很快抵达了${target.name}。`, 'info')
  for (let i = 0; i < segments; i++) {
    if (Math.random() < 0.24 + segments * 0.04) triggerTravelEvent(target)
  }
}

export function travelAndAct(locationId: string, action: string) {
  travelTo(locationId)
  if (getContext().game.player.locationId === locationId) performAction(action)
}

export function currentLocationCanReach(targetId: string): boolean {
  const ctx = getContext()
  return Boolean(ctx.findRoute(ctx.getCurrentLocation().id, targetId))
}

/* ─── Auto Action Choice ─── */

export function chooseAutoAction(): string | null {
  const ctx = getContext()
  const g = ctx.game
  const location = ctx.getCurrentLocation()
  const mode = g.player.mode

  if (mode === 'manual') return null
  if (g.combat.currentEnemy) return g.combat.autoBattle ? 'combat' : null
  if (g.player.hp < g.player.maxHp * 0.42 || g.player.qi < g.player.maxQi * 0.32) return 'meditate'
  if (g.player.breakthrough >= ctx.getNextBreakthroughNeed() * 0.92 && location.actions.includes('breakthrough')) return 'breakthrough'

  if (mode === 'cultivation') {
    if (location.aura < 42 && Math.random() < 0.34) {
      const better = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.aura - a.aura)[0]
      if (better && better.aura > location.aura) travelTo(better.id)
    }
    return location.actions.includes('meditate') ? 'meditate' : location.actions[0]
  }
  if (mode === 'merchant') {
    if (g.player.tradeRun) {
      if (location.id !== g.player.tradeRun.destinationId) travelTo(g.player.tradeRun.destinationId)
      return 'trade'
    }
    if (!isTradeHub(location) && Math.random() < 0.42) {
      const target = ['anping', 'lantern', 'blackforge', 'reedbank', 'yanpass', 'yunze'].find(id => currentLocationCanReach(id))
      if (target) travelTo(target)
    }
    return location.actions.includes('trade') ? 'trade' : location.actions[0]
  }
  if (mode === 'adventure') {
    if (location.danger < 4 && Math.random() < 0.36) {
      const riskier = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.danger - a.danger)[0]
      if (riskier && riskier.danger > location.danger) travelTo(riskier.id)
    }
    return location.actions.includes('quest') ? 'quest' : location.actions.includes('hunt') ? 'hunt' : location.actions[0]
  }
  if (mode === 'sect' && g.player.sect) {
    if (!location.tags.includes('sect') && currentLocationCanReach('jadegate') && Math.random() < 0.3) travelTo('jadegate')
    return location.actions.includes('sect') ? 'sect' : 'meditate'
  }
  return ['meditate', 'trade', 'hunt', 'quest', 'train'].find(a => location.actions.includes(a)) || location.actions[0]
}

/* ─── Action Processing ─── */

function processActionKey(actionKey: string | null) {
  if (!actionKey) return
  const ctx = getContext()
  const g = ctx.game

  if (actionKey === 'combat') { autoCombatTick(); return }
  if (actionKey === 'breakthrough') { attemptBreakthrough(); return }
  if (actionKey === 'sect') {
    applyPassiveAction('sect')
    if (g.player.sect) {
      g.player.sect.treasury += 8 + g.player.sect.buildings.market * 4
      g.player.sect.prestige += 0.6
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
    const started = maybeStartEncounter(actionKey)
    if (!started) {
      const pool = ITEMS.filter(i => i.tier <= (ctx.getCurrentLocation().marketTier || 0) + 1 && (i.type === ctx.getCurrentLocation().marketBias || Math.random() < 0.2))
      const item = sample(pool.length ? pool : ITEMS)
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
  processActionKey(actionKey)
  tickWorld()
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
      g.world.omen = sample(['星辉平稳', '灵潮暗涌', '海雾倒卷', '山门钟鸣', '赤霞流火', '北斗失位'])
    }
    resolveAuctionTurn()
    refreshMarketIfNeeded()
    maybeActivateRealm()
    processRelationshipTick()
    processSectTick()
    processPlayerFactionTick()
    processIndustryTick()
    if (g.world.hour === 0) processNpcLifeTick()
  }
  runNpcAI()
}

/* ─── Game Step (main loop entry) ─── */

export function gameStep() {
  const ctx = getContext()
  const g = ctx.game
  const action = chooseAutoAction()
  if (!action) {
    if (g.player.mode === 'manual') {
      tickWorld()
      if (g.player.hp <= 0) revivePlayer()
    }
    return
  }
  performAction(action)
  if (g.player.hp <= 0) revivePlayer()
}
