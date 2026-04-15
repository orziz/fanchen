(() => {
  const app = window.ShanHai;
  const { tables, utils, state } = app;
  const {
    LOCATION_MAP,
    TRAVEL_EVENT_TEMPLATES,
  } = tables;
  const { sample, randomInt } = utils;

  function fillTemplate(text, payload) {
    return Object.entries(payload).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), text);
  }

  function triggerTravelEvent(location) {
    const game = app.getGame();
    const event = sample(TRAVEL_EVENT_TEMPLATES);
    if (event.kind === "money") {
      const value = randomInt(12, 28);
      game.player.money += value;
      app.appendLog(fillTemplate(event.text, { location: location.name, value }), "loot");
      return;
    }
    if (event.kind === "item") {
      const item = sample(
        location.marketBias
          ? tables.ITEMS.filter((entry) => entry.tier <= (location.marketTier || 0) + 1 && (entry.type === location.marketBias || Math.random() < 0.25))
          : tables.ITEMS.filter((entry) => entry.tier <= (location.marketTier || 0) + 1),
      );
      app.addItemToInventory(item.id, 1);
      app.appendLog(fillTemplate(event.text, { terrain: location.terrain, item: item.name }), "loot");
      return;
    }
    app.adjustResource("hp", -randomInt(4, 10), "maxHp");
    app.adjustResource("qi", -randomInt(2, 8), "maxQi");
    game.player.breakthrough += 1.5;
    app.appendLog(event.text, "warn");
  }

  function travelTo(locationId) {
    const game = app.getGame();
    if (locationId === game.player.locationId) return;
    const current = app.getCurrentLocation();
    const target = LOCATION_MAP[locationId];
    if (!target) return;
    const path = app.findRoute(current.id, locationId);
    if (!path) {
      app.appendLog(`从${current.name}无法直接前往${target.name}。`, "warn");
      return;
    }
    const segments = Math.max(1, path.length - 1);
    const via = path.slice(1, -1).map((id) => LOCATION_MAP[id].short).join("、");
    game.player.locationId = locationId;
    game.player.action = sample(target.actions);
    app.adjustResource("stamina", -6 * segments, "maxStamina");
    app.adjustResource("qi", -3 * segments, "maxQi");
    app.adjustRegionStanding?.(locationId, 0.3 + segments * 0.1);
    state.selectedLocationId = locationId;
    app.appendLog(via ? `你踏上旅途，经由${via}抵达${target.name}。` : `你踏上旅途，很快抵达了${target.name}。`, "info");
    for (let index = 0; index < segments; index += 1) {
      if (Math.random() < 0.24 + segments * 0.04) {
        triggerTravelEvent(target);
      }
    }
    if (app.render) app.render();
  }

  function travelAndAct(locationId, action) {
    travelTo(locationId);
    if (app.getGame().player.locationId === locationId) {
      performAction(action);
    }
  }

  function chooseAutoAction() {
    const game = app.getGame();
    const location = app.getCurrentLocation();
    const mode = game.player.mode;

    if (mode === "manual") {
      return null;
    }

    if (game.combat.currentEnemy) {
      return game.combat.autoBattle ? "combat" : null;
    }
    if (game.player.hp < game.player.maxHp * 0.42 || game.player.qi < game.player.maxQi * 0.32) {
      return "meditate";
    }
    if (game.player.breakthrough >= app.getNextBreakthroughNeed() * 0.92 && location.actions.includes("breakthrough")) {
      return "breakthrough";
    }
    if (mode === "cultivation") {
      if (location.aura < 42 && Math.random() < 0.34) {
        const better = location.neighbors.map((id) => LOCATION_MAP[id]).sort((left, right) => right.aura - left.aura)[0];
        if (better && better.aura > location.aura) travelTo(better.id);
      }
      return location.actions.includes("meditate") ? "meditate" : location.actions[0];
    }
    if (mode === "merchant") {
      const tradeRun = app.getActiveTradeRun();
      if (tradeRun) {
        if (location.id !== tradeRun.destinationId) {
          travelTo(tradeRun.destinationId);
        }
        return "trade";
      }
      if (!app.isTradeHub(location) && Math.random() < 0.42) {
        const target = ["anping", "lantern", "blackforge", "reedbank", "yanpass", "yunze"].find((id) => app.currentLocationCanReach(id));
        if (target) travelTo(target);
      }
      return location.actions.includes("trade") ? "trade" : location.actions[0];
    }
    if (mode === "adventure") {
      if (location.danger < 4 && Math.random() < 0.36) {
        const riskier = location.neighbors.map((id) => LOCATION_MAP[id]).sort((left, right) => right.danger - left.danger)[0];
        if (riskier && riskier.danger > location.danger) travelTo(riskier.id);
      }
      return location.actions.includes("quest") ? "quest" : location.actions.includes("hunt") ? "hunt" : location.actions[0];
    }
    if (mode === "sect" && game.player.sect) {
      if (!location.tags.includes("sect") && app.currentLocationCanReach("jadegate") && Math.random() < 0.3) {
        travelTo("jadegate");
      }
      return location.actions.includes("sect") ? "sect" : "meditate";
    }
    const sequence = ["meditate", "trade", "hunt", "quest", "train"];
    return sequence.find((action) => location.actions.includes(action)) || location.actions[0];
  }

  function processActionActionKey(actionKey) {
    if (!actionKey) return;
    if (actionKey === "combat") {
      app.autoCombatTick();
      return;
    }
    if (actionKey === "breakthrough") {
      app.attemptBreakthrough();
      return;
    }
    if (actionKey === "sect") {
      app.applyPassiveAction("sect");
      if (app.getGame().player.sect) {
        app.getGame().player.sect.treasury += 8 + app.getGame().player.sect.buildings.market * 4;
        app.getGame().player.sect.prestige += 0.6;
      }
      return;
    }

    app.applyPassiveAction(actionKey);
    if (actionKey === "trade") {
      const tradeStatus = app.advanceTradeRun();
      if (tradeStatus === "settled" || tradeStatus === "traveling") {
        return;
      }
      if (app.getGame().player.mode === "merchant" && app.maybeStartBestTradeRun()) {
        return;
      }
      app.resolvePassiveTrade();
      app.adjustFactionStanding?.(app.getGame().player.affiliationId, 1);
    }
    if (actionKey === "auction") app.resolveAuctionVisit();
    if (["hunt", "quest"].includes(actionKey)) {
      if (actionKey === "quest") {
        app.getGame().player.stats.questsFinished += 1;
      }
      app.adjustFactionStanding?.(app.getGame().player.affiliationId, actionKey === "quest" ? 1.2 : 0.8);
      const started = app.maybeStartEncounter(actionKey);
      if (!started) {
        const item = sample(tables.ITEMS.filter((entry) => entry.tier <= (app.getCurrentLocation().marketTier || 0) + 1 && (entry.type === app.getCurrentLocation().marketBias || Math.random() < 0.2)));
        if (Math.random() < 0.42) {
          app.addItemToInventory(item.id, 1);
          app.appendLog(`你在${app.getCurrentLocation().name}一带收获了${item.name}。`, "loot");
        }
      } else {
        app.autoCombatTick();
      }
    }
  }

  function performAction(actionKey) {
    processActionActionKey(actionKey);
    tickWorld();
    if (app.render) app.render();
  }

  function tickWorld() {
    const game = app.getGame();
    game.world.subStep += 1;
    if (game.world.subStep >= 2) {
      game.world.subStep = 0;
      game.world.hour = (game.world.hour + 1) % tables.TIME_LABELS.length;
      if (game.world.hour === 0) {
        game.world.day += 1;
        game.world.weather = sample(["晴", "微雨", "大风", "寒霜", "雾起", "雷暴"]);
        game.world.omen = sample(["星辉平稳", "灵潮暗涌", "海雾倒卷", "山门钟鸣", "赤霞流火", "北斗失位"]);
      }
      app.resolveAuctionTurn();
      app.refreshMarketIfNeeded();
      app.maybeActivateRealm();
      app.processRelationshipTick();
      app.processSectTick();
      app.processPlayerFactionTick?.();
      app.processIndustryTick?.();
      if (game.world.hour === 0) {
        app.processNpcLifeTick();
      }
    }

    app.runNpcAI();
  }

  function gameStep() {
    const game = app.getGame();
    const action = chooseAutoAction();
    if (!action) {
      if (game.player.mode === "manual") {
        tickWorld();
        if (game.player.hp <= 0) {
          app.revivePlayer();
        }
      }
      if (app.render) app.render();
      return;
    }
    performAction(action);
    if (game.player.hp <= 0) {
      app.revivePlayer();
    }
  }

  Object.assign(app, {
    travelTo,
    travelAndAct,
    chooseAutoAction,
    performAction,
    tickWorld,
    gameStep,
  });
})();