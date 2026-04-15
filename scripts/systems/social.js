(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { SECT_NAME_PARTS, SECT_BUILDINGS, SOCIAL_EVENT_TEMPLATES, SECT_EVENT_TEMPLATES } = tables;
  const { sample, clamp, randomInt, round, uid } = utils;

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

  function adjustRelation(npcId, delta = {}) {
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

  function getPlayerFactionTerritories() {
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return [];
    return Object.values(app.getGame().world.territories || {})
      .map((territory) => {
        const location = tables.LOCATION_MAP[territory.locationId];
        if (!location) return null;
        const isControlled = territory.controllerId === playerFaction.id;
        if (!isControlled && territory.playerInfluence <= 0) return null;
        return {
          ...territory,
          location,
          isControlled,
          controllerName: getTerritoryControllerName(territory),
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.isControlled) - Number(left.isControlled)
        || right.playerInfluence - left.playerInfluence
        || (right.location.marketTier || 0) - (left.location.marketTier || 0));
  }

  function getPlayerFactionTerritoryTargets() {
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return [];
    const current = tables.LOCATION_MAP[app.getGame().player.locationId];
    const candidateIds = new Set(getPlayerFactionTerritories().map((entry) => entry.locationId));
    [current.id, ...(current.neighbors || [])].forEach((locationId) => candidateIds.add(locationId));
    return [...candidateIds]
      .map((locationId) => {
        const location = tables.LOCATION_MAP[locationId];
        if (!location) return null;
        const territory = getTerritoryState(locationId);
        const isControlled = territory.controllerId === playerFaction.id;
        if (!isControlled && territory.playerInfluence <= 0
          && !isTradeHubLocation(locationId)
          && !location.tags.includes("court")
          && !location.tags.includes("pass")
          && !location.tags.includes("sect")) {
          return null;
        }
        return {
          ...territory,
          location,
          isControlled,
          controllerName: getTerritoryControllerName(territory),
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.isControlled) - Number(left.isControlled)
        || Number(right.location.id === current.id) - Number(left.location.id === current.id)
        || (right.location.marketTier || 0) - (left.location.marketTier || 0));
  }

  function getPlayerTerritoryModifier(locationId) {
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return 0;
    const territory = getTerritoryState(locationId);
    if (territory.controllerId === playerFaction.id) return 0.08;
    if (territory.playerInfluence >= 30) return 0.03;
    return 0;
  }

  function getTerritoryCampaignBaseCost(locationId) {
    const location = tables.LOCATION_MAP[locationId];
    return {
      money: 72 + (location?.marketTier || 0) * 26 + (location?.tags.includes("court") ? 18 : 0) + (location?.tags.includes("pass") ? 12 : 0),
      supplies: 8 + (location?.danger || 0) + (location?.tags.includes("court") ? 4 : 0),
      stamina: 12 + (location?.danger || 0) * 2,
      guardNeed: 2 + ((location?.danger || 0) >= 4 ? 1 : 0),
      runnerNeed: 1 + (location?.tags.includes("market") || location?.tags.includes("port") ? 1 : 0),
    };
  }

  function getTerritoryCampaignIssues(locationId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const territory = getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    const cost = getTerritoryCampaignBaseCost(locationId);
    if (!playerFaction || !location) return ["眼下还没有可争的地盘。"];
    const issues = [];
    if (game.player.locationId !== locationId) issues.push(`需先前往${location.name}`);
    if (territory.controllerId === playerFaction.id) issues.push("这块地盘已经在你手里了");
    if (getFactionLiquidFunds() < cost.money) issues.push(`银钱不足，还差${cost.money - getFactionLiquidFunds()}`);
    if (playerFaction.supplies < cost.supplies) issues.push(`补给不足，还差${cost.supplies - playerFaction.supplies}`);
    if (game.player.stamina < cost.stamina) issues.push(`体力不足，还差${cost.stamina - game.player.stamina}`);
    if ((playerFaction.crew?.guards || 0) < cost.guardNeed) issues.push(`护手不够，还差${cost.guardNeed - (playerFaction.crew?.guards || 0)}`);
    if ((playerFaction.crew?.runners || 0) < cost.runnerNeed) issues.push(`跑线人手不够，还差${cost.runnerNeed - (playerFaction.crew?.runners || 0)}`);
    if (location.tags.includes("court") && getRegionStanding(locationId) < 6) issues.push(`本地声望太浅，还差${round(6 - getRegionStanding(locationId), 1)}`);
    return issues;
  }

  function explainTerritoryCampaign(locationId) {
    const issues = getTerritoryCampaignIssues(locationId);
    return issues.length ? issues.join("；") : "人手和银路都已备齐，可以争这条线。";
  }

  function canLaunchTerritoryCampaign(locationId) {
    return getTerritoryCampaignIssues(locationId).length === 0;
  }

  function launchTerritoryCampaign(locationId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const territory = getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    const cost = getTerritoryCampaignBaseCost(locationId);
    if (!playerFaction || !location || !canLaunchTerritoryCampaign(locationId)) {
      app.appendLog("这条地盘眼下还抢不下来。", "warn");
      return;
    }
    spendFactionLiquidFunds(cost.money);
    playerFaction.supplies = Math.max(0, playerFaction.supplies - cost.supplies);
    app.adjustResource("stamina", -cost.stamina, "maxStamina");

    const nearbySupport = getPlayerFactionTerritories()
      .filter((entry) => entry.isControlled && entry.location.neighbors.includes(locationId)).length;
    const campaignPower = playerFaction.level * 9
      + (playerFaction.crew?.guards || 0) * 5
      + (playerFaction.crew?.runners || 0) * 2
      + (playerFaction.crew?.brokers || 0) * 2
      + (playerFaction.branches?.watch || 0) * 6
      + (playerFaction.branches?.caravan || 0) * 3
      + nearbySupport * 6
      + (playerFaction.members?.length || 0) * 1.5
      + getRegionStanding(locationId) * 1.3;
    const defense = territory.stability
      + (location.marketTier || 0) * 7
      + (location.tags.includes("court") ? 14 : 0)
      + (location.tags.includes("pass") ? 8 : 0)
      + (territory.controllerId && territory.controllerId !== playerFaction.id ? 8 : 0);
    const delta = campaignPower + randomInt(-14, 14) - defense;

    if (delta >= 0) {
      territory.playerInfluence = clamp(territory.playerInfluence + 18 + Math.max(4, Math.round(delta * 0.45)), 0, 100);
      territory.stability = clamp(territory.stability - 6, 10, 120);
      playerFaction.influence += 3.6;
      playerFaction.prestige += 2.4;
      adjustRegionStanding(locationId, 1.2);
      if (territory.playerInfluence >= 60) {
        territory.controllerId = playerFaction.id;
        territory.playerInfluence = Math.max(territory.playerInfluence, 64);
        app.appendLog(`你在${location.name}压住了地头，把这条门路正式夺进了${playerFaction.name}手里。`, "loot");
      } else {
        app.appendLog(`你在${location.name}撬开了一道口子，${playerFaction.name}已经插手这条线。`, "loot");
      }
      return;
    }

    territory.playerInfluence = clamp(territory.playerInfluence + Math.max(0, 4 + delta), 0, 100);
    territory.stability = clamp(territory.stability + 4, 10, 120);
    playerFaction.prestige = Math.max(0, playerFaction.prestige - 0.8);
    app.appendLog(`你在${location.name}试着争路，却被${getTerritoryControllerName(territory)}压了回来。`, "warn");
  }

  function getTerritoryStabilizeIssues(locationId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const territory = getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    if (!playerFaction || !location) return ["眼下没有可稳固的地盘。"];
    const issues = [];
    const moneyCost = 38 + (location.marketTier || 0) * 12;
    const suppliesCost = 5 + (location.tags.includes("pass") ? 2 : 0);
    if (game.player.locationId !== locationId) issues.push(`需先前往${location.name}`);
    if (territory.controllerId !== playerFaction.id && territory.playerInfluence <= 0) issues.push("你在这里还没有站住脚");
    if (getFactionLiquidFunds() < moneyCost) issues.push(`银钱不足，还差${moneyCost - getFactionLiquidFunds()}`);
    if (playerFaction.supplies < suppliesCost) issues.push(`补给不足，还差${suppliesCost - playerFaction.supplies}`);
    return issues;
  }

  function explainStabilizeTerritory(locationId) {
    const issues = getTerritoryStabilizeIssues(locationId);
    return issues.length ? issues.join("；") : "门路已经铺住，可以继续压稳。";
  }

  function canStabilizeTerritory(locationId) {
    return getTerritoryStabilizeIssues(locationId).length === 0;
  }

  function stabilizeTerritory(locationId) {
    const playerFaction = getPlayerFaction();
    const territory = getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    if (!playerFaction || !location || !canStabilizeTerritory(locationId)) {
      app.appendLog("这块地盘眼下还稳不下来。", "warn");
      return;
    }
    const moneyCost = 38 + (location.marketTier || 0) * 12;
    const suppliesCost = 5 + (location.tags.includes("pass") ? 2 : 0);
    spendFactionLiquidFunds(moneyCost);
    playerFaction.supplies = Math.max(0, playerFaction.supplies - suppliesCost);
    territory.playerInfluence = clamp(territory.playerInfluence + 12 + (playerFaction.branches?.watch || 0) * 2, 0, 100);
    territory.stability = clamp(territory.stability + 8, 10, 120);
    if (territory.controllerId !== playerFaction.id && territory.playerInfluence >= 60) {
      territory.controllerId = playerFaction.id;
      app.appendLog(`你把${location.name}的人情、货路和地头一并压稳，正式立住了${playerFaction.name}的旗。`, "loot");
      return;
    }
    app.appendLog(`你在${location.name}又压实了一层门路，${playerFaction.name}的根脚更深了。`, "info");
  }

  function createTask(ownerType, kind, payload = {}) {
    return {
      id: uid(`${ownerType}-${kind}`),
      ownerType,
      kind,
      ...payload,
    };
  }

  function getAffiliationTasks() {
    const game = app.getGame();
    game.player.affiliationTasks = Array.isArray(game.player.affiliationTasks) ? game.player.affiliationTasks : [];
    return game.player.affiliationTasks;
  }

  function getFactionSupplyProfile(faction) {
    if (!faction) return { itemId: "spirit-grain", quantity: 2 };
    if (["guild", "escort", "bureau"].includes(faction.type)) {
      return { itemId: "cloth-roll", quantity: 2 };
    }
    if (faction.type === "order") {
      return { itemId: "mist-herb", quantity: 2 };
    }
    return { itemId: "spirit-grain", quantity: 3 };
  }

  function buildAffiliationSupplyTask(faction) {
    const supply = getFactionSupplyProfile(faction);
    return createTask("affiliation", "supply", {
      factionId: faction.id,
      title: `${faction.name}备货差使`,
      desc: `替${faction.name}补一笔常用资材，先把门内日用补齐。`,
      itemId: supply.itemId,
      quantity: supply.quantity,
      rewardMoney: 42 + faction.joinRequirement.money,
      rewardReputation: 1.2,
      rewardStanding: 2.6,
      rewardRegion: 0.8,
    });
  }

  function buildAffiliationPatrolTask(faction) {
    return createTask("affiliation", "patrol", {
      factionId: faction.id,
      title: `${faction.name}值役巡查`,
      desc: `回${tables.LOCATION_MAP[faction.locationId]?.name || faction.locationId}跑一趟值役，把门路站稳。`,
      staminaCost: isOfficialFaction(faction) ? 16 : 12,
      qiCost: isOfficialFaction(faction) ? 4 : 2,
      rewardMoney: 28 + faction.joinRequirement.rankIndex * 12,
      rewardReputation: 0.8,
      rewardStanding: 2.2,
      rewardRegion: 0.6,
    });
  }

  function buildAffiliationLiaisonTask(faction) {
    return createTask("affiliation", "liaison", {
      factionId: faction.id,
      title: `${faction.name}疏通门路`,
      desc: `备一笔人情与路费，替${faction.name}去打点本地往来。`,
      moneyCost: 36 + faction.joinRequirement.money,
      standingNeed: isOfficialFaction(faction) ? 5 : 3,
      rewardMoney: 20,
      rewardReputation: 1.4,
      rewardStanding: 3.4,
      rewardRegion: 1.2,
    });
  }

  function refreshAffiliationTasks(force = false) {
    const game = app.getGame();
    const faction = getCurrentAffiliation();
    if (!faction) {
      game.player.affiliationTasks = [];
      game.player.affiliationTaskDay = game.world.day;
      return [];
    }
    const tasks = getAffiliationTasks();
    if (!force && game.player.affiliationTaskDay === game.world.day && tasks.length >= 2) {
      return tasks;
    }
    game.player.affiliationTasks = [
      buildAffiliationSupplyTask(faction),
      buildAffiliationPatrolTask(faction),
      buildAffiliationLiaisonTask(faction),
    ].sort(() => Math.random() - 0.5).slice(0, 2);
    game.player.affiliationTaskDay = game.world.day;
    return game.player.affiliationTasks;
  }

  function getAffiliationTaskIssues(taskId) {
    const game = app.getGame();
    const task = getAffiliationTasks().find((entry) => entry.id === taskId);
    if (!task) return ["这份势力差使已经失效。"];
    const faction = app.getFaction(task.factionId);
    if (!faction || game.player.affiliationId !== faction.id) return ["你当前已不在这方势力中。"];
    const issues = [];
    if (game.player.locationId !== faction.locationId) issues.push(`需先前往${tables.LOCATION_MAP[faction.locationId]?.name || faction.locationId}`);
    if (task.kind === "supply") {
      const current = app.findInventoryEntry(task.itemId)?.quantity || 0;
      if (current < task.quantity) issues.push(`缺少${app.getItem(task.itemId)?.name || task.itemId} ${task.quantity - current}件`);
    }
    if (task.kind === "patrol") {
      if (game.player.stamina < task.staminaCost) issues.push(`体力不足，还差${task.staminaCost - game.player.stamina}`);
      if (game.player.qi < task.qiCost) issues.push(`真气不足，还差${task.qiCost - game.player.qi}`);
    }
    if (task.kind === "liaison") {
      const localStanding = getRegionStanding(faction.locationId);
      if (game.player.money < task.moneyCost) issues.push(`灵石不足，还差${task.moneyCost - game.player.money}`);
      if (localStanding < task.standingNeed) issues.push(`本地声望不足，还差${round(task.standingNeed - localStanding, 1)}`);
    }
    return issues;
  }

  function explainAffiliationTask(taskId) {
    const issues = getAffiliationTaskIssues(taskId);
    return issues.length ? issues.join("；") : "差使已经准备妥当。";
  }

  function canCompleteAffiliationTask(taskId) {
    return getAffiliationTaskIssues(taskId).length === 0;
  }

  function completeAffiliationTask(taskId) {
    const game = app.getGame();
    const tasks = getAffiliationTasks();
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || !canCompleteAffiliationTask(taskId)) {
      app.appendLog("这份势力差使眼下还接不稳。", "warn");
      return;
    }
    if (task.kind === "supply") {
      app.removeItemFromInventory(task.itemId, task.quantity);
    }
    if (task.kind === "patrol") {
      app.adjustResource("stamina", -task.staminaCost, "maxStamina");
      app.adjustResource("qi", -task.qiCost, "maxQi");
    }
    if (task.kind === "liaison") {
      game.player.money -= task.moneyCost;
    }
    game.player.money += task.rewardMoney;
    game.player.reputation += task.rewardReputation;
    adjustFactionStanding(task.factionId, task.rewardStanding);
    adjustRegionStanding(app.getFaction(task.factionId)?.locationId || game.player.locationId, task.rewardRegion);
    game.player.stats.affiliationTasksCompleted += 1;
    game.player.affiliationTasks = tasks.filter((entry) => entry.id !== taskId);
    app.appendLog(`你替${app.getFaction(task.factionId)?.name || "势力"}办妥“${task.title}”，门路更稳了。`, "loot");
  }

  function canJoinFaction(factionId) {
    return getFactionJoinIssues(factionId).length === 0;
  }

  function getFactionJoinIssues(factionId) {
    const game = app.getGame();
    const faction = app.getFaction(factionId);
    if (!faction) return ["这方势力暂时无法接触。"];
    const issues = [];
    if (game.player.affiliationId === factionId) issues.push("你已经在这方势力中");
    if (game.player.locationId !== faction.locationId) issues.push(`需前往${tables.LOCATION_MAP[faction.locationId]?.name || faction.locationId}`);
    if (game.player.money < faction.joinRequirement.money) issues.push(`灵石不足，还差${faction.joinRequirement.money - game.player.money}`);
    if (game.player.reputation < faction.joinRequirement.reputation) issues.push(`声望不足，还差${round(faction.joinRequirement.reputation - game.player.reputation, 1)}`);
    if (game.player.rankIndex < faction.joinRequirement.rankIndex) issues.push(`境界不足，需要${app.getRankData(faction.joinRequirement.rankIndex).name}`);
    return issues;
  }

  function explainFactionJoin(factionId) {
    const issues = getFactionJoinIssues(factionId);
    return issues.length ? issues.join("；") : "条件齐备，可以加入。";
  }

  function joinFaction(factionId) {
    const game = app.getGame();
    const faction = app.getFaction(factionId);
    if (!faction || !canJoinFaction(factionId)) {
      app.appendLog("眼下还没有资格加入这方势力。", "warn");
      return;
    }
    const previous = getCurrentAffiliation();
    game.player.affiliationId = factionId;
    game.player.affiliationRank = 0;
    game.player.factionStanding[factionId] = Math.max(game.player.factionStanding[factionId] || 0, 8);
    adjustRegionStanding(faction.locationId, 2.4);
    refreshAffiliationTasks(true);
    if (game.world.factions[factionId]) {
      game.world.factions[factionId].joined = true;
      game.world.factions[factionId].standing = game.player.factionStanding[factionId];
    }
    if (previous && previous.id !== factionId) {
      app.appendLog(`你离开了${previous.name}，转而投向${faction.name}。`, "npc");
    }
    game.player.title = `${faction.name}${faction.titles[0]}`;
    app.appendLog(`你正式加入${faction.name}，身份为“${faction.titles[0]}”。`, "loot");
  }

  function getPlayerFactionTotalCrew(playerFaction = getPlayerFaction()) {
    if (!playerFaction) return 0;
    return Object.values(playerFaction.crew || {}).reduce((sum, value) => sum + value, 0) + (playerFaction.members?.length || 0);
  }

  function getCreatePlayerFactionIssues() {
    const game = app.getGame();
    const issues = [];
    if (game.player.playerFaction) issues.push("你已经有自家势力了");
    if (game.player.rankIndex < 1) issues.push("至少要有练力修为，才能扛住初期摊子");
    if (game.player.reputation < 22) issues.push(`声望不足，还差${round(22 - game.player.reputation, 1)}`);
    if (game.player.money < 900) issues.push(`灵石不足，还差${900 - game.player.money}`);
    return issues;
  }

  function explainCreatePlayerFaction() {
    const issues = getCreatePlayerFactionIssues();
    return issues.length ? issues.join("；") : "已经够资格拉起自己的势力了。";
  }

  function canCreatePlayerFaction() {
    return getCreatePlayerFactionIssues().length === 0;
  }

  function createPlayerFaction() {
    const game = app.getGame();
    if (!canCreatePlayerFaction()) {
      app.appendLog("现在还扛不起自建势力的盘子。", "warn");
      return;
    }
    const name = createFactionName();
    game.player.money -= 900;
    game.player.playerFaction = app.createInitialPlayerFaction(name);
    game.player.playerFaction.foundedDay = game.world.day;
    game.player.playerFaction.headquartersLocationId = game.player.locationId;
    game.player.playerFaction.treasury = 180;
    game.player.playerFaction.supplies = 42;
    game.player.playerFaction.influence = 8;
    const territory = getTerritoryState(game.player.locationId);
    territory.playerInfluence = Math.max(territory.playerInfluence, 28);
    if (!territory.controllerId) {
      territory.controllerId = game.player.playerFaction.id;
    }
    refreshPlayerFactionMissions(true);
    app.appendLog(`你在${app.getCurrentLocation().name}拉起了自己的势力“${name}”。`, "loot");
  }

  function upgradePlayerFactionBranch(branchKey) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const branch = PLAYER_FACTION_BRANCHES[branchKey];
    if (!playerFaction || !branch) {
      app.appendLog("眼下还没有可升级的势力支线。", "warn");
      return;
    }
    const currentLevel = playerFaction.branches[branchKey] || 0;
    const cost = branch.baseCost * (currentLevel + 1);
    if (game.player.money < cost) {
      app.appendLog(`扩充${branch.label}需要${cost}灵石。`, "warn");
      return;
    }
    game.player.money -= cost;
    playerFaction.branches[branchKey] = currentLevel + 1;
    playerFaction.prestige += 2 + currentLevel;
    playerFaction.influence += 1.2 + currentLevel * 0.4;
    app.appendLog(`你的势力把${branch.label}扩到了 ${currentLevel + 1} 级。`, "loot");
  }

  function getRecruitFactionMemberIssues(npcId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const npc = app.getNpc(npcId);
    const relation = getRelation(npcId);
    if (!npc) return ["此人当前不在江湖册录中。"];
    const issues = [];
    if (!playerFaction) issues.push("你尚未拉起自己的势力");
    if (playerFaction?.members.includes(npcId)) issues.push("对方已经是你势力中的骨干了");
    if (npc.locationId !== game.player.locationId) issues.push("人不在眼前，暂时谈不成");
    if (relation.affinity < 16) issues.push(`好感不足，还差${16 - relation.affinity}`);
    if (relation.trust < 14) issues.push(`信任不足，还差${14 - relation.trust}`);
    if (game.player.money < 36) issues.push(`安家与盘缠还差${36 - game.player.money}灵石`);
    return issues;
  }

  function explainRecruitFactionMember(npcId) {
    const issues = getRecruitFactionMemberIssues(npcId);
    return issues.length ? issues.join("；") : "对方已经愿意来你帐下做事。";
  }

  function canRecruitFactionMember(npcId) {
    return getRecruitFactionMemberIssues(npcId).length === 0;
  }

  function recruitFactionMember(npcId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const npc = app.getNpc(npcId);
    if (!npc || !playerFaction || !canRecruitFactionMember(npcId)) {
      app.appendLog("这位江湖人暂时还不愿替你做事。", "warn");
      return;
    }
    game.player.money -= 36;
    playerFaction.members.push(npcId);
    playerFaction.influence += 1.8;
    playerFaction.prestige += 1;
    npc.factionId = playerFaction.id;
    npc.lastEvent = `投到${playerFaction.name}门下做事`;
    adjustRelation(npcId, { affinity: 4, trust: 6 });
    game.player.stats.factionMembersRecruited += 1;
    app.appendLog(`${npc.name}改投${playerFaction.name}，成了你麾下的骨干。`, "loot");
  }

  function getPlayerFactionMissions() {
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return [];
    playerFaction.missions = Array.isArray(playerFaction.missions) ? playerFaction.missions : [];
    return playerFaction.missions;
  }

  function buildPlayerFactionRouteMission(playerFaction) {
    return createTask("playerFaction", "route", {
      title: "押下一条货线",
      desc: `给${playerFaction.name}的商队拨一笔压货银，先把新货线滚起来。`,
      moneyCost: 92,
      suppliesCost: 6,
      runnerNeed: 2,
      rewardTreasury: 118,
      rewardSupplies: 10,
      rewardInfluence: 2.8,
      rewardPrestige: 1.4,
    });
  }

  function buildPlayerFactionRecruitMission(playerFaction) {
    const roles = ["runners", "guards", "brokers"];
    const role = roles[randomInt(0, roles.length - 1)];
    const labels = {
      runners: "脚夫和跑线手",
      guards: "押队护手",
      brokers: "掮客和账房",
    };
    return createTask("playerFaction", "recruit", {
      title: `添募${labels[role]}`,
      desc: `给${playerFaction.name}再添一批${labels[role]}，让摊子不只靠你一人撑。`,
      role,
      moneyCost: 68,
      rewardCrew: 1,
      rewardInfluence: 1.8,
      rewardPrestige: 1.2,
    });
  }

  function buildPlayerFactionOfficeMission(playerFaction) {
    return createTask("playerFaction", "office", {
      title: "打点本地门路",
      desc: `借官面或地头去给${playerFaction.name}打点一圈，把下一段路走顺。`,
      moneyCost: 54,
      standingNeed: 6,
      rewardInfluence: 4.2,
      rewardPrestige: 2.2,
      rewardRegion: 1.4,
      rewardSupplies: 4,
    });
  }

  function refreshPlayerFactionMissions(force = false) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return [];
    const missions = getPlayerFactionMissions();
    if (!force && playerFaction.missionDay === game.world.day && missions.length >= 3) {
      return missions;
    }
    playerFaction.missions = [
      buildPlayerFactionRouteMission(playerFaction),
      buildPlayerFactionRecruitMission(playerFaction),
      buildPlayerFactionOfficeMission(playerFaction),
    ];
    playerFaction.missionDay = game.world.day;
    return playerFaction.missions;
  }

  function getPlayerFactionMissionIssues(missionId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const mission = getPlayerFactionMissions().find((entry) => entry.id === missionId);
    if (!playerFaction || !mission) return ["这份势力任务已经失效。"];
    const issues = [];
    if (mission.kind === "route") {
      if (!isTradeHubLocation(game.player.locationId)) issues.push("要在市镇、港口或驿路上才能压这条货线");
      if (game.player.money < mission.moneyCost) issues.push(`灵石不足，还差${mission.moneyCost - game.player.money}`);
      if ((playerFaction.supplies || 0) < mission.suppliesCost) issues.push(`补给不足，还差${mission.suppliesCost - playerFaction.supplies}`);
      if ((playerFaction.crew?.runners || 0) < mission.runnerNeed) issues.push(`脚夫不够，还差${mission.runnerNeed - (playerFaction.crew?.runners || 0)}`);
    }
    if (mission.kind === "recruit") {
      if (game.player.money < mission.moneyCost) issues.push(`招募本钱不足，还差${mission.moneyCost - game.player.money}`);
    }
    if (mission.kind === "office") {
      if (!getGovernmentOfficeName(game.player.locationId)) issues.push("要在有官衙驻点的地方才能打点");
      if (game.player.money < mission.moneyCost) issues.push(`打点银不足，还差${mission.moneyCost - game.player.money}`);
      if (getRegionStanding(game.player.locationId) < mission.standingNeed) issues.push(`本地声望不足，还差${round(mission.standingNeed - getRegionStanding(game.player.locationId), 1)}`);
    }
    return issues;
  }

  function explainPlayerFactionMission(missionId) {
    const issues = getPlayerFactionMissionIssues(missionId);
    return issues.length ? issues.join("；") : "这份势力差事已经铺好了。";
  }

  function canCompletePlayerFactionMission(missionId) {
    return getPlayerFactionMissionIssues(missionId).length === 0;
  }

  function completePlayerFactionMission(missionId) {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    const missions = getPlayerFactionMissions();
    const mission = missions.find((entry) => entry.id === missionId);
    if (!playerFaction || !mission || !canCompletePlayerFactionMission(missionId)) {
      app.appendLog("这份自家势力任务眼下还接不稳。", "warn");
      return;
    }
    game.player.money -= mission.moneyCost || 0;
    if (mission.suppliesCost) {
      playerFaction.supplies = Math.max(0, playerFaction.supplies - mission.suppliesCost);
    }
    if (mission.kind === "recruit") {
      playerFaction.crew[mission.role] = (playerFaction.crew[mission.role] || 0) + mission.rewardCrew;
      game.player.stats.factionMembersRecruited += mission.rewardCrew;
    }
    playerFaction.treasury += mission.rewardTreasury || 0;
    playerFaction.supplies = clamp(playerFaction.supplies + (mission.rewardSupplies || 0), 0, 180);
    playerFaction.influence += mission.rewardInfluence || 0;
    playerFaction.prestige += mission.rewardPrestige || 0;
    if (mission.rewardRegion) {
      adjustRegionStanding(game.player.locationId, mission.rewardRegion);
    }
    game.player.stats.factionTasksCompleted += 1;
    playerFaction.missions = missions.filter((entry) => entry.id !== missionId);
    app.appendLog(`你替${playerFaction.name}办妥“${mission.title}”，摊子又往外伸了一截。`, "loot");
  }

  function getSectMissions() {
    const sect = app.getGame().player.sect;
    if (!sect) return [];
    sect.missions = Array.isArray(sect.missions) ? sect.missions : [];
    return sect.missions;
  }

  function buildSectGranaryMission(sect) {
    return createTask("sect", "granary", {
      title: "补山门粮库",
      desc: `给${sect.name}补一批口粮和药草，门内杂役与弟子才能安稳过日子。`,
      grainNeed: 3,
      herbNeed: 1,
      rewardFood: 22,
      rewardTreasury: 18,
      rewardPrestige: 2.4,
      rewardReputation: 0.8,
    });
  }

  function buildSectLectureMission(sect) {
    return createTask("sect", "lecture", {
      title: "开一场讲经课",
      desc: `抽时间给${sect.name}门下开讲经课，稳住门风也带一带弟子。`,
      qiCost: 10,
      discipleNeed: 1,
      rewardPrestige: 3.4,
      rewardTreasury: 16,
      rewardTeaching: 1.6,
    });
  }

  function buildSectRecruitMission(sect) {
    return createTask("sect", "recruit", {
      title: "招募外门弟子",
      desc: `拿一笔安置银去招一批外门新丁，让${sect.name}真正像个山门。`,
      moneyCost: 88,
      reputationNeed: 40,
      rewardOuter: 1,
      rewardPrestige: 2.8,
      rewardFood: 6,
    });
  }

  function refreshSectMissions(force = false) {
    const game = app.getGame();
    const sect = game.player.sect;
    if (!sect) return [];
    const missions = getSectMissions();
    if (!force && sect.missionDay === game.world.day && missions.length >= 3) {
      return missions;
    }
    sect.missions = [
      buildSectGranaryMission(sect),
      buildSectLectureMission(sect),
      buildSectRecruitMission(sect),
    ];
    sect.missionDay = game.world.day;
    return sect.missions;
  }

  function getSectMissionIssues(missionId) {
    const game = app.getGame();
    const sect = game.player.sect;
    const mission = getSectMissions().find((entry) => entry.id === missionId);
    if (!sect || !mission) return ["这份宗门差使已经失效。"];
    const issues = [];
    if (mission.kind === "granary") {
      const grain = app.findInventoryEntry("spirit-grain")?.quantity || 0;
      const herb = app.findInventoryEntry("mist-herb")?.quantity || 0;
      if (grain < mission.grainNeed) issues.push(`粗灵米还差${mission.grainNeed - grain}`);
      if (herb < mission.herbNeed) issues.push(`雾心草还差${mission.herbNeed - herb}`);
    }
    if (mission.kind === "lecture") {
      if (sect.disciples.length < mission.discipleNeed) issues.push("门下还没有能听课的亲传弟子");
      if (!sect.manualLibrary.length) issues.push("藏经阁暂无可开的经课");
      if (game.player.qi < mission.qiCost) issues.push(`真气不足，还差${mission.qiCost - game.player.qi}`);
      if (!tables.LOCATION_MAP[game.player.locationId]?.tags.includes("sect")) issues.push("最好回到行院或宗门据点开课");
    }
    if (mission.kind === "recruit") {
      if (game.player.money < mission.moneyCost) issues.push(`安置银不足，还差${mission.moneyCost - game.player.money}`);
      if (game.player.reputation < mission.reputationNeed) issues.push(`声望不足，还差${round(mission.reputationNeed - game.player.reputation, 1)}`);
    }
    return issues;
  }

  function explainSectMission(missionId) {
    const issues = getSectMissionIssues(missionId);
    return issues.length ? issues.join("；") : "这份宗门差使可以着手处理。";
  }

  function canCompleteSectMission(missionId) {
    return getSectMissionIssues(missionId).length === 0;
  }

  function completeSectMission(missionId) {
    const game = app.getGame();
    const sect = game.player.sect;
    const missions = getSectMissions();
    const mission = missions.find((entry) => entry.id === missionId);
    if (!sect || !mission || !canCompleteSectMission(missionId)) {
      app.appendLog("这份宗门差使眼下还办不成。", "warn");
      return;
    }
    if (mission.kind === "granary") {
      app.removeItemFromInventory("spirit-grain", mission.grainNeed);
      app.removeItemFromInventory("mist-herb", mission.herbNeed);
    }
    if (mission.kind === "lecture") {
      app.adjustResource("qi", -mission.qiCost, "maxQi");
      sect.teachings.forEach((teaching) => {
        teaching.progress += mission.rewardTeaching;
      });
    }
    if (mission.kind === "recruit") {
      game.player.money -= mission.moneyCost;
      sect.outerDisciples += mission.rewardOuter;
    }
    sect.food = clamp(sect.food + (mission.rewardFood || 0), 0, 240);
    sect.treasury += mission.rewardTreasury || 0;
    sect.prestige += mission.rewardPrestige || 0;
    game.player.reputation += mission.rewardReputation || 0;
    game.player.stats.sectTasksCompleted += 1;
    sect.missions = missions.filter((entry) => entry.id !== missionId);
    app.appendLog(`你替${sect.name}办妥“${mission.title}”，山门根基更稳了。`, "loot");
  }

  function createSect() {
    const game = app.getGame();
    if (game.player.sect) {
      app.appendLog("你已经建立了自己的宗门。", "warn");
      return;
    }
    if (game.player.rankIndex < 4) {
      app.appendLog("你还只是江湖中人，离自立山门差得太远。", "warn");
      return;
    }
    if (!app.findInventoryEntry("sect-banner")) {
      app.appendLog("建宗至少要备好一面宗门旗幡。", "warn");
      return;
    }
    if (game.player.reputation < 68 || game.player.money < 3800) {
      app.appendLog("建宗需要筑基以上名望、足够灵石和真正的立宗资格。", "warn");
      return;
    }
    const name = createSectName();
    game.player.money -= 3800;
    app.removeItemFromInventory("sect-banner", 1);
    game.player.sect = app.createInitialSect(name);
    game.player.sect.foundedDay = game.world.day;
    game.player.sect.treasury = 420;
    game.player.sect.manualLibrary = game.player.inventory
      .filter((entry) => app.getItem(entry.itemId)?.type === "manual")
      .slice(0, 1)
      .map((entry) => entry.itemId);
    refreshSectMissions(true);
    game.player.reputation += 6;
    app.appendLog(`你正式立下山门，宗门“${name}”就此开宗。`, "loot");
  }

  function upgradeSectBuilding(buildingKey) {
    const game = app.getGame();
    if (!game.player.sect) {
      app.appendLog("你尚未建立宗门。", "warn");
      return;
    }
    const building = SECT_BUILDINGS[buildingKey];
    if (!building) return;
    const currentLevel = game.player.sect.buildings[buildingKey] || 0;
    const cost = building.baseCost * (currentLevel + 1);
    if (game.player.money < cost) {
      app.appendLog(`升级${building.label}需要${cost}灵石。`, "warn");
      return;
    }
    game.player.money -= cost;
    game.player.sect.buildings[buildingKey] = currentLevel + 1;
    game.player.sect.prestige += 2 + currentLevel;
    app.appendLog(`${building.label}升至 ${currentLevel + 1} 级。`, "info");
  }

  function canRecruitDisciple(npcId) {
    return getRecruitDiscipleIssues(npcId).length === 0;
  }

  function getRecruitDiscipleIssues(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    const relation = getRelation(npcId);
    if (!npc) return ["此人当前不在江湖册录中。"];
    const issues = [];
    if (!game.player.sect) issues.push("你尚未建立宗门");
    if (game.player.sect?.disciples.includes(npcId)) issues.push("对方已经是门下弟子");
    if (relation.affinity < 24) issues.push(`好感不足，还差${24 - relation.affinity}`);
    if (relation.trust < 18) issues.push(`信任不足，还差${18 - relation.trust}`);
    if (npc.rankIndex > game.player.rankIndex + 1) issues.push("对方修为过高，暂时不愿屈就");
    return issues;
  }

  function explainRecruitDisciple(npcId) {
    const issues = getRecruitDiscipleIssues(npcId);
    return issues.length ? issues.join("；") : "缘分已到，可以收入门墙。";
  }

  function recruitDisciple(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc || !canRecruitDisciple(npcId)) {
      app.appendLog("对方还没有认可到愿意入你门墙的程度。", "warn");
      return;
    }
    game.player.sect.disciples.push(npcId);
    npc.masterId = "player";
    npc.sectId = game.player.sect.id;
    adjustRelation(npcId, { role: "apprentice", affinity: 8, trust: 10 });
    game.player.sect.prestige += 3;
    app.appendLog(`${npc.name}正式拜入${game.player.sect.name}，成为门下弟子。`, "loot");
  }

  function canBecomeMaster(npcId) {
    return getMasterBondIssues(npcId).length === 0;
  }

  function getMasterBondIssues(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    const relation = getRelation(npcId);
    if (!npc) return ["此人当前无法结成师承。"];
    const issues = [];
    if (game.player.masterId || relation.role === "master") issues.push("你已经有师承了");
    if (npc.rankIndex < game.player.rankIndex + 1) issues.push("对方修为还不足以收你为徒");
    if (relation.affinity < 18) issues.push(`好感不足，还差${18 - relation.affinity}`);
    if (relation.trust < 22) issues.push(`信任不足，还差${22 - relation.trust}`);
    return issues;
  }

  function explainMasterBond(npcId) {
    const issues = getMasterBondIssues(npcId);
    return issues.length ? issues.join("；") : "对方已经愿意收你入门。";
  }

  function becomeMasterBond(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc || !canBecomeMaster(npcId)) {
      app.appendLog("对方还未到愿意收你入门的地步。", "warn");
      return;
    }
    game.player.masterId = npcId;
    npc.apprenticeIds = npc.apprenticeIds || [];
    if (!npc.apprenticeIds.includes("player")) npc.apprenticeIds.push("player");
    adjustRelation(npcId, { role: "master", affinity: 6, trust: 8 });
    app.appendLog(`${npc.name}收你为门下弟子，今后可获更多指点。`, "loot");
  }

  function canBecomePartner(npcId) {
    return getPartnerBondIssues(npcId).length === 0;
  }

  function getPartnerBondIssues(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    const relation = getRelation(npcId);
    if (!npc) return ["此人当前无法结成道侣。"];
    const issues = [];
    if (game.player.partnerId || relation.role === "partner") issues.push("你已经有道侣了");
    if (relation.affinity < 36) issues.push(`好感不足，还差${36 - relation.affinity}`);
    if (relation.trust < 32) issues.push(`信任不足，还差${32 - relation.trust}`);
    if (relation.romance < 26) issues.push(`情缘不足，还差${26 - relation.romance}`);
    return issues;
  }

  function explainPartnerBond(npcId) {
    const issues = getPartnerBondIssues(npcId);
    return issues.length ? issues.join("；") : "水到渠成，可以结为道侣。";
  }

  function becomePartner(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc || !canBecomePartner(npcId)) {
      app.appendLog("你们之间的情分还未到水到渠成的程度。", "warn");
      return;
    }
    game.player.partnerId = npcId;
    npc.partnerId = "player";
    adjustRelation(npcId, { role: "partner", affinity: 8, trust: 8, romance: 10 });
    if (app.findInventoryEntry("bond-token")) {
      app.removeItemFromInventory("bond-token", 1);
    }
    app.appendLog(`你与${npc.name}互许道心，正式结为道侣。`, "loot");
  }

  function declareRival(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc) return;
    const relation = getRelation(npcId);
    relation.role = "rival";
    relation.rivalry = clamp(relation.rivalry + 28, 0, 100);
    relation.affinity = clamp(relation.affinity - 18, -100, 100);
    if (!game.player.rivalIds.includes(npcId)) game.player.rivalIds.push(npcId);
    app.appendLog(`你与${npc.name}彻底撕破脸，今后必有争斗。`, "warn");
  }

  function assignTeaching(npcId, manualId) {
    const game = app.getGame();
    if (!game.player.sect) {
      app.appendLog("你尚未建立宗门，无法传功。", "warn");
      return;
    }
    if (!game.player.sect.disciples.includes(npcId)) {
      app.appendLog("只有宗门弟子才能接受正式传功。", "warn");
      return;
    }
    if (!game.player.sect.manualLibrary.includes(manualId)) {
      app.appendLog("该功法尚未收入藏经阁。", "warn");
      return;
    }
    const existing = game.player.sect.teachings.find((entry) => entry.npcId === npcId);
    if (existing) {
      existing.manualId = manualId;
      existing.progress = 0;
    } else {
      game.player.sect.teachings.push({ npcId, manualId, progress: 0 });
    }
    app.appendLog(`你安排${app.getNpc(npcId)?.name || "弟子"}研习${app.getItem(manualId)?.name || "功法"}。`, "info");
  }

  function processRelationshipTick() {
    const game = app.getGame();
    game.npcs.forEach((npc) => {
      const relation = getRelation(npc.id);
      if (relation.role === "partner" && Math.random() < 0.1) {
        game.player.breakthrough += 1.2;
        relation.affinity = clamp(relation.affinity + 1, -100, 100);
        if (Math.random() < 0.24) {
          const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "partner"));
          app.appendLog(template.text.replaceAll("{npc}", npc.name), template.type);
        }
      }
      if (relation.role === "master" && Math.random() < 0.14) {
        game.player.cultivation += 0.6;
        relation.trust = clamp(relation.trust + 1, -100, 100);
      }
      if (relation.role === "rival" && Math.random() < 0.12) {
        relation.rivalry = clamp(relation.rivalry + 2, 0, 100);
        game.player.reputation += 0.1;
        if (Math.random() < 0.4) {
          const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "rival"));
          app.appendLog(template.text.replaceAll("{npc}", npc.name), template.type);
        }
      }
    });
  }

  function processSectTick() {
    const game = app.getGame();
    if (!game.player.sect) return;
    const sect = game.player.sect;
    if (sect.eventCooldown > 0) sect.eventCooldown -= 1;
    refreshSectMissions(game.world.hour === 0);
    sect.teachings.forEach((teaching) => {
      const npc = app.getNpc(teaching.npcId);
      if (!npc) return;
      teaching.progress += 1 + sect.buildings.library * 0.5;
      if (teaching.progress >= 4) {
        teaching.progress = 0;
        npc.cultivation += 10 + sect.buildings.dojo * 3;
        sect.prestige += 1;
        game.player.stats.disciplesTaught += 1;
        if (Math.random() < 0.32) {
          const template = sample(SECT_EVENT_TEMPLATES.filter((entry) => entry.id === "teaching-progress"));
          app.appendLog(template.text.replaceAll("{npc}", npc.name), template.type);
        }
      }
    });
    if (game.world.hour === 0) {
      const discipleWeight = sect.disciples.length + (sect.outerDisciples || 0) * 0.5;
      const tribute = 4 + sect.buildings.market * 3 + Math.round(discipleWeight * 3);
      const foodDelta = 4 + sect.buildings.hall * 2 - Math.max(2, Math.round(discipleWeight));
      sect.treasury += tribute;
      sect.food = clamp(sect.food + foodDelta, 0, 240);
      if (tribute > 0) {
        const template = sample(SECT_EVENT_TEMPLATES.filter((entry) => entry.id === "tribute"));
        app.appendLog(template.text.replaceAll("{value}", String(tribute)), template.type);
      }
      if (sect.food <= 8) {
        sect.prestige = Math.max(0, sect.prestige - 1.2);
        app.appendLog(`${sect.name}粮草紧张，门内人心略有浮动。`, "warn");
      }
      if (sect.prestige >= sect.level * 18) {
        sect.level += 1;
        app.appendLog(`${sect.name}名望提升，宗门升至 ${sect.level} 级。`, "loot");
      }
    }
  }

  function processPlayerFactionTick() {
    const game = app.getGame();
    const playerFaction = getPlayerFaction();
    if (!playerFaction) return;
    if (playerFaction.eventCooldown > 0) playerFaction.eventCooldown -= 1;
    refreshPlayerFactionMissions(game.world.hour === 0);
    if (game.world.hour !== 0) return;
    const crew = playerFaction.crew || {};
    const branchTotal = Object.values(playerFaction.branches || {}).reduce((sum, value) => sum + value, 0);
    const upkeep = (crew.runners || 0) * 2 + (crew.guards || 0) * 2 + (crew.brokers || 0) + branchTotal * 2;
    const revenue = 6 + (crew.brokers || 0) * 5 + (playerFaction.branches.caravan || 0) * 7 + (playerFaction.members?.length || 0) * 3;
    const supplyDelta = 3 + (playerFaction.branches.safehouse || 0) * 3 - Math.max(1, Math.round(upkeep * 0.35));
    let territoryRevenue = 0;
    let controlledCount = 0;
    Object.values(game.world.territories || {}).forEach((territory) => {
      const location = tables.LOCATION_MAP[territory.locationId];
      if (!location) return;
      const watchCover = (playerFaction.branches.watch || 0) + Math.floor((crew.guards || 0) / 2);
      if (territory.controllerId === playerFaction.id) {
        controlledCount += 1;
        territoryRevenue += 4 + (location.marketTier || 0) * 3 + (isTradeHubLocation(location.id) ? 3 : 1) + (location.tags.includes("pass") ? 2 : 0);
        territory.playerInfluence = clamp(territory.playerInfluence - Math.max(1, Math.round(4 - watchCover * 0.35)), 0, 100);
        territory.stability = clamp(territory.stability + 1 + (playerFaction.branches.watch || 0), 10, 120);
        if (territory.playerInfluence < 38) {
          territory.controllerId = territory.incumbentId || null;
          app.appendLog(`${playerFaction.name}在${location.name}的脚跟松了，这条线又被地头势力夺了回去。`, "warn");
        }
        return;
      }
      if (territory.playerInfluence > 0) {
        const fade = Math.max(1, Math.round(territory.stability / 40) - Math.floor((playerFaction.branches.watch || 0) / 2));
        territory.playerInfluence = clamp(territory.playerInfluence - fade, 0, 100);
      }
    });
    playerFaction.treasury += Math.max(0, revenue - upkeep) + territoryRevenue;
    playerFaction.supplies = clamp(playerFaction.supplies + supplyDelta, 0, 180);
    playerFaction.influence += 0.6 + (playerFaction.branches.watch || 0) * 0.5 + controlledCount * 0.4;
    playerFaction.prestige += controlledCount * 0.25;
    if (playerFaction.supplies <= 10) {
      playerFaction.prestige = Math.max(0, playerFaction.prestige - 1);
      app.appendLog(`${playerFaction.name}补给吃紧，手下人做事开始慢了。`, "warn");
    }
    if (playerFaction.prestige >= playerFaction.level * 16) {
      playerFaction.level += 1;
      app.appendLog(`${playerFaction.name}的势力盘子越滚越稳，升到了 ${playerFaction.level} 级。`, "loot");
    }
  }

  function visitNpc(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc) return;
    const relation = getRelation(npcId);
    if (npc.locationId !== game.player.locationId) {
      app.appendLog(`${npc.name}目前在${tables.LOCATION_MAP[npc.locationId].name}，暂时见不到。`, "warn");
      if (app.render) app.render();
      return;
    }
    const attitude = relation.affinity > 20 ? "坦诚" : relation.affinity > 0 ? "平和" : "疏离";
    const cost = 10 + Math.max(0, relation.rivalry > 10 ? 8 : 0);
    if (game.player.money < cost) {
      app.appendLog("灵石不够备礼，对方并不想多聊。", "warn");
      return;
    }
    game.player.money -= cost;
    adjustRelation(npcId, {
      affinity: npc.mood.kindness > 58 ? 5 : 2,
      trust: 3,
      romance: npc.mood.kindness > 70 ? 1 : 0,
      rivalry: relation.role === "rival" ? -2 : 0,
    });
    app.appendLog(`你与${npc.name}在${tables.LOCATION_MAP[npc.locationId].name}交谈，对方态度${attitude}。`, "npc");
    if (Math.random() < 0.26) {
      const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "teaching" || entry.id === "gift"));
      app.appendLog(template.text.replaceAll("{npc}", npc.name), template.type);
      if (template.id === "gift") {
        app.addItemToInventory(sample(["mist-herb", "spirit-grain", "jade-spring"]), 1);
      }
      if (template.id === "teaching") {
        game.player.insight += 0.4;
      }
    }
    if (app.render) app.render();
  }

  Object.assign(app, {
    getRelation,
    adjustRelation,
    getCurrentAffiliation,
    getPlayerFaction,
    getFactionTypeLabel,
    isOfficialFaction,
    getLocationOfficialFactions,
    getGovernmentOfficeName,
    getRegionStanding,
    adjustRegionStanding,
    adjustFactionStanding,
    getAffiliationTasks,
    refreshAffiliationTasks,
    getAffiliationTaskIssues,
    explainAffiliationTask,
    canCompleteAffiliationTask,
    completeAffiliationTask,
    canJoinFaction,
    getFactionJoinIssues,
    explainFactionJoin,
    joinFaction,
    getCreatePlayerFactionIssues,
    explainCreatePlayerFaction,
    canCreatePlayerFaction,
    createPlayerFaction,
    getPlayerFactionMissions,
    refreshPlayerFactionMissions,
    getPlayerFactionMissionIssues,
    explainPlayerFactionMission,
    canCompletePlayerFactionMission,
    completePlayerFactionMission,
    getTerritoryState,
    getPlayerFactionTerritories,
    getPlayerFactionTerritoryTargets,
    getPlayerTerritoryModifier,
    getTerritoryCampaignIssues,
    explainTerritoryCampaign,
    canLaunchTerritoryCampaign,
    launchTerritoryCampaign,
    getTerritoryStabilizeIssues,
    explainStabilizeTerritory,
    canStabilizeTerritory,
    stabilizeTerritory,
    getRecruitFactionMemberIssues,
    explainRecruitFactionMember,
    canRecruitFactionMember,
    recruitFactionMember,
    upgradePlayerFactionBranch,
    getPlayerFactionTotalCrew,
    createSect,
    getSectMissions,
    refreshSectMissions,
    getSectMissionIssues,
    explainSectMission,
    canCompleteSectMission,
    completeSectMission,
    upgradeSectBuilding,
    canRecruitDisciple,
    getRecruitDiscipleIssues,
    explainRecruitDisciple,
    recruitDisciple,
    canBecomeMaster,
    getMasterBondIssues,
    explainMasterBond,
    becomeMasterBond,
    canBecomePartner,
    getPartnerBondIssues,
    explainPartnerBond,
    becomePartner,
    declareRival,
    assignTeaching,
    processRelationshipTick,
    processSectTick,
    processPlayerFactionTick,
    visitNpc,
    PLAYER_FACTION_BRANCHES,
  });
})();