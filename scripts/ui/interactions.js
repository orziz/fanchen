(() => {
  const app = window.ShanHai;
  const { dom, state, runtime } = app;
  const { LOCATIONS } = app.tables;

  function getClosest(target, selector) {
    if (target instanceof Element) return target.closest(selector);
    if (target && target.parentElement instanceof Element) return target.parentElement.closest(selector);
    return null;
  }

  function bindDom() {
    dom.dayLabel = document.getElementById("dayLabel");
    dom.timeLabel = document.getElementById("timeLabel");
    dom.reputationLabel = document.getElementById("reputationLabel");
    dom.saveStateLabel = document.getElementById("saveStateLabel");
    dom.currentLocationLabel = document.getElementById("currentLocationLabel");
    dom.modeLabel = document.getElementById("modeLabel");
    dom.actionLabel = document.getElementById("actionLabel");
    dom.locationDetail = document.getElementById("locationDetail");
    dom.playerPanel = document.getElementById("playerPanel");
    dom.dockPanel = document.getElementById("dockPanel");
    dom.commandDetail = document.getElementById("commandDetail");
    dom.inventoryPanel = document.getElementById("inventoryPanel");
    dom.industryPanel = document.getElementById("industryPanel");
    dom.marketPanel = document.getElementById("marketPanel");
    dom.auctionPanel = document.getElementById("auctionPanel");
    dom.combatPanel = document.getElementById("combatPanel");
    dom.npcPanel = document.getElementById("npcPanel");
    dom.sectPanel = document.getElementById("sectPanel");
    dom.worldPanel = document.getElementById("worldPanel");
    dom.logList = document.getElementById("logList");
    dom.profileDetail = document.getElementById("profileDetail");
    dom.mapCanvas = document.getElementById("worldMap");
    dom.saveButton = document.getElementById("saveButton");
    dom.loadButton = document.getElementById("loadButton");
    dom.newGameButton = document.getElementById("newGameButton");
    dom.openJournalButton = document.getElementById("openJournalButton");
    dom.openMapButton = document.getElementById("openMapButton");
    dom.openCommandButton = document.getElementById("openCommandButton");
    dom.openProfileButton = document.getElementById("openProfileButton");
    dom.closeJournalButton = document.getElementById("closeJournalButton");
    dom.closeMapButton = document.getElementById("closeMapButton");
    dom.closeCommandButton = document.getElementById("closeCommandButton");
    dom.closeProfileButton = document.getElementById("closeProfileButton");
    dom.journalWindow = document.getElementById("journalWindow");
    dom.mapWindow = document.getElementById("mapWindow");
    dom.commandWindow = document.getElementById("commandWindow");
    dom.profileWindow = document.getElementById("profileWindow");
    dom.speedSwitch = document.getElementById("speedSwitch");
    dom.focusPlayerButton = document.getElementById("focusPlayerButton");
    dom.clearLogButton = document.getElementById("clearLogButton");
    dom.tabStrip = document.getElementById("tabStrip");
    dom.toastStack = document.getElementById("toastStack");
  }

  function handleBlockedControl(event) {
    const blocked = getClosest(event.target, "[aria-disabled=\"true\"][data-disabled-reason]");
    if (!blocked) return false;
    event.preventDefault();
    event.stopPropagation();
    app.showFeedback(blocked.dataset.disabledReason || "当前条件不足，暂时无法执行。", "warn");
    return true;
  }

  function showLocationOnMap(locationId) {
    state.selectedLocationId = locationId;
    app.openWindow("map");
    app.renderLocationDetail();
    app.renderMap();
  }

  function travelOnly(locationId) {
    const before = app.getGame().player.locationId;
    app.travelTo(locationId);
    if (before !== app.getGame().player.locationId) {
      app.tickWorld();
      app.render();
    }
  }

  function handlePlayerPanelClick(event) {
    const switchButton = getClosest(event.target, "[data-switch-tab]");
    if (switchButton) {
      state.selectedTab = switchButton.dataset.switchTab;
      app.renderTabs();
      return;
    }

    const focusButton = getClosest(event.target, "[data-focus-realm]");
    if (focusButton) {
      const realm = app.getRealm(focusButton.dataset.focusRealm);
      if (realm) {
        showLocationOnMap(realm.locationId);
      }
      return;
    }

    const modeButton = getClosest(event.target, "[data-mode]");
    if (modeButton) {
      app.setMode(modeButton.dataset.mode);
      return;
    }

    const quickButton = getClosest(event.target, "[data-quick-action]");
    if (!quickButton) return;
    const action = quickButton.dataset.quickAction;

    if (action === "rest") {
      app.adjustResource("hp", 18, "maxHp");
      app.adjustResource("qi", 16, "maxQi");
      app.adjustResource("stamina", 20, "maxStamina");
      app.appendLog("你暂时收束心神，运气回息。", "info");
      app.render();
      return;
    }

    if (action === "create-sect") {
      app.createSect();
      app.render();
      return;
    }

    if (action === "affiliation") {
      state.selectedTab = "sect";
      app.renderTabs();
      return;
    }

    app.forceAction(action);
  }

  function handleLocationDetailClick(event) {
    const travelButton = getClosest(event.target, "[data-travel-to]");
    if (travelButton) {
      travelOnly(travelButton.dataset.travelTo);
      return;
    }

    const actionButton = getClosest(event.target, "[data-location-action]");
    if (actionButton) {
      const { locationTarget, locationAction } = actionButton.dataset;
      if (app.getGame().player.locationId === locationTarget) {
        app.performAction(locationAction);
      } else {
        app.travelAndAct(locationTarget, locationAction);
      }
      return;
    }

    const realmButton = getClosest(event.target, "[data-challenge-realm]");
    if (!realmButton) return;
    const realmId = realmButton.dataset.challengeRealm;
    const realm = app.getRealm(realmId);
    if (!realm) return;
    if (app.getGame().player.locationId !== realm.locationId) {
      travelOnly(realm.locationId);
    }
    app.challengeRealm(realmId);
    app.render();
  }

  function handleInventoryClick(event) {
    const useButton = getClosest(event.target, "[data-use-item]");
    if (useButton) {
      app.consumeItem(useButton.dataset.useItem);
      return;
    }

    const sellButton = getClosest(event.target, "[data-sell-item]");
    if (sellButton) {
      app.sellItem(sellButton.dataset.sellItem);
      return;
    }

    const stashButton = getClosest(event.target, "[data-stash-manual]");
    if (stashButton) {
      app.stashManualToSect(stashButton.dataset.stashManual);
      app.render();
    }
  }

  function handleMarketClick(event) {
    const buyButton = getClosest(event.target, "[data-buy-listing]");
    if (buyButton) {
      app.buyListing(buyButton.dataset.buyListing);
      return;
    }

    const travelButton = getClosest(event.target, "[data-travel-market]");
    if (travelButton) {
      travelOnly(travelButton.dataset.travelMarket);
    }
  }

  function handleAuctionClick(event) {
    const bidButton = getClosest(event.target, "[data-bid-id]");
    if (bidButton) {
      app.placeBid(bidButton.dataset.bidId);
    }
  }

  function handleIndustryClick(event) {
    const buyButton = getClosest(event.target, "[data-buy-property]");
    if (buyButton) {
      app.purchaseProperty(buyButton.dataset.buyProperty);
      app.render();
      return;
    }

    const plantButton = getClosest(event.target, "[data-plant-crop]");
    if (plantButton) {
      app.plantCrop(plantButton.dataset.assetId, plantButton.dataset.plantCrop);
      app.render();
      return;
    }

    const harvestButton = getClosest(event.target, "[data-harvest-asset]");
    if (harvestButton) {
      app.harvestCrop(harvestButton.dataset.harvestAsset);
      app.render();
      return;
    }

    const craftButton = getClosest(event.target, "[data-craft-recipe]");
    if (craftButton) {
      app.craftRecipe(craftButton.dataset.craftRecipe);
      app.render();
      return;
    }

    const restockButton = getClosest(event.target, "[data-restock-shop]");
    if (restockButton) {
      app.restockShop(restockButton.dataset.restockShop);
      app.render();
      return;
    }

    const collectButton = getClosest(event.target, "[data-collect-shop]");
    if (collectButton) {
      app.collectShopIncome(collectButton.dataset.collectShop);
      app.render();
      return;
    }

    const fulfillButton = getClosest(event.target, "[data-fulfill-order]");
    if (fulfillButton) {
      app.fulfillIndustryOrder(fulfillButton.dataset.fulfillOrder);
      app.render();
    }
  }

  function handleCombatClick(event) {
    const challengeButton = getClosest(event.target, "[data-world-challenge]");
    if (challengeButton) {
      const realm = app.getRealm(challengeButton.dataset.worldChallenge);
      if (!realm) return;
      if (app.getGame().player.locationId !== realm.locationId) {
        travelOnly(realm.locationId);
      }
      app.challengeRealm(realm.id);
      app.render();
      return;
    }

    const toggleButton = getClosest(event.target, "[data-toggle-auto]");
    if (toggleButton) {
      app.getGame().combat.autoBattle = !app.getGame().combat.autoBattle;
      app.render();
      return;
    }

    const actionButton = getClosest(event.target, "[data-combat-action]");
    if (!actionButton) return;
    app.processBattleRound(actionButton.dataset.combatAction);
    app.tickWorld();
    app.render();
  }

  function handleNpcClick(event) {
    const visitButton = getClosest(event.target, "[data-visit-npc]");
    if (visitButton) {
      app.visitNpc(visitButton.dataset.visitNpc);
      return;
    }

    const followButton = getClosest(event.target, "[data-focus-npc]");
    if (followButton) {
      const npc = app.getNpc(followButton.dataset.focusNpc);
      if (npc) {
        showLocationOnMap(npc.locationId);
      }
      return;
    }

    const recruitButton = getClosest(event.target, "[data-recruit-npc]");
    if (recruitButton) {
      app.recruitDisciple(recruitButton.dataset.recruitNpc);
      app.render();
      return;
    }

    const masterButton = getClosest(event.target, "[data-master-npc]");
    if (masterButton) {
      app.becomeMasterBond(masterButton.dataset.masterNpc);
      app.render();
      return;
    }

    const partnerButton = getClosest(event.target, "[data-partner-npc]");
    if (partnerButton) {
      app.becomePartner(partnerButton.dataset.partnerNpc);
      app.render();
      return;
    }

    const rivalButton = getClosest(event.target, "[data-rival-npc]");
    if (rivalButton) {
      app.declareRival(rivalButton.dataset.rivalNpc);
      app.render();
    }
  }

  function handleSectClick(event) {
    const joinButton = getClosest(event.target, "[data-join-faction]");
    if (joinButton) {
      app.joinFaction(joinButton.dataset.joinFaction);
      app.render();
      return;
    }

    const createButton = getClosest(event.target, "[data-create-sect]");
    if (createButton) {
      app.createSect();
      app.render();
      return;
    }

    const upgradeButton = getClosest(event.target, "[data-upgrade-building]");
    if (upgradeButton) {
      app.upgradeSectBuilding(upgradeButton.dataset.upgradeBuilding);
      app.render();
      return;
    }

    const teachButton = getClosest(event.target, "[data-teach-npc]");
    if (teachButton) {
      app.assignTeaching(teachButton.dataset.teachNpc, teachButton.dataset.manualId);
      app.render();
    }
  }

  function handleWorldClick(event) {
    const challengeButton = getClosest(event.target, "[data-world-challenge]");
    if (challengeButton) {
      const realm = app.getRealm(challengeButton.dataset.worldChallenge);
      if (!realm) return;
      if (app.getGame().player.locationId !== realm.locationId) {
        travelOnly(realm.locationId);
      }
      app.challengeRealm(realm.id);
      app.render();
      return;
    }

    const focusButton = getClosest(event.target, "[data-focus-location]");
    if (focusButton) {
      showLocationOnMap(focusButton.dataset.focusLocation);
      return;
    }

    const travelButton = getClosest(event.target, "[data-world-travel]");
    if (travelButton) {
      travelOnly(travelButton.dataset.worldTravel);
    }
  }

  function handleDockClick(event) {
    const switchButton = getClosest(event.target, "[data-switch-tab]");
    if (switchButton) {
      state.selectedTab = switchButton.dataset.switchTab;
      app.renderTabs();
      return;
    }

    const focusButton = getClosest(event.target, "[data-focus-realm]");
    if (!focusButton) return;
    const realm = app.getRealm(focusButton.dataset.focusRealm);
    if (!realm) return;
    showLocationOnMap(realm.locationId);
  }

  function onCanvasClick(event) {
    const rect = dom.mapCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * dom.mapCanvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * dom.mapCanvas.height;
    const found = LOCATIONS.find((location) => Math.hypot(location.x - x, location.y - y) < 28);
    if (!found) return;
    state.selectedLocationId = found.id;
    app.renderLocationDetail();
    app.renderMap();
  }

  function bindEvents() {
    if (runtime.interactionsBound) return;
    runtime.interactionsBound = true;
    app.bindWindowEvents?.();

    dom.saveButton.addEventListener("click", () => app.saveGame(true));
    dom.loadButton.addEventListener("click", app.loadGame);
    dom.newGameButton.addEventListener("click", () => {
      if (window.confirm("确认重开此世？当前未存档进度会被覆盖。")) {
        app.resetGame();
      }
    });
    document.addEventListener("click", (event) => {
      handleBlockedControl(event);
    }, true);
    document.addEventListener("click", (event) => {
      const openButton = getClosest(event.target, "[data-open-window]");
      if (openButton) {
        event.preventDefault();
        app.toggleWindow(openButton.dataset.openWindow);
        return;
      }
      const closeButton = getClosest(event.target, "[data-close-window]");
      if (closeButton) {
        event.preventDefault();
        app.closeWindow(closeButton.dataset.closeWindow);
        return;
      }
      const minimizeButton = getClosest(event.target, "[data-window-action=\"minimize\"]");
      if (minimizeButton) {
        event.preventDefault();
        app.toggleWindowMinimize(minimizeButton.dataset.windowId);
        return;
      }
      const dockButton = getClosest(event.target, "[data-window-action=\"dock\"]");
      if (dockButton) {
        event.preventDefault();
        app.toggleWindowDock(dockButton.dataset.windowId);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        app.closeTopWindow?.();
      }
    });

    dom.speedSwitch.addEventListener("click", (event) => {
      const target = getClosest(event.target, "[data-speed]");
      if (!target) return;
      state.speed = Number(target.dataset.speed);
      app.renderSpeedButtons();
    });

    dom.focusPlayerButton.addEventListener("click", () => {
      showLocationOnMap(app.getGame().player.locationId);
    });

    dom.clearLogButton.addEventListener("click", () => {
      app.getGame().log = [];
      app.renderLog();
    });

    dom.tabStrip.addEventListener("click", (event) => {
      const target = getClosest(event.target, "[data-tab]");
      if (!target) return;
      state.selectedTab = target.dataset.tab;
      app.renderTabs();
    });

    [dom.mapWindow, dom.journalWindow, dom.profileWindow, dom.commandWindow].forEach((element) => {
      if (!element) return;
      element.addEventListener("pointerdown", () => app.bringWindowToFront(element.dataset.window));
    });

    document.querySelectorAll("[data-window-handle]").forEach((handle) => {
      const onDragStart = (event) => {
        if (getClosest(event.target, "button")) return;
        app.startWindowDrag(handle.dataset.windowHandle, event);
      };
      handle.addEventListener("pointerdown", onDragStart);
      handle.addEventListener("mousedown", onDragStart);
    });

    document.querySelectorAll(".window-actions button").forEach((button) => {
      const stopHeaderDrag = (event) => {
        event.stopPropagation();
      };
      button.addEventListener("pointerdown", stopHeaderDrag);
      button.addEventListener("mousedown", stopHeaderDrag);
    });

    dom.mapCanvas.addEventListener("click", onCanvasClick);
    dom.locationDetail.addEventListener("click", handleLocationDetailClick);
    dom.playerPanel.addEventListener("click", handlePlayerPanelClick);
    dom.commandDetail.addEventListener("click", handlePlayerPanelClick);
    dom.inventoryPanel.addEventListener("click", handleInventoryClick);
    dom.marketPanel.addEventListener("click", handleMarketClick);
    dom.industryPanel.addEventListener("click", handleIndustryClick);
    dom.auctionPanel.addEventListener("click", handleAuctionClick);
    dom.combatPanel.addEventListener("click", handleCombatClick);
    dom.npcPanel.addEventListener("click", handleNpcClick);
    dom.sectPanel.addEventListener("click", handleSectClick);
    dom.worldPanel.addEventListener("click", handleWorldClick);
    dom.dockPanel.addEventListener("click", handleDockClick);
  }

  Object.assign(app, {
    bindDom,
    bindEvents,
  });
})();
