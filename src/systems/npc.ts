import { getContext } from '@/core/context'
import { DAYS_PER_YEAR } from '@/config/calendar'
import { PLAYER_SECT_ENABLED } from '@/config'
import { bus } from '@/core/events'
import { LOCATION_MAP, FACTION_MAP } from '@/config'
import type { NpcIntelSource, NpcState } from '@/types/game'
import { sample, randomFloat, randomInt, findRoute } from '@/utils'
import { recordNpcEconomicAction } from '@/systems/worldEconomy'

const RUMOR_VENUE_COSTS = {
  teahouse: 4,
  tavern: 7,
} as const

type RumorVenue = keyof typeof RUMOR_VENUE_COSTS

/* ─── Profession Pools ─── */

function getNpcProfessionPool(npc: { lifeStage: string; homeId: string; locationId: string }) {
  const home = LOCATION_MAP.get(npc.homeId) || LOCATION_MAP.get(npc.locationId)
  const tags = home?.tags || []
  if (tags.includes('sect')) return npc.lifeStage === '少年' ? ['杂役弟子', '抄经童子', '听差弟子'] : npc.lifeStage === '壮年' ? ['外门弟子', '内门行走', '丹房执役', '护山弟子'] : npc.lifeStage === '中年' ? ['执事', '丹房教习', '护法', '司库'] : ['守阁老人', '宗门宿老', '外门教习']
  if (tags.includes('court')) return npc.lifeStage === '少年' ? ['衙门杂役', '送信的小厮', '抄书学徒'] : npc.lifeStage === '壮年' ? ['皂隶', '书吏', '巡街快手', '税契小吏'] : npc.lifeStage === '中年' ? ['捕头', '典吏', '粮台主事'] : ['老书办', '告老的书吏', '看库房的老吏']
  if (tags.includes('pass')) return npc.lifeStage === '少年' ? ['趟子学徒', '关城杂役', '驿卒'] : npc.lifeStage === '壮年' ? ['镖师', '关城军健', '赶车把式', '护货刀手'] : npc.lifeStage === '中年' ? ['押队头', '老镖头', '关市主事'] : ['守关老人', '洗手的老镖师', '驿站老卒']
  if (tags.includes('forge')) return npc.lifeStage === '少年' ? ['打杂学徒', '矿场童工', '送炭小厮'] : npc.lifeStage === '壮年' ? ['学徒铁匠', '匠工', '押镖好手', '矿场工头'] : npc.lifeStage === '中年' ? ['监造', '工坊主事', '老镖头'] : ['老铁匠', '炉前师傅', '洗手的老镖师']
  if (tags.includes('port') || tags.includes('market')) return npc.lifeStage === '少年' ? ['脚夫', '船行杂役', '跑街小厮'] : npc.lifeStage === '壮年' ? ['脚商', '船工', '分号伙计', '掮客'] : npc.lifeStage === '中年' ? ['掌柜', '行会执事', '船队老大'] : ['老账房', '歇了业的老掌柜', '说书先生']
  if (tags.includes('town') || tags.includes('starter')) return npc.lifeStage === '少年' ? ['佃户子弟', '跑堂杂工', '药圃学徒'] : npc.lifeStage === '壮年' ? ['农户', '货郎', '药农', '店伙'] : npc.lifeStage === '中年' ? ['里正助手', '小店东家', '药铺主事'] : ['乡里老人', '看祠堂的', '歇了业的老掌柜']
  return npc.lifeStage === '少年' ? ['放牛娃', '采药童子'] : npc.lifeStage === '壮年' ? ['游侠', '樵夫', '猎户', '采药人'] : npc.lifeStage === '中年' ? ['老猎户', '山路向导', '山货贩子'] : ['山里的老人', '看山人', '老樵夫']
}

function getNpcGoalPool(npc: { lifeStage: string; factionId?: string | null }) {
  const pool = npc.lifeStage === '少年' ? ['想拜进宗门', '想攒够学徒钱', '想学一门手艺', '想替家里挣口饭吃']
    : npc.lifeStage === '壮年' ? ['想攒钱买几亩田', '想跑几趟货翻身', '想在门里往上走一步', '想自己开间铺子']
      : npc.lifeStage === '中年' ? ['想在门里站稳脚跟', '想给家里攒点底子', '想收个徒弟传手艺', '想给儿女铺条路']
        : ['想回老家养老', '想守着家里那点产业', '想把手艺传下去', '只想安安稳稳过日子']
  // 没投靠哪一家的人，谈不上在门里往上走。
  return npc.factionId ? pool : pool.filter(goal => !goal.includes('门里'))
}

