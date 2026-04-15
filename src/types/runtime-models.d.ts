declare global {
  type ShanHaiPrimitive = string | number | boolean | null | undefined;
  type ShanHaiDataValue = ShanHaiPrimitive | ShanHaiDataRecord | ShanHaiDataValue[];

  interface ShanHaiDataRecord {
    [key: string]: ShanHaiDataValue;
  }

  type ShanHaiAssetKind = "farm" | "workshop" | "shop" | string;
  type ShanHaiFactionType = "village" | "society" | "guild" | "escort" | "court" | "bureau" | "garrison" | "order" | string;
  type ShanHaiLogType = "info" | "warn" | "loot" | "npc" | string;
  type ShanHaiModeId = "manual" | "balanced" | "cultivation" | "merchant" | "adventure" | "sect" | string;
  type ShanHaiRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | string;
  type ShanHaiWindowId = "map" | "journal" | "profile" | "command" | string;

  interface ShanHaiLoopIntervals {
    [key: number]: number;
    [key: string]: number;
  }

  interface ShanHaiSpeedOption extends ShanHaiDataRecord {
    value: number;
    label: string;
  }

  interface ShanHaiRankData extends ShanHaiDataRecord {
    name: string;
    need: number;
    qiMax: number;
    hpMax: number;
    staminaMax: number;
  }

  interface ShanHaiModeOption extends ShanHaiDataRecord {
    id: ShanHaiModeId;
    label: string;
    desc: string;
  }

  interface ShanHaiRarityMetaEntry extends ShanHaiDataRecord {
    label: string;
    color: string;
    value: number;
  }

  interface ShanHaiActionMetaEntry extends ShanHaiDataRecord {
    label: string;
    cost: Record<string, number>;
    reward: Record<string, number>;
  }

  interface ShanHaiItemEffect extends ShanHaiDataRecord {
    [key: string]: number | undefined;
  }

  interface ShanHaiItemData extends ShanHaiDataRecord {
    id: string;
    name: string;
    type: string;
    rarity: ShanHaiRarity;
    tier: number;
    minRankIndex: number;
    baseValue: number;
    desc: string;
    effect: ShanHaiItemEffect;
  }

  interface ShanHaiLocationData extends ShanHaiDataRecord {
    id: string;
    name: string;
    short: string;
    x: number;
    y: number;
    region: string;
    danger: number;
    marketBias: string;
    marketTier: number;
    aura: number;
    terrain: string;
    desc: string;
    actions: string[];
    neighbors: string[];
    resource: string;
    realmId: string | null;
    tags: string[];
    factionIds: string[];
  }

  interface ShanHaiFactionData extends ShanHaiDataRecord {
    id: string;
    name: string;
    type: ShanHaiFactionType;
    locationId: string;
    desc: string;
    joinRequirement: Record<string, number>;
    titles: string[];
    unlocks: string[];
  }

  interface ShanHaiPropertyDef extends ShanHaiDataRecord {
    id: string;
    label: string;
    kind: ShanHaiAssetKind;
    cost: number;
    locationTags: string[];
    allowedFactionIds: string[];
    capacity: number;
    desc: string;
  }

  interface ShanHaiCropData extends ShanHaiDataRecord {
    id: string;
    label: string;
    seedItemId: string;
    harvestItemId: string;
    growDays: number;
    yield: number;
    desc: string;
  }

  interface ShanHaiRequirement extends ShanHaiDataRecord {
    itemId: string;
    quantity: number;
  }

  interface ShanHaiCraftRecipe extends ShanHaiDataRecord {
    id: string;
    label: string;
    outputItemId: string;
    outputQuantity: number;
    cost: number;
    requiresPropertyKind: ShanHaiAssetKind;
    minRankIndex: number;
    inputs: ShanHaiRequirement[];
  }

  interface ShanHaiPersonalityData extends ShanHaiDataRecord {
    id: string;
    label: string;
    desc: string;
    moodBias: Record<string, number>;
  }

  interface ShanHaiNpcArchetype extends ShanHaiDataRecord {
    title: string;
    styles: string[];
    skillBias: Record<string, number>;
    favoriteItems: string[];
  }

  interface ShanHaiSectBuildingDef extends ShanHaiDataRecord {
    label: string;
    baseCost: number;
    desc: string;
  }

  interface ShanHaiMonsterAffix extends ShanHaiDataRecord {
    id: string;
    label: string;
    desc: string;
    mod: Record<string, number>;
  }

  interface ShanHaiMonsterTemplate extends ShanHaiDataRecord {
    id: string;
    name: string;
    region: string;
    baseHp: number;
    basePower: number;
    baseQi: number;
    rewards: Record<string, number>;
    lootTypes: string[];
  }

  interface ShanHaiRealmBossData extends ShanHaiDataRecord {
    name: string;
    baseHp: number;
    basePower: number;
    baseQi: number;
    affixes: string[];
  }

  interface ShanHaiRealmRewardData extends ShanHaiDataRecord {
    money: number;
    prestige: number;
    items: string[];
  }

  interface ShanHaiRealmTemplate extends ShanHaiDataRecord {
    id: string;
    name: string;
    locationId: string;
    unlockRep: number;
    desc: string;
    boss: ShanHaiRealmBossData;
    rewards: ShanHaiRealmRewardData;
  }

  interface ShanHaiEventTemplate extends ShanHaiDataRecord {
    id: string;
    text: string;
    type?: ShanHaiLogType;
    kind?: string;
  }

  interface ShanHaiGovernmentContractData extends ShanHaiDataRecord {
    itemId: string;
    standingNeed: number;
    priceFactor: number;
    desc: string;
  }

  interface ShanHaiGovernmentContractOffer extends ShanHaiDataRecord {
    kind: ShanHaiAssetKind;
    itemId: string;
    label: string;
    price: number;
    standingNeed: number;
    desc: string;
  }

  interface ShanHaiInventoryEntry extends ShanHaiDataRecord {
    itemId: string;
    quantity: number;
  }

  interface ShanHaiRelationState extends ShanHaiDataRecord {
    affinity: number;
    trust: number;
    romance: number;
    rivalry: number;
    role: string;
  }

  interface ShanHaiEquipmentState extends ShanHaiDataRecord {
    [key: string]: string | null;
    weapon: string | null;
    armor: string | null;
    manual: string | null;
  }

  interface ShanHaiAssetState extends ShanHaiDataRecord {
    id: string;
    propertyId: string;
    locationId: string;
    kind: ShanHaiAssetKind;
    label: string;
    cropId: string | null;
    daysRemaining: number;
    stock: number;
    pendingIncome: number;
    level: number;
    managerNpcId: string | null;
    automationTargetId: string | null;
  }

  interface ShanHaiPlayerAssets extends ShanHaiDataRecord {
    [key: string]: ShanHaiAssetState[];
    farms: ShanHaiAssetState[];
    workshops: ShanHaiAssetState[];
    shops: ShanHaiAssetState[];
  }

  interface ShanHaiPlayerSkills extends ShanHaiDataRecord {
    farming: number;
    crafting: number;
    trading: number;
  }

  interface ShanHaiPlayerStats extends ShanHaiDataRecord {
    enemiesDefeated: number;
    bossKills: number;
    tradesCompleted: number;
    tradeRoutesCompleted: number;
    questsFinished: number;
    affiliationTasksCompleted: number;
    factionTasksCompleted: number;
    sectTasksCompleted: number;
    auctionsWon: number;
    meditationSessions: number;
    disciplesTaught: number;
    factionMembersRecruited: number;
    cropsHarvested: number;
    craftedItems: number;
    shopCollections: number;
    industryUpgrades: number;
  }

  interface ShanHaiTaskState extends ShanHaiDataRecord {
    id: string;
    ownerType?: string;
    kind?: string;
    title?: string;
    desc?: string;
    type?: string;
    factionId?: string;
    itemId?: string;
    requirements?: ShanHaiRequirement[];
    quantity?: number;
    staminaCost?: number;
    qiCost?: number;
    moneyCost?: number;
    standingNeed?: number;
    suppliesCost?: number;
    runnerNeed?: number;
    role?: string;
    rewardCrew?: number;
    rewardMoney?: number;
    rewardStanding?: number;
    rewardRegion?: number;
    rewardFood?: number;
    rewardReputation?: number;
    rewardPrestige?: number;
    rewardInfluence?: number;
    rewardTreasury?: number;
    rewardSupplies?: number;
    rewardTeaching?: number;
    rewardOuter?: number;
    grainNeed?: number;
    herbNeed?: number;
    discipleNeed?: number;
    reputationNeed?: number;
  }

  interface ShanHaiTeachingState extends ShanHaiDataRecord {
    id?: string;
    npcId: string;
    manualId: string;
    progress: number;
  }

  interface ShanHaiSectBuildings extends ShanHaiDataRecord {
    [key: string]: number;
    hall: number;
    dojo: number;
    library: number;
    market: number;
  }

  interface ShanHaiSectState extends ShanHaiDataRecord {
    id: string;
    name: string;
    foundedDay: number;
    prestige: number;
    treasury: number;
    food: number;
    level: number;
    disciples: string[];
    elders: string[];
    buildings: ShanHaiSectBuildings;
    manualLibrary: string[];
    teachings: ShanHaiTeachingState[];
    missions: ShanHaiTaskState[];
    missionDay: number;
    outerDisciples: number;
    eventCooldown: number;
  }

  interface ShanHaiPlayerFactionCrew extends ShanHaiDataRecord {
    [key: string]: number;
    runners: number;
    guards: number;
    brokers: number;
  }

  interface ShanHaiPlayerFactionBranches extends ShanHaiDataRecord {
    [key: string]: number;
    caravan: number;
    safehouse: number;
    watch: number;
  }

  interface ShanHaiPlayerFactionState extends ShanHaiDataRecord {
    id: string;
    name: string;
    foundedDay: number;
    headquartersLocationId: string;
    prestige: number;
    treasury: number;
    supplies: number;
    influence: number;
    level: number;
    members: string[];
    crew: ShanHaiPlayerFactionCrew;
    branches: ShanHaiPlayerFactionBranches;
    missions: ShanHaiTaskState[];
    missionDay: number;
    eventCooldown: number;
  }

  interface ShanHaiTradeRunState extends ShanHaiDataRecord {
    id: string;
    originId: string;
    originName: string;
    destinationId: string;
    destinationName: string;
    cargoLabel: string;
    purchaseCost: number;
    saleEstimate: number;
    segments: number;
    startedDay: number;
  }

  interface ShanHaiTradeRouteOption extends ShanHaiDataRecord {
    id: string;
    originId: string;
    originName: string;
    destinationId: string;
    destinationName: string;
    cargoLabel: string;
    segments: number;
    purchaseCost: number;
    saleEstimate: number;
    profitEstimate: number;
    localStanding: number;
    affordable: boolean;
  }

  interface ShanHaiPlayerState extends ShanHaiDataRecord {
    name: string;
    title: string;
    rankIndex: number;
    cultivation: number;
    breakthrough: number;
    money: number;
    reputation: number;
    insight: number;
    power: number;
    charisma: number;
    qi: number;
    hp: number;
    stamina: number;
    maxQi: number;
    maxHp: number;
    maxStamina: number;
    bonusPower: number;
    bonusInsight: number;
    bonusCharisma: number;
    cultivationBonus: number;
    breakthroughRate: number;
    locationId: string;
    mode: ShanHaiModeId;
    action: string;
    inventory: ShanHaiInventoryEntry[];
    equipment: ShanHaiEquipmentState;
    affiliationId: string | null;
    affiliationRank: number;
    factionStanding: Record<string, number>;
    regionStanding: Record<string, number>;
    relations: Record<string, ShanHaiRelationState>;
    masterId: string | null;
    partnerId: string | null;
    rivalIds: string[];
    playerFaction: ShanHaiPlayerFactionState | null;
    affiliationTasks: ShanHaiTaskState[];
    affiliationTaskDay: number;
    sect: ShanHaiSectState | null;
    tradeRun: ShanHaiTradeRunState | null;
    assets: ShanHaiPlayerAssets;
    skills: ShanHaiPlayerSkills;
    stats: ShanHaiPlayerStats;
  }

  interface ShanHaiNpcMood extends ShanHaiDataRecord {
    greed: number;
    kindness: number;
    courage: number;
    patience: number;
    curiosity: number;
    intellect: number;
    honor: number;
  }

  interface ShanHaiNpcState extends ShanHaiDataRecord {
    id: string;
    name: string;
    title: string;
    profession: string;
    style: string;
    personalityId: string;
    personalityLabel: string;
    personalityDesc: string;
    homeId: string;
    locationId: string;
    rankIndex: number;
    cultivation: number;
    mood: ShanHaiNpcMood;
    ambition: number;
    wealth: number;
    favor: number;
    action: string;
    goal: string;
    inventory: ShanHaiInventoryEntry[];
    skillBias: Record<string, number>;
    favoriteItems: string[];
    lastEvent: string;
    lifeEvents: string[];
    cooldown: number;
    age: number;
    ageProgress: number;
    lifeStage: string;
    lifespan: number;
    alive: boolean;
    birthDay: number;
    sectId: string | null;
    factionId: string | null;
    factionRank: number;
    relation: ShanHaiRelationState;
    partnerId: string | null;
    masterId: string | null;
    apprenticeIds: string[];
  }

  interface ShanHaiMarketListing extends ShanHaiDataRecord {
    listingId: string;
    itemId: string;
    quantity: number;
    price: number;
    seller: string;
  }

  interface ShanHaiAuctionListing extends ShanHaiDataRecord {
    id: string;
    itemId: string;
    currentBid: number;
    minimumRaise: number;
    turnsLeft: number;
    bidderId: string;
    seller: string;
    quantity: number;
    interest: number;
  }

  interface ShanHaiEnemyRewards extends ShanHaiDataRecord {
    money: number;
    cultivation: number;
    reputation: number;
    breakthrough: number;
  }

  interface ShanHaiEnemyEffects extends ShanHaiDataRecord {
    burn: number;
    exposed: number;
  }

  interface ShanHaiEnemyState extends ShanHaiDataRecord {
    id: string;
    templateId: string;
    name: string;
    boss: boolean;
    realmId: string | null;
    regionId: string | null;
    affixIds: string[];
    maxHp: number;
    hp: number;
    maxQi: number;
    qi: number;
    power: number;
    dodge: number;
    defense: number;
    crit: number;
    burnOnHit: number;
    chillOnHit: number;
    qiBurn: number;
    rewards: ShanHaiEnemyRewards;
    rewardItemIds: string[];
    lootTypes: string[];
    effects: ShanHaiEnemyEffects;
  }

  interface ShanHaiCombatHistoryEntry extends ShanHaiDataRecord {
    text: string;
    type: ShanHaiLogType;
  }

  interface ShanHaiCombatPlayerEffects extends ShanHaiDataRecord {
    burn: number;
    guard: number;
    chill: number;
  }

  interface ShanHaiCombatState extends ShanHaiDataRecord {
    currentEnemy: ShanHaiEnemyState | null;
    history: ShanHaiCombatHistoryEntry[];
    autoBattle: boolean;
    lastResult: ShanHaiCombatResult | null;
    pendingRealmId: string | null;
    playerEffects?: ShanHaiCombatPlayerEffects;
  }

  interface ShanHaiCombatResult extends ShanHaiDataRecord {
    outcome: "victory" | "defeat" | string;
    enemy: string;
    boss: boolean;
  }

  interface ShanHaiIndustryOrderState extends ShanHaiTaskState {
    templateId: string;
    factionId: string;
    factionName: string;
    requirements: ShanHaiRequirement[];
    rewardMoney: number;
    rewardReputation: number;
    standing: number;
  }

  interface ShanHaiTerritoryTarget extends ShanHaiDataRecord {
    locationId: string;
    location: ShanHaiLocationData;
    controllerName: string;
    playerInfluence: number;
    stability: number;
    isControlled: boolean;
  }

  interface ShanHaiWorldFactionStatus extends ShanHaiDataRecord {
    standing: number;
    favor: number;
    joined: boolean;
  }

  interface ShanHaiTerritoryState extends ShanHaiDataRecord {
    locationId: string;
    controllerId: string | null;
    incumbentId: string | null;
    playerInfluence: number;
    stability: number;
  }

  interface ShanHaiWorldRealmState extends ShanHaiDataRecord {
    activeRealmId: string | null;
    cooldown: number;
    bossVictories: string[];
  }

  interface ShanHaiWorldState extends ShanHaiDataRecord {
    day: number;
    hour: number;
    subStep: number;
    weather: string;
    omen: string;
    factionFavor: Record<string, number>;
    factions: Record<string, ShanHaiWorldFactionStatus>;
    realm: ShanHaiWorldRealmState;
    industryOrders: ShanHaiIndustryOrderState[];
    industryOrderDay: number;
    territories: Record<string, ShanHaiTerritoryState>;
    events: ShanHaiTaskState[];
  }

  interface ShanHaiLogEntry extends ShanHaiDataRecord {
    stamp: string;
    text: string;
    type: ShanHaiLogType;
  }

  interface ShanHaiMigrationFlags extends ShanHaiDataRecord {
    deedRefundPatchApplied: boolean;
  }

  interface ShanHaiGameState extends ShanHaiDataRecord {
    player: ShanHaiPlayerState;
    npcs: ShanHaiNpcState[];
    market: Record<string, ShanHaiMarketListing[]>;
    auction: ShanHaiAuctionListing[];
    world: ShanHaiWorldState;
    combat: ShanHaiCombatState;
    migrationFlags: ShanHaiMigrationFlags;
    log: ShanHaiLogEntry[];
    lastSavedAt: number | string | null;
  }

  interface ShanHaiMapGlow extends ShanHaiDataRecord {
    x: number;
    y: number;
    radius: number;
  }

  interface ShanHaiMapStroke extends ShanHaiDataRecord {
    x: number;
    y: number;
    cpX: number;
    cpY: number;
    endX: number;
    endY: number;
    width: number;
  }

  interface ShanHaiMapTexture extends ShanHaiDataRecord {
    glows: ShanHaiMapGlow[];
    strokes: ShanHaiMapStroke[];
  }

  interface ShanHaiMapViewport extends ShanHaiDataRecord {
    scale: number;
    minScale: number;
    maxScale: number;
    offsetX: number;
    offsetY: number;
  }

  interface ShanHaiPoint extends ShanHaiDataRecord {
    x: number;
    y: number;
  }

  interface ShanHaiMapFocusOptions extends ShanHaiDataRecord {
    preserveScale?: boolean;
    render?: boolean;
    scale?: number;
  }

  interface ShanHaiMapInteractionState extends ShanHaiDataRecord {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    didDrag: boolean;
  }

  interface ShanHaiWindowDragState extends ShanHaiDataRecord {
    windowId: ShanHaiWindowId;
    offsetX: number;
    offsetY: number;
  }

  interface ShanHaiEnemyBuildOptions extends ShanHaiDataRecord {
    affixIds?: string[];
    boss?: boolean;
    danger?: number;
    realmId?: string | null;
    regionId?: string | null;
    rewardItemIds?: string[];
  }

  interface ShanHaiEnemyTemplateInput extends ShanHaiDataRecord {
    id?: string;
    lootTypes?: string[];
    name: string;
    baseHp: number;
    basePower: number;
    baseQi: number;
    rewards?: Record<string, number>;
  }

  interface ShanHaiRuntimeConfig extends ShanHaiDataRecord {
    SAVE_KEY: string;
    AUTO_SAVE_INTERVAL: number;
    MAX_LOG: number;
    LOOP_INTERVALS: ShanHaiLoopIntervals;
  }

  interface ShanHaiRuntimeTables extends ShanHaiDataRecord {
    RARITY_META: Record<string, ShanHaiRarityMetaEntry>;
    SPEED_OPTIONS: ShanHaiSpeedOption[];
    TIME_LABELS: string[];
    RANKS: ShanHaiRankData[];
    MODE_OPTIONS: ShanHaiModeOption[];
    ACTION_META: Record<string, ShanHaiActionMetaEntry>;
    LOCATIONS: ShanHaiLocationData[];
    LOCATION_MAP: Record<string, ShanHaiLocationData>;
    ITEMS: ShanHaiItemData[];
    ITEM_MAP: Record<string, ShanHaiItemData>;
    FACTIONS: ShanHaiFactionData[];
    PROPERTY_DEFS: ShanHaiPropertyDef[];
    CROPS: ShanHaiCropData[];
    CRAFT_RECIPES: ShanHaiCraftRecipe[];
    PERSONALITIES: ShanHaiPersonalityData[];
    NPC_ARCHETYPES: ShanHaiNpcArchetype[];
    RELATION_ROLES: Record<string, string>;
    SECT_NAME_PARTS: Record<string, string[]>;
    SECT_BUILDINGS: Record<string, ShanHaiSectBuildingDef>;
    MONSTER_TEMPLATES: ShanHaiMonsterTemplate[];
    MONSTER_AFFIXES: ShanHaiMonsterAffix[];
    REALM_TEMPLATES: ShanHaiRealmTemplate[];
    WORLD_EVENT_TEMPLATES: ShanHaiEventTemplate[];
    TRAVEL_EVENT_TEMPLATES: ShanHaiEventTemplate[];
    SOCIAL_EVENT_TEMPLATES: ShanHaiEventTemplate[];
    SECT_EVENT_TEMPLATES: ShanHaiEventTemplate[];
  }
}

export {};