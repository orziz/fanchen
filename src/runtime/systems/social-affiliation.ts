(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { round } = utils;
  const social = app.socialInternals;

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
    return social.createTask("affiliation", "supply", {
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
    return social.createTask("affiliation", "patrol", {
      factionId: faction.id,
      title: `${faction.name}值役巡查`,
      desc: `回${tables.LOCATION_MAP[faction.locationId]?.name || faction.locationId}跑一趟值役，把门路站稳。`,
      staminaCost: app.isOfficialFaction(faction) ? 16 : 12,
      qiCost: app.isOfficialFaction(faction) ? 4 : 2,
      rewardMoney: 28 + faction.joinRequirement.rankIndex * 12,
      rewardReputation: 0.8,
      rewardStanding: 2.2,
      rewardRegion: 0.6,
    });
  }

  function buildAffiliationLiaisonTask(faction) {
    return social.createTask("affiliation", "liaison", {
      factionId: faction.id,
      title: `${faction.name}疏通门路`,
      desc: `备一笔人情与路费，替${faction.name}去打点本地往来。`,
      moneyCost: 36 + faction.joinRequirement.money,
      standingNeed: app.isOfficialFaction(faction) ? 5 : 3,
      rewardMoney: 20,
      rewardReputation: 1.4,
      rewardStanding: 3.4,
      rewardRegion: 1.2,
    });
  }

  function refreshAffiliationTasks(force = false) {
    const game = app.getGame();
    const faction = app.getCurrentAffiliation();
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
      const localStanding = app.getRegionStanding(faction.locationId);
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
    app.adjustFactionStanding(task.factionId, task.rewardStanding);
    app.adjustRegionStanding(app.getFaction(task.factionId)?.locationId || game.player.locationId, task.rewardRegion);
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
    const previous = app.getCurrentAffiliation();
    game.player.affiliationId = factionId;
    game.player.affiliationRank = 0;
    game.player.factionStanding[factionId] = Math.max(game.player.factionStanding[factionId] || 0, 8);
    app.adjustRegionStanding(faction.locationId, 2.4);
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

  Object.assign(app, {
    canCompleteAffiliationTask,
    canJoinFaction,
    completeAffiliationTask,
    explainAffiliationTask,
    explainFactionJoin,
    getAffiliationTaskIssues,
    getAffiliationTasks,
    getFactionJoinIssues,
    joinFaction,
    refreshAffiliationTasks,
  });
})();
