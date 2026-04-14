(() => {
  const app = window.ShanHai;
  const { tables, utils, dom } = app;
  const { RARITY_META, LOCATION_MAP, CROPS, CRAFT_RECIPES } = tables;
  const { formatNumber, round } = utils;

  function renderInventoryPanel() {
    const game = app.getGame();
    const sect = game.player.sect;
    const labelMap = { weapon: "兵器", armor: "护甲", manual: "功法" };

    const equipmentEntries = Object.entries(game.player.equipment).map(([slot, itemId]) => {
      const item = itemId ? app.getItem(itemId) : null;
      return `
        <div class="item-card">
          <div class="item-top">
            <div>
              <p class="section-kicker">${labelMap[slot]}</p>
              <h3 class="item-title">${item ? item.name : "未装备"}</h3>
              <p class="item-meta">${item ? item.desc : "对应类型的物品可以在这里装备或参悟。"}</p>
            </div>
            <span class="rarity ${item ? RARITY_META[item.rarity].color : "common"}">${item ? RARITY_META[item.rarity].label : "空位"}</span>
          </div>
          <p class="item-meta">${item ? app.describeItemEffect(item) : ""}</p>
        </div>
      `;
    }).join("");

    const inventoryCards = game.player.inventory.length
      ? game.player.inventory
          .slice()
          .sort((left, right) => app.getItem(right.itemId).baseValue - app.getItem(left.itemId).baseValue)
          .map((entry) => {
            const item = app.getItem(entry.itemId);
            return `
              <div class="item-card">
                <div class="item-top">
                  <div>
                    <h3 class="item-title">${item.name} x${entry.quantity}</h3>
                    <p class="item-meta">${item.desc}</p>
                  </div>
                  <span class="rarity ${RARITY_META[item.rarity].color}">${RARITY_META[item.rarity].label}</span>
                </div>
                <p class="item-meta">效果：${app.describeItemEffect(item) || "可在交易、建宗或战斗中使用。"}</p>
                <div class="item-actions">
                  <button class="item-button" data-use-item="${item.id}">${["weapon", "armor", "manual"].includes(item.type) ? "装备 / 参悟" : "使用"}</button>
                  <button class="item-button" data-sell-item="${item.id}">出售一件</button>
                  ${sect && item.type === "manual" ? `<button class="item-button" data-stash-manual="${item.id}">收入藏经阁</button>` : ""}
                </div>
              </div>
            `;
          }).join("")
      : `<div class="empty-state">你的行囊暂时空空如也，出去历练或做生意吧。</div>`;

    dom.inventoryPanel.innerHTML = `
      <p class="panel-intro">这里汇总你的装备、功法和背包。功法、装备、宗门藏经都会直接影响修炼、战斗和传功效率。</p>
      <div class="inventory-grid">${equipmentEntries}</div>
      <h3 class="subsection-title">行囊</h3>
      <div class="inventory-grid">${inventoryCards}</div>
    `;
  }

  function getMarketScore(locationId, listings) {
    const location = LOCATION_MAP[locationId];
    const stockValue = listings.reduce((sum, listing) => sum + listing.price * listing.quantity, 0);
    return stockValue + location.aura * 10 + location.danger * 18;
  }

  function renderMarketPanel() {
    const game = app.getGame();
    const currentLocation = app.getCurrentLocation();
    const markets = Object.entries(game.market)
      .sort((left, right) => getMarketScore(right[0], right[1]) - getMarketScore(left[0], left[1]))
      .map(([locationId, listings]) => {
        const town = LOCATION_MAP[locationId];
        const cards = listings.slice(0, 6).map((listing) => {
          const item = app.getItem(listing.itemId);
          return `
            <div class="market-card">
              <div class="market-top">
                <div>
                  <h3 class="market-title">${item.name} x${listing.quantity}</h3>
                  <p class="market-meta">${item.desc}</p>
                </div>
                <span class="rarity ${RARITY_META[item.rarity].color}">${listing.price} 灵石</span>
              </div>
              <p class="market-meta">卖家：${listing.seller}</p>
              <p class="market-meta">效果：${app.describeItemEffect(item) || "主要用于收藏或流转。"}</p>
              <div class="market-actions">
                ${locationId === currentLocation.id ? `<button class="item-button" data-buy-listing="${listing.listingId}">立即购入</button>` : `<button class="item-button" data-travel-market="${locationId}">前往${town.short}</button>`}
              </div>
            </div>
          `;
        }).join("");

        return `
          <div>
            <h3 class="subsection-title">${town.name}</h3>
            <p class="panel-intro">灵气 ${town.aura}，偏好 ${app.getMarketBiasLabel(town.marketBias)}，特产 ${town.resource}。</p>
            <div class="market-grid">${cards || `<div class="empty-state">暂无货品。</div>`}</div>
          </div>
        `;
      }).join("");

    dom.marketPanel.innerHTML = `
      <p class="panel-intro">商铺每隔几个时辰就会刷新。行商模式会自动低买高卖，而你也可以手动扫货、换线、屯功法。</p>
      ${markets}
    `;
  }

  function renderAuctionPanel() {
    const game = app.getGame();
    const listings = game.auction
      .slice()
      .sort((left, right) => right.currentBid - left.currentBid)
      .map((listing) => {
        const item = app.getItem(listing.itemId);
        const leader = listing.bidderId === "player"
          ? "你"
          : listing.bidderId.startsWith("npc-")
            ? app.getNpc(listing.bidderId)?.name || "某位修士"
            : "神秘买家";
        return `
          <div class="auction-card">
            <div class="auction-top">
              <div>
                <h3 class="auction-title">${item.name}</h3>
                <p class="auction-meta">${item.desc}</p>
              </div>
              <span class="rarity ${RARITY_META[item.rarity].color}">${RARITY_META[item.rarity].label}</span>
            </div>
            <div class="inline-list">
              <span class="auction-timer">当前价 ${listing.currentBid}</span>
              <span class="auction-timer">领先者 ${leader}</span>
              <span class="auction-timer">剩余 ${listing.turnsLeft} 回合</span>
            </div>
            <p class="auction-meta">卖家：${listing.seller}</p>
            <div class="auction-actions">
              <button class="item-button" data-bid-id="${listing.id}">加价 ${listing.minimumRaise}</button>
            </div>
          </div>
        `;
      }).join("");

    dom.auctionPanel.innerHTML = `
      <p class="panel-intro">拍卖行会按世界时辰自动结算。NPC 会依据财富、性格和与你的关系抬价，不会只是陪跑。</p>
      <div class="auction-list">${listings || `<div class="empty-state">拍卖场正在换批次，请稍后再看。</div>`}</div>
    `;
  }

  function renderIndustryPanel() {
    const game = app.getGame();
    const properties = app.getLocalProperties?.() || [];
    const orders = app.refreshIndustryOrders?.() || [];
    const farms = game.player.assets.farms;
    const workshops = game.player.assets.workshops;
    const shops = game.player.assets.shops;

    const orderCards = orders.length
      ? orders.map((order) => {
          const canFulfill = app.canFulfillIndustryOrder(order.id);
          return `
            <div class="item-card">
              <div class="item-top">
                <div>
                  <h3 class="item-title">${order.title}</h3>
                  <p class="item-meta">${order.factionName} · ${order.desc}</p>
                </div>
                <span class="rarity uncommon">报酬 ${order.rewardMoney}</span>
              </div>
              <p class="item-meta">交付：${order.requirements.map((entry) => {
                const current = app.findInventoryEntry(entry.itemId)?.quantity || 0;
                return `${app.getItem(entry.itemId)?.name || entry.itemId} ${current}/${entry.quantity}`;
              }).join("、")}</p>
              <p class="item-meta">额外收益：声望 +${round(order.rewardReputation, 1)}</p>
              <div class="item-actions">
                <button class="item-button" data-fulfill-order="${order.id}" ${app.getGuardAttrs(canFulfill, app.explainIndustryOrder(order.id))}>${canFulfill ? "交付订单" : "查看缺口"}</button>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">各地行会正在换单，过几个时辰再来看看。</div>`;

    const propertyCards = properties.length
      ? properties.map((property) => {
          const canPurchase = app.canPurchaseProperty(property.id);
          const routes = (property.allowedFactionIds || []).map((factionId) => app.getFaction(factionId)?.name).filter(Boolean);
          return `
            <div class="world-card">
              <span>${property.label}</span>
              <strong>${property.cost} 灵石</strong>
              <p class="item-meta">${property.desc}</p>
              <p class="item-meta">门路来源：${routes.length ? routes.join("、") : app.getUnlockLabel(property.kind)}</p>
              <div class="item-actions">
                <button class="item-button" data-buy-property="${property.id}" ${app.getGuardAttrs(canPurchase, app.explainPropertyPurchase(property.id))}>${canPurchase ? "购入到自己名下" : "查看购入条件"}</button>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">当前地点没有可经营的产业类型，换个地方看看。</div>`;

    const farmCards = farms.length
      ? farms.map((farm) => {
          const crop = farm.cropId ? app.getCrop(farm.cropId) : null;
          return `
            <div class="item-card">
              <div class="item-top">
                <div>
                  <h3 class="item-title">${farm.label}</h3>
                  <p class="item-meta">地点：${LOCATION_MAP[farm.locationId]?.name || farm.locationId}</p>
                </div>
                <span class="rarity common">田产</span>
              </div>
              <p class="item-meta">${crop ? `${crop.label} 剩余 ${farm.daysRemaining} 天` : "当前空置，可立即播种。"}</p>
              <div class="item-actions">
                ${!crop ? CROPS.map((entry) => `<button class="item-button" data-plant-crop="${entry.id}" data-asset-id="${farm.id}">种${entry.label}</button>`).join("") : `<button class="item-button" data-harvest-asset="${farm.id}" ${app.getGuardAttrs(farm.daysRemaining <= 0, app.explainHarvest(farm.id))}>${farm.daysRemaining > 0 ? "查看成熟时间" : "收成"}</button>`}
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">你还没有属于自己的田地。</div>`;

    const workshopCards = workshops.length
      ? workshops.map((workshop) => `
          <div class="item-card">
            <div class="item-top">
              <div>
                <h3 class="item-title">${workshop.label}</h3>
                <p class="item-meta">地点：${LOCATION_MAP[workshop.locationId]?.name || workshop.locationId}</p>
              </div>
              <span class="rarity uncommon">工坊</span>
            </div>
            <div class="teaching-actions">
              ${CRAFT_RECIPES.map((recipe) => `<button class="npc-button" data-craft-recipe="${recipe.id}" ${app.getGuardAttrs(app.canCraftRecipe(recipe.id), app.explainCraftRecipe(recipe.id))}>${app.canCraftRecipe(recipe.id) ? recipe.label : `查看${recipe.label}条件`}</button>`).join("")}
            </div>
          </div>
        `).join("")
      : `<div class="empty-state">你还没有属于自己的工坊。</div>`;

    const shopCards = shops.length
      ? shops.map((shop) => `
          <div class="item-card">
            <div class="item-top">
              <div>
                <h3 class="item-title">${shop.label}</h3>
                <p class="item-meta">地点：${LOCATION_MAP[shop.locationId]?.name || shop.locationId}</p>
              </div>
              <span class="rarity rare">铺面</span>
            </div>
            <p class="item-meta">库存 ${shop.stock} 批，待收账 ${shop.pendingIncome} 灵石</p>
            <div class="item-actions">
              <button class="item-button" data-restock-shop="${shop.id}">进货</button>
              <button class="item-button" data-collect-shop="${shop.id}">收账</button>
            </div>
          </div>
        `).join("")
      : `<div class="empty-state">你还没有属于自己的铺面。</div>`;

    dom.industryPanel.innerHTML = `
      <p class="panel-intro">产业系统围绕“记到自己名下”展开。现在会直接告诉你为什么买不了、交不了、做不出，不再只有按下去没反应。</p>
      <h3 class="subsection-title">行会订单</h3>
      <div class="inventory-grid industry-stack">${orderCards}</div>
      <h3 class="subsection-title">当前地点可经营产业</h3>
      <div class="world-grid industry-stack">${propertyCards}</div>
      <h3 class="subsection-title">名下田产</h3>
      <div class="inventory-grid industry-stack">${farmCards}</div>
      <h3 class="subsection-title">名下工坊</h3>
      <div class="inventory-grid industry-stack">${workshopCards}</div>
      <h3 class="subsection-title">名下铺面</h3>
      <div class="inventory-grid industry-stack">${shopCards}</div>
    `;
  }

  Object.assign(app, {
    renderInventoryPanel,
    renderMarketPanel,
    renderAuctionPanel,
    renderIndustryPanel,
  });
})();