/** 到了一个年纪，街坊嘴里会怎么说这个人。 */
const STAGE_REMARKS: Record<string, string> = {
  少年: '个头蹿高了一大截',
  壮年: '成了能顶事的人',
  中年: '鬓角见了白',
  老年: '腿脚不如从前了',
}

function appendNpcLifeEvent(npc: any, text: string) {
  npc.lifeEvents = npc.lifeEvents || []
  npc.lifeEvents.push(text)
  if (npc.lifeEvents.length > 6) npc.lifeEvents = npc.lifeEvents.slice(-6)
}

function refreshNpcLifeProfile(npc: any, force = false) {
  const profPool = getNpcProfessionPool(npc)
  if (force || !profPool.includes(npc.profession) || Math.random() < 0.28) npc.profession = sample(profPool)
  const goalPool = getNpcGoalPool(npc)
  if (force || Math.random() < 0.32) npc.goal = sample(goalPool)
  if (npc.lifeStage === '老年') npc.action = sample(['meditate', 'trade', 'sect'])
  else if (npc.lifeStage === '少年') npc.action = sample(['train', 'trade', 'quest'])
}

const YANPASS_CURFEW_HOURS = new Set([10, 11, 0, 1])

function venueLabel(venue: RumorVenue) {
  return venue === 'teahouse' ? '茶馆' : '酒馆'
}

function isValidNpcIntelSource(source: unknown): source is NpcIntelSource {
  return source === 'heard' || source === 'met'
}

function npcIntelWeight(source: NpcIntelSource | null) {
  if (source === 'met') return 2
  if (source === 'heard') return 1
  return 0
}

function venueSupportedByLocation(venue: RumorVenue, locationId: string) {
  const tags = LOCATION_MAP.get(locationId)?.tags || []
  if (venue === 'teahouse') return tags.some(tag => ['town', 'market', 'court', 'sect'].includes(tag))
  return tags.some(tag => ['market', 'port', 'pass', 'town'].includes(tag))
}

function buildRumorScope(anchorId: string) {
  const nearby = LOCATION_MAP.get(anchorId)?.neighbors || []
  const extended = nearby.flatMap(id => LOCATION_MAP.get(id)?.neighbors || [])
  return new Set([anchorId, ...nearby, ...extended])
}

function scoreRumorTarget(npc: any, venue: RumorVenue, anchorId: string, scope: Set<string>) {
  const tags = LOCATION_MAP.get(npc.locationId)?.tags || []
  let score = npc.locationId === anchorId ? 42 : scope.has(npc.locationId) ? 24 : 10
  if (venue === 'teahouse') {
    if (tags.some(tag => ['town', 'court', 'sect'].includes(tag))) score += 14
    score += npc.mood.curiosity * 0.05 + npc.mood.kindness * 0.03
  } else {
    if (tags.some(tag => ['market', 'port', 'pass'].includes(tag))) score += 16
    score += npc.wealth * 0.04 + npc.mood.greed * 0.03
  }
  return score
}

function pickRumorTargets(venue: RumorVenue) {
  const ctx = getContext()
  const anchorId = ctx.game.player.locationId
  const scope = buildRumorScope(anchorId)
  return ctx.game.npcs
    .filter(npc => npc.alive && !knowsNpc(npc.id))
    .sort((left, right) => scoreRumorTarget(right, venue, anchorId, scope) - scoreRumorTarget(left, venue, anchorId, scope))
}

function drawRumorTargets(venue: RumorVenue) {
  const candidates = [...pickRumorTargets(venue)]
  const targets: typeof candidates = []
  const count = Math.min(venue === 'teahouse' ? 2 : 3, candidates.length)
  while (targets.length < count && candidates.length) {
    const index = randomInt(0, candidates.length - 1)
    targets.push(candidates.splice(index, 1)[0])
  }
  return targets
}

function describeRumor(npc: any, venue: RumorVenue) {
  const locationName = LOCATION_MAP.get(npc.locationId)?.name || npc.locationId
  if (venue === 'teahouse') {
    return `你在茶馆听人提起${npc.name}，说此人近来常在${locationName}活动，正打算${npc.goal}。`
  }
  return `你在酒馆从行脚客口中听到${npc.name}的消息：此人最近常在${locationName}出没，多半忙着${npc.goal}。`
}

export function getNpcIntelSource(npcId: string): NpcIntelSource | null {
  const source = getContext().game.player.npcIntel[npcId]
  return isValidNpcIntelSource(source) ? source : null
}

