import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import type { PlayerState } from '@/types/game'
import { LOCATION_MAP } from '@/config'
import { calendarOf } from '@/config/calendar'
import { sample, findRoute as resolveRoute } from '@/utils'
import { processRelationshipTick, processFactionStatusTick, processTerritoryStatusTick } from '@/systems/social'
import { meetNpcsAtLocation, processNpcLifeTick, runNpcAI } from '@/systems/npc'
import { processWorldEconomyTick } from '@/systems/worldEconomy'

/* ─── 路网 ─── */

export interface TravelPreview {
  route: string[] | null
  segments: number
  /** 按路段累计的日数 */
  days: number
  viaIds: string[]
  blockedReason: string | null
}

function canEnterJadegate(player: PlayerState) {
  return player.affiliationId === 'jadegate-courtyard'
    || (player.factionStanding['jadegate-courtyard'] || 0) >= 12
    || player.rankIndex >= 2
    || player.reputation >= 16
}

function getPlayerTravelBlockReason(fromId: string, toId: string) {
  const player = getContext().game.player
  if (toId === 'jadegate' && !canEnterJadegate(player)) return '玉阙行院只认引荐与名望，眼下还进不去山门。'
  if (fromId === 'snowpeak' && toId === 'jadegate' && player.rankIndex < 1) return '寒魄峰往玉阙的山道灵压太重，至少得有练力底子。'
  return null
}

/** 一段路走几日：平路一日，险地山路两日。 */
export function segmentDays(fromId: string, toId: string) {
  const from = LOCATION_MAP.get(fromId)
  const to = LOCATION_MAP.get(toId)
  const danger = Math.max(from?.danger || 1, to?.danger || 1)
  return danger >= 3 ? 2 : 1
}

function routeDays(route: string[]) {
  let days = 0
  for (let i = 0; i < route.length - 1; i += 1) days += segmentDays(route[i], route[i + 1])
  return days
}

export function getTravelPreview(targetId: string, originId = getContext().game.player.locationId): TravelPreview {
  if (targetId === originId) return { route: [originId], segments: 0, days: 0, viaIds: [], blockedReason: null }
  const route = resolveRoute(originId, targetId, { canTraverse: (from, to) => !getPlayerTravelBlockReason(from, to) })
  if (route) {
    return { route, segments: route.length - 1, days: routeDays(route), viaIds: route.slice(1, -1), blockedReason: null }
  }
  const staticRoute = resolveRoute(originId, targetId)
  if (staticRoute) {
    for (let i = 0; i < staticRoute.length - 1; i += 1) {
      const reason = getPlayerTravelBlockReason(staticRoute[i], staticRoute[i + 1])
      if (reason) return { route: null, segments: staticRoute.length - 1, days: routeDays(staticRoute), viaIds: staticRoute.slice(1, -1), blockedReason: reason }
    }
  }
  return { route: null, segments: 0, days: 0, viaIds: [], blockedReason: null }
}

export function currentLocationCanReach(targetId: string) {
  return Boolean(getTravelPreview(targetId).route)
}

/** 到了一处地方：落脚、认人、记下来过。 */
export function arriveAt(locationId: string) {
  const ctx = getContext()
  const g = ctx.game
  if (!LOCATION_MAP.has(locationId)) return
  g.player.locationId = locationId
  ctx.selectedLocationId = locationId
  g.story.flags[`visited.${locationId}`] = true
  meetNpcsAtLocation(locationId)
  ctx.adjustRegionStanding(locationId, 0.25)
  bus.emit('state:location-changed', { locationId })
}

/* ─── 世界过一日 ─── */

const WEATHER_BY_SEASON = {
  spring: ['晴', '晴', '微雨', '微雨', '雾起', '大风'],
  summer: ['晴', '晴', '微雨', '雷暴', '雷暴', '大风'],
  autumn: ['晴', '晴', '大风', '雾起', '微雨', '寒霜'],
  winter: ['晴', '寒霜', '寒霜', '大风', '雾起', '晴'],
} as const

const OMENS = ['星辉平稳', '灵潮暗涌', '海雾倒卷', '宗门钟鸣', '赤霞流火', '北斗失位']

/**
 * 世界自己过一日：天气换过，NPC、势力、地盘与商况各自推演一步。
 * 各系统的日结以 hour === 0 为界，这里在子时跑完日结，再把时辰交回给调用方。
 */
export function advanceWorldDay() {
  const g = getContext().game
  const shownHour = g.world.hour
  g.world.day += 1
  g.world.hour = 0
  g.world.subStep = 0
  g.world.weather = sample([...WEATHER_BY_SEASON[calendarOf(g.world.day).season]])
  if (Math.random() < 0.1) g.world.omen = sample(OMENS)
  processFactionStatusTick()
  processRelationshipTick()
  processTerritoryStatusTick()
  processWorldEconomyTick()
  processNpcLifeTick()
  runNpcAI()
  g.world.hour = shownHour
}

/** 秘境开启的传闻。 */
export function announceRealm(locationId: string, realmName: string) {
  const loc = LOCATION_MAP.get(locationId)
  if (!loc) return
  const ctx = getContext()
  ctx.appendLog(`听说${loc.name}那边出了异象，都说是${realmName}开了。`, 'npc')
}
