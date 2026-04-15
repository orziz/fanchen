(() => {
  const app = window.ShanHai;
  const { tables, utils, state } = app;
  const { ensureArray } = utils;
  const previousRefundFlag = ["le", "gacyDeedRefund"].join("");

  const DEED_REFUND_PATCH_MAP = {
    "你使用了薄田地契。": "farm-deed",
    "你使用了工坊牌照。": "workshop-permit",
    "你使用了铺面契书。": "shop-deed",
  };

  function addInventoryItemToGame(game: ShanHaiGameState, itemId, quantity = 1) {
    const entry = ensureArray<ShanHaiInventoryEntry>(game.player.inventory).find((candidate) => candidate.itemId === itemId);
    if (entry) {
      entry.quantity += quantity;
      return;
    }
    game.player.inventory.push({ itemId, quantity });
  }

  function applyDeedRefundPatch(game: ShanHaiGameState) {
    if (game.migrationFlags?.deedRefundPatchApplied || game.migrationFlags?.[previousRefundFlag]) {
      game.migrationFlags.deedRefundPatchApplied = true;
      delete game.migrationFlags[previousRefundFlag];
      return;
    }

    const refunds: Record<string, number> = {};
    ensureArray<ShanHaiLogEntry>(game.log).forEach((entry) => {
      const itemId = DEED_REFUND_PATCH_MAP[entry?.text];
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

    game.migrationFlags.deedRefundPatchApplied = true;
  }

  function hydrateGameState(raw: Partial<ShanHaiGameState> = {}) {
    const fresh = app.createGameState();
    const rawNpcs = ensureArray<ShanHaiNpcState>(raw.npcs);
    const rawSect = raw.player?.sect;
    const rawPlayerFaction = raw.player?.playerFaction;
    const defaultSect = rawSect ? app.createInitialSect(rawSect.name || "") : null;
    const defaultPlayerFaction = rawPlayerFaction ? app.createInitialPlayerFaction(rawPlayerFaction.name || "") : null;
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
        regionStanding: { ...fresh.player.regionStanding, ...(raw.player?.regionStanding || {}) },
        relations: { ...fresh.player.relations, ...(raw.player?.relations || {}) },
        stats: { ...fresh.player.stats, ...(raw.player?.stats || {}) },
        affiliationTasks: Array.isArray(raw.player?.affiliationTasks) ? raw.player.affiliationTasks : [],
        affiliationTaskDay: raw.player?.affiliationTaskDay || 0,
        tradeRun: raw.player?.tradeRun || null,
        sect: rawSect ? {
          ...defaultSect,
          ...rawSect,
          buildings: { ...defaultSect.buildings, ...(rawSect.buildings || {}) },
        } : null,
        playerFaction: rawPlayerFaction ? {
          ...defaultPlayerFaction,
          ...rawPlayerFaction,
          crew: { ...defaultPlayerFaction.crew, ...(rawPlayerFaction.crew || {}) },
          branches: { ...defaultPlayerFaction.branches, ...(rawPlayerFaction.branches || {}) },
        } : null,
      },
      world: {
        ...fresh.world,
        ...raw.world,
        factionFavor: { ...fresh.world.factionFavor, ...(raw.world?.factionFavor || {}) },
        factions: { ...fresh.world.factions, ...(raw.world?.factions || {}) },
        territories: { ...fresh.world.territories, ...(raw.world?.territories || {}) },
        realm: { ...fresh.world.realm, ...(raw.world?.realm || {}) },
      },
      combat: { ...fresh.combat, ...(raw.combat || {}) },
      market: raw.market || fresh.market,
      auction: raw.auction || fresh.auction,
      migrationFlags: { ...fresh.migrationFlags, ...(raw.migrationFlags || {}) },
      npcs: rawNpcs.length
        ? rawNpcs.map((npc, index) => ({
            ...app.createNPC(index + 80),
            ...npc,
            lifeEvents: ensureArray<string>(npc.lifeEvents).length ? npc.lifeEvents : [npc.lastEvent || "初入江湖"],
            relation: { ...app.createRelationState(), ...(npc.relation || {}) },
          }))
        : fresh.npcs,
      log: ensureArray<ShanHaiLogEntry>(raw.log).slice(0, app.config.MAX_LOG || 120),
    };

    game.player.assets.farms = ensureArray<ShanHaiAssetState>(game.player.assets.farms).map((asset) => ({
      level: 1,
      managerNpcId: null,
      automationTargetId: null,
      pendingIncome: 0,
      ...asset,
    }));
    game.player.assets.workshops = ensureArray<ShanHaiAssetState>(game.player.assets.workshops).map((asset) => ({
      level: 1,
      managerNpcId: null,
      automationTargetId: null,
      pendingIncome: 0,
      ...asset,
    }));
    game.player.assets.shops = ensureArray<ShanHaiAssetState>(game.player.assets.shops).map((asset) => ({
      level: 1,
      managerNpcId: null,
      automationTargetId: null,
      pendingIncome: 0,
      ...asset,
    }));

    applyDeedRefundPatch(game);
    state.selectedLocationId = game.player.locationId;
    return game;
  }

  Object.assign(app, {
    hydrateGameState,
  });
})();