import { getContext } from '@/core/context'
import { PLAYER_SECT_ENABLED } from '@/config'
import type { GameState } from '@/types/game'
import { clamp, round } from '@/utils'

const SCALE = 100

type PlayerMetricKey = 'cultivation' | 'breakthrough' | 'reputation' | 'insight' | 'power' | 'charisma'
type PlayerSkillKey = 'farming' | 'crafting' | 'trading'
type PlayerFactionMetricKey = 'influence' | 'prestige'

function asWhole(value: number, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return clamp(0, min, max)
  return clamp(round(value), min, max)
}

function splitDecimal(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0
  const whole = Math.trunc(safeValue)
  const carry = Math.round((safeValue - whole) * SCALE)
  return { whole, carry }
}

function getCarryMap(game: GameState) {
  const flags = game.migrationFlags as Record<string, unknown>
  const current = flags.numericCarry
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return current as Record<string, number>
  }
  const created: Record<string, number> = {}
  flags.numericCarry = created
  return created
}

function setCarryValue(game: GameState, bucketKey: string, carry: number) {
  const carryMap = getCarryMap(game)
  if (!carry) {
    delete carryMap[bucketKey]
    return
  }
  carryMap[bucketKey] = carry
}

function backfillCarriedValue(game: GameState, bucketKey: string, value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  const { whole, carry } = splitDecimal(value)
  setCarryValue(game, bucketKey, carry)
  return clamp(whole, min, max)
}

export function resolveCarriedDelta(game: GameState, bucketKey: string, delta: number) {
  if (!delta || !Number.isFinite(delta)) return 0
  const carryMap = getCarryMap(game)
  const total = (carryMap[bucketKey] || 0) + Math.round(delta * SCALE)
  const wholeDelta = total >= 0 ? Math.floor(total / SCALE) : Math.ceil(total / SCALE)
  const rest = total - wholeDelta * SCALE
  if (rest) carryMap[bucketKey] = rest
  else delete carryMap[bucketKey]
  return wholeDelta
}

export function addPlayerMetric(key: PlayerMetricKey, delta: number, options: { min?: number; max?: number } = {}) {
  const ctx = getContext()
  const player = ctx.game.player
  const wholeDelta = resolveCarriedDelta(ctx.game, `player.${key}`, delta)
  if (!wholeDelta) return player[key]
  const nextValue = player[key] + wholeDelta
  player[key] = clamp(nextValue, options.min ?? 0, options.max ?? Number.POSITIVE_INFINITY)
  return player[key]
}

export function addPlayerSkill(key: PlayerSkillKey, delta: number) {
  const ctx = getContext()
  const skills = ctx.game.player.skills
  const wholeDelta = resolveCarriedDelta(ctx.game, `player.skills.${key}`, delta)
  if (!wholeDelta) return skills[key]
  skills[key] = Math.max(0, skills[key] + wholeDelta)
  return skills[key]
}

export function addPlayerFactionMetric(key: PlayerFactionMetricKey, delta: number, options: { min?: number; max?: number } = {}) {
  const ctx = getContext()
  const playerFaction = ctx.game.player.playerFaction
  if (!playerFaction) return 0
  const wholeDelta = resolveCarriedDelta(ctx.game, `player.playerFaction.${key}`, delta)
  if (!wholeDelta) return playerFaction[key]
  const nextValue = playerFaction[key] + wholeDelta
  playerFaction[key] = clamp(nextValue, options.min ?? 0, options.max ?? Number.POSITIVE_INFINITY)
  return playerFaction[key]
}

function normalizeLooseNumberRecord(entry: Record<string, unknown> | null | undefined) {
  if (!entry) return
  Object.keys(entry).forEach((key) => {
    const value = entry[key]
    if (typeof value === 'number') entry[key] = round(value)
  })
}

function normalizeMissionList(missions: unknown) {
  if (!Array.isArray(missions)) return []
  return missions.map((mission) => {
    if (!mission || typeof mission !== 'object') return mission
    normalizeLooseNumberRecord(mission as Record<string, unknown>)
    return mission
  })
}

