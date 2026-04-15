(() => {
  const app = window.ShanHai;
  const { tables, utils, runtime } = app;
  const { MONSTER_TEMPLATES, MONSTER_AFFIXES, REALM_TEMPLATES, ITEMS } = tables;
  const { clamp, randomFloat, randomInt, sample, uid, round } = utils;

  type EnemyTemplate = ShanHaiEnemyTemplateInput | ShanHaiMonsterTemplate;

  function getCombat() {
    return app.getGame().combat;
  }

  function getAffix(affixId) {
    return MONSTER_AFFIXES.find((affix) => affix.id === affixId) || null;
  }

  function addCombatHistory(text, type = "info") {
    const combat = getCombat();
    combat.history.unshift({ text, type });
    if (combat.history.length > 24) {
      combat.history.length = 24;
    }
  }

  function chooseRewardItemByTypes(types) {
    const pool = ITEMS.filter((item) => types.includes(item.type));
    return sample(pool.length ? pool : ITEMS);
  }

  function buildEnemyFromTemplate(template: EnemyTemplate, options: ShanHaiEnemyBuildOptions = {}) {
    const game = app.getGame();
    const playerRank = game.player.rankIndex;
    const scale = 1 + playerRank * 0.16 + (options.danger || 0) * 0.08 + (options.boss ? 0.3 : 0);
    const affixIds = options.affixIds || [];
    const affixes = affixIds.map(getAffix).filter(Boolean);

    const enemy = {
      id: uid(options.boss ? "boss" : "enemy"),
      templateId: template.id || template.name,
      name: template.name,
      boss: Boolean(options.boss),
      realmId: options.realmId || null,
      regionId: options.regionId || null,
      affixIds,
      maxHp: Math.round(template.baseHp * scale),
      hp: Math.round(template.baseHp * scale),
      maxQi: Math.round((template.baseQi || 20) * (1 + (options.boss ? 0.18 : 0))),
      qi: Math.round((template.baseQi || 20) * (1 + (options.boss ? 0.18 : 0))),
      power: round(template.basePower * scale, 1),
      dodge: 0.04,
      defense: 0.04,
      crit: 0.05,
      burnOnHit: 0,
      chillOnHit: 0,
      qiBurn: 0,
      rewards: {
        money: Math.round((template.rewards?.money || 12) * scale),
        cultivation: round((template.rewards?.cultivation || 4) * (1 + playerRank * 0.08), 1),
        reputation: options.boss ? 5 + playerRank : Math.max(0, Math.round((options.danger || 1) * 0.3)),
        breakthrough: options.boss ? 8 + (options.danger || 0) : 1 + (options.danger || 0) * 0.5,
      },
      rewardItemIds: options.rewardItemIds || [],
      lootTypes: template.lootTypes || [],
      effects: {
        burn: 0,
        exposed: 0,
      },
    };

    affixes.forEach((affix) => {
      enemy.maxHp = Math.round(enemy.maxHp * (1 + (affix.mod.hp || 0)));
      enemy.hp = enemy.maxHp;
      enemy.power = round(enemy.power * (1 + (affix.mod.power || 0)), 1);
      enemy.dodge += affix.mod.dodge || 0;
      enemy.defense += affix.mod.defense || 0;
      enemy.crit += affix.mod.crit || 0;
      enemy.burnOnHit += affix.mod.burn || 0;
      enemy.chillOnHit += affix.mod.chill || 0;
      enemy.qiBurn += affix.mod.qiBurn || 0;
    });

    return enemy;
  }

  function generateEncounter(location: ShanHaiLocationData, options: ShanHaiEnemyBuildOptions = {}) {
    const templatePool = MONSTER_TEMPLATES.filter((monster) => monster.region === location.id);
    const template = sample(templatePool.length ? templatePool : MONSTER_TEMPLATES);
    const affixCount = options.boss ? 2 + Math.floor(location.danger / 3) : Math.min(2, Math.floor(location.danger / 3) + (Math.random() < 0.32 ? 1 : 0));
    const affixIds = [];
    while (affixIds.length < affixCount) {
      const affix = sample(MONSTER_AFFIXES);
      if (!affixIds.includes(affix.id)) affixIds.push(affix.id);
    }
    return buildEnemyFromTemplate(template, {
      ...options,
      regionId: location.id,
      danger: location.danger,
      affixIds,
    });
  }

  function startEncounter(source = "hunt") {
    const game = app.getGame();
    if (game.combat.currentEnemy) return game.combat.currentEnemy;
    const location = app.getCurrentLocation();
    const enemy = generateEncounter(location, { boss: false });
    game.combat.history = [];
    game.combat.currentEnemy = enemy;
    game.combat.autoBattle = true;
    game.combat.playerEffects = game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 };
    game.player.action = source;
    addCombatHistory(`你遭遇了${enemy.affixIds.length ? `${enemy.affixIds.map((id) => getAffix(id)?.label || "").join("、")}·` : ""}${enemy.name}。`, "warn");
    app.appendLog(`你在${location.name}遭遇${enemy.name}，战斗一触即发。`, "warn");
    return enemy;
  }

  function challengeRealm(realmId) {
    const game = app.getGame();
    const realm = app.getRealm(realmId);
    if (!realm) return;
    if (game.player.reputation < realm.unlockRep) {
      app.appendLog(`你的声望不足，尚无法进入${realm.name}。`, "warn");
      return;
    }
    if (game.player.locationId !== realm.locationId) {
      app.appendLog(`要挑战${realm.name}，你得先赶到${app.tables.LOCATION_MAP[realm.locationId].name}。`, "warn");
      return;
    }
    if (game.combat.currentEnemy) {
      app.appendLog("你仍在战斗中，无法直接转入首领秘境。", "warn");
      return;
    }
    const enemy = buildEnemyFromTemplate(
      {
        id: realm.id,
        name: realm.boss.name,
        baseHp: realm.boss.baseHp,
        basePower: realm.boss.basePower,
        baseQi: realm.boss.baseQi,
        rewards: { money: realm.rewards.money, cultivation: 16 },
        lootTypes: realm.rewards.items.map((itemId) => app.getItem(itemId)?.type).filter(Boolean),
      },
      {
        boss: true,
        realmId,
        regionId: realm.locationId,
        danger: app.tables.LOCATION_MAP[realm.locationId].danger + 1,
        affixIds: realm.boss.affixes,
        rewardItemIds: realm.rewards.items,
      },
    );
    game.combat.history = [];
    game.combat.currentEnemy = enemy;
    game.combat.pendingRealmId = realmId;
    game.combat.autoBattle = true;
    game.combat.playerEffects = game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 };
    addCombatHistory(`你踏入${realm.name}，${enemy.name}自深处现身。`, "warn");
    app.appendLog(`你闯入${realm.name}，与${enemy.name}正面相逢。`, "warn");
  }

  function getHealingItem() {
    const candidates = ["jade-spring", "mist-herb", "spirit-grain"];
    return candidates.find((itemId) => app.findInventoryEntry(itemId));
  }

  function applyOngoingEffects() {
    const game = app.getGame();
    const combat = game.combat;
    const enemy = combat.currentEnemy;
    if (!enemy) return;

    combat.playerEffects = combat.playerEffects || { burn: 0, guard: 0, chill: 0 };
    if (combat.playerEffects.burn > 0) {
      combat.playerEffects.burn -= 1;
      app.adjustResource("hp", -6, "maxHp");
      addCombatHistory("你身上的灼烧持续灼痛气血。", "warn");
    }
    if (enemy.effects.burn > 0) {
      enemy.effects.burn -= 1;
      enemy.hp = Math.max(0, enemy.hp - 8);
      addCombatHistory(`${enemy.name}被火劲反噬，气息一乱。`, "info");
    }
  }

  function computePlayerDamage(kind) {
    const base = app.getPlayerPower() + app.getGame().player.rankIndex * 4 + app.getPlayerInsight() * 0.28;
    const variance = randomFloat(0.88, 1.14);
    const skillMultiplier = kind === "skill" ? 1.55 : kind === "counter" ? 1.25 : 1;
    return Math.max(6, round(base * variance * skillMultiplier, 1));
  }

  function enemyReceivesDamage(enemy, rawDamage) {
    if (Math.random() < enemy.dodge) {
      addCombatHistory(`${enemy.name}身形一晃，避开了你的攻势。`, "warn");
      return 0;
    }
    const finalDamage = Math.max(5, round(rawDamage * (1 - enemy.defense), 1));
    enemy.hp = Math.max(0, enemy.hp - finalDamage);
    addCombatHistory(`你打中了${enemy.name}，造成${finalDamage}点伤害。`, "loot");
    return finalDamage;
  }

  function playerUseCombatItem() {
    const itemId = getHealingItem();
    if (!itemId) {
      app.adjustResource("hp", 6, "maxHp");
      app.adjustResource("qi", 4, "maxQi");
      addCombatHistory("你强行调息，勉强稳住了伤势。", "info");
      return;
    }
    const item = app.getItem(itemId);
    app.consumeItem(itemId);
    addCombatHistory(`你在战斗中服用了${item.name}。`, "info");
  }

  function tryFlee() {
    const game = app.getGame();
    const enemy = game.combat.currentEnemy;
    if (!enemy) return false;
    if (enemy.boss) {
      addCombatHistory("首领秘境已封锁退路，无法轻易脱身。", "warn");
      return false;
    }
    const success = Math.random() < 0.56 + app.getPlayerCharisma() / 200;
    if (success) {
      addCombatHistory(`你成功摆脱了${enemy.name}。`, "info");
      app.appendLog(`你从${enemy.name}手中脱身，暂避锋芒。`, "info");
      game.combat.currentEnemy = null;
      game.combat.pendingRealmId = null;
      return true;
    }
    addCombatHistory(`你试图脱身，却被${enemy.name}缠住。`, "warn");
    return false;
  }

  function enemyTurn(enemy) {
    const game = app.getGame();
    const effects = game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 };
    const guardMultiplier = effects.guard > 0 ? 0.58 : 1;
    const damage = Math.max(4, round(enemy.power * randomFloat(0.84, 1.12) * guardMultiplier, 1));
    app.adjustResource("hp", -damage, "maxHp");
    addCombatHistory(`${enemy.name}反击，令你损失${damage}点气血。`, "warn");
    if (enemy.qiBurn) {
      app.adjustResource("qi", -enemy.qiBurn, "maxQi");
    }
    if (enemy.burnOnHit) {
      effects.burn = Math.max(effects.burn, enemy.burnOnHit);
    }
    if (enemy.chillOnHit) {
      effects.chill = Math.max(effects.chill, enemy.chillOnHit);
      app.adjustResource("stamina", -enemy.chillOnHit, "maxStamina");
    }
    effects.guard = 0;
    game.combat.playerEffects = effects;
  }

  function resolveVictory(enemy) {
    const game = app.getGame();
    game.player.money += enemy.rewards.money;
    game.player.cultivation += enemy.rewards.cultivation;
    game.player.breakthrough += enemy.rewards.breakthrough;
    game.player.reputation += enemy.rewards.reputation;
    game.player.stats.enemiesDefeated += 1;

    const dropIds = enemy.rewardItemIds.length
      ? enemy.rewardItemIds
      : enemy.lootTypes.length
        ? [chooseRewardItemByTypes(enemy.lootTypes).id]
        : [];
    dropIds.forEach((itemId) => app.addItemToInventory(itemId, 1));

    if (enemy.boss) {
      game.player.stats.bossKills += 1;
      if (game.player.sect) {
        game.player.sect.prestige += app.getRealm(enemy.realmId)?.rewards.prestige || 0;
      }
      game.world.realm.bossVictories.push(enemy.realmId);
      game.world.realm.cooldown = 8;
      game.world.realm.activeRealmId = null;
      game.combat.pendingRealmId = null;
      app.appendLog(`你斩落${enemy.name}，秘境灵机尽归己身。`, "loot");
    } else {
      app.appendLog(`你击败${enemy.name}，战果已收入囊中。`, "loot");
    }

    addCombatHistory(`战斗结束，你赢下了这场厮杀。`, "loot");
    game.combat.lastResult = { outcome: "victory", enemy: enemy.name, boss: enemy.boss };
    game.combat.currentEnemy = null;
    game.combat.autoBattle = false;
    app.checkRankGrowth();
  }

  function resolveDefeat(enemy) {
    const game = app.getGame();
    addCombatHistory(`${enemy.name}将你逼入绝境，这一战败了。`, "warn");
    app.appendLog(`你败给了${enemy.name}，所幸留得性命。`, "warn");
    game.combat.lastResult = { outcome: "defeat", enemy: enemy.name, boss: enemy.boss };
    game.combat.currentEnemy = null;
    game.combat.pendingRealmId = null;
    game.combat.autoBattle = false;
    app.revivePlayer();
  }

  function processBattleRound(action = "attack") {
    const game = app.getGame();
    const enemy = game.combat.currentEnemy;
    if (!enemy) return;

    applyOngoingEffects();
    if (enemy.hp <= 0) {
      resolveVictory(enemy);
      return;
    }

    if (action === "flee" && tryFlee()) {
      return;
    }

    if (action === "defend") {
      game.combat.playerEffects = game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 };
      game.combat.playerEffects.guard = 1;
      addCombatHistory("你稳住身形，准备硬接下一击。", "info");
    } else if (action === "item") {
      playerUseCombatItem();
    } else {
      const useSkill = action === "skill" && app.getGame().player.qi >= 10;
      if (useSkill) {
        app.adjustResource("qi", -10, "maxQi");
      }
      const damage = computePlayerDamage(useSkill ? "skill" : "attack");
      enemyReceivesDamage(enemy, damage);
      if (useSkill && Math.random() < 0.22) {
        enemy.effects.burn = Math.max(enemy.effects.burn, 2);
      }
    }

    if (enemy.hp <= 0) {
      resolveVictory(enemy);
      return;
    }

    enemyTurn(enemy);
    if (app.getGame().player.hp <= 0) {
      resolveDefeat(enemy);
    }
  }

  function autoCombatTick() {
    const game = app.getGame();
    if (!game.combat.currentEnemy) return false;
    const preferred = game.player.qi >= 12 ? "skill" : "attack";
    processBattleRound(preferred);
    return true;
  }

  function maybeStartEncounter(actionKey) {
    const action = tables.ACTION_META[actionKey];
    if (!action || !action.reward.encounter) return false;
    if (app.getGame().combat.currentEnemy) return true;
    if (Math.random() < action.reward.encounter) {
      startEncounter(actionKey);
      return true;
    }
    return false;
  }

  Object.assign(app, {
    getCombat,
    getAffix,
    addCombatHistory,
    buildEnemyFromTemplate,
    generateEncounter,
    startEncounter,
    challengeRealm,
    processBattleRound,
    autoCombatTick,
    maybeStartEncounter,
  });
})();