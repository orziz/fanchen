import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GameState, PlayerState, NpcState, CombatState, WorldState,
  InventoryEntry, RelationState, LogEntry, MarketListing, AuctionListing,
  AssetState, EnemyState, PlayerEffects, CombatHistoryEntry, CombatLastResult,
  SectState, PlayerFactionState, TradeRun, TerritoryEntry, IndustryOrder,
  StoryState, StoryHistoryEntry, StoryProgressEntry,
} from '@/types/game'
import {
  RANKS, ITEMS, LOCATIONS, LOCATION_MAP, FACTIONS, FACTION_MAP,
  MONSTER_TEMPLATES, MONSTER_AFFIXES, REALM_TEMPLATES, PROPERTY_DEFS,
  CROPS, CRAFT_RECIPES, MODE_OPTIONS, ACTION_META, TIME_LABELS,
  SAVE_KEY, LEGACY_SAVE_KEYS, MAX_LOG, NPC_ARCHETYPES, PERSONALITIES,
  WORLD_EVENT_TEMPLATES, TRAVEL_EVENT_TEMPLATES, SOCIAL_EVENT_TEMPLATES, SECT_EVENT_TEMPLATES,
  SECT_BUILDINGS,
} from '@/config'
import {
  randomInt, randomFloat, sample, clamp, round, uid, ensureArray,
  fillTemplate, findRoute, buildMapTexture,
} from '@/utils'
import type { MapTexture } from '@/utils'
import { getItem } from '@/config'
import { bus } from '@/core/events'
import { setContext, type GameContext } from '@/core/context'

/* ═══════════════════ Factories ═══════════════════ */

function createRelationState(): RelationState {
  return { affinity: 0, trust: 0, romance: 0, rivalry: 0, role: 'none' }
}

function deriveLifeStage(age: number) {
  if (age < 14) return '稚龄'
  if (age < 22) return '少年'
  if (age < 40) return '壮年'
  if (age < 60) return '中年'
  return '老年'
}

function createInitialSect(name = ''): SectState {
  return {
    id: 'player-sect', name, foundedDay: 0, prestige: 0, treasury: 0, food: 60,
    level: 1, disciples: [], elders: [],
    buildings: { hall: 1, dojo: 0, library: 0, market: 0 },
    manualLibrary: [], teachings: [], missions: [], missionDay: 0,
    outerDisciples: 0, eventCooldown: 0,
  }
}

function createInitialPlayerFaction(name = ''): PlayerFactionState {
  return {
    id: 'player-faction', name, foundedDay: 0, headquartersLocationId: 'qinghe',
    prestige: 0, treasury: 0, supplies: 28, influence: 0, level: 1,
    members: [], crew: { runners: 2, guards: 1, brokers: 1 },
    branches: { caravan: 1, safehouse: 0, watch: 0 },
    missions: [], missionDay: 0, eventCooldown: 0,
  }
}

