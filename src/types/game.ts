/* ─── Inventory & Equipment ─── */
export interface InventoryEntry { itemId: string; quantity: number }
export interface Equipment { weapon: string | null; armor: string | null; manual: string | null }

/* ─── Relation ─── */
export interface RelationState {
  affinity: number; trust: number; romance: number; rivalry: number; role: string
}

/* ─── Player Assets ─── */
export interface AssetState {
  id: string; propertyId: string; locationId: string; kind: string; label: string
  cropId: string | null; daysRemaining: number; stock: number; pendingIncome: number
  level: number; managerNpcId: string | null; automationTargetId: string | null
  lastManagedResult?: string
}

export interface PlayerAssets {
  farms: AssetState[]; workshops: AssetState[]; shops: AssetState[]
}

export interface PlayerSkills {
  farming: number; crafting: number; trading: number
}

export interface PlayerStats {
  enemiesDefeated: number; bossKills: number; tradesCompleted: number
  tradeRoutesCompleted: number; questsFinished: number; affiliationTasksCompleted: number
  factionTasksCompleted: number; sectTasksCompleted: number; auctionsWon: number
  meditationSessions: number; disciplesTaught: number; factionMembersRecruited: number
  cropsHarvested: number; craftedItems: number; shopCollections: number; industryUpgrades: number
}

/* ─── Sect ─── */
export interface SectBuildings { hall: number; dojo: number; library: number; market: number }
export interface Teaching { npcId: string; manualId: string; progress: number }
export interface SectMission { id: string; ownerType: string; kind: string; [key: string]: unknown }

export interface SectState {
  id: string; name: string; foundedDay: number; prestige: number; treasury: number
  food: number; level: number; disciples: string[]; elders: string[]
  buildings: SectBuildings; manualLibrary: string[]; teachings: Teaching[]
  missions: SectMission[]; missionDay: number; outerDisciples: number; eventCooldown: number
}

/* ─── Player Faction ─── */
export interface PlayerFactionCrew { runners: number; guards: number; brokers: number }
export interface PlayerFactionBranches { caravan: number; safehouse: number; watch: number }

export interface PlayerFactionState {
  id: string; name: string; foundedDay: number; headquartersLocationId: string
  prestige: number; treasury: number; supplies: number; influence: number; level: number
  members: string[]; crew: PlayerFactionCrew; branches: PlayerFactionBranches
  missions: SectMission[]; missionDay: number; eventCooldown: number
}

/* ─── Trade Run ─── */
export interface TradeRun {
  id: string; originId: string; originName: string; destinationId: string; destinationName: string
  cargoLabel: string; purchaseCost: number; saleEstimate: number; segments: number; startedDay: number
}

/* ─── Player ─── */
export interface PlayerState {
  name: string; title: string; rankIndex: number; cultivation: number; breakthrough: number
  money: number; reputation: number; insight: number; power: number; charisma: number
  qi: number; hp: number; stamina: number
  maxQi: number; maxHp: number; maxStamina: number
  bonusPower: number; bonusInsight: number; bonusCharisma: number
  cultivationBonus: number; breakthroughRate: number
  locationId: string; mode: string; action: string
  inventory: InventoryEntry[]; equipment: Equipment
  affiliationId: string | null; affiliationRank: number
  factionStanding: Record<string, number>; regionStanding: Record<string, number>
  relations: Record<string, RelationState>
  masterId: string | null; partnerId: string | null; rivalIds: string[]
  affiliationTasks: SectMission[]; affiliationTaskDay: number
  sect: SectState | null; playerFaction: PlayerFactionState | null
  tradeRun: TradeRun | null; assets: PlayerAssets; skills: PlayerSkills; stats: PlayerStats
}

/* ─── NPC ─── */
export interface NpcMood {
  greed: number; kindness: number; courage: number; patience: number
  curiosity: number; intellect: number; honor: number
}

export interface NpcState {
  id: string; name: string; title: string; profession: string; style: string
  personalityId: string; personalityLabel: string; personalityDesc: string
  homeId: string; locationId: string; rankIndex: number; cultivation: number
  mood: NpcMood; ambition: number; wealth: number; favor: number
  action: string; goal: string; inventory: InventoryEntry[]; skillBias: Record<string, number>
  favoriteItems: string[]; lastEvent: string; lifeEvents: string[]; cooldown: number
  age: number; ageProgress: number; lifeStage: string; lifespan: number; alive: boolean
  birthDay: number; sectId: string | null; factionId: string | null; factionRank: number
  relation: RelationState; partnerId: string | null; masterId: string | null; apprenticeIds: string[]
}

/* ─── Combat ─── */
export interface EnemyEffects { burn: number; exposed: number }
export interface PlayerEffects { burn: number; guard: number; chill: number }
export interface CombatHistoryEntry { text: string; type: string }
export interface CombatLastResult { outcome: string; enemy: string; boss: boolean }

export interface EnemyState {
  id: string; templateId: string; name: string; boss: boolean
  realmId: string | null; regionId: string | null; affixIds: string[]
  maxHp: number; hp: number; maxQi: number; qi: number; power: number
  dodge: number; defense: number; crit: number
  burnOnHit: number; chillOnHit: number; qiBurn: number
  rewards: { money: number; cultivation: number; reputation: number; breakthrough: number }
  rewardItemIds: string[]; lootTypes: string[]; effects: EnemyEffects
}

export interface CombatState {
  currentEnemy: EnemyState | null; history: CombatHistoryEntry[]
  autoBattle: boolean; lastResult: CombatLastResult | null
  pendingRealmId: string | null; playerEffects: PlayerEffects
}

/* ─── World ─── */
export interface FactionFavor { merchants: number; court: number; sect: number; rogues: number }
export interface WorldFactionEntry { standing: number; favor: number; joined: boolean }
export interface RealmProgress { activeRealmId: string | null; cooldown: number; bossVictories: string[] }

export interface TerritoryEntry {
  locationId: string; controllerId: string | null; incumbentId: string | null
  playerInfluence: number; stability: number
}

export interface MarketListing {
  listingId: string; itemId: string; quantity: number; price: number; seller: string
}

export interface AuctionListing {
  id: string; itemId: string; currentBid: number; minimumRaise: number
  turnsLeft: number; bidderId: string; seller: string; quantity: number; interest: number
}

export interface LogEntry { stamp: string; text: string; type: string }

export interface WorldState {
  day: number; hour: number; subStep: number; weather: string; omen: string
  factionFavor: FactionFavor; factions: Record<string, WorldFactionEntry>
  realm: RealmProgress; industryOrders: IndustryOrder[]; industryOrderDay: number
  territories: Record<string, TerritoryEntry>; events: unknown[]
}

export interface IndustryOrder {
  id: string; templateId: string; title: string; desc: string
  factionId: string; factionName: string
  requirements: { itemId: string; quantity: number }[]
  rewardMoney: number; rewardReputation: number; standing: number
}

export interface MigrationFlags { deedRefundPatchApplied: boolean; [key: string]: unknown }

/* ─── Root Game State ─── */
export interface GameState {
  player: PlayerState
  npcs: NpcState[]
  market: Record<string, MarketListing[]>
  auction: AuctionListing[]
  world: WorldState
  combat: CombatState
  migrationFlags: MigrationFlags
  log: LogEntry[]
  lastSavedAt: number | null
}
