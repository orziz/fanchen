(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { SECT_BUILDINGS, SECT_EVENT_TEMPLATES } = tables;
  const { sample, clamp, round } = utils;
  const social = app.socialInternals;

  function getSectMissions() {
    const sect = app.getGame().player.sect;
    if (!sect) return [];
    sect.missions = Array.isArray(sect.missions) ? sect.missions : [];
    return sect.missions;
  }

  function buildSectGranaryMission(sect) {
    return social.createTask("sect", "granary", {
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
    return social.createTask("sect", "lecture", {
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
    return social.createTask("sect", "recruit", {
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
    const name = social.createSectName();
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
    const relation = app.getRelation(npcId);
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
    app.adjustRelation(npcId, { role: "apprentice", affinity: 8, trust: 10 });
    game.player.sect.prestige += 3;
    app.appendLog(`${npc.name}正式拜入${game.player.sect.name}，成为门下弟子。`, "loot");
  }

  function canBecomeMaster(npcId) {
    return getMasterBondIssues(npcId).length === 0;
  }

  function getMasterBondIssues(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    const relation = app.getRelation(npcId);
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
    app.adjustRelation(npcId, { role: "master", affinity: 6, trust: 8 });
    app.appendLog(`${npc.name}收你为门下弟子，今后可获更多指点。`, "loot");
  }

  function canBecomePartner(npcId) {
    return getPartnerBondIssues(npcId).length === 0;
  }

  function getPartnerBondIssues(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    const relation = app.getRelation(npcId);
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
    app.adjustRelation(npcId, { role: "partner", affinity: 8, trust: 8, romance: 10 });
    if (app.findInventoryEntry("bond-token")) {
      app.removeItemFromInventory("bond-token", 1);
    }
    app.appendLog(`你与${npc.name}互许道心，正式结为道侣。`, "loot");
  }

  function declareRival(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc) return;
    const relation = app.getRelation(npcId);
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
          app.appendLog(template.text.split("{npc}").join(npc.name), template.type);
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
        app.appendLog(template.text.split("{value}").join(String(tribute)), template.type);
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

  Object.assign(app, {
    assignTeaching,
    becomeMasterBond,
    becomePartner,
    canBecomeMaster,
    canBecomePartner,
    canCompleteSectMission,
    canRecruitDisciple,
    completeSectMission,
    createSect,
    declareRival,
    explainMasterBond,
    explainPartnerBond,
    explainRecruitDisciple,
    explainSectMission,
    getMasterBondIssues,
    getPartnerBondIssues,
    getRecruitDiscipleIssues,
    getSectMissionIssues,
    getSectMissions,
    processSectTick,
    recruitDisciple,
    refreshSectMissions,
    upgradeSectBuilding,
  });
})();
