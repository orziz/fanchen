(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { PROPERTY_DEFS, CROPS, CRAFT_RECIPES, FACTIONS } = tables;
  const { sample, uid } = utils;

  const DEED_ITEM_BY_KIND = {
    farm: "farm-deed",
    workshop: "workshop-permit",
    shop: "shop-deed",
  };

  const SECT_UNLOCK_BY_KIND = {
    farm: "hall",
    workshop: "dojo",
    shop: "market",
  };

  const ORDER_TEMPLATES = [
    {
      id: "grain-route",
      title: "乡社口粮单",
      desc: "青禾乡社正在补口粮，先把粗灵米送过去。",
      requirements: [{ itemId: "spirit-grain", quantity: 4 }],
      rewardMoney: 56,
      rewardReputation: 1.2,
      standing: 2.4,
      factionId: "qinghe-commons",
    },
    {
      id: "herb-relief",
      title: "药草济急单",
      desc: "迷林猎社在收治伤员，急需雾心草和草膏。",
      requirements: [{ itemId: "mist-herb", quantity: 2 }, { itemId: "herb-paste", quantity: 1 }],
      rewardMoney: 88,
      rewardReputation: 1.8,
      standing: 3.2,
      factionId: "mist-hunt-lodge",
    },
    {
      id: "forge-consignment",
      title: "工盟押货单",
      desc: "玄铁工盟在催一批练手兵刃，赶得上就能接后续门路。",
      requirements: [{ itemId: "wood-spear", quantity: 1 }, { itemId: "scrap-iron", quantity: 2 }],
      rewardMoney: 118,
      rewardReputation: 2.2,
      standing: 4,
      factionId: "blackforge-guild",
    },
    {
      id: "stall-restock",
      title: "商盟补货单",
      desc: "听潮商盟要临时补摊，粗布和杂木料都收。",
      requirements: [{ itemId: "cloth-roll", quantity: 2 }, { itemId: "timber", quantity: 2 }],
      rewardMoney: 96,
      rewardReputation: 1.6,
      standing: 3.4,
      factionId: "tide-market",
    },
    {
      id: "sect-supply",
      title: "山门备库单",
      desc: "玉阙山门要补一批基础资材，交货后更容易在门内站稳。",
      requirements: [{ itemId: "spirit-grain", quantity: 2 }, { itemId: "mist-herb", quantity: 2 }, { itemId: "cloth-roll", quantity: 1 }],
      rewardMoney: 102,
      rewardReputation: 2,
      standing: 3.8,
      factionId: "jadegate-order",
    },
  ];

  function getAssets(kind) {
    const game = app.getGame();
    return game.player.assets[`${kind}s`] || [];
  }

  function getIndustryOrders() {
    const world = app.getGame().world;
    world.industryOrders = Array.isArray(world.industryOrders) ? world.industryOrders : [];
    return world.industryOrders;
  }

  function createIndustryOrder(template) {
    const faction = FACTIONS.find((entry) => entry.id === template.factionId);
    return {
      id: uid(`order-${template.id}`),
      templateId: template.id,
      title: template.title,
      desc: template.desc,
      factionId: template.factionId,
      factionName: faction?.name || "行会",
      requirements: template.requirements.map((entry) => ({ ...entry })),
      rewardMoney: template.rewardMoney,
      rewardReputation: template.rewardReputation,
      standing: template.standing,
    };
  }

  function refreshIndustryOrders(force = false) {
    const world = app.getGame().world;
    const orders = getIndustryOrders();
    if (!force && world.industryOrderDay === world.day && orders.length >= 3) {
      return orders;
    }
    const nextTemplates = ORDER_TEMPLATES.slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    world.industryOrders = nextTemplates.map(createIndustryOrder);
    world.industryOrderDay = world.day;
    return world.industryOrders;
  }

  function getIndustryOrderIssues(orderId) {
    const order = getIndustryOrders().find((entry) => entry.id === orderId);
    if (!order) return ["这张订单已经失效。"];
    return order.requirements.flatMap((entry) => {
      const current = app.findInventoryEntry(entry.itemId)?.quantity || 0;
      if (current >= entry.quantity) return [];
      const itemName = app.getItem(entry.itemId)?.name || entry.itemId;
      return [`缺少${itemName} ${entry.quantity - current}件`];
    });
  }

  function explainIndustryOrder(orderId) {
    const issues = getIndustryOrderIssues(orderId);
    return issues.length ? issues.join("；") : "货物齐备，可以交付。";
  }

  function canFulfillIndustryOrder(orderId) {
    return getIndustryOrderIssues(orderId).length === 0;
  }

  function fulfillIndustryOrder(orderId) {
    const world = app.getGame().world;
    const orders = getIndustryOrders();
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    if (!canFulfillIndustryOrder(orderId)) {
      app.appendLog("你手头货不够，还交不了这笔订单。", "warn");
      return;
    }
    order.requirements.forEach((entry) => {
      app.removeItemFromInventory(entry.itemId, entry.quantity);
    });
    app.getGame().player.money += order.rewardMoney;
    app.getGame().player.reputation += order.rewardReputation;
    app.adjustFactionStanding?.(order.factionId, order.standing || 0);
    world.industryOrders = orders.filter((entry) => entry.id !== orderId);
    app.appendLog(`你完成了${order.factionName}的“${order.title}”，入账${order.rewardMoney}灵石。`, "loot");
    if (world.industryOrders.length === 0) {
      refreshIndustryOrders(true);
    }
  }

  function hasIndustryAccess(kind, property) {
    const game = app.getGame();
    const faction = app.getCurrentAffiliation?.();
    if (faction && faction.unlocks.includes(kind)) {
      if (!property || !property.allowedFactionIds || property.allowedFactionIds.includes(faction.id)) {
        return true;
      }
    }
    if (game.player.sect) {
      const buildingKey = SECT_UNLOCK_BY_KIND[kind];
      return (game.player.sect.buildings[buildingKey] || 0) > 0;
    }
    return false;
  }

  function getAvailableProperties() {
    const current = app.getCurrentLocation();
    return PROPERTY_DEFS.filter((property) => {
      if (property.locationTags && !property.locationTags.some((tag) => current.tags.includes(tag))) return false;
      return hasIndustryAccess(property.kind, property);
    });
  }

  function getLocalProperties() {
    const current = app.getCurrentLocation();
    return PROPERTY_DEFS.filter((property) => property.locationTags.some((tag) => current.tags.includes(tag)));
  }

  function getPropertyPurchaseIssues(propertyId) {
    const game = app.getGame();
    const property = app.getPropertyDef(propertyId);
    if (!property) return ["这处产业已经不存在。"];
    const issues = [];
    if (!property.locationTags.some((tag) => app.getCurrentLocation().tags.includes(tag))) {
      issues.push("当前地点不提供这类产业");
    }
    if (!hasIndustryAccess(property.kind, property)) {
      issues.push(`尚未打通${property.kind === "farm" ? "田产" : property.kind === "workshop" ? "工坊" : "铺面"}门路`);
    }
    if (game.player.money < property.cost) {
      issues.push(`灵石不足，还差${property.cost - game.player.money}`);
    }
    const deedItemId = DEED_ITEM_BY_KIND[property.kind];
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

  function getHarvestIssues(assetId) {
    const asset = getAssets("farm").find((entry) => entry.id === assetId);
    if (!asset || !asset.cropId) return ["这块田里还没有作物。"];
    if (asset.daysRemaining > 0) return [`作物尚未成熟，还需${asset.daysRemaining}天`];
    return [];
  }

  function explainHarvest(assetId) {
    const issues = getHarvestIssues(assetId);
    return issues.length ? issues.join("；") : "作物已熟，可以收成。";
  }

  function purchaseProperty(propertyId) {
    const game = app.getGame();
    const property = app.getPropertyDef(propertyId);
    if (!property || !canPurchaseProperty(propertyId)) {
      app.appendLog("眼下还买不起或买不到这处产业。", "warn");
      return;
    }
    const deedItemId = DEED_ITEM_BY_KIND[property.kind];
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
    };
    getAssets(property.kind).push(asset);
    app.appendLog(`${property.label}已经记在你名下。`, "loot");
    if (property.kind === "farm") app.adjustFactionStanding?.(game.player.affiliationId, 2);
    if (property.kind === "workshop") app.adjustFactionStanding?.(game.player.affiliationId, 3);
    if (property.kind === "shop") app.adjustFactionStanding?.(game.player.affiliationId, 3);
  }

  function plantCrop(assetId, cropId) {
    const asset = getAssets("farm").find((entry) => entry.id === assetId);
    const crop = app.getCrop(cropId);
    if (!asset || !crop) return;
    if (asset.cropId) {
      app.appendLog("这块田还没腾出来。", "warn");
      return;
    }
    if (!app.removeItemFromInventory(crop.seedItemId, 1)) {
      app.appendLog("你手头没有对应种子。", "warn");
      return;
    }
    asset.cropId = crop.id;
    asset.daysRemaining = crop.growDays;
    app.appendLog(`你在${asset.label}里种下了${crop.label}。`, "info");
  }

  function harvestCrop(assetId) {
    const asset = getAssets("farm").find((entry) => entry.id === assetId);
    if (!asset || !asset.cropId) return;
    if (asset.daysRemaining > 0) {
      app.appendLog("作物尚未成熟。", "warn");
      return;
    }
    const crop = app.getCrop(asset.cropId);
    if (!crop) return;
    app.addItemToInventory(crop.harvestItemId, crop.yield);
    asset.cropId = null;
    asset.daysRemaining = 0;
    app.getGame().player.skills.farming += 0.4;
    app.getGame().player.stats.cropsHarvested += crop.yield;
    app.adjustFactionStanding?.(app.getGame().player.affiliationId, 1.5);
    app.appendLog(`你从${asset.label}收成了${app.getItem(crop.harvestItemId)?.name || crop.harvestItemId} x${crop.yield}。`, "loot");
  }

  function canCraftRecipe(recipeId) {
    return getCraftRecipeIssues(recipeId).length === 0;
  }

  function getCraftRecipeIssues(recipeId) {
    const recipe = app.getRecipe(recipeId);
    const game = app.getGame();
    if (!recipe) return ["这张配方当前不可用。"];
    const issues = [];
    if (!getAssets(recipe.requiresPropertyKind).length) {
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

  function craftRecipe(recipeId) {
    const recipe = app.getRecipe(recipeId);
    const game = app.getGame();
    if (!recipe || !canCraftRecipe(recipeId)) {
      app.appendLog("材料、工坊或手艺还不够，暂时做不出这件东西。", "warn");
      return;
    }
    recipe.inputs.forEach((input) => {
      app.removeItemFromInventory(input.itemId, input.quantity);
    });
    game.player.money -= recipe.cost;
    app.addItemToInventory(recipe.outputItemId, recipe.outputQuantity);
    game.player.skills.crafting += 0.6;
    game.player.stats.craftedItems += recipe.outputQuantity;
    app.adjustFactionStanding?.(game.player.affiliationId, 2);
    app.appendLog(`你亲手做出了${app.getItem(recipe.outputItemId)?.name || recipe.outputItemId}。`, "loot");
  }

  function restockShop(assetId) {
    const shop = getAssets("shop").find((entry) => entry.id === assetId);
    const game = app.getGame();
    if (!shop) return;
    const cost = 24;
    if (game.player.money < cost) {
      app.appendLog("手头灵石不够进货。", "warn");
      return;
    }
    game.player.money -= cost;
    shop.stock += 3;
    app.appendLog(`你给${shop.label}补了新货。`, "info");
  }

  function collectShopIncome(assetId) {
    const shop = getAssets("shop").find((entry) => entry.id === assetId);
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
    app.appendLog(`你从${shop.label}收回了${income}灵石。`, "loot");
  }

  function processIndustryTick() {
    const game = app.getGame();
    refreshIndustryOrders(game.world.industryOrders.length < 3);
    if (game.world.hour !== 0) return;

    getAssets("farm").forEach((farm) => {
      if (!farm.cropId || farm.daysRemaining <= 0) return;
      farm.daysRemaining -= 1;
    });

    getAssets("shop").forEach((shop) => {
      if (shop.stock <= 0) return;
      const location = tables.LOCATION_MAP[shop.locationId];
      const income = 8 + Math.round(game.player.skills.trading) + (location?.marketTier || 0) * 4;
      shop.stock -= 1;
      shop.pendingIncome += income;
    });

    refreshIndustryOrders(true);
  }

  Object.assign(app, {
    getAvailableProperties,
    getLocalProperties,
    getIndustryOrders,
    refreshIndustryOrders,
    canFulfillIndustryOrder,
    getIndustryOrderIssues,
    explainIndustryOrder,
    fulfillIndustryOrder,
    canPurchaseProperty,
    getPropertyPurchaseIssues,
    explainPropertyPurchase,
    purchaseProperty,
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