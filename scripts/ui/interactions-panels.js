(() => {
  const app = window.ShanHai;
  const { state } = app;

  function handlePlayerPanelClick(event) {
    const switchButton = app.getClosest(event.target, "[data-switch-tab]");
    if (switchButton) {
      state.selectedTab = switchButton.dataset.switchTab;
      app.renderTabs();
      return;
    }

    const focusButton = app.getClosest(event.target, "[data-focus-realm]");
    if (focusButton) {
      const realm = app.getRealm(focusButton.dataset.focusRealm);
      if (realm) app.showLocationOnMap(realm.locationId);
      return;
    }

    const modeButton = app.getClosest(event.target, "[data-mode]");
    if (modeButton) {
      app.setMode(modeButton.dataset.mode);
      return;
    }

    const quickButton = app.getClosest(event.target, "[data-quick-action]");
    if (quickButton) {
      app.runQuickAction(quickButton.dataset.quickAction);
    }
  }

  function handleLocationDetailClick(event) {
    const travelButton = app.getClosest(event.target, "[data-travel-to]");
    if (travelButton) {
      app.travelOnly(travelButton.dataset.travelTo);
      return;
    }

    const actionButton = app.getClosest(event.target, "[data-location-action]");
    if (actionButton) {
      const { locationTarget, locationAction } = actionButton.dataset;
      if (app.getGame().player.locationId === locationTarget) {
        app.performAction(locationAction);
      } else {
        app.travelAndAct(locationTarget, locationAction);
      }
      return;
    }

    const realmButton = app.getClosest(event.target, "[data-challenge-realm]");
    if (!realmButton) return;
    const realm = app.getRealm(realmButton.dataset.challengeRealm);
    if (!realm) return;
    if (app.getGame().player.locationId !== realm.locationId) {
      app.travelOnly(realm.locationId);
    }
    app.challengeRealm(realm.id);
    app.render();
  }

  function handleInventoryClick(event) {
    const useButton = app.getClosest(event.target, "[data-use-item]");
    if (useButton) {
      app.consumeItem(useButton.dataset.useItem);
      return;
    }

    const sellButton = app.getClosest(event.target, "[data-sell-item]");
    if (sellButton) {
      app.sellItem(sellButton.dataset.sellItem);
      return;
    }

    const stashButton = app.getClosest(event.target, "[data-stash-manual]");
    if (stashButton) {
      app.stashManualToSect(stashButton.dataset.stashManual);
      app.render();
    }
  }

  function handleMarketClick(event) {
    const startRouteButton = app.getClosest(event.target, "[data-start-trade-run]");
    if (startRouteButton) {
      if (app.startTradeRun(startRouteButton.dataset.startTradeRun)) {
        app.tickWorld();
      }
      app.render();
      return;
    }

    const continueRouteButton = app.getClosest(event.target, "[data-continue-trade-run]");
    if (continueRouteButton) {
      if (app.advanceTradeRun() !== "none") {
        app.tickWorld();
      }
      app.render();
      return;
    }

    const buyButton = app.getClosest(event.target, "[data-buy-listing]");
    if (buyButton) {
      app.buyListing(buyButton.dataset.buyListing);
      return;
    }

    const travelButton = app.getClosest(event.target, "[data-travel-market]");
    if (travelButton) {
      app.travelOnly(travelButton.dataset.travelMarket);
    }
  }

  function handleAuctionClick(event) {
    const bidButton = app.getClosest(event.target, "[data-bid-id]");
    if (bidButton) {
      app.placeBid(bidButton.dataset.bidId);
    }
  }

  function handleIndustryClick(event) {
    const assignButton = app.getClosest(event.target, "[data-assign-asset-id]");
    if (assignButton) {
      app.assignAssetManager?.(
        assignButton.dataset.assignAssetKind,
        assignButton.dataset.assignAssetId,
        assignButton.dataset.assignAssetNpc,
      );
      app.render();
      return;
    }

    const clearManagerButton = app.getClosest(event.target, "[data-clear-asset-id]");
    if (clearManagerButton) {
      app.clearAssetManager?.(clearManagerButton.dataset.clearAssetKind, clearManagerButton.dataset.clearAssetId);
      app.render();
      return;
    }

    const setPlanButton = app.getClosest(event.target, "[data-set-asset-plan-id]");
    if (setPlanButton) {
      app.setAssetPlan?.(
        setPlanButton.dataset.setAssetPlanKind,
        setPlanButton.dataset.setAssetPlanId,
        setPlanButton.dataset.planTarget,
      );
      app.render();
      return;
    }

    const upgradeButton = app.getClosest(event.target, "[data-upgrade-asset-id]");
    if (upgradeButton) {
      app.upgradeAsset(upgradeButton.dataset.upgradeAssetKind, upgradeButton.dataset.upgradeAssetId);
      app.render();
      return;
    }

    const governmentButton = app.getClosest(event.target, "[data-buy-gov-contract]");
    if (governmentButton) {
      app.purchaseGovernmentContract(governmentButton.dataset.buyGovContract);
      app.render();
      return;
    }

    const buyButton = app.getClosest(event.target, "[data-buy-property]");
    if (buyButton) {
      app.purchaseProperty(buyButton.dataset.buyProperty);
      app.render();
      return;
    }

    const plantButton = app.getClosest(event.target, "[data-plant-crop]");
    if (plantButton) {
      app.plantCrop(plantButton.dataset.assetId, plantButton.dataset.plantCrop);
      app.render();
      return;
    }

    const harvestButton = app.getClosest(event.target, "[data-harvest-asset]");
    if (harvestButton) {
      app.harvestCrop(harvestButton.dataset.harvestAsset);
      app.render();
      return;
    }

    const craftButton = app.getClosest(event.target, "[data-craft-recipe]");
    if (craftButton) {
      app.craftRecipe(craftButton.dataset.craftRecipe);
      app.render();
      return;
    }

    const restockButton = app.getClosest(event.target, "[data-restock-shop]");
    if (restockButton) {
      app.restockShop(restockButton.dataset.restockShop);
      app.render();
      return;
    }

    const collectButton = app.getClosest(event.target, "[data-collect-shop]");
    if (collectButton) {
      app.collectShopIncome(collectButton.dataset.collectShop);
      app.render();
      return;
    }

    const fulfillButton = app.getClosest(event.target, "[data-fulfill-order]");
    if (fulfillButton) {
      app.fulfillIndustryOrder(fulfillButton.dataset.fulfillOrder);
      app.render();
    }
  }

  function handleCombatClick(event) {
    const challengeButton = app.getClosest(event.target, "[data-world-challenge]");
    if (challengeButton) {
      const realm = app.getRealm(challengeButton.dataset.worldChallenge);
      if (!realm) return;
      if (app.getGame().player.locationId !== realm.locationId) {
        app.travelOnly(realm.locationId);
      }
      app.challengeRealm(realm.id);
      app.render();
      return;
    }

    const toggleButton = app.getClosest(event.target, "[data-toggle-auto]");
    if (toggleButton) {
      app.getGame().combat.autoBattle = !app.getGame().combat.autoBattle;
      app.render();
      return;
    }

    const actionButton = app.getClosest(event.target, "[data-combat-action]");
    if (!actionButton) return;
    app.processBattleRound(actionButton.dataset.combatAction);
    app.tickWorld();
    app.render();
  }

  function handleNpcClick(event) {
    const visitButton = app.getClosest(event.target, "[data-visit-npc]");
    if (visitButton) {
      app.visitNpc(visitButton.dataset.visitNpc);
      return;
    }

    const followButton = app.getClosest(event.target, "[data-focus-npc]");
    if (followButton) {
      const npc = app.getNpc(followButton.dataset.focusNpc);
      if (npc) app.showLocationOnMap(npc.locationId);
      return;
    }

    const recruitButton = app.getClosest(event.target, "[data-recruit-npc]");
    if (recruitButton) {
      app.recruitDisciple(recruitButton.dataset.recruitNpc);
      app.render();
      return;
    }

    const recruitFactionButton = app.getClosest(event.target, "[data-recruit-faction-member]");
    if (recruitFactionButton) {
      app.recruitFactionMember?.(recruitFactionButton.dataset.recruitFactionMember);
      app.render();
      return;
    }

    const masterButton = app.getClosest(event.target, "[data-master-npc]");
    if (masterButton) {
      app.becomeMasterBond(masterButton.dataset.masterNpc);
      app.render();
      return;
    }

    const partnerButton = app.getClosest(event.target, "[data-partner-npc]");
    if (partnerButton) {
      app.becomePartner(partnerButton.dataset.partnerNpc);
      app.render();
      return;
    }

    const rivalButton = app.getClosest(event.target, "[data-rival-npc]");
    if (rivalButton) {
      app.declareRival(rivalButton.dataset.rivalNpc);
      app.render();
    }
  }

  function handleSectClick(event) {
    const focusButton = app.getClosest(event.target, "[data-focus-location]");
    if (focusButton) {
      app.showLocationOnMap(focusButton.dataset.focusLocation);
      return;
    }

    const createFactionButton = app.getClosest(event.target, "[data-create-player-faction]");
    if (createFactionButton) {
      app.createPlayerFaction?.();
      app.render();
      return;
    }

    const joinButton = app.getClosest(event.target, "[data-join-faction]");
    if (joinButton) {
      app.joinFaction(joinButton.dataset.joinFaction);
      app.render();
      return;
    }

    const createButton = app.getClosest(event.target, "[data-create-sect]");
    if (createButton) {
      app.createSect();
      app.render();
      return;
    }

    const upgradeButton = app.getClosest(event.target, "[data-upgrade-building]");
    if (upgradeButton) {
      app.upgradeSectBuilding(upgradeButton.dataset.upgradeBuilding);
      app.render();
      return;
    }

    const branchButton = app.getClosest(event.target, "[data-upgrade-faction-branch]");
    if (branchButton) {
      app.upgradePlayerFactionBranch?.(branchButton.dataset.upgradeFactionBranch);
      app.render();
      return;
    }

    const campaignButton = app.getClosest(event.target, "[data-campaign-territory]");
    if (campaignButton) {
      app.launchTerritoryCampaign?.(campaignButton.dataset.campaignTerritory);
      app.render();
      return;
    }

    const stabilizeButton = app.getClosest(event.target, "[data-stabilize-territory]");
    if (stabilizeButton) {
      app.stabilizeTerritory?.(stabilizeButton.dataset.stabilizeTerritory);
      app.render();
      return;
    }

    const affiliationTaskButton = app.getClosest(event.target, "[data-complete-affiliation-task]");
    if (affiliationTaskButton) {
      app.completeAffiliationTask?.(affiliationTaskButton.dataset.completeAffiliationTask);
      app.render();
      return;
    }

    const factionMissionButton = app.getClosest(event.target, "[data-complete-player-faction-mission]");
    if (factionMissionButton) {
      app.completePlayerFactionMission?.(factionMissionButton.dataset.completePlayerFactionMission);
      app.render();
      return;
    }

    const sectMissionButton = app.getClosest(event.target, "[data-complete-sect-mission]");
    if (sectMissionButton) {
      app.completeSectMission?.(sectMissionButton.dataset.completeSectMission);
      app.render();
      return;
    }

    const teachButton = app.getClosest(event.target, "[data-teach-npc]");
    if (teachButton) {
      app.assignTeaching(teachButton.dataset.teachNpc, teachButton.dataset.manualId);
      app.render();
    }
  }

  function handleWorldClick(event) {
    const challengeButton = app.getClosest(event.target, "[data-world-challenge]");
    if (challengeButton) {
      const realm = app.getRealm(challengeButton.dataset.worldChallenge);
      if (!realm) return;
      if (app.getGame().player.locationId !== realm.locationId) {
        app.travelOnly(realm.locationId);
      }
      app.challengeRealm(realm.id);
      app.render();
      return;
    }

    const focusButton = app.getClosest(event.target, "[data-focus-location]");
    if (focusButton) {
      app.showLocationOnMap(focusButton.dataset.focusLocation);
      return;
    }

    const travelButton = app.getClosest(event.target, "[data-world-travel]");
    if (travelButton) {
      app.travelOnly(travelButton.dataset.worldTravel);
    }
  }

  function handleDockClick(event) {
    const quickButton = app.getClosest(event.target, "[data-quick-action]");
    if (quickButton) {
      app.runQuickAction(quickButton.dataset.quickAction);
      return;
    }

    const switchButton = app.getClosest(event.target, "[data-switch-tab]");
    if (switchButton) {
      state.selectedTab = switchButton.dataset.switchTab;
      app.renderTabs();
      return;
    }

    const continueRouteButton = app.getClosest(event.target, "[data-continue-trade-run]");
    if (continueRouteButton) {
      if (app.advanceTradeRun() !== "none") {
        app.tickWorld();
      }
      app.render();
      return;
    }

    const focusButton = app.getClosest(event.target, "[data-focus-realm]");
    if (!focusButton) return;
    const realm = app.getRealm(focusButton.dataset.focusRealm);
    if (realm) {
      app.showLocationOnMap(realm.locationId);
    }
  }

  Object.assign(app, {
    handlePlayerPanelClick,
    handleLocationDetailClick,
    handleInventoryClick,
    handleMarketClick,
    handleAuctionClick,
    handleIndustryClick,
    handleCombatClick,
    handleNpcClick,
    handleSectClick,
    handleWorldClick,
    handleDockClick,
  });
})();