export function normalizeGameNumericState(game: GameState) {
  const player = game.player
  const playerIntegerKeys = [
    'rankIndex',
    'money',
    'qi',
    'hp',
    'stamina',
    'maxQi',
    'maxHp',
    'maxStamina',
    'bonusPower',
    'bonusInsight',
    'bonusCharisma',
    'affiliationRank',
    'wantedUntilDay',
  ] as const
  playerIntegerKeys.forEach((key) => {
    player[key] = asWhole(player[key], 0)
  })

  player.cultivation = backfillCarriedValue(game, 'player.cultivation', player.cultivation)
  player.breakthrough = backfillCarriedValue(game, 'player.breakthrough', player.breakthrough)
  player.reputation = backfillCarriedValue(game, 'player.reputation', player.reputation)
  player.insight = backfillCarriedValue(game, 'player.insight', player.insight)
  player.power = backfillCarriedValue(game, 'player.power', player.power)
  player.charisma = backfillCarriedValue(game, 'player.charisma', player.charisma)
  player.skills.farming = backfillCarriedValue(game, 'player.skills.farming', player.skills.farming)
  player.skills.crafting = backfillCarriedValue(game, 'player.skills.crafting', player.skills.crafting)
  player.skills.trading = backfillCarriedValue(game, 'player.skills.trading', player.skills.trading)

  player.inventory = player.inventory.map((entry) => ({
    ...entry,
    quantity: asWhole(entry.quantity, 0),
  }))

  Object.keys(player.learnedTechniques || {}).forEach((skillId) => {
    const state = player.learnedTechniques[skillId]
    state.stage = asWhole(state.stage, 0)
    state.mastery = asWhole(state.mastery, 0)
    state.learnedDay = asWhole(state.learnedDay, 0)
  })

  Object.keys(player.learnedKnowledges || {}).forEach((knowledgeId) => {
    player.learnedKnowledges[knowledgeId] = asWhole(player.learnedKnowledges[knowledgeId], 0)
  })

  Object.keys(player.factionStanding || {}).forEach((factionId) => {
    player.factionStanding[factionId] = backfillCarriedValue(game, `player.factionStanding.${factionId}`, player.factionStanding[factionId])
  })

  Object.keys(player.regionStanding || {}).forEach((locationId) => {
    player.regionStanding[locationId] = backfillCarriedValue(game, `player.regionStanding.${locationId}`, player.regionStanding[locationId])
  })

  Object.keys(player.factionCooldowns || {}).forEach((factionId) => {
    player.factionCooldowns[factionId] = asWhole(player.factionCooldowns[factionId], 0)
  })

  Object.keys(player.relations || {}).forEach((npcId) => {
    const relation = player.relations[npcId]
    relation.affinity = asWhole(relation.affinity, -100, 100)
    relation.trust = asWhole(relation.trust, -100, 100)
    relation.romance = asWhole(relation.romance, -100, 100)
    relation.rivalry = asWhole(relation.rivalry, 0, 100)
  })

  Object.keys(player.stats || {}).forEach((key) => {
    const stats = player.stats as unknown as Record<string, number>
    stats[key] = asWhole(stats[key], 0)
  })

  player.affiliationTasks = normalizeMissionList(player.affiliationTasks) as typeof player.affiliationTasks
  player.affiliationTaskDay = asWhole(player.affiliationTaskDay, 0)

  if (player.tradeRun) {
    player.tradeRun.purchaseCost = asWhole(player.tradeRun.purchaseCost, 0)
    player.tradeRun.saleEstimate = asWhole(player.tradeRun.saleEstimate, 0)
    player.tradeRun.segments = asWhole(player.tradeRun.segments, 0)
    player.tradeRun.startedDay = asWhole(player.tradeRun.startedDay, 0)
  }

  if (player.travelPlan) {
    player.travelPlan.nextIndex = asWhole(player.travelPlan.nextIndex, 0)
    player.travelPlan.startedDay = asWhole(player.travelPlan.startedDay, 0)
  }

  if (player.sect) {
    player.sect.foundedDay = asWhole(player.sect.foundedDay, 0)
    player.sect.prestige = backfillCarriedValue(game, 'player.sect.prestige', player.sect.prestige)
    player.sect.treasury = asWhole(player.sect.treasury, 0)
    player.sect.food = asWhole(player.sect.food, 0)
    player.sect.level = asWhole(player.sect.level, 1)
    player.sect.missionDay = asWhole(player.sect.missionDay, 0)
    player.sect.outerDisciples = asWhole(player.sect.outerDisciples, 0)
    player.sect.eventCooldown = asWhole(player.sect.eventCooldown, 0)
    Object.keys(player.sect.buildings).forEach((key) => {
      const buildings = player.sect!.buildings as unknown as Record<string, number>
      buildings[key] = asWhole(buildings[key], 0)
    })
    player.sect.teachings = player.sect.teachings.map((teaching) => ({
      ...teaching,
      stage: asWhole(teaching.stage, 0),
      mastery: asWhole(teaching.mastery, 0),
    }))
    player.sect.missions = normalizeMissionList(player.sect.missions) as typeof player.sect.missions
  }

  if (player.playerFaction) {
    player.playerFaction.foundedDay = asWhole(player.playerFaction.foundedDay, 0)
    player.playerFaction.prestige = backfillCarriedValue(game, 'player.playerFaction.prestige', player.playerFaction.prestige)
    player.playerFaction.treasury = asWhole(player.playerFaction.treasury, 0)
    player.playerFaction.supplies = asWhole(player.playerFaction.supplies, 0)
    player.playerFaction.influence = backfillCarriedValue(game, 'player.playerFaction.influence', player.playerFaction.influence)
    player.playerFaction.level = asWhole(player.playerFaction.level, 1)
    player.playerFaction.missionDay = asWhole(player.playerFaction.missionDay, 0)
    player.playerFaction.eventCooldown = asWhole(player.playerFaction.eventCooldown, 0)
    Object.keys(player.playerFaction.crew).forEach((key) => {
      const crew = player.playerFaction!.crew as unknown as Record<string, number>
      crew[key] = asWhole(crew[key], 0)
    })
    Object.keys(player.playerFaction.branches).forEach((key) => {
      const branches = player.playerFaction!.branches as unknown as Record<string, number>
      branches[key] = asWhole(branches[key], 0)
    })
    player.playerFaction.missions = normalizeMissionList(player.playerFaction.missions) as typeof player.playerFaction.missions
  }

  game.npcs = game.npcs.map((npc) => ({
    ...npc,
    rankIndex: asWhole(npc.rankIndex, 0),
    cultivation: asWhole(npc.cultivation, 0),
    ambition: asWhole(npc.ambition, 0),
    wealth: asWhole(npc.wealth, 0),
    favor: asWhole(npc.favor, 0),
    cooldown: asWhole(npc.cooldown, 0),
    age: asWhole(npc.age, 0),
    ageProgress: asWhole(npc.ageProgress, 0),
    lifespan: asWhole(npc.lifespan, 1),
    birthDay: asWhole(npc.birthDay),
    factionRank: asWhole(npc.factionRank, 0),
    mood: {
      greed: asWhole(npc.mood.greed, 0, 100),
      kindness: asWhole(npc.mood.kindness, 0, 100),
      courage: asWhole(npc.mood.courage, 0, 100),
      patience: asWhole(npc.mood.patience, 0, 100),
      curiosity: asWhole(npc.mood.curiosity, 0, 100),
      intellect: asWhole(npc.mood.intellect, 0, 100),
      honor: asWhole(npc.mood.honor, 0, 100),
    },
    relation: {
      ...npc.relation,
      affinity: asWhole(npc.relation.affinity, -100, 100),
      trust: asWhole(npc.relation.trust, -100, 100),
      romance: asWhole(npc.relation.romance, -100, 100),
      rivalry: asWhole(npc.relation.rivalry, 0, 100),
    },
    inventory: npc.inventory.map((entry) => ({
      ...entry,
      quantity: asWhole(entry.quantity, 0),
    })),
    travelPlan: npc.travelPlan ? {
      ...npc.travelPlan,
      nextIndex: asWhole(npc.travelPlan.nextIndex, 0),
      startedDay: asWhole(npc.travelPlan.startedDay, 0),
    } : null,
  }))

  game.market = Object.fromEntries(
    Object.entries(game.market || {}).map(([locationId, listings]) => [
      locationId,
      listings.map((listing) => ({
        ...listing,
        quantity: asWhole(listing.quantity, 0),
        price: asWhole(listing.price, 0),
      })),
    ]),
  )

  game.auction = (game.auction || []).map((listing) => ({
    ...listing,
    currentBid: asWhole(listing.currentBid, 0),
    minimumRaise: asWhole(listing.minimumRaise, 0),
    turnsLeft: asWhole(listing.turnsLeft, 0),
    quantity: asWhole(listing.quantity, 0),
    interest: asWhole(listing.interest, 0),
  }))

  game.world.day = asWhole(game.world.day, 1)
  game.world.hour = asWhole(game.world.hour, 0)
  game.world.subStep = asWhole(game.world.subStep, 0)
  game.world.industryOrderDay = asWhole(game.world.industryOrderDay, 0)
  game.world.factionFavor.merchants = backfillCarriedValue(game, 'world.factionFavor.merchants', game.world.factionFavor.merchants)
  game.world.factionFavor.court = backfillCarriedValue(game, 'world.factionFavor.court', game.world.factionFavor.court)
  game.world.factionFavor.sect = backfillCarriedValue(game, 'world.factionFavor.sect', game.world.factionFavor.sect)
  game.world.factionFavor.rogues = backfillCarriedValue(game, 'world.factionFavor.rogues', game.world.factionFavor.rogues)
  Object.keys(game.world.factions || {}).forEach((factionId) => {
    const entry = game.world.factions[factionId]
    entry.standing = backfillCarriedValue(game, `world.factions.${factionId}.standing`, entry.standing)
    entry.favor = backfillCarriedValue(game, `world.factions.${factionId}.favor`, entry.favor)
  })
  game.world.realm.cooldown = asWhole(game.world.realm.cooldown, 0)
  Object.keys(game.world.territories || {}).forEach((locationId) => {
    const territory = game.world.territories[locationId]
    territory.playerInfluence = asWhole(territory.playerInfluence, 0)
    territory.stability = asWhole(territory.stability, 0)
    territory.prosperity = asWhole(territory.prosperity, 0)
    territory.tradeHeat = asWhole(territory.tradeHeat, 0)
    territory.localSupply = asWhole(territory.localSupply, 0)
    territory.needPressure = asWhole(territory.needPressure, 0)
  })
  game.world.industryOrders = (game.world.industryOrders || []).map((order) => ({
    ...order,
    rewardMoney: asWhole(order.rewardMoney, 0),
    rewardReputation: asWhole(order.rewardReputation, 0),
    standing: asWhole(order.standing, 0),
    requirements: order.requirements.map((req) => ({
      ...req,
      quantity: asWhole(req.quantity, 0),
    })),
  }))

  if (game.combat.currentEnemy) {
    game.combat.currentEnemy.maxHp = asWhole(game.combat.currentEnemy.maxHp, 1)
    game.combat.currentEnemy.hp = asWhole(game.combat.currentEnemy.hp, 0)
    game.combat.currentEnemy.maxQi = asWhole(game.combat.currentEnemy.maxQi, 0)
    game.combat.currentEnemy.qi = asWhole(game.combat.currentEnemy.qi, 0)
    game.combat.currentEnemy.power = asWhole(game.combat.currentEnemy.power, 0)
    game.combat.currentEnemy.burnOnHit = asWhole(game.combat.currentEnemy.burnOnHit, 0)
    game.combat.currentEnemy.chillOnHit = asWhole(game.combat.currentEnemy.chillOnHit, 0)
    game.combat.currentEnemy.qiBurn = asWhole(game.combat.currentEnemy.qiBurn, 0)
    game.combat.currentEnemy.rewards.money = asWhole(game.combat.currentEnemy.rewards.money, 0)
    game.combat.currentEnemy.rewards.cultivation = asWhole(game.combat.currentEnemy.rewards.cultivation, 0)
    game.combat.currentEnemy.rewards.reputation = asWhole(game.combat.currentEnemy.rewards.reputation, 0)
    game.combat.currentEnemy.rewards.breakthrough = asWhole(game.combat.currentEnemy.rewards.breakthrough, 0)
    game.combat.currentEnemy.effects.burn = asWhole(game.combat.currentEnemy.effects.burn, 0)
    game.combat.currentEnemy.effects.exposed = asWhole(game.combat.currentEnemy.effects.exposed, 0)
    game.combat.currentEnemy.effects.chill = asWhole(game.combat.currentEnemy.effects.chill, 0)
  }
  game.combat.playerEffects.burn = asWhole(game.combat.playerEffects.burn, 0)
  game.combat.playerEffects.guard = asWhole(game.combat.playerEffects.guard, 0)
  game.combat.playerEffects.chill = asWhole(game.combat.playerEffects.chill, 0)

  Object.keys(game.story.progress || {}).forEach((progressKey) => {
    game.story.progress[progressKey].triggerCount = asWhole(game.story.progress[progressKey].triggerCount, 0)
  })
  game.story.history = (game.story.history || []).map((entry) => ({
    ...entry,
    day: asWhole(entry.day, 0),
    hour: asWhole(entry.hour, 0),
  }))

  game.lastSavedAt = game.lastSavedAt ? asWhole(game.lastSavedAt, 0) : null

  if (!PLAYER_SECT_ENABLED && player.mode === 'sect') {
    player.mode = 'balanced'
  }
}