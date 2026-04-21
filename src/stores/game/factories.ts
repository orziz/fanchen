import type {
  AuctionListing,
  CombatState,
  GameState,
  InventoryEntry,
  LearnedTechniqueState,
  MarketListing,
  NpcState,
  PlayerFactionState,
  PlayerState,
  RelationState,
  SectState,
  StoryState,
  TerritoryEntry,
  WorldState,
} from '@/types/game'
import {
  DISTRIBUTABLE_ITEMS,
  FACTIONS,
  LOCATIONS,
  NPC_ARCHETYPES,
  PERSONALITIES,
} from '@/config'
import { clamp, randomFloat, randomInt, sample, uid } from '@/utils'

export function createRelationState(): RelationState {
  return { affinity: 0, trust: 0, romance: 0, rivalry: 0, role: 'none' }
}

export function deriveLifeStage(age: number) {
  if (age < 14) return '稚龄'
  if (age < 22) return '少年'
  if (age < 40) return '壮年'
  if (age < 60) return '中年'
  return '老年'
}

export function createInitialSect(name = ''): SectState {
  return {
    id: 'player-sect', name, foundedDay: 0, prestige: 0, treasury: 0, food: 60,
    level: 1, disciples: [], elders: [],
    buildings: { hall: 1, dojo: 0, library: 0, market: 0 },
    skillLibrary: [], teachings: [], missions: [], missionDay: 0,
    outerDisciples: 0, eventCooldown: 0,
  }
}

export function createInitialPlayerFaction(name = ''): PlayerFactionState {
  return {
    id: 'player-faction', name, foundedDay: 0, headquartersLocationId: 'qinghe',
    prestige: 0, treasury: 0, supplies: 28, influence: 0, level: 1,
    members: [], crew: { runners: 2, guards: 1, brokers: 1 },
    branches: { caravan: 1, safehouse: 0, watch: 0 },
    missions: [], missionDay: 0, eventCooldown: 0,
  }
}

export function createInitialTerritories(): Record<string, TerritoryEntry> {
  return Object.fromEntries(LOCATIONS.map(loc => [loc.id, {
    locationId: loc.id,
    controllerId: loc.factionIds?.[0] || null,
    incumbentId: loc.factionIds?.[0] || null,
    playerInfluence: 0,
    stability: 18
      + (loc.marketTier || 0) * 6
      + (loc.tags.includes('court') ? 12 : 0)
      + ((loc.tags.includes('port') || loc.tags.includes('market')) ? 6 : 0)
      + (loc.tags.includes('pass') ? 8 : 0),
    prosperity: 22
      + (loc.marketTier || 0) * 8
      + ((loc.tags.includes('port') || loc.tags.includes('market')) ? 8 : 0)
      + (loc.tags.includes('court') ? 5 : 0),
    tradeHeat: 10
      + (loc.marketTier || 0) * 7
      + ((loc.tags.includes('port') || loc.tags.includes('market')) ? 10 : 0)
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
  }]))
}

function createInitialPlayer(): PlayerState {
  return {
    name: '林寒', title: '寒门凡人', rankIndex: 0, cultivation: 0, breakthrough: 0,
    money: 28, reputation: 0, insight: 4, power: 3, charisma: 2,
    qi: 18, hp: 68, stamina: 82, maxQi: 28, maxHp: 72, maxStamina: 92,
    bonusPower: 0, bonusInsight: 0, bonusCharisma: 0,
    cultivationBonus: 0, breakthroughRate: 0.18,
    locationId: 'qinghe', mode: 'balanced', action: 'train',
    inventory: [
      { itemId: 'spirit-grain', quantity: 2 },
      { itemId: 'mist-herb', quantity: 1 },
      { itemId: 'cloth-roll', quantity: 1 },
      { itemId: 'seed-grain', quantity: 1 },
    ],
    equipment: { weapon: null, armor: null, heart: null },
    learnedTechniques: {},
    learnedKnowledges: {},
    affiliationId: null, affiliationRank: 0,
    factionStanding: {}, regionStanding: {}, factionCooldowns: {},
    npcIntel: {},
    wantedByFactionId: null, wantedUntilDay: 0, relations: {},
    masterId: null, partnerId: null, rivalIds: [],
    affiliationTasks: [], affiliationTaskDay: 0,
    sect: null, playerFaction: null, tradeRun: null,
    travelPlan: null,
    assets: { farms: [], workshops: [], shops: [] },
    skills: { farming: 0, crafting: 0, trading: 0 },
    stats: {
      enemiesDefeated: 0, bossKills: 0, tradesCompleted: 0, tradeRoutesCompleted: 0,
      questsFinished: 0, affiliationTasksCompleted: 0, factionTasksCompleted: 0,
      sectTasksCompleted: 0, auctionsWon: 0, meditationSessions: 0,
      disciplesTaught: 0, factionMembersRecruited: 0, cropsHarvested: 0,
      craftedItems: 0, shopCollections: 0, industryUpgrades: 0,
    },
  }
}

