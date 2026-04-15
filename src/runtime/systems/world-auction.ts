(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const {
    LOCATIONS,
    LOCATION_MAP,
    WORLD_EVENT_TEMPLATES,
    REALM_TEMPLATES,
  } = tables;
  const { sample, randomInt } = utils;

  function rerender() {
    if (app.render) app.render();
  }

  function fillTemplate(text, payload) {
    return Object.entries(payload).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), text);
  }

  function getReservedAuctionFunds(ignoreListingId = null) {
    return app.getGame().auction.reduce((sum, listing) => {
      if (listing.bidderId !== "player") return sum;
      if (listing.id === ignoreListingId) return sum;
      return sum + listing.currentBid;
    }, 0);
  }

  function placeBid(listingId) {
    const game = app.getGame();
    const listing = game.auction.find((entry) => entry.id === listingId);
    if (!listing) return;
    const nextBid = listing.currentBid + listing.minimumRaise;
    if (game.player.money < getReservedAuctionFunds(listing.id) + nextBid) {
      app.appendLog("你手头灵石不够抬价。", "warn");
      return;
    }
    listing.currentBid = nextBid;
    listing.bidderId = "player";
    listing.interest += 8;
    app.appendLog(`你对${app.getItem(listing.itemId)?.name || "拍品"}出价${nextBid}灵石。`, "info");
    rerender();
  }

  function resolveAuctionVisit() {
    const game = app.getGame();
    if (!game.auction.length) {
      game.auction = app.createAuctionListings(randomInt(3, 5));
      return;
    }
    const listing = sample(game.auction);
    const item = app.getItem(listing.itemId);
    if (!item) return;
    if (Math.random() < 0.28 && game.player.money > listing.currentBid + listing.minimumRaise) {
      placeBid(listing.id);
    } else {
      game.player.reputation += 0.4;
      app.appendLog(`你在拍卖行打探到${item.name}的消息。`, "npc");
    }
  }

  function resolveAuctionTurn() {
    const game = app.getGame();
    const survivors = [];
    game.auction.forEach((listing) => {
      listing.turnsLeft -= 1;
      if (listing.turnsLeft > 0) {
        if (Math.random() < listing.interest / 150) {
          const challenger = sample(game.npcs);
          const nextBid = listing.currentBid + listing.minimumRaise;
          const rivalPressure = game.player.rivalIds.includes(challenger.id) ? 0.18 : 0;
          if (challenger.wealth > nextBid && challenger.mood.greed / 100 + rivalPressure > 0.42) {
            listing.currentBid = nextBid;
            listing.bidderId = challenger.id;
            challenger.wealth -= Math.round(nextBid * 0.05);
          }
        }
        survivors.push(listing);
        return;
      }

      const item = app.getItem(listing.itemId);
      if (listing.bidderId === "player") {
        if (game.player.money >= listing.currentBid) {
          game.player.money -= listing.currentBid;
          app.addItemToInventory(listing.itemId, listing.quantity);
          game.player.stats.auctionsWon += 1;
          app.appendLog(`拍卖结束，你拍得${item?.name || "奇珍"}。`, "loot");
        } else {
          app.appendLog(`你对${item?.name || "拍品"}的出价因灵石不足作废。`, "warn");
        }
      } else if (listing.bidderId.startsWith("npc-")) {
        const npc = app.getNpc(listing.bidderId);
        if (npc) {
          npc.inventory.push({ itemId: listing.itemId, quantity: listing.quantity });
          npc.lastEvent = `在拍卖行夺得${item?.name || "拍品"}`;
        }
        app.appendLog(`${npc?.name || "某位修士"}拍下了${item?.name || "奇珍"}。`, "npc");
      }
    });
    game.auction = survivors;
    if (game.auction.length < 4) {
      game.auction.push(...app.createAuctionListings(randomInt(1, 2)));
    }
  }

  function refreshMarketIfNeeded() {
    const game = app.getGame();
    if (game.world.hour % 4 !== 0 || game.world.subStep !== 0) return;
    LOCATIONS.forEach((location) => {
      game.market[location.id] = app.createMarketListings(location);
    });
    app.appendLog("各地商铺与黑市货架焕然一新。", "info");
  }

  function maybeActivateRealm() {
    const game = app.getGame();
    if (game.world.realm.cooldown > 0) {
      game.world.realm.cooldown -= 1;
      return;
    }
    if (game.world.realm.activeRealmId) return;
    if (Math.random() < 0.18) {
      const eligible = REALM_TEMPLATES.filter((realm) => game.player.reputation >= Math.max(0, realm.unlockRep - 6));
      if (!eligible.length) return;
      const realm = sample(eligible);
      game.world.realm.activeRealmId = realm.id;
      const location = LOCATION_MAP[realm.locationId];
      app.appendLog(fillTemplate(sample(WORLD_EVENT_TEMPLATES).text, { location: location.name, resource: location.resource }), "npc");
      app.appendLog(`${realm.name}在${location.name}附近出现了波动。`, "npc");
    }
  }

  Object.assign(app, {
    placeBid,
    resolveAuctionVisit,
    resolveAuctionTurn,
    refreshMarketIfNeeded,
    maybeActivateRealm,
  });
})();