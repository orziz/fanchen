(() => {
  const app = window.ShanHai;
  const { tables, utils, dom } = app;
  const { RARITY_META, LOCATION_MAP, CROPS, CRAFT_RECIPES } = tables;
  const { formatNumber, round } = utils;

  function renderAssetDelegateControls(kind, asset) {
    const candidates = app.getAssetDelegateCandidates?.() || [];
    const manager = app.getAssetManager?.(kind, asset.id);
    const candidateButtons = candidates.length
      ? candidates.map((npc) => `<button class="npc-button" data-assign-asset-kind="${kind}" data-assign-asset-id="${asset.id}" data-assign-asset-npc="${npc.id}" ${app.getGuardAttrs(app.canAssignAssetManager?.(kind, asset.id, npc.id), app.explainAssignAssetManager?.(kind, asset.id, npc.id) || "条件不足")}>${manager?.id === npc.id ? `管事 ${npc.name}` : `委派 ${npc.name}`}</button>`).join("")
      : `<span class="muted">暂无可委派人手</span>`;
    const planButtons = kind === "farm"
      ? CROPS.map((crop) => `<button class="npc-button" data-set-asset-plan-kind="farm" data-set-asset-plan-id="${asset.id}" data-plan-target="${crop.id}" ${app.getGuardAttrs(app.canSetAssetPlan?.("farm", asset.id, crop.id), app.explainSetAssetPlan?.("farm", asset.id, crop.id) || "条件不足")}>轮种${crop.label}</button>`).join("")
      : kind === "workshop"
        ? CRAFT_RECIPES.map((recipe) => `<button class="npc-button" data-set-asset-plan-kind="workshop" data-set-asset-plan-id="${asset.id}" data-plan-target="${recipe.id}" ${app.getGuardAttrs(app.canSetAssetPlan?.("workshop", asset.id, recipe.id), app.explainSetAssetPlan?.("workshop", asset.id, recipe.id) || "条件不足")}>常做${recipe.label}</button>`).join("")
        : "";

    return `
      <p class="item-meta">管事：${app.getAssetManagerLabel?.(asset) || "暂未委派"} · 章程：${app.getAssetAutomationLabel?.(kind, asset) || "未定"}</p>
      <div class="teaching-actions">${candidateButtons}</div>
      ${planButtons ? `<div class="teaching-actions">${planButtons}</div>` : ""}
      ${manager ? `<div class="item-actions"><button class="item-button" data-clear-asset-kind="${kind}" data-clear-asset-id="${asset.id}">收回管事</button></div>` : ""}
    `;
  }

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
      <p class="panel-intro">行囊里装着兵刃、护具、功法和契物，随时能拿来撑住你的修行、营生与山门根基。</p>
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
    const currentStanding = app.getRegionStanding?.(currentLocation.id) || 0;
    const governmentOffice = app.getGovernmentOfficeName?.(currentLocation.id);
    const activeTradeRun = app.getActiveTradeRun?.();
    const routeCards = (app.getTradeRouteOptions?.(currentLocation.id) || []).map((route) => `
      <div class="item-card ${route.affordable ? "" : "muted-card"}">
        <div class="item-top">
          <div>
            <h3 class="item-title">${route.originName} → ${route.destinationName}</h3>
            <p class="item-meta">${route.cargoLabel} · ${route.segments} 段路程 · 到站预估 ${route.saleEstimate}</p>
          </div>
          <span class="rarity uncommon">净利约 ${route.profitEstimate}</span>
        </div>
        <p class="item-meta">压货 ${route.purchaseCost} 灵石，目的地声望 ${route.localStanding.toFixed(1)}</p>
        <div class="item-actions">
          <button class="item-button" data-start-trade-run="${route.destinationId}" ${app.getGuardAttrs(route.affordable && !activeTradeRun, activeTradeRun ? "你已有在途货路。" : `灵石不足，还差${route.purchaseCost - game.player.money}`)}>${route.affordable ? "压货启程" : "查看压货条件"}</button>
        </div>
      </div>
    `).join("") || `<div class="empty-state">当前地点没有成形的大宗货路。</div>`;
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
      <p class="panel-intro">市集货架随时辰轮转。压货、跑城、交割和踩线，才是把商路滚活的正经做法。</p>
      <div class="summary-grid">
        <div class="summary-box"><span>当前商技</span><strong>${round(game.player.skills.trading, 1)}</strong></div>
        <div class="summary-box"><span>本地声望</span><strong>${round(currentStanding, 1)}</strong></div>
        <div class="summary-box"><span>官府文契</span><strong>${governmentOffice || "无官衙驻点"}</strong></div>
        <div class="summary-box"><span>在途货路</span><strong>${activeTradeRun ? `${activeTradeRun.originName}→${activeTradeRun.destinationName}` : "暂无"}</strong></div>
      </div>
      ${activeTradeRun ? `
        <div class="combat-card standout">
          <div class="auction-top">
            <div>
              <p class="section-kicker">当前货队</p>
              <h3 class="auction-title">${activeTradeRun.cargoLabel}</h3>
              <p class="auction-meta">${activeTradeRun.originName} → ${activeTradeRun.destinationName} · 压货 ${activeTradeRun.purchaseCost} · 预估到手 ${activeTradeRun.saleEstimate}</p>
            </div>
            <span class="rarity rare">${currentLocation.id === activeTradeRun.destinationId ? "已到站" : "在途"}</span>
          </div>
          <div class="auction-actions">
            <button class="item-button" data-continue-trade-run="1">${currentLocation.id === activeTradeRun.destinationId ? "交割货队" : `继续前往${activeTradeRun.destinationName}`}</button>
          </div>
        </div>
      ` : ""}
      <h3 class="subsection-title">跑商货路</h3>
      <div class="inventory-grid industry-stack">${routeCards}</div>
      <h3 class="subsection-title">各地市集</h3>
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
      <p class="panel-intro">拍场随时辰落槌。谁有家底、谁肯争、谁和你过不去，都会体现在价码上。</p>
      <div class="auction-list">${listings || `<div class="empty-state">拍卖场正在换批次，请稍后再看。</div>`}</div>
    `;
  }

  function renderIndustryPanel() {
    const game = app.getGame();
    const properties = app.getLocalProperties?.() || [];
    const governmentContracts = app.getGovernmentContractOffers?.() || [];
    const orders = app.refreshIndustryOrders?.() || [];
    const farms = game.player.assets.farms;
    const workshops = game.player.assets.workshops;
    const shops = game.player.assets.shops;
    const currentStanding = app.getRegionStanding?.() || 0;
    const governmentOffice = app.getGovernmentOfficeName?.();
    const playerFaction = app.getPlayerFaction?.();
    const sect = game.player.sect;

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

    const governmentCards = governmentContracts.length
      ? governmentContracts.map((offer) => {
          const canPurchase = app.canPurchaseGovernmentContract(offer.kind);
          return `
            <div class="item-card">
              <div class="item-top">
                <div>
                  <h3 class="item-title">${offer.label}</h3>
                  <p class="item-meta">${governmentOffice} · ${offer.desc}</p>
                </div>
                <span class="rarity uncommon">${offer.price} 灵石</span>
              </div>
              <p class="item-meta">购置门槛：地区声望 ${offer.standingNeed}，当前 ${round(currentStanding, 1)}</p>
              <div class="item-actions">
                <button class="item-button" data-buy-gov-contract="${offer.kind}" ${app.getGuardAttrs(canPurchase, app.explainGovernmentContract(offer.kind))}>${canPurchase ? "从官府买契" : "查看购置条件"}</button>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">当前地点没有衙门公开售契，想买官契就去州府或河埠试试。</div>`;

    const farmCards = farms.length
      ? farms.map((farm) => {
          const crop = farm.cropId ? app.getCrop(farm.cropId) : null;
          return `
            <div class="item-card">
              <div class="item-top">
                <div>
                  <h3 class="item-title">${farm.label}</h3>
                  <p class="item-meta">地点：${LOCATION_MAP[farm.locationId]?.name || farm.locationId} · ${farm.level} 级</p>
                </div>
                <span class="rarity common">田产</span>
              </div>
              <p class="item-meta">${crop ? `${crop.label} 剩余 ${farm.daysRemaining} 天` : "当前空置，可立即播种。"}</p>
              ${renderAssetDelegateControls("farm", farm)}
              <div class="item-actions">
                ${!crop ? CROPS.map((entry) => `<button class="item-button" data-plant-crop="${entry.id}" data-asset-id="${farm.id}">种${entry.label}</button>`).join("") : `<button class="item-button" data-harvest-asset="${farm.id}" ${app.getGuardAttrs(farm.daysRemaining <= 0, app.explainHarvest(farm.id))}>${farm.daysRemaining > 0 ? "查看成熟时间" : "收成"}</button>`}
                <button class="item-button" data-upgrade-asset-kind="farm" data-upgrade-asset-id="${farm.id}" ${app.getGuardAttrs(app.canUpgradeAsset?.("farm", farm.id), app.explainAssetUpgrade?.("farm", farm.id) || "条件不足")}>${app.canUpgradeAsset?.("farm", farm.id) ? `扩田 ${app.getAssetUpgradeCost?.("farm", farm.id)} 灵石` : "查看扩建条件"}</button>
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
                <p class="item-meta">地点：${LOCATION_MAP[workshop.locationId]?.name || workshop.locationId} · ${workshop.level} 级</p>
              </div>
              <span class="rarity uncommon">工坊</span>
            </div>
            <p class="item-meta">炉火旺、章程稳，工坊出的货才厚实。</p>
            ${renderAssetDelegateControls("workshop", workshop)}
            <div class="teaching-actions">
              ${CRAFT_RECIPES.map((recipe) => `<button class="npc-button" data-craft-recipe="${recipe.id}" ${app.getGuardAttrs(app.canCraftRecipe(recipe.id), app.explainCraftRecipe(recipe.id))}>${app.canCraftRecipe(recipe.id) ? recipe.label : `查看${recipe.label}条件`}</button>`).join("")}
            </div>
            <div class="item-actions">
              <button class="item-button" data-upgrade-asset-kind="workshop" data-upgrade-asset-id="${workshop.id}" ${app.getGuardAttrs(app.canUpgradeAsset?.("workshop", workshop.id), app.explainAssetUpgrade?.("workshop", workshop.id) || "条件不足")}>${app.canUpgradeAsset?.("workshop", workshop.id) ? `扩坊 ${app.getAssetUpgradeCost?.("workshop", workshop.id)} 灵石` : "查看扩建条件"}</button>
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
                <p class="item-meta">地点：${LOCATION_MAP[shop.locationId]?.name || shop.locationId} · ${shop.level} 级</p>
              </div>
              <span class="rarity rare">铺面</span>
            </div>
            <p class="item-meta">库存 ${shop.stock} 批，待收账 ${shop.pendingIncome} 灵石。铺面吃的是薄利长流，货线和地盘越稳，账越厚。</p>
            ${renderAssetDelegateControls("shop", shop)}
            <div class="item-actions">
              <button class="item-button" data-restock-shop="${shop.id}">进货</button>
              <button class="item-button" data-collect-shop="${shop.id}">收账</button>
              <button class="item-button" data-upgrade-asset-kind="shop" data-upgrade-asset-id="${shop.id}" ${app.getGuardAttrs(app.canUpgradeAsset?.("shop", shop.id), app.explainAssetUpgrade?.("shop", shop.id) || "条件不足")}>${app.canUpgradeAsset?.("shop", shop.id) ? `扩铺 ${app.getAssetUpgradeCost?.("shop", shop.id)} 灵石` : "查看扩建条件"}</button>
            </div>
          </div>
        `).join("")
      : `<div class="empty-state">你还没有属于自己的铺面。</div>`;

    dom.industryPanel.innerHTML = `
      <p class="panel-intro">此处可置办官契、接行会单、扩建田产工坊铺面，也能把活计交给门下或自家人去跑。</p>
      <div class="summary-grid">
        <div class="summary-box"><span>本地声望</span><strong>${round(currentStanding, 1)}</strong></div>
        <div class="summary-box"><span>官府驻点</span><strong>${governmentOffice || "无"}</strong></div>
        <div class="summary-box"><span>名下产业</span><strong>${farms.length + workshops.length + shops.length}</strong></div>
        <div class="summary-box"><span>现银</span><strong>${game.player.money}</strong></div>
        <div class="summary-box"><span>自家势力加成</span><strong>${playerFaction ? playerFaction.name : "暂无"}</strong></div>
        <div class="summary-box"><span>宗门加成</span><strong>${sect ? sect.name : "暂无"}</strong></div>
        <div class="summary-box"><span>可委派人手</span><strong>${(app.getAssetDelegateCandidates?.() || []).length}</strong></div>
      </div>
      <h3 class="subsection-title">官府契约</h3>
      <div class="inventory-grid industry-stack">${governmentCards}</div>
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