function createInitialTerritories(): Record<string, TerritoryEntry> {
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
    equipment: { weapon: null, armor: null, manual: null },
    affiliationId: null, affiliationRank: 0,
    factionStanding: {}, regionStanding: {}, factionCooldowns: {},
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

function createLootBundle(amount: number, options: { minRarity?: number; maxRarity?: number; minTier?: number; maxTier?: number } = {}) {
  const minRarity = options.minRarity ?? 0
  const maxRarity = options.maxRarity ?? 4
  const minTier = options.minTier ?? 0
  const maxTier = options.maxTier ?? 6
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  const pool = ITEMS.filter(item => {
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

function createNPC(index: number): NpcState {
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

function createMarketListings(location: { id: string; marketTier: number; marketBias: string; tags: string[] }): MarketListing[] {
  const listings: MarketListing[] = []
  const amount = randomInt(5, 8)
  const allowedTier = Math.max(0, location.marketTier || 0)
  for (let i = 0; i < amount; i++) {
    const weightedPool = ITEMS.filter(item => {
      if (item.tier > allowedTier + (Math.random() < 0.2 ? 1 : 0)) return false
      if (['legendary', 'epic'].includes(item.rarity) && allowedTier < 4) return false
      if (['deed', 'permit', 'sect'].includes(item.type) && !location.tags.some(tag => ['town', 'market', 'port', 'forge', 'sect'].includes(tag))) return false
      return item.type === location.marketBias || Math.random() < 0.35
    })
    const item = sample(weightedPool.length ? weightedPool : ITEMS)
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

function createAuctionListings(amount: number, playerRankIndex = 0, playerReputation = 0): AuctionListing[] {
  const listings: AuctionListing[] = []
  const progressionTier = Math.max(1, Math.min(6, playerRankIndex + Math.floor(playerReputation / 18) + 1))
  const eligible = ITEMS.filter(item => item.tier >= 1 && item.tier <= progressionTier + 1 && !['seed', 'grain', 'wood', 'cloth'].includes(item.type))
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
    progress: {},
    flags: {},
    history: [],
  }
}

function createGameState(): GameState {
  return {
    player: createInitialPlayer(),
    npcs: Array.from({ length: 12 }, (_, i) => createNPC(i + 1)),
    market: createInitialMarket(),
    auction: createAuctionListings(randomInt(4, 6)),
    world: createInitialWorld(),
    combat: createInitialCombat(),
    story: createInitialStory(),
    migrationFlags: { deedRefundPatchApplied: false },
    log: [], lastSavedAt: null,
  }
}

/* ═══════════════════ Hydration ═══════════════════ */

function hydrateGameState(raw: Partial<GameState> = {}): GameState {
  const fresh = createGameState()
  const rawNpcs = ensureArray<NpcState>(raw.npcs)
  const rawSect = raw.player?.sect
  const rawPF = raw.player?.playerFaction
  const defaultSect = rawSect ? createInitialSect(rawSect.name || '') : null
  const defaultPF = rawPF ? createInitialPlayerFaction(rawPF.name || '') : null
  const rawStoryProgress = raw.story?.progress || {}
  const storyProgressDefaults: StoryProgressEntry = {
    status: 'idle',
    seenNodeIds: [],
    triggerCount: 0,
    lastNodeId: null,
  }

  const game: GameState = {
    ...fresh, ...raw,
    player: {
      ...fresh.player, ...raw.player,
      equipment: { ...fresh.player.equipment, ...(raw.player?.equipment || {}) },
      assets: { ...fresh.player.assets, ...(raw.player?.assets || {}) },
      skills: { ...fresh.player.skills, ...(raw.player?.skills || {}) },
      factionStanding: { ...fresh.player.factionStanding, ...(raw.player?.factionStanding || {}) },
      regionStanding: { ...fresh.player.regionStanding, ...(raw.player?.regionStanding || {}) },
      relations: { ...fresh.player.relations, ...(raw.player?.relations || {}) },
      stats: { ...fresh.player.stats, ...(raw.player?.stats || {}) },
      affiliationTasks: Array.isArray(raw.player?.affiliationTasks) ? raw.player!.affiliationTasks : [],
      affiliationTaskDay: raw.player?.affiliationTaskDay || 0,
      tradeRun: raw.player?.tradeRun || null,
      travelPlan: raw.player?.travelPlan || null,
      sect: rawSect ? { ...defaultSect!, ...rawSect, buildings: { ...defaultSect!.buildings, ...(rawSect.buildings || {}) } } : null,
      playerFaction: rawPF ? {
        ...defaultPF!, ...rawPF,
        crew: { ...defaultPF!.crew, ...(rawPF.crew || {}) },
        branches: { ...defaultPF!.branches, ...(rawPF.branches || {}) },
      } : null,
    },
    world: {
      ...fresh.world, ...raw.world,
      factionFavor: { ...fresh.world.factionFavor, ...(raw.world?.factionFavor || {}) },
      factions: { ...fresh.world.factions, ...(raw.world?.factions || {}) },
      territories: { ...fresh.world.territories, ...(raw.world?.territories || {}) },
      realm: { ...fresh.world.realm, ...(raw.world?.realm || {}) },
    },
    combat: { ...fresh.combat, ...(raw.combat || {}) },
    story: {
      ...fresh.story, ...(raw.story || {}),
      bindings: { ...fresh.story.bindings, ...(raw.story?.bindings || {}) },
      progress: Object.fromEntries(
        Object.entries(rawStoryProgress).map(([key, value]) => {
          const entry = value as Partial<StoryProgressEntry> | undefined
          return [key, {
            ...storyProgressDefaults,
            ...(entry || {}),
            seenNodeIds: ensureArray<string>(entry?.seenNodeIds),
          }]
        }),
      ),
      flags: { ...fresh.story.flags, ...(raw.story?.flags || {}) },
      history: ensureArray<StoryHistoryEntry>(raw.story?.history).slice(0, 24).map(entry => ({
        storyId: entry.storyId || '',
        progressKey: entry.progressKey || entry.storyId || '',
        nodeId: entry.nodeId || '',
        title: entry.title || '未命名剧情',
        speaker: entry.speaker || '',
        text: entry.text || '',
        day: Number(entry.day) || 0,
        hour: Number(entry.hour) || 0,
      })),
    },
    market: raw.market || fresh.market,
    auction: raw.auction || fresh.auction,
    migrationFlags: { ...fresh.migrationFlags, ...(raw.migrationFlags || {}) },
    npcs: rawNpcs.length
      ? rawNpcs.map((npc, i) => ({
          ...createNPC(i + 80), ...npc,
          lifeEvents: ensureArray<string>(npc.lifeEvents).length ? npc.lifeEvents : [npc.lastEvent || '初入江湖'],
          relation: { ...createRelationState(), ...(npc.relation || {}) },
          travelPlan: npc.travelPlan || null,
        }))
      : fresh.npcs,
    log: ensureArray<LogEntry>(raw.log).slice(0, MAX_LOG),
  }

  const assetDefaults = { level: 1, managerNpcId: null, automationTargetId: null, pendingIncome: 0 }
  game.player.assets.farms = ensureArray<AssetState>(game.player.assets.farms).map(a => ({ ...assetDefaults, ...a }))
  game.player.assets.workshops = ensureArray<AssetState>(game.player.assets.workshops).map(a => ({ ...assetDefaults, ...a }))
  game.player.assets.shops = ensureArray<AssetState>(game.player.assets.shops).map(a => ({ ...assetDefaults, ...a }))

  return game
}

function readStoredSave() {
  const keys = [SAVE_KEY, ...LEGACY_SAVE_KEYS]
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw) return { key, raw }
  }
  return null
}

/* ═══════════════════ Store ═══════════════════ */

export const useGameStore = defineStore('game', () => {
  /* ─── State ─── */
  const game = ref<GameState>(createGameState())
  const selectedLocationId = ref('qinghe')
  const speed = ref(1)
  const saveState = ref('未存档')
  const mapTexture = ref<MapTexture>(buildMapTexture())
  const feedback = ref<{ text: string; type: string } | null>(null)
  const initialized = ref(false)

  /* ─── Getters ─── */
  const player = computed(() => game.value.player)
  const npcs = computed(() => game.value.npcs)
  const combat = computed(() => game.value.combat)
  const world = computed(() => game.value.world)
  const market = computed(() => game.value.market)
  const auction = computed(() => game.value.auction)
  const log = computed(() => game.value.log)
  const story = computed(() => game.value.story)

  const currentLocation = computed(() => LOCATION_MAP.get(player.value.locationId)!)
  const selectedLocation = computed(() => LOCATION_MAP.get(selectedLocationId.value) || currentLocation.value)
  const rankData = computed(() => RANKS[Math.min(player.value.rankIndex, RANKS.length - 1)])
  const nextBreakthroughNeed = computed(() => {
    const next = RANKS[Math.min(player.value.rankIndex + 1, RANKS.length - 1)]
    return next ? next.need : 999999
  })
  const playerPower = computed(() => player.value.power + (player.value.bonusPower || 0))
  const playerInsight = computed(() => player.value.insight + (player.value.bonusInsight || 0))
  const playerCharisma = computed(() => player.value.charisma + (player.value.bonusCharisma || 0))
  const currentAffiliation = computed(() => player.value.affiliationId ? FACTION_MAP.get(player.value.affiliationId) || null : null)
  const playerFaction = computed(() => player.value.playerFaction)
  const sect = computed(() => player.value.sect)

  /* ─── GameContext getter methods (framework-agnostic) ─── */
  function getCurrentLocation() { return currentLocation.value }
  function getSelectedLocation() { return selectedLocation.value }
  function getRankData(index?: number) {
    const i = index ?? player.value.rankIndex
    return RANKS[Math.min(i, RANKS.length - 1)]
  }
  function getNextBreakthroughNeed() { return nextBreakthroughNeed.value }
  function getPlayerPower() { return playerPower.value }
  function getPlayerInsight() { return playerInsight.value }
  function getPlayerCharisma() { return playerCharisma.value }
  function getCurrentAffiliation() { return currentAffiliation.value }
  function getPlayerFaction() { return playerFaction.value }
  function getSect() { return sect.value }

  /* ─── Helpers ─── */
  function getNpc(npcId: string) {
    return game.value.npcs.find(n => n.id === npcId) || null
  }

  function findInventoryEntry(itemId: string) {
    return game.value.player.inventory.find(e => e.itemId === itemId) || null
  }

  function ensurePlayerRelation(npcId: string): RelationState {
    game.value.player.relations[npcId] = game.value.player.relations[npcId] || createRelationState()
    return game.value.player.relations[npcId]
  }

  function addItemToInventory(itemId: string, quantity = 1) {
    const entry = findInventoryEntry(itemId)
    if (entry) entry.quantity += quantity
    else game.value.player.inventory.push({ itemId, quantity })
    bus.emit('state:inventory-changed', { itemId, quantity })
  }

  function removeItemFromInventory(itemId: string, quantity = 1): boolean {
    const entry = findInventoryEntry(itemId)
    if (!entry || entry.quantity < quantity) return false
    entry.quantity -= quantity
    if (entry.quantity <= 0) {
      game.value.player.inventory = game.value.player.inventory.filter(e => e !== entry)
    }
    bus.emit('state:inventory-changed', { itemId, quantity: -quantity })
    return true
  }

  function adjustResource(key: string, amount: number, maxKey?: string) {
    const p = game.value.player as Record<string, unknown>
    const current = p[key]
    if (typeof current !== 'number') return
    const max = maxKey && typeof p[maxKey] === 'number' ? p[maxKey] as number : Infinity
    ;(p[key] as number) = clamp(current + amount, 0, max)
    bus.emit('state:resource-changed', { key, amount, value: p[key] })
  }

  function appendLog(text: string, type = 'info') {
    const w = game.value.world
    const stamp = `第${w.day}日 ${TIME_LABELS[w.hour]}`
    game.value.log.unshift({ stamp, text, type })
    if (game.value.log.length > MAX_LOG) game.value.log.length = MAX_LOG
    if (['warn', 'loot', 'action'].includes(type)) {
      feedback.value = { text, type }
      setTimeout(() => { feedback.value = null }, 3000)
    }
    bus.emit('state:log-added', { text, type })
  }

  function getRegionStanding(locationId = player.value.locationId) {
    return game.value.player.regionStanding[locationId] || 0
  }

  function adjustRegionStanding(locationId = player.value.locationId, amount = 0) {
    if (!locationId || !amount) return
    game.value.player.regionStanding[locationId] = round((game.value.player.regionStanding[locationId] || 0) + amount, 1)
    bus.emit('state:region-standing-changed', { locationId, amount })
  }

  function adjustFactionStanding(factionId: string | null, amount: number) {
    if (!factionId) return 0
    const p = game.value.player
    const w = game.value.world
    p.factionStanding[factionId] = round((p.factionStanding[factionId] || 0) + amount, 1)
    if (w.factions[factionId]) {
      w.factions[factionId].standing = p.factionStanding[factionId]
      w.factions[factionId].favor += amount * 0.25
    }
    const faction = FACTION_MAP.get(factionId)
    if (faction) {
      const officialTypes = new Set(['court', 'bureau', 'garrison'])
      if (officialTypes.has(faction.type)) w.factionFavor.court += amount * 0.2
      else if (['guild', 'escort', 'village', 'society'].includes(faction.type)) w.factionFavor.merchants += amount * 0.18
      else if (faction.type === 'order') w.factionFavor.sect += amount * 0.12
    }
    // check affiliation rank up
    const affFaction = currentAffiliation.value
    if (affFaction) {
      const standing = p.factionStanding[affFaction.id] || 0
      const nextRank = standing >= 80 ? 3 : standing >= 45 ? 2 : standing >= 18 ? 1 : 0
      if (nextRank > p.affiliationRank) {
        p.affiliationRank = nextRank
        p.title = `${affFaction.name}${affFaction.titles[nextRank]}`
        appendLog(`你在${affFaction.name}中的身份升为"${affFaction.titles[nextRank]}"。`, 'loot')
      }
    }
    bus.emit('state:faction-standing-changed', { factionId, amount })
    return p.factionStanding[factionId]
  }

  function adjustRelation(npcId: string, delta: Partial<RelationState> = {}) {
    const relation = ensurePlayerRelation(npcId)
    relation.affinity = clamp(relation.affinity + (delta.affinity || 0), -100, 100)
    relation.trust = clamp(relation.trust + (delta.trust || 0), -100, 100)
    relation.romance = clamp(relation.romance + (delta.romance || 0), -100, 100)
    relation.rivalry = clamp(relation.rivalry + (delta.rivalry || 0), 0, 100)
    if (delta.role) relation.role = delta.role
    const npc = getNpc(npcId)
    if (npc) npc.relation = { ...relation }
    bus.emit('state:relation-changed', { npcId, relation })
    return relation
  }

  function clearLog() {
    game.value.log = []
    bus.emit('state:log-cleared')
  }

  function toggleAutoBattle() {
    game.value.combat.autoBattle = !game.value.combat.autoBattle
    bus.emit('state:combat-auto-toggled', game.value.combat.autoBattle)
  }

  function updateDerivedStats() {
    const p = game.value.player
    const rank = RANKS[Math.min(p.rankIndex, RANKS.length - 1)]
    let maxQi = rank.qiMax, maxHp = rank.hpMax, maxStamina = rank.staminaMax
    let cultivationBonus = 0, breakthroughRate = 0.5
    let powerBonus = 0, insightBonus = 0, charismaBonus = 0
    Object.values(p.equipment).forEach(itemId => {
      if (!itemId) return
      const item = getItem(itemId)
      if (!item) return
      if (item.effect.hp) maxHp += item.effect.hp
      if (item.effect.qi) maxQi += item.effect.qi
      if (item.effect.stamina) maxStamina += item.effect.stamina
      if (item.effect.cultivation) cultivationBonus += item.effect.cultivation
      if (item.effect.breakthroughRate) breakthroughRate += item.effect.breakthroughRate
      if (item.effect.power) powerBonus += item.effect.power
      if (item.effect.insight) insightBonus += item.effect.insight
      if (item.effect.charisma) charismaBonus += item.effect.charisma
    })
    if (p.masterId) { cultivationBonus += 0.02; breakthroughRate += 0.015 }
    if (p.partnerId) { charismaBonus += 1; cultivationBonus += 0.01 }
    if (p.sect) {
      cultivationBonus += p.sect.buildings.library * 0.01
      powerBonus += p.sect.buildings.dojo * 0.28
      charismaBonus += Math.max(0, p.sect.level - 1)
    }
    p.maxQi = maxQi; p.maxHp = maxHp; p.maxStamina = maxStamina
    p.bonusPower = powerBonus; p.bonusInsight = insightBonus; p.bonusCharisma = charismaBonus
    p.cultivationBonus = cultivationBonus; p.breakthroughRate = breakthroughRate
    p.qi = clamp(p.qi, 0, maxQi); p.hp = clamp(p.hp, 0, maxHp); p.stamina = clamp(p.stamina, 0, maxStamina)
    bus.emit('state:derived-stats-updated')
  }

  /* ─── Save / Load / Reset ─── */
  function saveGame(manual = true) {
    try {
      game.value.lastSavedAt = Date.now()
      localStorage.setItem(SAVE_KEY, JSON.stringify(game.value))
      LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key))
      saveState.value = `${manual ? '已手动存档' : '自动存档'} ${new Date(game.value.lastSavedAt).toLocaleTimeString('zh-CN', { hour12: false })}`
      bus.emit('game:saved', { manual })
    } catch {
      saveState.value = '存档失败'
      appendLog('浏览器拒绝写入本地存档。', 'warn')
    }
  }

  function loadGame() {
    try {
      const stored = readStoredSave()
      if (!stored?.raw) { appendLog('当前浏览器里没有可读取的存档。', 'warn'); return }
      game.value = hydrateGameState(JSON.parse(stored.raw))
      localStorage.setItem(SAVE_KEY, JSON.stringify(game.value))
      LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key))
      updateDerivedStats()
      selectedLocationId.value = game.value.player.locationId
      saveState.value = `已读取 ${new Date(game.value.lastSavedAt || Date.now()).toLocaleTimeString('zh-CN', { hour12: false })}`
      appendLog('旧日行程已经续上。', 'info')
      bus.emit('game:loaded')
    } catch {
      appendLog('存档损坏或格式不兼容，读取失败。', 'warn')
    }
  }

  function resetGame() {
    game.value = createGameState()
    selectedLocationId.value = game.value.player.locationId
    saveState.value = '新轮回已开启'
    updateDerivedStats()
    appendLog('新的一世开始了，你从云泽渡醒来。', 'info')
    bus.emit('game:reset')
  }

  function initializeGame() {
    if (initialized.value) return
    const stored = readStoredSave()
    if (stored?.raw) {
      try {
        game.value = hydrateGameState(JSON.parse(stored.raw))
        localStorage.setItem(SAVE_KEY, JSON.stringify(game.value))
        LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key))
        saveState.value = '已载入本地存档'
      } catch {
        game.value = createGameState()
        saveState.value = '旧存档损坏，已重置'
      }
    } else {
      game.value = createGameState()
      saveState.value = '未存档'
    }
    updateDerivedStats()
    selectedLocationId.value = game.value.player.locationId
    mapTexture.value = buildMapTexture()
    appendLog('凡尘立道录已开启，你的寒门修途开始运转。', 'info')
    initialized.value = true
    bus.emit('game:initialized')
  }

  /* ─── Build GameContext adapter (unwraps refs for framework-agnostic systems) ─── */
  const contextAdapter: GameContext = {
    get game() { return game.value },
    bus,
    get selectedLocationId() { return selectedLocationId.value },
    set selectedLocationId(v: string) { selectedLocationId.value = v },
    get speed() { return speed.value },
    set speed(v: number) { speed.value = v },
    get saveState() { return saveState.value },
    set saveState(v: string) { saveState.value = v },
    getCurrentLocation, getSelectedLocation, getRankData, getNextBreakthroughNeed,
    getPlayerPower, getPlayerInsight, getPlayerCharisma,
    getCurrentAffiliation, getPlayerFaction, getSect,
    getNpc, findInventoryEntry, ensurePlayerRelation,
    addItemToInventory, removeItemFromInventory, adjustResource,
    appendLog, getRegionStanding, adjustRegionStanding,
    adjustFactionStanding, adjustRelation, updateDerivedStats,
    createRelationState, deriveLifeStage, createInitialSect, createInitialPlayerFaction,
    createLootBundle, createNPC, createMarketListings, createAuctionListings,
    createInitialTerritories, findRoute,
    saveGame, loadGame, resetGame, initializeGame,
  }
  // Register as the global context singleton immediately
  setContext(contextAdapter)

  /* ─── Build GameContext-compatible instance and register ─── */
  const storeApi = {
    // state
    game, selectedLocationId, speed, saveState, mapTexture, feedback, initialized,
    // event bus
    bus,
    // reactive getters (Vue components)
    player, npcs, combat, world, market, auction, log, story,
    currentLocation, selectedLocation, rankData, nextBreakthroughNeed,
    playerPower, playerInsight, playerCharisma,
    currentAffiliation, playerFaction, sect,
    // GameContext getter methods (framework-agnostic)
    getCurrentLocation, getSelectedLocation, getRankData, getNextBreakthroughNeed,
    getPlayerPower, getPlayerInsight, getPlayerCharisma,
    getCurrentAffiliation, getPlayerFaction, getSect,
    // helpers
    getNpc, findInventoryEntry, ensurePlayerRelation,
    addItemToInventory, removeItemFromInventory, adjustResource,
    appendLog, getRegionStanding, adjustRegionStanding,
    adjustFactionStanding, adjustRelation,
    updateDerivedStats, clearLog, toggleAutoBattle,
    // save/load
    saveGame, loadGame, resetGame, initializeGame,
    // factories (exposed for systems)
    createRelationState, deriveLifeStage, createInitialSect, createInitialPlayerFaction,
    createLootBundle, createNPC, createMarketListings, createAuctionListings,
    createInitialTerritories, findRoute,
  }

  return storeApi
})
