(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { clamp, randomInt, round } = utils;
  const social = app.socialInternals;

  function getPlayerFactionTerritories() {
    const playerFaction = app.getPlayerFaction();
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
          controllerName: social.getTerritoryControllerName(territory),
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.isControlled) - Number(left.isControlled)
        || right.playerInfluence - left.playerInfluence
        || (right.location.marketTier || 0) - (left.location.marketTier || 0));
  }

  function getPlayerFactionTerritoryTargets() {
    const playerFaction = app.getPlayerFaction();
    if (!playerFaction) return [];
    const current = tables.LOCATION_MAP[app.getGame().player.locationId];
    const candidateIds = new Set(getPlayerFactionTerritories().map((entry) => entry.locationId));
    [current.id, ...(current.neighbors || [])].forEach((locationId) => candidateIds.add(locationId));
    return [...candidateIds]
      .map((locationId) => {
        const location = tables.LOCATION_MAP[locationId];
        if (!location) return null;
        const territory = app.getTerritoryState(locationId);
        const isControlled = territory.controllerId === playerFaction.id;
        if (!isControlled && territory.playerInfluence <= 0
          && !app.isTradeHubLocation(locationId)
          && !location.tags.includes("court")
          && !location.tags.includes("pass")
          && !location.tags.includes("sect")) {
          return null;
        }
        return {
          ...territory,
          location,
          isControlled,
          controllerName: social.getTerritoryControllerName(territory),
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.isControlled) - Number(left.isControlled)
        || Number(right.location.id === current.id) - Number(left.location.id === current.id)
        || (right.location.marketTier || 0) - (left.location.marketTier || 0));
  }

  function getPlayerTerritoryModifier(locationId) {
    const playerFaction = app.getPlayerFaction();
    if (!playerFaction) return 0;
    const territory = app.getTerritoryState(locationId);
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
    const playerFaction = app.getPlayerFaction();
    const territory = app.getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    const cost = getTerritoryCampaignBaseCost(locationId);
    if (!playerFaction || !location) return ["眼下还没有可争的地盘。"];
    const issues = [];
    if (game.player.locationId !== locationId) issues.push(`需先前往${location.name}`);
    if (territory.controllerId === playerFaction.id) issues.push("这块地盘已经在你手里了");
    if (social.getFactionLiquidFunds() < cost.money) issues.push(`银钱不足，还差${cost.money - social.getFactionLiquidFunds()}`);
    if (playerFaction.supplies < cost.supplies) issues.push(`补给不足，还差${cost.supplies - playerFaction.supplies}`);
    if (game.player.stamina < cost.stamina) issues.push(`体力不足，还差${cost.stamina - game.player.stamina}`);
    if ((playerFaction.crew?.guards || 0) < cost.guardNeed) issues.push(`护手不够，还差${cost.guardNeed - (playerFaction.crew?.guards || 0)}`);
    if ((playerFaction.crew?.runners || 0) < cost.runnerNeed) issues.push(`跑线人手不够，还差${cost.runnerNeed - (playerFaction.crew?.runners || 0)}`);
    if (location.tags.includes("court") && app.getRegionStanding(locationId) < 6) issues.push(`本地声望太浅，还差${round(6 - app.getRegionStanding(locationId), 1)}`);
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
    const playerFaction = app.getPlayerFaction();
    const territory = app.getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    const cost = getTerritoryCampaignBaseCost(locationId);
    if (!playerFaction || !location || !canLaunchTerritoryCampaign(locationId)) {
      app.appendLog("这条地盘眼下还抢不下来。", "warn");
      return;
    }
    social.spendFactionLiquidFunds(cost.money);
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
      + app.getRegionStanding(locationId) * 1.3;
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
      app.adjustRegionStanding(locationId, 1.2);
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
    app.appendLog(`你在${location.name}试着争路，却被${social.getTerritoryControllerName(territory)}压了回来。`, "warn");
  }

  function getTerritoryStabilizeIssues(locationId) {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction();
    const territory = app.getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    if (!playerFaction || !location) return ["眼下没有可稳固的地盘。"];
    const issues = [];
    const moneyCost = 38 + (location.marketTier || 0) * 12;
    const suppliesCost = 5 + (location.tags.includes("pass") ? 2 : 0);
    if (game.player.locationId !== locationId) issues.push(`需先前往${location.name}`);
    if (territory.controllerId !== playerFaction.id && territory.playerInfluence <= 0) issues.push("你在这里还没有站住脚");
    if (social.getFactionLiquidFunds() < moneyCost) issues.push(`银钱不足，还差${moneyCost - social.getFactionLiquidFunds()}`);
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
    const playerFaction = app.getPlayerFaction();
    const territory = app.getTerritoryState(locationId);
    const location = tables.LOCATION_MAP[locationId];
    if (!playerFaction || !location || !canStabilizeTerritory(locationId)) {
      app.appendLog("这块地盘眼下还稳不下来。", "warn");
      return;
    }
    const moneyCost = 38 + (location.marketTier || 0) * 12;
    const suppliesCost = 5 + (location.tags.includes("pass") ? 2 : 0);
    social.spendFactionLiquidFunds(moneyCost);
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

  Object.assign(app, {
    canLaunchTerritoryCampaign,
    canStabilizeTerritory,
    explainStabilizeTerritory,
    explainTerritoryCampaign,
    getPlayerFactionTerritories,
    getPlayerFactionTerritoryTargets,
    getPlayerTerritoryModifier,
    getTerritoryCampaignIssues,
    getTerritoryStabilizeIssues,
    launchTerritoryCampaign,
    stabilizeTerritory,
  });
})();
