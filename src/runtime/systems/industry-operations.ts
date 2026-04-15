(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { uid } = utils;
  const internals = app.industryInternals || (app.industryInternals = {} as ShanHaiIndustryInternals);

  function getPropertyPurchaseIssues(propertyId) {
    const game = app.getGame();
    const property = app.getPropertyDef(propertyId);
    if (!property) return ["这处产业已经不存在。"]; 
    const issues = [];
    if (!property.locationTags.some((tag) => app.getCurrentLocation().tags.includes(tag))) {
      issues.push("当前地点不提供这类产业");
    }
    if (!internals.hasIndustryAccess(property.kind, property)) {
      issues.push(`尚未打通${property.kind === "farm" ? "田产" : property.kind === "workshop" ? "工坊" : "铺面"}门路`);
    }
    if (game.player.money < property.cost) {
      issues.push(`灵石不足，还差${property.cost - game.player.money}`);
    }
    const deedItemId = internals.DEED_ITEM_BY_KIND[property.kind];
    if (deedItemId && !app.findInventoryEntry(deedItemId)) {
      issues.push(`缺少${app.getItem(deedItemId)?.name || "对应契据"}`);
    }
    return issues;
  }

  function explainPropertyPurchase(propertyId) {
    const issues = getPropertyPurchaseIssues(propertyId);
    return issues.length ? issues.join("；") : "条件齐备，可以购入。";
  }

  function canPurchaseProperty(propertyId) {
    return getPropertyPurchaseIssues(propertyId).length === 0;
  }

  function purchaseProperty(propertyId) {
    const game = app.getGame();
    const property = app.getPropertyDef(propertyId);
    if (!property || !canPurchaseProperty(propertyId)) {
      app.appendLog("眼下还买不起或买不到这处产业。", "warn");
      return;
    }
    const deedItemId = internals.DEED_ITEM_BY_KIND[property.kind];
    if (deedItemId) {
      app.removeItemFromInventory(deedItemId, 1);
    }
    game.player.money -= property.cost;
    const asset = {
      id: uid(property.kind),
      propertyId,
      locationId: app.getCurrentLocation().id,
      kind: property.kind,
      label: property.label,
      cropId: null,
      daysRemaining: 0,
      stock: 0,
      pendingIncome: 0,
      level: 1,
      managerNpcId: null,
      automationTargetId: null,
    };
    internals.getAssets(property.kind).push(asset);
    app.appendLog(`${property.label}已经记在你名下。`, "loot");
    app.adjustRegionStanding?.(app.getCurrentLocation().id, 1.2);
    if (property.kind === "farm") app.adjustFactionStanding?.(game.player.affiliationId, 2);
    if (property.kind === "workshop") app.adjustFactionStanding?.(game.player.affiliationId, 3);
    if (property.kind === "shop") app.adjustFactionStanding?.(game.player.affiliationId, 3);
  }

  function getAssignAssetManagerIssues(kind, assetId, npcId) {
    const asset = internals.getAsset(kind, assetId);
    const npc = app.getNpc(npcId);
    if (!asset || !npc) return ["这份委派眼下办不成。"]; 
    const issues = [];
    const candidates = app.getAssetDelegateCandidates().map((entry) => entry.id);
    if (!candidates.includes(npcId)) issues.push("只有自家势力骨干或门下弟子才能接手产业");
    const managedAsset = internals.getManagedAssetByNpcId(npcId);
    if (managedAsset && managedAsset.id !== assetId) issues.push("此人已经在管另一处产业了");
    return issues;
  }

  function explainAssignAssetManager(kind, assetId, npcId) {
    const issues = getAssignAssetManagerIssues(kind, assetId, npcId);
    return issues.length ? issues.join("；") : "这份委派可以定下。";
  }

  function canAssignAssetManager(kind, assetId, npcId) {
    return getAssignAssetManagerIssues(kind, assetId, npcId).length === 0;
  }

  function assignAssetManager(kind, assetId, npcId) {
    const asset = internals.getAsset(kind, assetId);
    const npc = app.getNpc(npcId);
    if (!asset || !npc || !canAssignAssetManager(kind, assetId, npcId)) {
      app.appendLog("这份产业委派眼下还定不下来。", "warn");
      return;
    }
    asset.managerNpcId = npcId;
    npc.lastEvent = `接手打理${asset.label}`;
    app.appendLog(`你把${asset.label}交给${npc.name}照看。`, "info");
  }

  function clearAssetManager(kind, assetId) {
    const asset = internals.getAsset(kind, assetId);
    if (!asset?.managerNpcId) return;
    const npc = app.getNpc(asset.managerNpcId);
    asset.managerNpcId = null;
    app.appendLog(`你收回了${asset.label}的管事权${npc ? `，${npc.name}不再看这摊子` : ""}。`, "info");
  }

  function getSetAssetPlanIssues(kind, assetId, targetId) {
    const asset = internals.getAsset(kind, assetId);
    if (!asset) return ["这份经营章程暂时定不下来。"]; 
    const issues = [];
    if (!asset.managerNpcId) issues.push("需先给这处产业委派人手");
    if (kind === "farm" && !app.getCrop(targetId)) issues.push("这份轮种章程不存在");
    if (kind === "workshop" && !app.getRecipe(targetId)) issues.push("这份工坊活计不存在");
    return issues;
  }

  function explainSetAssetPlan(kind, assetId, targetId) {
    const issues = getSetAssetPlanIssues(kind, assetId, targetId);
    return issues.length ? issues.join("；") : "这份章程已经可以交代下去。";
  }

  function canSetAssetPlan(kind, assetId, targetId) {
    return getSetAssetPlanIssues(kind, assetId, targetId).length === 0;
  }

  function setAssetPlan(kind, assetId, targetId) {
    const asset = internals.getAsset(kind, assetId);
    if (!asset || !canSetAssetPlan(kind, assetId, targetId)) {
      app.appendLog("这份经营章程眼下还立不住。", "warn");
      return;
    }
    asset.automationTargetId = targetId;
    app.appendLog(`${asset.label}改按“${app.getAssetAutomationLabel(kind, asset)}”行事。`, "info");
  }

  function getAssetUpgradeCost(kind, assetId) {
    const asset = internals.getAsset(kind, assetId);
    if (!asset) return 0;
    return internals.INDUSTRY_UPGRADE_BASE_COST[kind] * asset.level;
  }

  function getAssetUpgradeIssues(kind, assetId) {
    const game = app.getGame();
    const asset = internals.getAsset(kind, assetId);
    if (!asset) return ["这处产业暂时无法整修。"]; 
    const cost = getAssetUpgradeCost(kind, assetId);
    const issues = [];
    if (game.player.money < cost) {
      issues.push(`灵石不足，还差${cost - game.player.money}`);
    }
    if (kind === "shop" && asset.stock > 0) {
      issues.push("铺里还有现货，先把这一轮货转完再扩面");
    }
    return issues;
  }

  function explainAssetUpgrade(kind, assetId) {
    const issues = getAssetUpgradeIssues(kind, assetId);
    return issues.length ? issues.join("；") : "可以继续扩建。";
  }

  function canUpgradeAsset(kind, assetId) {
    return getAssetUpgradeIssues(kind, assetId).length === 0;
  }

  function upgradeAsset(kind, assetId) {
    const game = app.getGame();
    const asset = internals.getAsset(kind, assetId);
    if (!asset || !canUpgradeAsset(kind, assetId)) {
      app.appendLog("这处产业眼下还扩不动。", "warn");
      return;
    }
    const cost = getAssetUpgradeCost(kind, assetId);
    game.player.money -= cost;
    asset.level += 1;
    if (kind === "shop") {
      asset.stock = 0;
      asset.pendingIncome = 0;
    }
    game.player.stats.industryUpgrades += 1;
    app.adjustFactionStanding?.(game.player.affiliationId, 1.8 + asset.level * 0.3);
    app.appendLog(`${asset.label}扩建完成，升到 ${asset.level} 级。`, "loot");
  }

  function plantCropInternal(asset, cropId, { automated = false } = {}) {
    const crop = app.getCrop(cropId);
    if (!asset || !crop) return false;
    if (asset.cropId) {
      if (!automated) app.appendLog("这块田还没腾出来。", "warn");
      return false;
    }
    if (!app.removeItemFromInventory(crop.seedItemId, 1)) {
      if (!automated) app.appendLog("你手头没有对应种子。", "warn");
      return false;
    }
    asset.cropId = crop.id;
    asset.daysRemaining = crop.growDays;
    asset.lastManagedResult = `${crop.label}已经播下。`;
    if (!automated) {
      app.appendLog(`你在${asset.label}里种下了${crop.label}。`, "info");
    }
    return true;
  }

  function plantCrop(assetId, cropId) {
    const asset = internals.getAssets("farm").find((entry) => entry.id === assetId);
    if (!asset) return;
    plantCropInternal(asset, cropId);
  }

  function getHarvestIssues(assetId) {
    const asset = internals.getAssets("farm").find((entry) => entry.id === assetId);
    if (!asset || !asset.cropId) return ["这块田里还没有作物。"]; 
    if (asset.daysRemaining > 0) return [`作物尚未成熟，还需${asset.daysRemaining}天`];
    return [];
  }

  function explainHarvest(assetId) {
    const issues = getHarvestIssues(assetId);
    return issues.length ? issues.join("；") : "作物已熟，可以收成。";
  }

  function harvestCropInternal(asset, { automated = false } = {}) {
    if (!asset || !asset.cropId) return false;
    if (asset.daysRemaining > 0) {
      if (!automated) app.appendLog("作物尚未成熟。", "warn");
      return false;
    }
    const crop = app.getCrop(asset.cropId);
    if (!crop) return false;
    const support = internals.getIndustrySupportBonus("farm", asset.locationId);
    const operatorBonus = internals.getAssetOperatorBonus(asset);
    const harvestYield = crop.yield + Math.max(0, asset.level - 1) + Math.round(crop.yield * (support.output + operatorBonus));
    app.addItemToInventory(crop.harvestItemId, harvestYield);
    asset.cropId = null;
    asset.daysRemaining = 0;
    asset.lastManagedResult = `${app.getItem(crop.harvestItemId)?.name || crop.harvestItemId} x${harvestYield}`;
    app.getGame().player.skills.farming += automated ? 0.25 : 0.4;
    app.getGame().player.stats.cropsHarvested += harvestYield;
    app.adjustFactionStanding?.(app.getGame().player.affiliationId, automated ? 0.8 : 1.5);
    internals.applyIndustryNetworkGrowth("farm", harvestYield * 6);
    if (!automated) {
      app.appendLog(`你从${asset.label}收成了${app.getItem(crop.harvestItemId)?.name || crop.harvestItemId} x${harvestYield}。`, "loot");
    }
    return true;
  }

  function harvestCrop(assetId) {
    const asset = internals.getAssets("farm").find((entry) => entry.id === assetId);
    if (!asset) return;
    harvestCropInternal(asset);
  }

  function getCraftRecipeIssues(recipeId) {
    const recipe = app.getRecipe(recipeId);
    const game = app.getGame();
    if (!recipe) return ["这张配方当前不可用。"]; 
    const issues = [];
    if (!internals.getAssets(recipe.requiresPropertyKind).length) {
      issues.push(`名下还没有可用${recipe.requiresPropertyKind === "workshop" ? "工坊" : recipe.requiresPropertyKind}`);
    }
    if (game.player.rankIndex < recipe.minRankIndex) {
      issues.push(`境界不足，需要${app.getRankData(recipe.minRankIndex).name}`);
    }
    if (game.player.money < recipe.cost) {
      issues.push(`灵石不足，还差${recipe.cost - game.player.money}`);
    }
    recipe.inputs.forEach((input) => {
      const current = app.findInventoryEntry(input.itemId)?.quantity || 0;
      if (current < input.quantity) {
        issues.push(`缺少${app.getItem(input.itemId)?.name || input.itemId} ${input.quantity - current}件`);
      }
    });
    return issues;
  }

  function explainCraftRecipe(recipeId) {
    const issues = getCraftRecipeIssues(recipeId);
    return issues.length ? issues.join("；") : "材料与条件齐备，可以动工。";
  }

  function canCraftRecipe(recipeId) {
    return getCraftRecipeIssues(recipeId).length === 0;
  }

  function craftRecipe(recipeId) {
    const recipe = app.getRecipe(recipeId);
    const game = app.getGame();
    if (!recipe || !canCraftRecipe(recipeId)) {
      app.appendLog("材料、工坊或手艺还不够，暂时做不出这件东西。", "warn");
      return;
    }
    const workshop = internals.getAssets("workshop").slice().sort((left, right) => (right.level || 1) - (left.level || 1))[0] || null;
    recipe.inputs.forEach((input) => {
      app.removeItemFromInventory(input.itemId, input.quantity);
    });
    game.player.money -= recipe.cost;
    const workshopLevel = workshop?.level || internals.getAssets("workshop").reduce((max, asset) => Math.max(max, asset.level || 1), 1);
    const support = internals.getIndustrySupportBonus("workshop", workshop?.locationId || app.getCurrentLocation().id);
    const operatorBonus = internals.getAssetOperatorBonus(workshop);
    const extraOutput = workshopLevel >= 3 && Math.random() < 0.3 + support.output + operatorBonus ? 1 : 0;
    app.addItemToInventory(recipe.outputItemId, recipe.outputQuantity + extraOutput);
    game.player.skills.crafting += 0.6;
    game.player.stats.craftedItems += recipe.outputQuantity + extraOutput;
    app.adjustFactionStanding?.(game.player.affiliationId, 2);
    internals.applyIndustryNetworkGrowth("workshop", recipe.cost + extraOutput * 22);
    app.appendLog(`你亲手做出了${app.getItem(recipe.outputItemId)?.name || recipe.outputItemId}。`, "loot");
  }

  function getShopRestockCost(shop) {
    return 26 + shop.level * 10;
  }

  function getShopRestockAmount(shop) {
    const support = internals.getIndustrySupportBonus("shop", shop.locationId);
    const operatorBonus = internals.getAssetOperatorBonus(shop);
    return 2 + shop.level + Math.round((support.output + support.upkeep + operatorBonus) * 2);
  }

  function restockShopInternal(shop, { automated = false } = {}) {
    if (!shop) return false;
    const cost = getShopRestockCost(shop);
    if (automated) {
      if (!internals.spendIndustryFunds(cost)) return false;
    } else if (app.getGame().player.money < cost) {
      app.appendLog("手头灵石不够进货。", "warn");
      return false;
    } else {
      app.getGame().player.money -= cost;
    }
    shop.stock += getShopRestockAmount(shop);
    shop.lastManagedResult = `补货 ${shop.stock} 批`;
    if (!automated) {
      app.appendLog(`你给${shop.label}补了新货。`, "info");
    }
    return true;
  }

  function restockShop(assetId) {
    const shop = internals.getAssets("shop").find((entry) => entry.id === assetId);
    if (!shop) return;
    restockShopInternal(shop);
  }

  function collectShopIncome(assetId) {
    const shop = internals.getAssets("shop").find((entry) => entry.id === assetId);
    if (!shop) return;
    if (shop.pendingIncome <= 0) {
      app.appendLog("今天铺面还没什么进账。", "info");
      return;
    }
    const income = shop.pendingIncome;
    shop.pendingIncome = 0;
    app.getGame().player.money += income;
    app.getGame().player.skills.trading += 0.5;
    app.getGame().player.stats.shopCollections += 1;
    app.adjustFactionStanding?.(app.getGame().player.affiliationId, 1.5);
    internals.applyIndustryNetworkGrowth("shop", income);
    app.appendLog(`你从${shop.label}收回了${income}灵石。`, "loot");
  }

  function processIndustryTick() {
    const game = app.getGame();
    app.refreshIndustryOrders(game.world.industryOrders.length < 3);
    if (game.world.hour !== 0) return;

    internals.getAssets("farm").forEach((farm) => {
      const operatorBonus = internals.getAssetOperatorBonus(farm);
      if (farm.cropId && farm.daysRemaining > 0) {
        const acceleration = farm.level >= 3 && Math.random() < 0.35 + operatorBonus ? 1 : 0;
        farm.daysRemaining = Math.max(0, farm.daysRemaining - 1 - acceleration);
      }
      if (farm.managerNpcId && farm.cropId && farm.daysRemaining <= 0) {
        const harvested = harvestCropInternal(farm, { automated: true });
        if (harvested && farm.automationTargetId) {
          plantCropInternal(farm, farm.automationTargetId, { automated: true });
        }
        return;
      }
      if (farm.managerNpcId && !farm.cropId && farm.automationTargetId) {
        plantCropInternal(farm, farm.automationTargetId, { automated: true });
      }
    });

    internals.getAssets("workshop").forEach((workshop) => {
      if (!workshop.managerNpcId || !workshop.automationTargetId) return;
      const recipe = app.getRecipe(workshop.automationTargetId);
      if (!recipe) return;
      const canRun = recipe.inputs.every((input) => (app.findInventoryEntry(input.itemId)?.quantity || 0) >= input.quantity);
      const automatedCost = Math.max(4, Math.round(recipe.cost * 0.6));
      if (!canRun || !internals.spendIndustryFunds(automatedCost)) return;
      recipe.inputs.forEach((input) => {
        app.removeItemFromInventory(input.itemId, input.quantity);
      });
      const support = internals.getIndustrySupportBonus("workshop", workshop.locationId);
      const operatorBonus = internals.getAssetOperatorBonus(workshop);
      const extraOutput = workshop.level >= 2 && Math.random() < 0.18 + support.output * 0.5 + operatorBonus ? 1 : 0;
      app.addItemToInventory(recipe.outputItemId, recipe.outputQuantity + extraOutput);
      game.player.skills.crafting += 0.25;
      game.player.stats.craftedItems += recipe.outputQuantity + extraOutput;
      workshop.lastManagedResult = `${app.getItem(recipe.outputItemId)?.name || recipe.outputItemId} x${recipe.outputQuantity + extraOutput}`;
      internals.applyIndustryNetworkGrowth("workshop", automatedCost + extraOutput * 18);
    });

    internals.getAssets("shop").forEach((shop) => {
      if (shop.managerNpcId && shop.stock <= 0) {
        restockShopInternal(shop, { automated: true });
      }
      if (shop.stock <= 0) return;
      const location = tables.LOCATION_MAP[shop.locationId];
      const support = internals.getIndustrySupportBonus("shop", shop.locationId);
      const operatorBonus = internals.getAssetOperatorBonus(shop);
      const income = Math.max(
        5,
        Math.round(4 + game.player.skills.trading * 0.45 + (location?.marketTier || 0) * 2 + shop.level * 3 + shop.level * (support.output + operatorBonus)),
      );
      const upkeep = Math.max(1, Math.round(shop.level * (1 - support.upkeep)));
      shop.stock -= 1;
      shop.pendingIncome += Math.max(2, income - upkeep);
      shop.lastManagedResult = `待收账 ${shop.pendingIncome} 灵石`;
    });

    app.refreshIndustryOrders(true);
  }

  Object.assign(app, {
    canPurchaseProperty,
    getPropertyPurchaseIssues,
    explainPropertyPurchase,
    purchaseProperty,
    getAssignAssetManagerIssues,
    explainAssignAssetManager,
    canAssignAssetManager,
    assignAssetManager,
    clearAssetManager,
    getSetAssetPlanIssues,
    explainSetAssetPlan,
    canSetAssetPlan,
    setAssetPlan,
    getAssetUpgradeCost,
    getAssetUpgradeIssues,
    explainAssetUpgrade,
    canUpgradeAsset,
    upgradeAsset,
    plantCrop,
    harvestCrop,
    getHarvestIssues,
    explainHarvest,
    canCraftRecipe,
    getCraftRecipeIssues,
    explainCraftRecipe,
    craftRecipe,
    restockShop,
    collectShopIncome,
    processIndustryTick,
  });
})();