export function rememberNpcIntel(npcId: string, source: NpcIntelSource = 'heard') {
  const player = getContext().game.player
  const current = getNpcIntelSource(npcId)
  if (npcIntelWeight(current) >= npcIntelWeight(source)) return current || source
  player.npcIntel[npcId] = source
  return source
}

export function knowsNpc(npcId: string) {
  return Boolean(getNpcIntelSource(npcId))
}

export function meetNpcsAtLocation(locationId = getContext().game.player.locationId) {
  const ctx = getContext()
  const metIds = ctx.game.npcs
    .filter(npc => npc.alive && npc.locationId === locationId)
    .map(npc => npc.id)
  metIds.forEach(npcId => rememberNpcIntel(npcId, 'met'))
  return metIds
}

export function getNpcRumorIssues(venue: RumorVenue): string[] {
  const ctx = getContext()
  const issues: string[] = []
  if (!venueSupportedByLocation(venue, ctx.game.player.locationId)) {
    issues.push(`此地还没有能让你稳稳打听消息的${venueLabel(venue)}。`)
  }
  const cost = RUMOR_VENUE_COSTS[venue]
  if (ctx.game.player.money < cost) {
    issues.push(`灵石不足，还差${cost - ctx.game.player.money}`)
  }
  if (!pickRumorTargets(venue).length) {
    issues.push('眼下已经没有新的生面孔消息可打听了')
  }
  return issues
}

export function canGatherNpcRumors(venue: RumorVenue) {
  return getNpcRumorIssues(venue).length === 0
}

export function explainNpcRumors(venue: RumorVenue) {
  const issues = getNpcRumorIssues(venue)
  return issues.length ? issues.join('；') : `花点茶资酒钱，就能在${venueLabel(venue)}里换到新的江湖消息。`
}

export function gatherNpcRumors(venue: RumorVenue) {
  const ctx = getContext()
  const issues = getNpcRumorIssues(venue)
  if (issues.length) {
    ctx.appendLog(`${venueLabel(venue)}里暂时打听不到新消息。${issues[0]}`, 'warn')
    return [] as string[]
  }
  ctx.game.player.money -= RUMOR_VENUE_COSTS[venue]
  const targets = drawRumorTargets(venue)
  targets.forEach((npc) => {
    rememberNpcIntel(npc.id, 'heard')
    ctx.appendLog(describeRumor(npc, venue), 'npc')
  })
  return targets.map(npc => npc.id)
}

function canNpcUseYanpassFastTrack(npc: any) {
  return npc.factionId === 'yanpass-escort' || npc.action === 'trade' || npc.wealth >= 220
}

function canNpcEnterJadegate(npc: any) {
  return npc.factionId === 'jadegate-courtyard'
    || npc.sectId === 'jadegate-courtyard'
    || npc.rankIndex >= 2
    || npc.cultivation >= 160
    || npc.lifeStage === '老年'
}

function getNpcTravelBlockReason(npc: any, fromId: string, toId: string) {
  const ctx = getContext()
  if (toId === 'yanpass' && YANPASS_CURFEW_HOURS.has(ctx.game.world.hour) && !canNpcUseYanpassFastTrack(npc)) {
    return '雁回关夜里闭阖，没有镖路门路时难以夜过关城。'
  }
  if (toId === 'jadegate' && !canNpcEnterJadegate(npc)) {
    return '玉阙行院不会轻易放没有引荐的人进山。'
  }
  if (fromId === 'snowpeak' && toId === 'jadegate' && npc.rankIndex < 1) {
    return '寒魄峰往玉阙的山道灵压太重，脚力不够会被劝退。'
  }
  return null
}

function planNpcTravel(npc: any, destinationId: string) {
  if (!destinationId || destinationId === npc.locationId) return false
  if (npc.travelPlan?.destinationId === destinationId) return true
  const route = findRoute(npc.locationId, destinationId, {
    canTraverse(fromId, toId) {
      return !getNpcTravelBlockReason(npc, fromId, toId)
    },
  })
  if (!route) {
    npc.travelPlan = null
    return false
  }
  npc.travelPlan = {
    route,
    destinationId,
    destinationName: LOCATION_MAP.get(destinationId)?.name || destinationId,
    nextIndex: 1,
    startedDay: getContext().game.world.day,
    pendingAction: null,
    pausedReason: null,
  }
  return true
}

