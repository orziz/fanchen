(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { PROPERTY_DEFS, FACTIONS } = tables;
  const { uid } = utils;

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
      title: "行院备库单",
      desc: "玉阙行院要补一批基础资材，交货后更容易在外院站稳。",
      requirements: [{ itemId: "spirit-grain", quantity: 2 }, { itemId: "mist-herb", quantity: 2 }, { itemId: "cloth-roll", quantity: 1 }],
      rewardMoney: 102,
      rewardReputation: 2,
      standing: 3.8,
      factionId: "jadegate-courtyard",
    },
  ];

  const internals = app.industryInternals || (app.industryInternals = {} as ShanHaiIndustryInternals);

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

  function getGovernmentContractOffers(locationId = app.getCurrentLocation().id) {
    const location = tables.LOCATION_MAP[locationId];
    if (!location || !app.getGovernmentOfficeName?.(locationId)) return [];
    const localKinds = [...new Set(PROPERTY_DEFS
      .filter((property) => property.locationTags.some((tag) => location.tags.includes(tag)))
      .map((property) => property.kind))];

    return localKinds
      .filter((kind) => internals.GOVERNMENT_CONTRACTS[kind])
      .map((kind) => {
        const contract = internals.GOVERNMENT_CONTRACTS[kind];
        const item = app.getItem(contract.itemId);
        return {
          kind,
          itemId: contract.itemId,
          label: item?.name || contract.itemId,
          price: Math.max(18, Math.round((item?.baseValue || 0) * contract.priceFactor)),
          standingNeed: internals.getGovernmentStandingNeed(kind, locationId),
          desc: contract.desc,
        };
      });
  }

  function getGovernmentContractIssues(kind) {
    const offer = getGovernmentContractOffers().find((entry) => entry.kind === kind);
    const game = app.getGame();
    if (!offer) return ["当前没有官府出售这类契约。"]; 

    const issues = [];
    const standing = app.getRegionStanding?.() || 0;
    if (standing < offer.standingNeed) {
      issues.push(`地区声望不足，还差${(offer.standingNeed - standing).toFixed(1)}`);
    }
    if (game.player.money < offer.price) {
      issues.push(`灵石不足，还差${offer.price - game.player.money}`);
    }
    return issues;
  }

  function explainGovernmentContract(kind) {
    const issues = getGovernmentContractIssues(kind);
    return issues.length ? issues.join("；") : "官府愿意卖你这份契约。";
  }

  function canPurchaseGovernmentContract(kind) {
    return getGovernmentContractIssues(kind).length === 0;
  }

  function purchaseGovernmentContract(kind) {
    const offer = getGovernmentContractOffers().find((entry) => entry.kind === kind);
    const game = app.getGame();
    if (!offer || !canPurchaseGovernmentContract(kind)) {
      app.appendLog("官府暂时不愿把这份契约卖给你。", "warn");
      return;
    }
    game.player.money -= offer.price;
    app.addItemToInventory(offer.itemId, 1);
    app.adjustRegionStanding?.(app.getCurrentLocation().id, 0.8);
    app.appendLog(`${app.getGovernmentOfficeName?.() || "官府"}以${offer.price}灵石卖给你一份${offer.label}。`, "loot");
  }

  Object.assign(app, {
    getGovernmentContractOffers,
    getGovernmentContractIssues,
    explainGovernmentContract,
    canPurchaseGovernmentContract,
    purchaseGovernmentContract,
    getIndustryOrders,
    refreshIndustryOrders,
    canFulfillIndustryOrder,
    getIndustryOrderIssues,
    explainIndustryOrder,
    fulfillIndustryOrder,
  });
})();