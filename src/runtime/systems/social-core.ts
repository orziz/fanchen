(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { SECT_NAME_PARTS } = tables;
  const { sample, clamp, round, uid } = utils;
  const social = app.socialInternals = app.socialInternals || ({} as ShanHaiSocialInternals);

  const OFFICIAL_FACTION_TYPES = new Set(["court", "bureau", "garrison"]);
  const FACTION_TYPE_LABELS = {
    village: "乡社",
    society: "行社",
    guild: "商帮",
    escort: "镖局",
    court: "官府",
    bureau: "转运司",
    garrison: "军府",
    order: "行院",
  };
  const PLAYER_FACTION_NAME_PARTS = {
    prefix: ["河埠", "听潮", "玄灯", "归帆", "雁行", "青禾", "云泽", "赤崖"],
    suffix: ["商社", "会盟", "行号", "驿团", "外局", "义行", "柜坊", "货盟"],
  };
  const PLAYER_FACTION_BRANCHES = {
    caravan: { label: "商队线", desc: "扩车队、压货线和跨城分销。", baseCost: 180 },
    safehouse: { label: "货栈点", desc: "设栈屯货，减缓断供和路损。", baseCost: 140 },
    watch: { label: "耳目网", desc: "布置门路和线人，方便接单、疏通和护路。", baseCost: 160 },
  };

  function createTerritoryEntry(locationId) {
    const location = tables.LOCATION_MAP[locationId];
    if (!location) {
      return {
        locationId,
        controllerId: null,
        incumbentId: null,
        playerInfluence: 0,
        stability: 24,
      };
    }
    return {
      locationId,
      controllerId: location.factionIds?.[0] || null,
      incumbentId: location.factionIds?.[0] || null,
      playerInfluence: 0,
      stability: 18
        + (location.marketTier || 0) * 6
        + (location.tags.includes("court") ? 12 : 0)
        + (location.tags.includes("port") || location.tags.includes("market") ? 6 : 0)
        + (location.tags.includes("pass") ? 8 : 0),
    };
  }

  function getRelation(npcId) {
    return app.ensurePlayerRelation(npcId);
  }

  function adjustRelation(npcId, delta: Partial<ShanHaiRelationState> = {}) {
    const relation = getRelation(npcId);
    relation.affinity = clamp(relation.affinity + (delta.affinity || 0), -100, 100);
    relation.trust = clamp(relation.trust + (delta.trust || 0), -100, 100);
    relation.romance = clamp(relation.romance + (delta.romance || 0), -100, 100);
    relation.rivalry = clamp(relation.rivalry + (delta.rivalry || 0), 0, 100);
    if (delta.role) {
      relation.role = delta.role;
    }
    const npc = app.getNpc(npcId);
    if (npc) {
      npc.relation = { ...relation };
    }
    return relation;
  }

  function createSectName() {
    return `${sample(SECT_NAME_PARTS.prefix)}${sample(SECT_NAME_PARTS.suffix)}`;
  }

  function createFactionName() {
    return `${sample(PLAYER_FACTION_NAME_PARTS.prefix)}${sample(PLAYER_FACTION_NAME_PARTS.suffix)}`;
  }

  function getCurrentAffiliation() {
    return app.getFaction(app.getGame().player.affiliationId);
  }

  function getPlayerFaction() {
    return app.getGame().player.playerFaction || null;
  }

  function getTerritoryState(locationId) {
    const game = app.getGame();
    const defaults = createTerritoryEntry(locationId);
    game.world.territories = game.world.territories || {};
    if (!game.world.territories[locationId]) {
      game.world.territories[locationId] = defaults;
      return game.world.territories[locationId];
    }
    const territory = game.world.territories[locationId];
    Object.keys(defaults).forEach((key) => {
      if (territory[key] == null) {
        territory[key] = defaults[key];
      }
    });
    return game.world.territories[locationId];
  }

  function getFactionTypeLabel(type) {
    return FACTION_TYPE_LABELS[type] || "势力";
  }

  function isOfficialFaction(factionOrId) {
    const faction = typeof factionOrId === "string" ? app.getFaction(factionOrId) : factionOrId;
    return Boolean(faction && OFFICIAL_FACTION_TYPES.has(faction.type));
  }

  function isTradeHubLocation(locationId) {
    const location = tables.LOCATION_MAP[locationId];
    return Boolean(location && ["market", "port", "town", "pass"].some((tag) => location.tags.includes(tag)));
  }

  function getLocationOfficialFactions(locationId = app.getGame().player.locationId) {
    const location = tables.LOCATION_MAP[locationId];
    if (!location?.factionIds?.length) return [];
    return location.factionIds
      .map((factionId) => app.getFaction(factionId))
      .filter((faction) => isOfficialFaction(faction));
  }

  function getGovernmentOfficeName(locationId = app.getGame().player.locationId) {
    return getLocationOfficialFactions(locationId)[0]?.name || "";
  }

  function getRegionStanding(locationId = app.getGame().player.locationId) {
    return app.getGame().player.regionStanding[locationId] || 0;
  }

  function adjustRegionStanding(locationId = app.getGame().player.locationId, amount = 0) {
    const game = app.getGame();
    if (!locationId || !amount) return getRegionStanding(locationId);
    game.player.regionStanding[locationId] = round((game.player.regionStanding[locationId] || 0) + amount, 1);
    return game.player.regionStanding[locationId];
  }

  function checkAffiliationRankUp() {
    const game = app.getGame();
    const faction = getCurrentAffiliation();
    if (!faction) return;
    const standing = game.player.factionStanding[faction.id] || 0;
    const nextRank = standing >= 80 ? 3 : standing >= 45 ? 2 : standing >= 18 ? 1 : 0;
    if (nextRank <= game.player.affiliationRank) return;
    game.player.affiliationRank = nextRank;
    game.player.title = `${faction.name}${faction.titles[nextRank]}`;
    app.appendLog(`你在${faction.name}中的身份升为“${faction.titles[nextRank]}”。`, "loot");
  }

  function adjustFactionStanding(factionId, amount) {
    const game = app.getGame();
    if (!factionId) return 0;
    const faction = app.getFaction(factionId);
    game.player.factionStanding[factionId] = round((game.player.factionStanding[factionId] || 0) + amount, 1);
    if (game.world.factions[factionId]) {
      game.world.factions[factionId].standing = game.player.factionStanding[factionId];
      game.world.factions[factionId].favor += amount * 0.25;
    }
    if (faction) {
      if (isOfficialFaction(faction)) {
        game.world.factionFavor.court += amount * 0.2;
      } else if (["guild", "escort", "village", "society"].includes(faction.type)) {
        game.world.factionFavor.merchants += amount * 0.18;
      } else if (faction.type === "order") {
        game.world.factionFavor.sect += amount * 0.12;
      }
    }
    checkAffiliationRankUp();
    return game.player.factionStanding[factionId];
  }

  function getFactionLiquidFunds() {
    const playerFaction = getPlayerFaction();
    return (playerFaction?.treasury || 0) + app.getGame().player.money;
  }

  function spendFactionLiquidFunds(amount) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    if (getFactionLiquidFunds() < amount) return false;
    const treasurySpend = Math.min(playerFaction?.treasury || 0, amount);
    if (playerFaction) {
      playerFaction.treasury -= treasurySpend;
    }
    game.player.money -= amount - treasurySpend;
    return true;
  }

  function getTerritoryControllerName(territory) {
    const playerFaction = getPlayerFaction();
    if (territory.controllerId && territory.controllerId === playerFaction?.id) {
      return playerFaction.name;
    }
    return app.getFaction(territory.controllerId)?.name || "散户地头";
  }

  function createTask(ownerType, kind, payload = {}) {
    return {
      id: uid(`${ownerType}-${kind}`),
      ownerType,
      kind,
      ...payload,
    };
  }

  function getPlayerFactionTotalCrew(playerFaction = getPlayerFaction()) {
    if (!playerFaction) return 0;
    return Object.values(playerFaction.crew || {}).reduce((sum, value) => sum + value, 0) + (playerFaction.members?.length || 0);
  }

  Object.assign(social, {
    createTask,
    createFactionName,
    createSectName,
    createTerritoryEntry,
    getFactionLiquidFunds,
    getPlayerFactionTotalCrew,
    getTerritoryControllerName,
    spendFactionLiquidFunds,
  });

  Object.assign(app, {
    adjustFactionStanding,
    adjustRegionStanding,
    adjustRelation,
    getCurrentAffiliation,
    getFactionTypeLabel,
    getGovernmentOfficeName,
    getLocationOfficialFactions,
    getPlayerFaction,
    getPlayerFactionTotalCrew,
    getRegionStanding,
    getRelation,
    getTerritoryState,
    isOfficialFaction,
    isTradeHubLocation,
    PLAYER_FACTION_BRANCHES,
  });
})();