function advanceNpcTravelStep(npc: any) {
  const plan = npc.travelPlan
  if (!plan) return false

  const current = LOCATION_MAP.get(npc.locationId)
  if (!current) {
    npc.travelPlan = null
    return false
  }

  const expectedCurrentId = plan.route[Math.max(0, plan.nextIndex - 1)]
  if (expectedCurrentId && expectedCurrentId !== npc.locationId) {
    const replanned = planNpcTravel(npc, plan.destinationId)
    if (!replanned || !npc.travelPlan) {
      npc.travelPlan = null
      return false
    }
  }

  const activePlan = npc.travelPlan
  if (!activePlan) return false
  const nextStopId = activePlan.route[activePlan.nextIndex]
  if (!nextStopId) {
    npc.travelPlan = null
    return false
  }

  const nextStop = LOCATION_MAP.get(nextStopId)
  if (!nextStop) {
    npc.travelPlan = null
    return false
  }

  const blockedReason = getNpcTravelBlockReason(npc, current.id, nextStopId)
  if (blockedReason) {
    activePlan.pausedReason = blockedReason
    npc.action = 'travel'
    npc.lastEvent = `在${current.name}被关卡拦了回来`
    return true
  }

  activePlan.pausedReason = null
  npc.locationId = nextStopId
  npc.action = 'travel'
  activePlan.nextIndex += 1

  if (activePlan.nextIndex >= activePlan.route.length) {
    npc.travelPlan = null
    npc.lastEvent = `到了${nextStop.name}`
    return true
  }

  npc.lastEvent = `到了${nextStop.name}`
  return true
}

/* ─── Daily Life Tick ─── */

export function processNpcLifeTick() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs = g.npcs.map((npc, index) => {
    if (!npc.alive) return npc
    npc.ageProgress = (npc.ageProgress || 0) + 1
    if (npc.ageProgress >= DAYS_PER_YEAR) {
      npc.ageProgress = 0
      const prevStage = npc.lifeStage
      npc.age += 1
      npc.lifeStage = ctx.deriveLifeStage(npc.age)
      if (npc.lifeStage !== prevStage) {
        refreshNpcLifeProfile(npc, true)
        const remark = STAGE_REMARKS[npc.lifeStage] || '又长了一岁'
        appendNpcLifeEvent(npc, `${npc.age}岁，${remark}`)
        npc.lastEvent = remark
      }
      if (!npc.factionId && LOCATION_MAP.get(npc.homeId)?.factionIds?.length && Math.random() < 0.22) {
        npc.factionId = sample(LOCATION_MAP.get(npc.homeId)!.factionIds)
        npc.factionRank = 0
        refreshNpcLifeProfile(npc, true)
        const factionName = FACTION_MAP.get(npc.factionId)?.name || '一方势力'
        appendNpcLifeEvent(npc, `进了${factionName}`)
        npc.lastEvent = `进了${factionName}`
      }
      if (npc.factionId && npc.factionRank < 3 && (npc.cultivation > 140 + npc.factionRank * 180 || npc.wealth > 180 + npc.factionRank * 120) && Math.random() < 0.18) {
        npc.factionRank += 1
        const faction = FACTION_MAP.get(npc.factionId)
        const title = faction?.titles[Math.min(npc.factionRank, (faction?.titles.length || 1) - 1)] || '更进一步'
        appendNpcLifeEvent(npc, `在${faction?.name || '门里'}当上了${title}`)
        npc.lastEvent = `在${faction?.name || '门里'}当上了${title}`
      }
      if (npc.lifeStage === '老年' && Math.random() < 0.24) {
        if (npc.locationId !== npc.homeId && planNpcTravel(npc, npc.homeId)) {
          refreshNpcLifeProfile(npc, true)
          appendNpcLifeEvent(npc, `想回${LOCATION_MAP.get(npc.homeId)?.name || '老家'}养老`)
          npc.lastEvent = `正往${LOCATION_MAP.get(npc.homeId)?.name || '老家'}走，说是回去养老`
        } else if (npc.locationId === npc.homeId) {
          refreshNpcLifeProfile(npc, true)
          appendNpcLifeEvent(npc, `回${LOCATION_MAP.get(npc.homeId)?.name || '老家'}养老了`)
          npc.lastEvent = `回${LOCATION_MAP.get(npc.homeId)?.name || '老家'}养老了`
        }
      }
    }
    if (npc.age >= npc.lifespan && Math.random() < 0.34) {
      const rel = ctx.ensurePlayerRelation(npc.id)
      if (rel.role !== 'none') ctx.appendLog(`${npc.name}过世了。`, 'npc')
      const successor = ctx.createNPC(index + 1)
      successor.id = npc.id
      successor.lastEvent = '刚来这边讨生活'
      successor.lifeEvents = ['来这边讨生活']
      return successor
    }
    if (Math.random() < 0.1) refreshNpcLifeProfile(npc, false)
    return npc
  })
}

/* ─── NPC Action ─── */

