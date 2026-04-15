(() => {
  const app = window.ShanHai;
  const { tables, utils, state, config } = app;
  const { RANKS, MODE_OPTIONS, ACTION_META, MAX_LOG, ITEMS, PROPERTY_DEFS } = { ...tables, MAX_LOG: config.MAX_LOG };
  const { clamp, round, sample, uid } = utils;

  const ASSET_EFFECT_KIND_MAP = {
    assetFarm: "farm",
    assetWorkshop: "workshop",
    assetShop: "shop",
  };

  const ASSET_KIND_LABELS = {
    farm: "田产",
    workshop: "工坊",
    shop: "铺面",
  };

  function rerender() {
    if (app.render) app.render();
  }

  function rerenderTopBar() {
    if (app.renderTopBar) app.renderTopBar();
  }

  function addItemToInventory(itemId, quantity = 1) {
    const game = app.getGame();
    const entry = app.findInventoryEntry(itemId);
    if (entry) {
      entry.quantity += quantity;
    } else {
      game.player.inventory.push({ itemId, quantity });
    }
  }

  function removeItemFromInventory(itemId, quantity = 1) {
    const game = app.getGame();
    const entry = app.findInventoryEntry(itemId);
    if (!entry || entry.quantity < quantity) return false;
    entry.quantity -= quantity;
    if (entry.quantity <= 0) {
      game.player.inventory = game.player.inventory.filter((candidate) => candidate !== entry);
    }
    return true;
  }

  function adjustResource(key, amount, maxKey) {
    const game = app.getGame();
    if (typeof game.player[key] !== "number") return;
    const max = maxKey ? game.player[maxKey] : Infinity;
    game.player[key] = clamp(game.player[key] + amount, 0, max);
  }

  function getAssetCollection(kind) {
    return app.getGame().player.assets[`${kind}s`];
  }

  function getLocalPropertyForAssetKind(kind) {
    const current = app.getCurrentLocation();
    return PROPERTY_DEFS
      .filter((property) => property.kind === kind && property.locationTags?.some((tag) => current.tags.includes(tag)))
      .sort((left, right) => (left.cost || 0) - (right.cost || 0))[0] || null;
  }

  function claimAssetFromItem(item) {
    const effectEntry = Object.entries(ASSET_EFFECT_KIND_MAP).find(([effectKey]) => item.effect?.[effectKey]);
    if (!effectEntry) return { handled: false };

    const [effectKey, kind] = effectEntry;
    const amount = Math.max(1, Math.floor(item.effect[effectKey] || 0));
    const property = getLocalPropertyForAssetKind(kind);
    if (!property) {
      return {
        handled: true,
        success: false,
        message: `这里暂时不能把${item.name}落成${ASSET_KIND_LABELS[kind] || "资产"}，换到合适地点再用。`,
      };
    }

    if (!removeItemFromInventory(item.id, 1)) {
      return {
        handled: true,
        success: false,
        message: `你手头已经没有${item.name}了。`,
      };
    }

    const current = app.getCurrentLocation();
    const collection = getAssetCollection(kind);
    const created = [];

    for (let index = 0; index < amount; index += 1) {
      const asset = {
        id: uid(kind),
        propertyId: property.id,
        locationId: current.id,
        kind,
        label: amount > 1 ? `${property.label}·${collection.length + 1}` : property.label,
        cropId: null,
        daysRemaining: 0,
        stock: 0,
        pendingIncome: 0,
        level: 1,
        managerNpcId: null,
        automationTargetId: null,
      };
      collection.push(asset);
      created.push(asset.label);
    }

    return {
      handled: true,
      success: true,
      message: `${item.name}兑成了${created.join("、")}，已经记在你名下。`,
    };
  }

  function appendLog(text, type = "info") {
    const game = app.getGame();
    const stamp = `第${game.world.day}日 ${tables.TIME_LABELS[game.world.hour]}`;
    game.log.unshift({ stamp, text, type });
    if (game.log.length > MAX_LOG) {
      game.log.length = MAX_LOG;
    }
    app.renderLog?.();
    if (["warn", "loot"].includes(type)) {
      app.showFeedback?.(text, type);
    }
  }

  function updateDerivedStats() {
    const game = app.getGame();
    const rank = app.getRankData(game.player.rankIndex);
    let maxQi = rank.qiMax;
    let maxHp = rank.hpMax;
    let maxStamina = rank.staminaMax;
    let cultivationBonus = 0;
    let breakthroughRate = 0.5;
    let powerBonus = 0;
    let insightBonus = 0;
    let charismaBonus = 0;

    Object.values(game.player.equipment).forEach((itemId) => {
      if (!itemId) return;
      const item = app.getItem(itemId);
      if (!item) return;
      if (item.effect.hp) maxHp += item.effect.hp;
      if (item.effect.qi) maxQi += item.effect.qi;
      if (item.effect.stamina) maxStamina += item.effect.stamina;
      if (item.effect.cultivation) cultivationBonus += item.effect.cultivation;
      if (item.effect.breakthroughRate) breakthroughRate += item.effect.breakthroughRate;
      if (item.effect.power) powerBonus += item.effect.power;
      if (item.effect.insight) insightBonus += item.effect.insight;
      if (item.effect.charisma) charismaBonus += item.effect.charisma;
    });

    if (game.player.masterId) {
      cultivationBonus += 0.02;
      breakthroughRate += 0.015;
    }
    if (game.player.partnerId) {
      charismaBonus += 1;
      cultivationBonus += 0.01;
    }
    if (game.player.sect) {
      cultivationBonus += game.player.sect.buildings.library * 0.01;
      powerBonus += game.player.sect.buildings.dojo * 0.28;
      charismaBonus += Math.max(0, game.player.sect.level - 1);
    }

    game.player.maxQi = maxQi;
    game.player.maxHp = maxHp;
    game.player.maxStamina = maxStamina;
    game.player.bonusPower = powerBonus;
    game.player.bonusInsight = insightBonus;
    game.player.bonusCharisma = charismaBonus;
    game.player.cultivationBonus = cultivationBonus;
    game.player.breakthroughRate = breakthroughRate;
    game.player.qi = clamp(game.player.qi, 0, maxQi);
    game.player.hp = clamp(game.player.hp, 0, maxHp);
    game.player.stamina = clamp(game.player.stamina, 0, maxStamina);
  }

  function getPlayerPower() {
    const game = app.getGame();
    return game.player.power + (game.player.bonusPower || 0);
  }

  function getPlayerInsight() {
    const game = app.getGame();
    return game.player.insight + (game.player.bonusInsight || 0);
  }

  function getPlayerCharisma() {
    const game = app.getGame();
    return game.player.charisma + (game.player.bonusCharisma || 0);
  }

  function setMode(modeId) {
    const game = app.getGame();
    if (!MODE_OPTIONS.find((mode) => mode.id === modeId)) return;
    game.player.mode = modeId;
    appendLog(`挂机模式切换为“${MODE_OPTIONS.find((mode) => mode.id === modeId)?.label || modeId}”。`, "info");
    rerender();
  }

  function getNextBreakthroughNeed() {
    const game = app.getGame();
    const nextRank = RANKS[Math.min(game.player.rankIndex + 1, RANKS.length - 1)];
    return nextRank ? nextRank.need : 999999;
  }

  function maybeLearnFromManual() {
    const game = app.getGame();
    const manualId = game.player.equipment.manual;
    if (!manualId) return;
    const manual = app.getItem(manualId);
    if (!manual) return;
    if (Math.random() < 0.08) {
      game.player.insight += (manual.effect.insight || 2) * 0.05;
    }
  }

  function checkRankGrowth() {
    const game = app.getGame();
    const rankIndex = game.player.rankIndex;
    const nextRank = RANKS[rankIndex + 1];
    if (nextRank && game.player.cultivation >= nextRank.need * 0.78) {
      game.player.breakthrough = Math.max(game.player.breakthrough, nextRank.need * 0.24);
    }
    updateDerivedStats();
  }

  function attemptBreakthrough() {
    const game = app.getGame();
    const nextRankIndex = game.player.rankIndex + 1;
    if (nextRankIndex >= RANKS.length) {
      appendLog("你已站在当前境界的极处，只能继续温养根基。", "info");
      return false;
    }
    const need = getNextBreakthroughNeed();
    if (game.player.breakthrough < need * 0.85) {
      appendLog("火候仍欠，贸然冲关只会徒耗真气。", "warn");
      return false;
    }

    const location = app.getCurrentLocation();
    const successRate = clamp(
      game.player.breakthroughRate + location.aura / 520 + getPlayerInsight() / 760 + game.player.breakthrough / (need * 2.8),
      0.1,
      0.62,
    );

    if (Math.random() < successRate) {
      game.player.rankIndex = nextRankIndex;
      game.player.breakthrough = Math.max(0, game.player.breakthrough - need * 0.7);
      game.player.reputation += 2 + nextRankIndex * 2;
      game.player.title = `${RANKS[nextRankIndex].name}境修士`;
      appendLog(`灵机贯体，你成功踏入${RANKS[nextRankIndex].name}境。`, "loot");
      updateDerivedStats();
      adjustResource("hp", game.player.maxHp, "maxHp");
      adjustResource("qi", game.player.maxQi, "maxQi");
      adjustResource("stamina", game.player.maxStamina, "maxStamina");
      return true;
    }

    game.player.breakthrough *= 0.68;
    adjustResource("hp", -12, "maxHp");
    adjustResource("qi", -16, "maxQi");
    appendLog("冲关受挫，经脉震荡，需要重新稳固根基。", "warn");
    return false;
  }

  function consumeItem(itemId) {
    const game = app.getGame();
    const item = app.getItem(itemId);
    if (!item) return;

    if (item.type === "weapon") {
      if (!removeItemFromInventory(itemId, 1)) return;
      if (game.player.equipment.weapon) addItemToInventory(game.player.equipment.weapon, 1);
      game.player.equipment.weapon = item.id;
      appendLog(`你装备了${item.name}。`, "info");
    } else if (item.type === "armor") {
      if (!removeItemFromInventory(itemId, 1)) return;
      if (game.player.equipment.armor) addItemToInventory(game.player.equipment.armor, 1);
      game.player.equipment.armor = item.id;
      appendLog(`你换上了${item.name}。`, "info");
    } else if (item.type === "manual") {
      if (!removeItemFromInventory(itemId, 1)) return;
      if (game.player.equipment.manual) addItemToInventory(game.player.equipment.manual, 1);
      game.player.equipment.manual = item.id;
      appendLog(`你开始参悟${item.name}。`, "info");
    } else {
      const assetClaim = claimAssetFromItem(item);
      if (assetClaim.handled) {
        appendLog(assetClaim.message, assetClaim.success ? "loot" : "warn");
        updateDerivedStats();
        rerender();
        return;
      }

      if (!removeItemFromInventory(itemId, 1)) return;
      if (item.effect.hp) adjustResource("hp", item.effect.hp, "maxHp");
      if (item.effect.qi) adjustResource("qi", item.effect.qi, "maxQi");
      if (item.effect.stamina) adjustResource("stamina", item.effect.stamina, "maxStamina");
      if (item.effect.reputation) game.player.reputation += item.effect.reputation;
      if (item.effect.breakthrough) game.player.breakthrough += item.effect.breakthrough;
      if (item.effect.power) game.player.power += item.effect.power * 0.12;
      if (item.effect.insight) game.player.insight += item.effect.insight * 0.1;
      if (item.effect.charisma) game.player.charisma += item.effect.charisma * 0.1;
      appendLog(`你使用了${item.name}。`, "info");
    }

    updateDerivedStats();
    rerender();
  }

  function stashManualToSect(itemId) {
    const game = app.getGame();
    if (!game.player.sect) {
      appendLog("你尚未建立宗门，无法入藏功法。", "warn");
      return;
    }
    const item = app.getItem(itemId);
    if (!item || item.type !== "manual") return;
    if (!removeItemFromInventory(itemId, 1)) return;
    game.player.sect.manualLibrary.push(itemId);
    appendLog(`${item.name}已收入宗门藏经阁。`, "info");
    rerender();
  }

  function sellItem(itemId) {
    const game = app.getGame();
    const entry = app.findInventoryEntry(itemId);
    const item = app.getItem(itemId);
    if (!entry || !item) return;
    const location = app.getCurrentLocation();
    const price = Math.round(item.baseValue * (location.marketBias === item.type ? 0.96 : 0.72));
    removeItemFromInventory(itemId, 1);
    game.player.money += price;
    game.player.stats.tradesCompleted += 1;
    app.adjustRegionStanding?.(location.id, 0.4);
    appendLog(`你将${item.name}出售给${location.name}商人，获得${price}灵石。`, "info");
    rerender();
  }

  function revivePlayer() {
    const game = app.getGame();
    game.player.hp = Math.round(game.player.maxHp * 0.64);
    game.player.qi = Math.round(game.player.maxQi * 0.58);
    game.player.stamina = Math.round(game.player.maxStamina * 0.7);
    game.player.money = Math.max(0, game.player.money - 48);
    appendLog("你在濒危中被路人救下，损失部分灵石后重整旗鼓。", "warn");
  }

  function saveGame(manual = true) {
    const game = app.getGame();
    try {
      game.lastSavedAt = Date.now();
      localStorage.setItem(config.SAVE_KEY, JSON.stringify(game));
      state.saveState = `${manual ? "已手动存档" : "自动存档"} ${new Date(game.lastSavedAt).toLocaleTimeString("zh-CN", { hour12: false })}`;
      rerenderTopBar();
    } catch (error) {
      state.saveState = "存档失败";
      rerenderTopBar();
      appendLog("浏览器拒绝写入本地存档。", "warn");
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(config.SAVE_KEY);
      if (!raw) {
        appendLog("当前浏览器里没有可读取的存档。", "warn");
        return;
      }
      app.setGame(app.hydrateGameState(JSON.parse(raw)));
      updateDerivedStats();
      state.saveState = `已读取 ${new Date(app.getGame().lastSavedAt || Date.now()).toLocaleTimeString("zh-CN", { hour12: false })}`;
      appendLog("旧日行程已经续上。", "info");
      rerender();
    } catch (error) {
      appendLog("存档损坏或格式不兼容，读取失败。", "warn");
    }
  }

  function resetGame() {
    app.setGame(app.createGameState());
    state.selectedLocationId = app.getGame().player.locationId;
    state.saveState = "新轮回已开启";
    updateDerivedStats();
    appendLog("新的一世开始了，你从云泽渡醒来。", "info");
    rerender();
  }

  function applyPassiveAction(actionKey) {
    const game = app.getGame();
    const action = ACTION_META[actionKey];
    if (!action) return;

    game.player.action = actionKey;
    const costMultiplier = 1 + app.getCurrentLocation().danger * 0.03;
    const cultivationBoost = 1 + (game.player.cultivationBonus || 0) + app.getCurrentLocation().aura / 520;

    if (action.cost.stamina) adjustResource("stamina", -action.cost.stamina * costMultiplier, "maxStamina");
    if (action.cost.qi) adjustResource("qi", -action.cost.qi * costMultiplier, "maxQi");

    if (game.player.stamina <= 5) {
      adjustResource("stamina", 12, "maxStamina");
      adjustResource("qi", 6, "maxQi");
      appendLog("你感到疲惫，于是短暂歇息恢复精力。", "info");
      return;
    }

    if (action.reward.cultivation) game.player.cultivation += action.reward.cultivation * cultivationBoost;
    if (action.reward.qi) adjustResource("qi", action.reward.qi, "maxQi");
    if (action.reward.hp) adjustResource("hp", action.reward.hp, "maxHp");
    if (action.reward.money) game.player.money += Math.round(action.reward.money * (1 + game.player.reputation / 220));
    if (action.reward.reputation) game.player.reputation += round(action.reward.reputation, 1);
    if (action.reward.breakthrough) game.player.breakthrough += action.reward.breakthrough * (1 + getPlayerInsight() / 420);
    if (action.reward.power) game.player.power += action.reward.power * 0.08;
    if (action.reward.market) game.player.stats.tradesCompleted += 1;

    if (actionKey === "meditate") {
      game.player.stats.meditationSessions += 1;
      adjustResource("hp", 1.5, "maxHp");
    }
    if (actionKey === "train") {
      game.player.insight += 0.05;
    }

    maybeLearnFromManual();
    checkRankGrowth();
  }

  function forceAction(actionKey) {
    if (!ACTION_META[actionKey]) return;
    if (typeof app.performAction === "function") {
      app.performAction(actionKey);
      return;
    }
    if (actionKey === "breakthrough") {
      attemptBreakthrough();
      app.tickWorld();
      rerender();
      return;
    }
    applyPassiveAction(actionKey);
    app.tickWorld();
    rerender();
  }

  Object.assign(app, {
    addItemToInventory,
    removeItemFromInventory,
    adjustResource,
    appendLog,
    updateDerivedStats,
    getPlayerPower,
    getPlayerInsight,
    getPlayerCharisma,
    setMode,
    getNextBreakthroughNeed,
    maybeLearnFromManual,
    checkRankGrowth,
    attemptBreakthrough,
    consumeItem,
    stashManualToSect,
    sellItem,
    revivePlayer,
    saveGame,
    loadGame,
    resetGame,
    applyPassiveAction,
    forceAction,
  });
})();