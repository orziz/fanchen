(() => {
  const app = window.ShanHai;
  const { tables, utils, runtime, state } = app;
  const {
    LOCATIONS,
    LOCATION_MAP,
    ITEMS,
    ITEM_MAP,
    NPC_ARCHETYPES,
    PERSONALITIES,
    RANKS,
    FACTIONS,
    PROPERTY_DEFS,
    CROPS,
    CRAFT_RECIPES,
    REALM_TEMPLATES,
    MONSTER_TEMPLATES,
  } = tables;
  const { randomInt, randomFloat, sample, uid, ensureArray } = utils;

  const LEGACY_DEED_REFUND_MAP = {
    "你使用了薄田地契。": "farm-deed",
    "你使用了工坊牌照。": "workshop-permit",
    "你使用了铺面契书。": "shop-deed",
  };

  function getGame() {
    return runtime.game;
  }

  function setGame(nextGame) {
    runtime.game = nextGame;
    return runtime.game;
  }

  function createRelationState() {
    return {
      affinity: 0,
      trust: 0,
      romance: 0,
      rivalry: 0,
      role: "none",
    };
  }

  function deriveLifeStage(age) {
    if (age < 14) return "稚龄";
    if (age < 22) return "少年";
    if (age < 40) return "壮年";
    if (age < 60) return "中年";
    return "老年";
  }

  function createInitialSect(name = "") {
    return {
      id: "player-sect",
      name,
      foundedDay: 0,
      prestige: 0,
      treasury: 0,
      food: 60,
      level: 1,
      disciples: [],
      elders: [],
      buildings: {
        hall: 1,
        dojo: 0,
        library: 0,
        market: 0,
      },
      manualLibrary: [],
      teachings: [],
      eventCooldown: 0,
    };
  }

  function createInitialPlayer() {
    return {
      name: "林寒",
      title: "寒门凡人",
      rankIndex: 0,
      cultivation: 0,
      breakthrough: 0,
      money: 28,
      reputation: 0,
      insight: 4,
      power: 3,
      charisma: 2,
      qi: 18,
      hp: 68,
      stamina: 82,
      maxQi: 28,
      maxHp: 72,
      maxStamina: 92,
      bonusPower: 0,
      bonusInsight: 0,
      bonusCharisma: 0,
      cultivationBonus: 0,
      breakthroughRate: 0.18,
      locationId: "qinghe",
      mode: "balanced",
      action: "train",
      inventory: [
        { itemId: "spirit-grain", quantity: 2 },
        { itemId: "mist-herb", quantity: 1 },
        { itemId: "cloth-roll", quantity: 1 },
        { itemId: "seed-grain", quantity: 1 },
      ],
      equipment: {
        weapon: null,
        armor: null,
        manual: null,
      },
      affiliationId: null,
      affiliationRank: 0,
      factionStanding: {},
      relations: {},
      masterId: null,
      partnerId: null,
      rivalIds: [],
      sect: null,
      assets: {
        farms: [],
        workshops: [],
        shops: [],
      },
      skills: {
        farming: 0,
        crafting: 0,
        trading: 0,
      },
      stats: {
        enemiesDefeated: 0,
        bossKills: 0,
        tradesCompleted: 0,
        questsFinished: 0,
        auctionsWon: 0,
        meditationSessions: 0,
        disciplesTaught: 0,
        cropsHarvested: 0,
        craftedItems: 0,
        shopCollections: 0,
      },
    };
  }

  function createLootBundle(amount, options = {}) {
    const minRarity = options.minRarity ?? 0;
    const maxRarity = options.maxRarity ?? 4;
    const minTier = options.minTier ?? 0;
    const maxTier = options.maxTier ?? 6;
    const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
    const pool = ITEMS.filter((item) => {
      const rarityIndex = rarityOrder.indexOf(item.rarity);
      return rarityIndex >= minRarity && rarityIndex <= maxRarity && item.tier >= minTier && item.tier <= maxTier;
    });

    const bundle = [];
    for (let index = 0; index < amount; index += 1) {
      const baseItem = sample(pool);
      const existing = bundle.find((entry) => entry.itemId === baseItem.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        bundle.push({ itemId: baseItem.id, quantity: 1 });
      }
    }
    return bundle;
  }

  function createNPC(index) {
    const archetype = sample(NPC_ARCHETYPES);
    const personality = sample(PERSONALITIES);
    const home = sample(LOCATIONS);
    const age = randomInt(14, 62);
    const factionId = home.factionIds?.length ? sample(home.factionIds) : null;
    const rankCap = Math.min(4, Math.max(0, home.marketTier + (home.tags.includes("sect") ? 1 : 0)));
    const rankIndex = randomInt(0, rankCap);
    const cultivationBase = [18, 70, 180, 420, 980][Math.min(rankIndex, 4)] || 40;
    const professions = home.tags.includes("sect")
      ? ["杂役", "外门弟子", "内门弟子", "执事"]
      : home.tags.includes("forge")
        ? ["矿工", "学徒铁匠", "匠工", "镖师"]
        : home.tags.includes("port")
          ? ["脚商", "船工", "分号伙计", "掮客"]
          : home.tags.includes("town")
            ? ["农户", "货郎", "药农", "店伙"]
            : ["游侠", "散户", "猎手", "采药人"];
    const name = `${sample(["沈", "陆", "柳", "苏", "白", "秦", "叶", "温", "洛", "宁"])}${sample(archetype.styles)}${sample(["子", "娘", "客", "尘", "书", "川", "歌", "雨", "岚", "舟"])} `;
    const mood = {
      greed: Math.max(0, Math.min(100, 50 + (personality.moodBias.greed || 0) + randomInt(-10, 10))),
      kindness: Math.max(0, Math.min(100, 50 + (personality.moodBias.kindness || 0) + randomInt(-10, 10))),
      courage: Math.max(0, Math.min(100, 50 + (personality.moodBias.courage || 0) + randomInt(-10, 10))),
      patience: Math.max(0, Math.min(100, 50 + (personality.moodBias.patience || 0) + randomInt(-10, 10))),
      curiosity: Math.max(0, Math.min(100, 50 + (personality.moodBias.curiosity || 0) + randomInt(-10, 10))),
      intellect: Math.max(0, Math.min(100, 50 + (personality.moodBias.intellect || 0) + randomInt(-10, 10))),
      honor: Math.max(0, Math.min(100, 50 + (personality.moodBias.honor || 0) + randomInt(-10, 10))),
    };

    return {
      id: `npc-${index}`,
      name: name.trim(),
      title: archetype.title,
      profession: sample(professions),
      style: sample(archetype.styles),
      personalityId: personality.id,
      personalityLabel: personality.label,
      personalityDesc: personality.desc,
      homeId: home.id,
      locationId: home.id,
      rankIndex,
      cultivation: cultivationBase + randomInt(0, Math.max(20, cultivationBase)),
      mood,
      ambition: randomInt(20, 90),
      wealth: randomInt(18, 240 + home.marketTier * 90),
      favor: randomInt(0, 18),
      action: sample(["meditate", "trade", "hunt", "quest", "sect"]),
      goal: sample(["积蓄家底", "找门路入宗", "攒钱买田", "跑货翻身", "学一门手艺", "争取晋升" ]),
      inventory: createLootBundle(randomInt(1, 3), { minRarity: 0, maxRarity: Math.min(2, home.marketTier + 1), minTier: 0, maxTier: Math.min(3, home.marketTier + 1) }),
      skillBias: archetype.skillBias,
      favoriteItems: archetype.favoriteItems,
      lastEvent: "初入江湖",
      lifeEvents: ["初入江湖"],
      cooldown: randomInt(1, 3),
      age,
      ageProgress: randomInt(0, 11),
      lifeStage: deriveLifeStage(age),
      lifespan: randomInt(62, 88),
      alive: true,
      birthDay: -(age * 12 + randomInt(0, 11)),
      sectId: factionId && FACTIONS.find((faction) => faction.id === factionId)?.type === "sect" ? factionId : null,
      factionId,
      factionRank: factionId ? randomInt(0, 1) : 0,
      relation: createRelationState(),
      partnerId: null,
      masterId: null,
      apprenticeIds: [],
    };
  }

  function createInitialMarket() {
    const markets = {};
    LOCATIONS.forEach((location) => {
      markets[location.id] = createMarketListings(location);
    });
    return markets;
  }

  function createMarketListings(location) {
    const listings = [];
    const amount = randomInt(5, 8);
    const allowedTier = Math.max(0, location.marketTier || 0);
    for (let index = 0; index < amount; index += 1) {
      const weightedPool = ITEMS.filter((item) => {
        if (item.tier > allowedTier + (Math.random() < 0.2 ? 1 : 0)) return false;
        if (["legendary", "epic"].includes(item.rarity) && allowedTier < 4) return false;
        if (["deed", "permit", "sect"].includes(item.type) && !location.tags.some((tag) => ["town", "market", "port", "forge", "sect"].includes(tag))) return false;
        return item.type === location.marketBias || Math.random() < 0.35;
      });
      const item = sample(weightedPool.length ? weightedPool : ITEMS);
      const modifier = randomFloat(0.96, 1.18) + location.marketTier * 0.04;
      listings.push({
        listingId: uid(`market-${location.id}`),
        itemId: item.id,
        quantity: randomInt(1, ["manual", "weapon", "armor", "deed", "permit", "sect", "tool", "token"].includes(item.type) ? 1 : 3),
        price: Math.max(10, Math.round(item.baseValue * modifier)),
        seller: sample(["本地商会", "流云行脚", "黑市摊主", "宗门执事", "秘境拾荒客"]),
      });
    }
    return listings;
  }

  function createAuctionListings(amount) {
    const listings = [];
    const progressionTier = runtime.game ? Math.max(1, Math.min(6, runtime.game.player.rankIndex + Math.floor(runtime.game.player.reputation / 18) + 1)) : 1;
    const eligible = ITEMS.filter((item) => item.tier >= 1 && item.tier <= progressionTier + 1 && !["seed", "grain", "wood", "cloth"].includes(item.type));
    for (let index = 0; index < amount; index += 1) {
      const item = sample(eligible);
      const currentBid = Math.round(item.baseValue * randomFloat(0.88, 1.22));
      listings.push({
        id: uid("auction"),
        itemId: item.id,
        currentBid,
        minimumRaise: Math.max(10, Math.round(currentBid * 0.1)),
        turnsLeft: randomInt(4, 8),
        bidderId: sample(["market", "mystery"]),
        seller: sample(["潮声秘市", "玄铁夜拍", "陨星异宝拍卖", "玉阙竞珍"]),
        quantity: 1,
        interest: randomInt(28, 100),
      });
    }
    return listings;
  }

  function createInitialWorld() {
    return {
      day: 1,
      hour: 0,
      subStep: 0,
      weather: sample(["晴", "微雨", "雾起", "大风", "寒霜"]),
      omen: sample(["星辉平稳", "灵潮暗涌", "海雾倒卷", "山门钟鸣", "赤霞流火"]),
      factionFavor: {
        merchants: 0,
        sect: 0,
        rogues: 0,
      },
      factions: Object.fromEntries(FACTIONS.map((faction) => [faction.id, { standing: 0, favor: 0, joined: false } ])),
      realm: {
        activeRealmId: null,
        cooldown: 0,
        bossVictories: [],
      },
      industryOrders: [],
      industryOrderDay: 1,
      events: [],
    };
  }

  function createInitialCombat() {
    return {
      currentEnemy: null,
      history: [],
      autoBattle: false,
      lastResult: null,
      pendingRealmId: null,
    };
  }

  function createGameState() {
    return {
      player: createInitialPlayer(),
      npcs: Array.from({ length: 12 }, (_, index) => createNPC(index + 1)),
      market: createInitialMarket(),
      auction: createAuctionListings(randomInt(4, 6)),
      world: createInitialWorld(),
      combat: createInitialCombat(),
      migrationFlags: {
        legacyDeedRefund: false,
      },
      log: [],
      lastSavedAt: null,
    };
  }

  function addInventoryItemToGame(game, itemId, quantity = 1) {
    const entry = ensureArray(game.player.inventory).find((candidate) => candidate.itemId === itemId);
    if (entry) {
      entry.quantity += quantity;
      return;
    }
    game.player.inventory.push({ itemId, quantity });
  }

  function applyLegacyDeedRefund(game) {
    if (game.migrationFlags?.legacyDeedRefund) return;

    const refunds = {};
    ensureArray(game.log).forEach((entry) => {
      const itemId = LEGACY_DEED_REFUND_MAP[entry?.text];
      if (!itemId) return;
      refunds[itemId] = (refunds[itemId] || 0) + 1;
    });

    Object.entries(refunds).forEach(([itemId, quantity]) => {
      addInventoryItemToGame(game, itemId, quantity);
    });

    if (Object.keys(refunds).length) {
      const refundText = Object.entries(refunds)
        .map(([itemId, quantity]) => `${app.getItem(itemId)?.name || itemId} x${quantity}`)
        .join("、");
      const stamp = `第${game.world.day}日 ${tables.TIME_LABELS[game.world.hour]}`;
      game.log.unshift({
        stamp,
        text: `旧版本曾错误吞掉契据，已补回背包：${refundText}。`,
        type: "loot",
      });
      if (game.log.length > (app.config.MAX_LOG || 120)) {
        game.log.length = app.config.MAX_LOG || 120;
      }
    }

    game.migrationFlags.legacyDeedRefund = true;
  }

  function hydrateGameState(raw) {
    const fresh = createGameState();
    const game = {
      ...fresh,
      ...raw,
      player: {
        ...fresh.player,
        ...raw.player,
        equipment: { ...fresh.player.equipment, ...(raw.player?.equipment || {}) },
        assets: { ...fresh.player.assets, ...(raw.player?.assets || {}) },
        skills: { ...fresh.player.skills, ...(raw.player?.skills || {}) },
        factionStanding: { ...fresh.player.factionStanding, ...(raw.player?.factionStanding || {}) },
        relations: { ...fresh.player.relations, ...(raw.player?.relations || {}) },
        stats: { ...fresh.player.stats, ...(raw.player?.stats || {}) },
        sect: raw.player?.sect ? { ...createInitialSect(raw.player.sect.name || ""), ...raw.player.sect } : null,
      },
      world: {
        ...fresh.world,
        ...raw.world,
        factionFavor: { ...fresh.world.factionFavor, ...(raw.world?.factionFavor || {}) },
        factions: { ...fresh.world.factions, ...(raw.world?.factions || {}) },
        realm: { ...fresh.world.realm, ...(raw.world?.realm || {}) },
      },
      combat: { ...fresh.combat, ...(raw.combat || {}) },
      market: raw.market || fresh.market,
      auction: raw.auction || fresh.auction,
      migrationFlags: { ...fresh.migrationFlags, ...(raw.migrationFlags || {}) },
      npcs: ensureArray(raw.npcs).length
        ? raw.npcs.map((npc, index) => ({
            ...createNPC(index + 80),
            ...npc,
            lifeEvents: ensureArray(npc.lifeEvents).length ? npc.lifeEvents : [npc.lastEvent || "初入江湖"],
            relation: { ...createRelationState(), ...(npc.relation || {}) },
          }))
        : fresh.npcs,
      log: ensureArray(raw.log).slice(0, app.config.MAX_LOG || 120),
    };

    applyLegacyDeedRefund(game);

    state.selectedLocationId = game.player.locationId;
    return game;
  }

  function getRankData(rankIndex) {
    return RANKS[Math.min(rankIndex, RANKS.length - 1)];
  }

  function getCurrentLocation() {
    return LOCATION_MAP[getGame().player.locationId];
  }

  function getSelectedLocation() {
    return LOCATION_MAP[state.selectedLocationId] || getCurrentLocation();
  }

  function getItem(itemId) {
    return ITEM_MAP[itemId];
  }

  function getNpc(npcId) {
    return getGame().npcs.find((npc) => npc.id === npcId) || null;
  }

  function getRealm(realmId) {
    return REALM_TEMPLATES.find((realm) => realm.id === realmId) || null;
  }

  function getMonsterTemplate(monsterId) {
    return MONSTER_TEMPLATES.find((monster) => monster.id === monsterId) || null;
  }

  function getFaction(factionId) {
    return FACTIONS.find((faction) => faction.id === factionId) || null;
  }

  function getPropertyDef(propertyId) {
    return PROPERTY_DEFS.find((property) => property.id === propertyId) || null;
  }

  function getCrop(cropId) {
    return CROPS.find((crop) => crop.id === cropId) || null;
  }

  function getRecipe(recipeId) {
    return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId) || null;
  }

  function findInventoryEntry(itemId) {
    return getGame().player.inventory.find((entry) => entry.itemId === itemId) || null;
  }

  function ensurePlayerRelation(npcId) {
    const game = getGame();
    game.player.relations[npcId] = game.player.relations[npcId] || createRelationState();
    return game.player.relations[npcId];
  }

  Object.assign(app, {
    getGame,
    setGame,
    createInitialSect,
    createInitialPlayer,
    createRelationState,
    createLootBundle,
    createNPC,
    createMarketListings,
    createAuctionListings,
    createInitialWorld,
    createInitialCombat,
    createGameState,
    hydrateGameState,
    getRankData,
    getCurrentLocation,
    getSelectedLocation,
    getItem,
    getNpc,
    getRealm,
    getMonsterTemplate,
    getFaction,
    getPropertyDef,
    getCrop,
    getRecipe,
    findInventoryEntry,
    ensurePlayerRelation,
    deriveLifeStage,
  });
})();