export function createInitialTechniqueState(skillId: string, learnedDay = 0): LearnedTechniqueState {
  return { skillId, stage: 1, mastery: 0, learnedDay }
}

export function createLootBundle(
  amount: number,
  options: { minRarity?: number; maxRarity?: number; minTier?: number; maxTier?: number } = {},
) {
  const minRarity = options.minRarity ?? 0
  const maxRarity = options.maxRarity ?? 4
  const minTier = options.minTier ?? 0
  const maxTier = options.maxTier ?? 6
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  const pool = DISTRIBUTABLE_ITEMS.filter(item => {
    const ri = rarityOrder.indexOf(item.rarity)
    return ri >= minRarity && ri <= maxRarity && item.tier >= minTier && item.tier <= maxTier
  })
  const bundle: InventoryEntry[] = []
  for (let i = 0; i < amount; i++) {
    const baseItem = sample(pool)
    const existing = bundle.find(e => e.itemId === baseItem.id)
    if (existing) existing.quantity += 1
    else bundle.push({ itemId: baseItem.id, quantity: 1 })
  }
  return bundle
}

export function createNPC(index: number): NpcState {
  const archetype = sample(NPC_ARCHETYPES)
  const personality = sample(PERSONALITIES)
  const home = sample(LOCATIONS)
  const age = randomInt(14, 62)
  const factionId = home.factionIds?.length ? sample(home.factionIds) : null
  const rankCap = Math.min(4, Math.max(0, home.marketTier + (home.tags.includes('sect') ? 1 : 0)))
  const rankIndex = randomInt(0, rankCap)
  const cultivationBase = [18, 70, 180, 420, 980][Math.min(rankIndex, 4)] || 40
  const professions = home.tags.includes('sect')
    ? ['杂役', '外门弟子', '内门弟子', '执事']
    : home.tags.includes('forge')
      ? ['矿工', '学徒铁匠', '匠工', '镖师']
      : home.tags.includes('port')
        ? ['脚商', '船工', '分号伙计', '掮客']
        : home.tags.includes('town')
          ? ['农户', '货郎', '药农', '店伙']
          : ['游侠', '散户', '猎手', '采药人']
  const name = `${sample(['沈', '陆', '柳', '苏', '白', '秦', '叶', '温', '洛', '宁'])}${sample(archetype.styles)}${sample(['子', '娘', '客', '尘', '书', '川', '歌', '雨', '岚', '舟'])}`
  const mood = {
    greed: clamp(50 + (personality.moodBias.greed || 0) + randomInt(-10, 10), 0, 100),
    kindness: clamp(50 + (personality.moodBias.kindness || 0) + randomInt(-10, 10), 0, 100),
    courage: clamp(50 + (personality.moodBias.courage || 0) + randomInt(-10, 10), 0, 100),
    patience: clamp(50 + (personality.moodBias.patience || 0) + randomInt(-10, 10), 0, 100),
    curiosity: clamp(50 + (personality.moodBias.curiosity || 0) + randomInt(-10, 10), 0, 100),
    intellect: clamp(50 + (personality.moodBias.intellect || 0) + randomInt(-10, 10), 0, 100),
    honor: clamp(50 + (personality.moodBias.honor || 0) + randomInt(-10, 10), 0, 100),
  }
  return {
    id: `npc-${index}`, name: name.trim(), title: archetype.title,
    profession: sample(professions), style: sample(archetype.styles),
    personalityId: personality.id, personalityLabel: personality.label, personalityDesc: personality.desc,
    homeId: home.id, locationId: home.id, rankIndex,
    cultivation: cultivationBase + randomInt(0, Math.max(20, cultivationBase)),
    mood, ambition: randomInt(20, 90), wealth: randomInt(18, 240 + home.marketTier * 90),
    favor: randomInt(0, 18), action: sample(['meditate', 'trade', 'hunt', 'quest', 'sect']),
    goal: sample(['积蓄家底', '找门路入宗', '攒钱买田', '跑货翻身', '学一门手艺', '争取晋升']),
    inventory: createLootBundle(randomInt(1, 3), { minRarity: 0, maxRarity: Math.min(2, home.marketTier + 1), minTier: 0, maxTier: Math.min(3, home.marketTier + 1) }),
    skillBias: archetype.skillBias, favoriteItems: archetype.favoriteItems,
    lastEvent: '初入江湖', lifeEvents: ['初入江湖'], cooldown: randomInt(1, 3),
    age, ageProgress: randomInt(0, 11), lifeStage: deriveLifeStage(age),
    lifespan: randomInt(62, 88), alive: true, birthDay: -(age * 12 + randomInt(0, 11)),
    sectId: factionId && FACTIONS.find(f => f.id === factionId)?.type === 'sect' ? factionId : null,
    factionId, factionRank: factionId ? randomInt(0, 1) : 0,
    relation: createRelationState(), partnerId: null, masterId: null, apprenticeIds: [],
    travelPlan: null,
  }
}

