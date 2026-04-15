(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { clamp, round, randomInt } = utils;
  const social = app.socialInternals;

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

  function getPlayerFactionMissions() {
    const playerFaction = app.getPlayerFaction();
    if (!playerFaction) return [];
    playerFaction.missions = Array.isArray(playerFaction.missions) ? playerFaction.missions : [];
    return playerFaction.missions;
  }

  function buildPlayerFactionRouteMission(playerFaction) {
    return social.createTask("playerFaction", "route", {
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
    return social.createTask("playerFaction", "recruit", {
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
    return social.createTask("playerFaction", "office", {
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
    const playerFaction = app.getPlayerFaction();
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

  function createPlayerFaction() {
    const game = app.getGame();
    if (!canCreatePlayerFaction()) {
      app.appendLog("现在还扛不起自建势力的盘子。", "warn");
      return;
    }
    const name = social.createFactionName();
    game.player.money -= 900;
    game.player.playerFaction = app.createInitialPlayerFaction(name);
    game.player.playerFaction.foundedDay = game.world.day;
    game.player.playerFaction.headquartersLocationId = game.player.locationId;
    game.player.playerFaction.treasury = 180;
    game.player.playerFaction.supplies = 42;
    game.player.playerFaction.influence = 8;
    const territory = app.getTerritoryState(game.player.locationId);
    territory.playerInfluence = Math.max(territory.playerInfluence, 28);
    if (!territory.controllerId) {
      territory.controllerId = game.player.playerFaction.id;
    }
    refreshPlayerFactionMissions(true);
    app.appendLog(`你在${app.getCurrentLocation().name}拉起了自己的势力“${name}”。`, "loot");
  }

  function upgradePlayerFactionBranch(branchKey) {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction();
    const branch = app.PLAYER_FACTION_BRANCHES[branchKey];
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
    const playerFaction = app.getPlayerFaction();
    const npc = app.getNpc(npcId);
    const relation = app.getRelation(npcId);
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
    const playerFaction = app.getPlayerFaction();
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
    app.adjustRelation(npcId, { affinity: 4, trust: 6 });
    game.player.stats.factionMembersRecruited += 1;
    app.appendLog(`${npc.name}改投${playerFaction.name}，成了你麾下的骨干。`, "loot");
  }

  function getPlayerFactionMissionIssues(missionId) {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction();
    const mission = getPlayerFactionMissions().find((entry) => entry.id === missionId);
    if (!playerFaction || !mission) return ["这份势力任务已经失效。"];
    const issues = [];
    if (mission.kind === "route") {
      if (!app.isTradeHubLocation(game.player.locationId)) issues.push("要在市镇、港口或驿路上才能压这条货线");
      if (game.player.money < mission.moneyCost) issues.push(`灵石不足，还差${mission.moneyCost - game.player.money}`);
      if ((playerFaction.supplies || 0) < mission.suppliesCost) issues.push(`补给不足，还差${mission.suppliesCost - playerFaction.supplies}`);
      if ((playerFaction.crew?.runners || 0) < mission.runnerNeed) issues.push(`脚夫不够，还差${mission.runnerNeed - (playerFaction.crew?.runners || 0)}`);
    }
    if (mission.kind === "recruit") {
      if (game.player.money < mission.moneyCost) issues.push(`招募本钱不足，还差${mission.moneyCost - game.player.money}`);
    }
    if (mission.kind === "office") {
      if (!app.getGovernmentOfficeName(game.player.locationId)) issues.push("要在有官衙驻点的地方才能打点");
      if (game.player.money < mission.moneyCost) issues.push(`打点银不足，还差${mission.moneyCost - game.player.money}`);
      if (app.getRegionStanding(game.player.locationId) < mission.standingNeed) issues.push(`本地声望不足，还差${round(mission.standingNeed - app.getRegionStanding(game.player.locationId), 1)}`);
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
    const playerFaction = app.getPlayerFaction();
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
      app.adjustRegionStanding(game.player.locationId, mission.rewardRegion);
    }
    game.player.stats.factionTasksCompleted += 1;
    playerFaction.missions = missions.filter((entry) => entry.id !== missionId);
    app.appendLog(`你替${playerFaction.name}办妥“${mission.title}”，摊子又往外伸了一截。`, "loot");
  }

  function processPlayerFactionTick() {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction();
    if (!playerFaction) return;
    if (playerFaction.eventCooldown > 0) playerFaction.eventCooldown -= 1;
    refreshPlayerFactionMissions(game.world.hour === 0);
    if (game.world.hour !== 0) return;
    const crew = playerFaction.crew || ({ runners: 0, guards: 0, brokers: 0 } as ShanHaiPlayerFactionCrew);
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
        territoryRevenue += 4 + (location.marketTier || 0) * 3 + (app.isTradeHubLocation(location.id) ? 3 : 1) + (location.tags.includes("pass") ? 2 : 0);
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

  Object.assign(app, {
    canCompletePlayerFactionMission,
    canCreatePlayerFaction,
    canRecruitFactionMember,
    completePlayerFactionMission,
    createPlayerFaction,
    explainCreatePlayerFaction,
    explainPlayerFactionMission,
    explainRecruitFactionMember,
    getCreatePlayerFactionIssues,
    getPlayerFactionMissionIssues,
    getPlayerFactionMissions,
    getRecruitFactionMemberIssues,
    processPlayerFactionTick,
    recruitFactionMember,
    refreshPlayerFactionMissions,
    upgradePlayerFactionBranch,
  });
})();
