(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { LOCATIONS, LOCATION_MAP } = tables;
  const { randomFloat, sample } = utils;

  const TRADE_CARGO_LABELS = {
    herb: "药材货包",
    grain: "粮货担子",
    wood: "木料货排",
    ore: "矿货车板",
    cloth: "布匹行箱",
    relic: "奇货匣",
    fire: "火材箱",
    scroll: "残卷匣",
    pill: "丹药匣",
    ice: "寒材箱",
  };

  function rerender() {
    if (app.render) app.render();
  }

  function findRoute(startId, endId) {
    if (startId === endId) return [startId];
    const queue = [[startId]];
    const visited = new Set([startId]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      const location = LOCATION_MAP[last];
      for (const neighborId of location.neighbors) {
        if (visited.has(neighborId)) continue;
        const nextPath = [...path, neighborId];
        if (neighborId === endId) return nextPath;
        visited.add(neighborId);
        queue.push(nextPath);
      }
    }
    return null;
  }

  function currentLocationCanReach(targetId) {
    return Boolean(findRoute(app.getCurrentLocation().id, targetId));
  }

  function isTradeHub(location) {
    return Boolean(location && (location.tags.includes("market") || location.tags.includes("port") || location.tags.includes("town") || location.tags.includes("pass")));
  }

  function getActiveTradeRun() {
    return app.getGame().player.tradeRun || null;
  }

  function getTradeRouteOptions(locationId = app.getGame().player.locationId) {
    const game = app.getGame();
    const origin = LOCATION_MAP[locationId];
    if (!origin || !isTradeHub(origin)) return [];

    return LOCATIONS
      .filter((destination) => destination.id !== origin.id && isTradeHub(destination))
      .map((destination) => {
        const path = findRoute(origin.id, destination.id);
        if (!path) return null;
        const segments = Math.max(1, path.length - 1);
        const cargoLabel = TRADE_CARGO_LABELS[origin.marketBias] || `${origin.resource}货`;
        const originTerritoryBonus = app.getPlayerTerritoryModifier?.(origin.id) || 0;
        const destinationTerritoryBonus = app.getPlayerTerritoryModifier?.(destination.id) || 0;
        const purchaseCost = Math.round((88 + origin.marketTier * 32 + segments * 22 + (origin.tags.includes("port") ? 14 : 0)) * (1 - originTerritoryBonus * 0.35));
        const demandBonus = destination.marketBias === origin.marketBias ? 0.05 : 0.16;
        const courtBonus = destination.tags.includes("court") ? 0.04 : 0;
        const saleEstimate = Math.round(purchaseCost * (1.1 + segments * 0.05 + demandBonus * 0.6 + courtBonus + destination.marketTier * 0.025 + destinationTerritoryBonus * 0.7 + originTerritoryBonus * 0.3));
        return {
          id: `${origin.id}-${destination.id}`,
          originId: origin.id,
          originName: origin.name,
          destinationId: destination.id,
          destinationName: destination.name,
          cargoLabel,
          segments,
          purchaseCost,
          saleEstimate,
          profitEstimate: saleEstimate - purchaseCost,
          localStanding: app.getRegionStanding?.(destination.id) || 0,
          affordable: game.player.money >= purchaseCost,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.profitEstimate - left.profitEstimate)
      .slice(0, 4);
  }

  function startTradeRun(destinationId) {
    const game = app.getGame();
    const route = getTradeRouteOptions().find((entry) => entry.destinationId === destinationId);
    if (!route) {
      app.appendLog("当前没有合适的跑商货路。", "warn");
      return false;
    }
    if (getActiveTradeRun()) {
      app.appendLog("你已经压着一批货了，先把这一趟交割完。", "warn");
      return false;
    }
    if (game.player.money < route.purchaseCost) {
      app.appendLog(`压货还差${route.purchaseCost - game.player.money}灵石。`, "warn");
      return false;
    }

    game.player.money -= route.purchaseCost;
    game.player.tradeRun = {
      id: route.id,
      originId: route.originId,
      originName: route.originName,
      destinationId: route.destinationId,
      destinationName: route.destinationName,
      cargoLabel: route.cargoLabel,
      purchaseCost: route.purchaseCost,
      saleEstimate: route.saleEstimate,
      segments: route.segments,
      startedDay: game.world.day,
    };
    app.adjustRegionStanding?.(route.originId, 0.8);
    app.appendLog(`你在${route.originName}压下${route.cargoLabel}，准备跑往${route.destinationName}。`, "info");
    app.travelTo(route.destinationId);
    if (game.player.locationId === route.destinationId) {
      app.appendLog(`货队已抵达${route.destinationName}，可以立即交割。`, "info");
    }
    return true;
  }

  function settleTradeRun() {
    const game = app.getGame();
    const tradeRun = getActiveTradeRun();
    if (!tradeRun) {
      app.appendLog("你手里暂时没有在途货路。", "warn");
      return false;
    }
    if (game.player.locationId !== tradeRun.destinationId) {
      app.appendLog(`这批货要送到${tradeRun.destinationName}才好交割。`, "warn");
      return false;
    }

    const localStanding = app.getRegionStanding?.(tradeRun.destinationId) || 0;
    const fluctuation = randomFloat(0.94, 1.12);
    const revenue = Math.max(
      tradeRun.purchaseCost + 8,
      Math.round(tradeRun.saleEstimate * (1 + game.player.skills.trading * 0.008 + localStanding * 0.008) * fluctuation),
    );
    const profit = revenue - tradeRun.purchaseCost;

    game.player.money += revenue;
    game.player.skills.trading += 0.55 + tradeRun.segments * 0.06;
    game.player.stats.tradesCompleted += 2;
    game.player.stats.tradeRoutesCompleted += 1;
    app.adjustRegionStanding?.(tradeRun.originId, 0.5);
    app.adjustRegionStanding?.(tradeRun.destinationId, 1 + tradeRun.segments * 0.15);
    app.adjustFactionStanding?.(game.player.affiliationId, 1.1);
    app.appendLog(`你在${tradeRun.destinationName}交割${tradeRun.cargoLabel}，净赚${profit}灵石。`, "loot");
    game.player.tradeRun = null;
    return true;
  }

  function advanceTradeRun() {
    const tradeRun = getActiveTradeRun();
    if (!tradeRun) return "none";
    if (app.getGame().player.locationId !== tradeRun.destinationId) {
      app.travelTo(tradeRun.destinationId);
      return "traveling";
    }
    return settleTradeRun() ? "settled" : "none";
  }

  function maybeStartBestTradeRun() {
    const route = getTradeRouteOptions().find((entry) => entry.affordable);
    if (!route) return false;
    return startTradeRun(route.destinationId);
  }

  function resolvePassiveTrade() {
    const game = app.getGame();
    const market = game.market[game.player.locationId] || [];
    if (!market.length) return;
    const listing = sample(market);
    const item = app.getItem(listing.itemId);
    if (!item) return;
    const territoryBonus = app.getPlayerTerritoryModifier?.(game.player.locationId) || 0;
    const margin = Math.max(1, Math.round(listing.price * randomFloat(0.015, 0.04 + territoryBonus * 0.12)));
    game.player.money += margin;
    game.player.stats.tradesCompleted += 1;
    game.player.skills.trading += 0.08;
    app.adjustRegionStanding?.(game.player.locationId, 0.35);
    app.adjustFactionStanding?.(game.player.affiliationId, 0.45);
    app.appendLog(`你顺手倒卖${item.name}，净赚${margin}灵石。`, "info");
  }

  function buyListing(listingId) {
    const game = app.getGame();
    const market = game.market[game.player.locationId] || [];
    const listing = market.find((entry) => entry.listingId === listingId);
    if (!listing) return;
    if (game.player.money < listing.price) {
      app.appendLog("灵石不足，买不起这件货。", "warn");
      return;
    }
    game.player.money -= listing.price;
    app.addItemToInventory(listing.itemId, listing.quantity);
    game.player.stats.tradesCompleted += 1;
    app.adjustRegionStanding?.(game.player.locationId, 0.4);
    app.appendLog(`你购入${app.getItem(listing.itemId)?.name || "货物"} x${listing.quantity}。`, "loot");
    game.market[game.player.locationId] = market.filter((entry) => entry !== listing);
    rerender();
  }

  Object.assign(app, {
    findRoute,
    currentLocationCanReach,
    isTradeHub,
    getActiveTradeRun,
    getTradeRouteOptions,
    startTradeRun,
    settleTradeRun,
    advanceTradeRun,
    maybeStartBestTradeRun,
    resolvePassiveTrade,
    buyListing,
  });
})();