export function createMarketListings(location: { id: string; marketTier: number; marketBias: string; tags: string[] }): MarketListing[] {
  const listings: MarketListing[] = []
  const amount = randomInt(5, 8)
  const allowedTier = Math.max(0, location.marketTier || 0)
  for (let i = 0; i < amount; i++) {
    const weightedPool = DISTRIBUTABLE_ITEMS.filter(item => {
      if (item.tier > allowedTier + (Math.random() < 0.2 ? 1 : 0)) return false
      if (['legendary', 'epic'].includes(item.rarity) && allowedTier < 4) return false
      if (['deed', 'permit', 'sect'].includes(item.type) && !location.tags.some(tag => ['town', 'market', 'port', 'forge', 'sect'].includes(tag))) return false
      return item.type === location.marketBias || Math.random() < 0.35
    })
    const item = sample(weightedPool.length ? weightedPool : DISTRIBUTABLE_ITEMS)
    const modifier = randomFloat(0.96, 1.18) + location.marketTier * 0.04
    listings.push({
      listingId: uid(`market-${location.id}`),
      itemId: item.id,
      quantity: randomInt(1, ['manual', 'weapon', 'armor', 'deed', 'permit', 'sect', 'tool', 'token'].includes(item.type) ? 1 : 3),
      price: Math.max(10, Math.round(item.baseValue * modifier)),
      seller: sample(['本地商会', '流云行脚', '黑市摊主', '宗门执事', '秘境拾荒客']),
    })
  }
  return listings
}

function createInitialMarket(): Record<string, MarketListing[]> {
  const markets: Record<string, MarketListing[]> = {}
  LOCATIONS.forEach(loc => { markets[loc.id] = createMarketListings(loc) })
  return markets
}

export function createAuctionListings(amount: number, playerRankIndex = 0, playerReputation = 0): AuctionListing[] {
  const listings: AuctionListing[] = []
  const progressionTier = Math.max(1, Math.min(6, playerRankIndex + Math.floor(playerReputation / 18) + 1))
  const eligible = DISTRIBUTABLE_ITEMS.filter(item => item.tier >= 1 && item.tier <= progressionTier + 1 && !['seed', 'grain', 'wood', 'cloth'].includes(item.type))
  for (let i = 0; i < amount; i++) {
    const item = sample(eligible)
    const currentBid = Math.round(item.baseValue * randomFloat(0.88, 1.22))
    listings.push({
      id: uid('auction'), itemId: item.id, currentBid,
      minimumRaise: Math.max(10, Math.round(currentBid * 0.1)),
      turnsLeft: randomInt(4, 8), bidderId: sample(['market', 'mystery']),
      seller: sample(['潮声秘市', '玄铁夜拍', '陨星异宝拍卖', '玉阙竞珍']),
      quantity: 1, interest: randomInt(28, 100),
    })
  }
  return listings
}

function createInitialWorld(): WorldState {
  return {
    day: 1, hour: 0, subStep: 0,
    weather: sample(['晴', '微雨', '雾起', '大风', '寒霜']),
    omen: sample(['星辉平稳', '灵潮暗涌', '海雾倒卷', '宗门钟鸣', '赤霞流火']),
    factionFavor: { merchants: 0, court: 0, sect: 0, rogues: 0 },
    factions: Object.fromEntries(FACTIONS.map(f => [f.id, { standing: 0, favor: 0, joined: false }])),
    realm: { activeRealmId: null, cooldown: 0, bossVictories: [] },
    industryOrders: [], industryOrderDay: 1,
    territories: createInitialTerritories(),
    events: [],
  }
}

function createInitialCombat(): CombatState {
  return {
    currentEnemy: null, history: [], autoBattle: false,
    lastResult: null, pendingRealmId: null,
    playerEffects: { burn: 0, guard: 0, chill: 0 },
  }
}

function createInitialStory(): StoryState {
  return {
    activeStoryId: null,
    activeNodeId: null,
    activeProgressKey: null,
    presentation: null,
    bindings: { npcId: null, locationId: null },
    suspended: null,
    progress: {},
    flags: {},
    history: [],
  }
}

function seedInitialNpcIntel(player: PlayerState, npcs: NpcState[]) {
  npcs.forEach((npc) => {
    if (npc.locationId === player.locationId) {
      player.npcIntel[npc.id] = 'met'
    }
  })
}

export function createGameState(): GameState {
  const player = createInitialPlayer()
  const npcs = Array.from({ length: 12 }, (_, i) => createNPC(i + 1))
  seedInitialNpcIntel(player, npcs)
  return {
    player,
    npcs,
    market: createInitialMarket(),
    auction: createAuctionListings(randomInt(4, 6)),
    world: createInitialWorld(),
    combat: createInitialCombat(),
    story: createInitialStory(),
    migrationFlags: { deedRefundPatchApplied: false },
    log: [], lastSavedAt: null,
  }
}