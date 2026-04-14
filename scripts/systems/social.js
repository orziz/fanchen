(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { RELATION_ROLES, SECT_NAME_PARTS, SECT_BUILDINGS, SOCIAL_EVENT_TEMPLATES, SECT_EVENT_TEMPLATES } = tables;
  const { sample, clamp, randomInt, round } = utils;

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

  function getCurrentAffiliation() {
    return app.getFaction(app.getGame().player.affiliationId);
  }

  function adjustFactionStanding(factionId, amount) {
    const game = app.getGame();
    if (!factionId) return 0;
    game.player.factionStanding[factionId] = (game.player.factionStanding[factionId] || 0) + amount;
    if (game.world.factions[factionId]) {
      game.world.factions[factionId].standing = game.player.factionStanding[factionId];
      game.world.factions[factionId].favor += amount * 0.25;
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

  function canJoinFaction(factionId) {
    return getFactionJoinIssues(factionId).length === 0;
  }

  function getFactionJoinIssues(factionId) {
    const game = app.getGame();
    const faction = app.getFaction(factionId);
    if (!faction) return ["这方势力暂时无法接触。"];
    const issues = [];
    if (game.player.affiliationId === factionId) issues.push("你已经在这方势力中");
    if (game.player.locationId !== faction.locationId) issues.push(`需前往${app.tables.LOCATION_MAP[faction.locationId]?.name || faction.locationId}`);
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
      const tribute = 8 + sect.disciples.length * 6 + sect.buildings.market * 6;
      sect.treasury += tribute;
      sect.food = clamp(sect.food + 6 + sect.disciples.length, 0, 200);
      if (tribute > 0) {
        const template = sample(SECT_EVENT_TEMPLATES.filter((entry) => entry.id === "tribute"));
        app.appendLog(template.text.replaceAll("{value}", String(tribute)), template.type);
      }
      if (sect.prestige >= sect.level * 18) {
        sect.level += 1;
        app.appendLog(`${sect.name}名望提升，宗门升至 ${sect.level} 级。`, "loot");
      }
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
    adjustFactionStanding,
    canJoinFaction,
    getFactionJoinIssues,
    explainFactionJoin,
    joinFaction,
    createSect,
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
    visitNpc,
  });
})();