function processNpcAction(npc: any, action: string) {
  const ctx = getContext()
  const g = ctx.game
  const location = LOCATION_MAP.get(npc.locationId)!
  switch (action) {
    case 'meditate':
      npc.cultivation += (2 + location.aura * 0.08) * (npc.skillBias.meditate || 1)
      npc.lastEvent = `在${location.name}闭关，好些日子没露面`
      break
    case 'trade': {
      const profit = Math.round((4 + location.marketTier * 6) * (npc.skillBias.trade || 1))
      npc.wealth += profit
      npc.lastEvent = `在${location.name}做成了几笔买卖`
      if (Math.random() < 0.18) ctx.adjustRelation(npc.id, { affinity: npc.mood.kindness > 60 ? 1 : -1, trust: npc.mood.kindness > 60 ? 1 : 0 })
      break
    }
    case 'hunt':
    case 'quest': {
      const challenge = location.danger * 18
      const score = npc.cultivation * 0.18 + npc.ambition + randomFloat(-16, 18)
      if (score > challenge) {
        const reward = Math.round((8 + location.danger * 6) * (npc.skillBias.combat || 1))
        npc.wealth += reward
        npc.cultivation += reward * 0.05
        npc.lastEvent = action === 'quest' ? `在${location.name}接了趟差事，挣了些钱` : `在${location.name}打了头野物，卖了个好价`
        if (Math.random() < 0.16) npc.inventory.push({ itemId: sample(['mist-herb', 'timber', 'scrap-iron', 'iron-sand', 'beast-hide']), quantity: 1 })
      } else {
        npc.lastEvent = `在${location.name}吃了亏，带着伤回来`
        ctx.adjustRelation(npc.id, { affinity: -1, rivalry: 1 })
      }
      break
    }
    case 'sect':
      npc.lastEvent = `在${location.name}替门里跑腿`
      if (PLAYER_SECT_ENABLED && npc.sectId === 'player-sect' && g.player.sect) g.player.sect.treasury += 4
      break
    default:
      // 闲着的日子没什么可传的。
      recordNpcEconomicAction(npc, action, npc.locationId)
      return
  }
  recordNpcEconomicAction(npc, action, npc.locationId)
  maybeReportKnownNpc(npc)
}

/** 只有玩家见过或听说过的人，其近况才会传进纪事。 */
function maybeReportKnownNpc(npc: NpcState) {
  const ctx = getContext()
  if (!ctx.game.player.npcIntel[npc.id] || Math.random() >= 0.12) return
  ctx.appendLog(`听说${npc.name}${npc.lastEvent}。`, 'npc')
}

/* ─── NPC AI ─── */

export function runNpcAI() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs.forEach(npc => {
    npc.cooldown -= 1
    if (npc.cooldown > 0) return

    if (PLAYER_SECT_ENABLED && npc.masterId === 'player' && g.player.sect && npc.locationId !== g.player.locationId) {
      planNpcTravel(npc, g.player.locationId)
    }

    if (npc.travelPlan && advanceNpcTravelStep(npc)) {
      maybeReportKnownNpc(npc)
      npc.cooldown = randomInt(1, 2)
      return
    }

    const current = LOCATION_MAP.get(npc.locationId)!
    let chosen = npc.action

    if (PLAYER_SECT_ENABLED && npc.masterId === 'player' && g.player.sect && Math.random() < 0.3) {
      npc.lastEvent = npc.locationId === g.player.locationId ? '赶来宗门听候安排' : '正沿路赶来宗门听候安排'
    } else if (Math.random() < (npc.lifeStage === '老年' ? 0.12 : npc.lifeStage === '少年' ? 0.32 : 0.26)) {
      npc.locationId = sample(current.neighbors)
      npc.lastEvent = `动身去了${LOCATION_MAP.get(npc.locationId)!.name}`
    }

    const loc = LOCATION_MAP.get(npc.locationId)!
    if (npc.mood.greed > 70 && loc.actions.includes('trade')) chosen = 'trade'
    if (npc.mood.curiosity > 68 && loc.actions.includes('quest')) chosen = 'quest'
    if (npc.mood.patience > 72 && loc.actions.includes('meditate')) chosen = 'meditate'
    if (npc.lifeStage === '老年' && loc.actions.includes('meditate')) chosen = sample(['meditate', 'trade'])
    if (PLAYER_SECT_ENABLED && npc.sectId === 'player-sect' && Math.random() < 0.3) chosen = 'sect'

    npc.action = chosen
    processNpcAction(npc, chosen)
    npc.cooldown = randomInt(1, 3)
  })
}
