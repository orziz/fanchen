(() => {
  // 已拆分到 scripts/ui/panels/*.js，保留空壳以兼容旧引用。
})();
  function renderLocationDetail() {
    const game = app.getGame();
    const selected = app.getSelectedLocation();
    const current = app.getCurrentLocation();
    const isCurrent = selected.id === current.id;
    const reachable = isCurrent || app.currentLocationCanReach(selected.id);
    const residents = game.npcs.filter((npc) => npc.locationId === selected.id).slice(0, 5);
    const activeRealm = game.world.realm.activeRealmId === selected.realmId ? app.getRealm(selected.realmId) : null;
    const factionsHere = FACTIONS.filter((faction) => selected.factionIds?.includes(faction.id));
    const industryHints = [
      selected.tags.includes("starter") ? "适合白手起家" : null,
      selected.tags.includes("town") ? "可置办田产或铺面" : null,
      selected.tags.includes("forge") ? "可经营工坊" : null,
      selected.tags.includes("market") || selected.tags.includes("port") ? "适合行商开铺" : null,
      selected.tags.includes("sect") ? "有宗门产业门路" : null,
    ].filter(Boolean);

    dom.locationDetail.innerHTML = `
      <div class="location-card">
        <div class="location-top">
          <div>
            <p class="section-kicker">地脉详情</p>
            <h3 class="location-title">${selected.name}</h3>
            <p class="location-meta">${selected.desc}</p>
          </div>
          <div class="inline-list">
            <span class="tag">${selected.region}</span>
            <span class="tag">灵气 ${selected.aura}</span>
            <span class="tag">风险 ${selected.danger}</span>
          </div>
        </div>

        <div class="two-column">
          <div class="world-card"><span>地貌</span><strong>${selected.terrain}</strong></div>
          <div class="world-card"><span>特产</span><strong>${selected.resource}</strong></div>
          <div class="world-card"><span>市集层级</span><strong>${selected.marketTier || 0} 阶</strong></div>
          <div class="world-card"><span>势力驻点</span><strong>${factionsHere.length ? factionsHere.map((faction) => faction.name).join(" / ") : "暂无"}</strong></div>
        </div>

        ${activeRealm ? `
          <div class="divider"></div>
          <div class="combat-card standout">
            <div class="location-top">
              <div>
                <p class="section-kicker">首领秘境</p>
                <h3 class="location-title">${activeRealm.name}</h3>
                <p class="location-meta">${activeRealm.desc}</p>
              </div>
              <span class="rarity epic">声望需求 ${activeRealm.unlockRep}</span>
            </div>
            <div class="location-actions">
              <button class="item-button" data-challenge-realm="${activeRealm.id}">${isCurrent ? "立即闯入秘境" : "先赶赴此地并挑战"}</button>
            </div>
          </div>
        ` : ""}

        <div class="divider"></div>
        <div class="inline-list">
          ${selected.actions.map((action) => `<span class="route-pill">${ACTION_META[action]?.label || action}</span>`).join("")}
          ${industryHints.map((hint) => `<span class="route-pill">${hint}</span>`).join("")}
        </div>
        <div class="location-actions">
          <button class="item-button" data-travel-to="${selected.id}" ${isCurrent || !reachable ? "disabled" : ""}>${isCurrent ? "已在此地" : reachable ? "前往此地" : "尚不可达"}</button>
          ${selected.actions.map((action) => `<button class="item-button" data-location-target="${selected.id}" data-location-action="${action}">${isCurrent ? `执行${ACTION_META[action]?.label || action}` : `前往后${ACTION_META[action]?.label || action}`}</button>`).join("")}
        </div>
        <p class="location-meta">常驻人物：${residents.length ? residents.map((npc) => `${npc.name}·${npc.personalityLabel}`).join("、") : "暂无熟悉面孔"}</p>
        <p class="location-meta">此地门路：${factionsHere.length ? factionsHere.map((faction) => `${faction.name}·可开${faction.unlocks.join("/")}`).join("；") : "暂无成型势力，可先路过打探。"}</p>
      </div>
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
            <p class="panel-intro">灵气 ${town.aura}，偏好 ${town.marketBias}，特产 ${town.resource}。</p>
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

  function renderCombatPanel() {
    const game = app.getGame();
    const enemy = game.combat.currentEnemy;
    const activeRealm = game.world.realm.activeRealmId ? app.getRealm(game.world.realm.activeRealmId) : null;

    if (!enemy) {
      dom.combatPanel.innerHTML = `
        <p class="panel-intro">正式战斗会在历练、追查机缘或主动闯入秘境时触发。你可以观察怪物词条，并随时切换自动或手动战斗。</p>
        <div class="combat-grid single">
          ${activeRealm ? `
            <div class="combat-card standout">
              <div class="auction-top">
                <div>
                  <p class="section-kicker">活跃秘境</p>
                  <h3 class="auction-title">${activeRealm.name}</h3>
                  <p class="auction-meta">${activeRealm.desc}</p>
                </div>
                <span class="rarity epic">声望需求 ${activeRealm.unlockRep}</span>
              </div>
              <p class="auction-meta">出现地点：${LOCATION_MAP[activeRealm.locationId].name}，首领：${activeRealm.boss.name}</p>
              <div class="auction-actions">
                <button class="item-button" data-world-challenge="${activeRealm.id}">${game.player.locationId === activeRealm.locationId ? "立即挑战" : "赶赴并挑战"}</button>
              </div>
            </div>
          ` : `<div class="empty-state">当前没有活跃的首领秘境，继续游历与刷图，等待世界异象出现。</div>`}
          ${game.combat.lastResult ? `
            <div class="combat-card">
              <p class="section-kicker">最近战报</p>
              <h3 class="auction-title">${game.combat.lastResult.outcome === "victory" ? "胜利" : "败退"}</h3>
              <p class="auction-meta">对象：${game.combat.lastResult.enemy}${game.combat.lastResult.boss ? " · 首领" : ""}</p>
            </div>
          ` : ""}
        </div>
      `;
      return;
    }

    const affixMarkup = enemy.affixIds.length
      ? enemy.affixIds.map((affixId) => {
          const affix = app.getAffix(affixId);
          return `<span class="trait-chip">${affix?.label || affixId} · ${affix?.desc || ""}</span>`;
        }).join("")
      : `<span class="trait-chip">无特殊词条</span>`;

    const history = game.combat.history.length
      ? game.combat.history.map((entry) => `<article class="log-item ${entry.type}"><div>${entry.text}</div></article>`).join("")
      : `<div class="empty-state">战斗刚刚开始。</div>`;

    dom.combatPanel.innerHTML = `
      <p class="panel-intro">战斗面板会展示敌人的词条、生命与输出倾向。关闭自动战斗后，挂机循环会暂停代打，你可以手动操作。</p>
      <div class="combat-grid">
        <div class="combat-card standout">
          <div class="auction-top">
            <div>
              <p class="section-kicker">当前敌人</p>
              <h3 class="auction-title">${enemy.name}${enemy.boss ? " · 首领" : ""}</h3>
              <p class="auction-meta">区域：${LOCATION_MAP[enemy.regionId]?.name || "未知"}${enemy.realmId ? ` · 来自${app.getRealm(enemy.realmId)?.name || "秘境"}` : ""}</p>
            </div>
            <span class="rarity ${enemy.boss ? "legendary" : "epic"}">${enemy.boss ? "首领" : "遭遇战"}</span>
          </div>
          <div class="meter-stack compact">
            ${app.renderMeter("敌方气血", enemy.hp, enemy.maxHp, "hp")}
            ${app.renderMeter("敌方真气", enemy.qi, enemy.maxQi, "qi")}
          </div>
          <div class="inline-list">
            <span class="tag">战力 ${round(enemy.power)}</span>
            <span class="tag">闪避 ${Math.round(enemy.dodge * 100)}%</span>
            <span class="tag">护甲 ${Math.round(enemy.defense * 100)}%</span>
            <span class="tag">暴击 ${Math.round(enemy.crit * 100)}%</span>
          </div>
          <div class="inline-list affix-row">${affixMarkup}</div>
          <p class="auction-meta">预计收益：灵石 ${enemy.rewards.money}，修为 ${round(enemy.rewards.cultivation)}，突破 ${round(enemy.rewards.breakthrough)}，声望 ${round(enemy.rewards.reputation)}</p>
          <div class="auction-actions">
            <button class="item-button" data-combat-action="attack">普攻</button>
            <button class="item-button" data-combat-action="skill">术法</button>
            <button class="item-button" data-combat-action="defend">防守</button>
            <button class="item-button" data-combat-action="item">用药</button>
            <button class="item-button" data-combat-action="flee">脱战</button>
            <button class="item-button" data-toggle-auto="1">${game.combat.autoBattle ? "关闭自动战斗" : "开启自动战斗"}</button>
          </div>
        </div>
        <div class="combat-card">
          <p class="section-kicker">战斗记录</p>
          <div class="combat-history">${history}</div>
        </div>
      </div>
    `;
  }

  function renderNpcPanel() {
    const game = app.getGame();
    const cards = game.npcs
      .slice()
      .sort((left, right) => app.getRelation(right.id).affinity - app.getRelation(left.id).affinity)
      .map((npc) => {
        const relation = app.getRelation(npc.id);
        const rank = app.getRankData(npc.rankIndex).name;
        const canRecruit = app.canRecruitDisciple(npc.id);
        const canMaster = app.canBecomeMaster(npc.id);
        const canPartner = app.canBecomePartner(npc.id);
        const faction = npc.factionId ? app.getFaction(npc.factionId) : null;
        const memoir = (npc.lifeEvents || []).slice(-2).join(" / ");
        return `
          <div class="npc-card">
            <div class="npc-top">
              <div>
                <h3 class="npc-name">${npc.name}</h3>
                <p class="npc-meta">${npc.title} · ${npc.profession || "江湖人"} · ${npc.personalityLabel} · ${rank}</p>
              </div>
              <div class="inline-list">
                <span class="trait-chip">身份 ${app.getRoleLabel(relation.role)}</span>
                <span class="trait-chip">财富 ${formatNumber(npc.wealth)}</span>
              </div>
            </div>
            <p class="npc-meta">${npc.personalityDesc}</p>
            <p class="npc-meta">当前位置：${LOCATION_MAP[npc.locationId].name}，目标：${npc.goal}，最近动向：${npc.lastEvent}</p>
            <p class="npc-meta">人生阶段：${npc.lifeStage} · ${npc.age} 岁${faction ? ` · 所属 ${faction.name}` : " · 尚无归属"}</p>
            <p class="npc-meta">近年经历：${memoir || "暂无大事"}</p>
            <div class="inline-list">
              <span class="trait-chip">好感 ${relation.affinity}</span>
              <span class="trait-chip">信任 ${relation.trust}</span>
              <span class="trait-chip">情缘 ${relation.romance}</span>
              <span class="trait-chip">仇怨 ${relation.rivalry}</span>
            </div>
            <div class="inline-list">
              <span class="trait-chip">贪念 ${npc.mood.greed}</span>
              <span class="trait-chip">仁心 ${npc.mood.kindness}</span>
              <span class="trait-chip">胆魄 ${npc.mood.courage}</span>
              <span class="trait-chip">耐性 ${npc.mood.patience}</span>
            </div>
            <div class="npc-actions">
              <button class="npc-button" data-visit-npc="${npc.id}">拜访</button>
              <button class="npc-button" data-focus-npc="${npc.id}">查看所在地点</button>
              <button class="npc-button" data-recruit-npc="${npc.id}" ${canRecruit ? "" : "disabled"}>收为弟子</button>
              <button class="npc-button" data-master-npc="${npc.id}" ${canMaster ? "" : "disabled"}>拜其为师</button>
              <button class="npc-button" data-partner-npc="${npc.id}" ${canPartner ? "" : "disabled"}>结为道侣</button>
              <button class="npc-button" data-rival-npc="${npc.id}">立为仇敌</button>
            </div>
          </div>
        `;
      }).join("");

    dom.npcPanel.innerHTML = `
      <p class="panel-intro">每个 NPC 都有独立人格、财富、行动和关系曲线。他们会自己游历、做买卖、抢拍，也会因为你的行为成为弟子、师长、道侣或仇敌。</p>
      <div class="npc-grid">${cards}</div>
    `;
  }

  function renderIndustryPanel() {
    const game = app.getGame();
    const properties = app.getAvailableProperties?.() || [];
    const orders = app.refreshIndustryOrders?.() || [];
    const farms = game.player.assets.farms;
    const workshops = game.player.assets.workshops;
    const shops = game.player.assets.shops;

    const orderCards = orders.length
      ? orders.map((order) => `
          <div class="item-card">
            <div class="item-top">
              <div>
                <h3 class="item-title">${order.title}</h3>
                <p class="item-meta">${order.factionName} · ${order.desc}</p>
              </div>
              <span class="rarity uncommon">报酬 ${order.rewardMoney}</span>
            </div>
            <p class="item-meta">交付：${order.requirements.map((entry) => `${app.getItem(entry.itemId)?.name || entry.itemId} x${entry.quantity}`).join("、")}</p>
            <p class="item-meta">额外收益：声望 +${round(order.rewardReputation, 1)}</p>
            <div class="item-actions">
              <button class="item-button" data-fulfill-order="${order.id}" ${app.canFulfillIndustryOrder(order.id) ? "" : "disabled"}>交付订单</button>
            </div>
          </div>
        `).join("")
      : `<div class="empty-state">各地行会正在换单，过几个时辰再来看看。</div>`;

    const propertyCards = properties.length
      ? properties.map((property) => `
          <div class="world-card">
            <span>${property.label}</span>
            <strong>${property.cost} 灵石</strong>
            <p class="item-meta">${property.desc}</p>
            <div class="item-actions">
              <button class="item-button" data-buy-property="${property.id}" ${app.canPurchaseProperty(property.id) ? "" : "disabled"}>购入到自己名下</button>
            </div>
          </div>
        `).join("")
      : `<div class="empty-state">当前地点暂无你能购买的产业，先加入对应势力或去更合适的地方。</div>`;

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
                ${!crop ? CROPS.map((entry) => `<button class="item-button" data-plant-crop="${entry.id}" data-asset-id="${farm.id}">种${entry.label}</button>`).join("") : `<button class="item-button" data-harvest-asset="${farm.id}" ${farm.daysRemaining > 0 ? "disabled" : ""}>收成</button>`}
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
              ${CRAFT_RECIPES.map((recipe) => `<button class="npc-button" data-craft-recipe="${recipe.id}" ${app.canCraftRecipe(recipe.id) ? "" : "disabled"}>${recipe.label}</button>`).join("")}
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
      <p class="panel-intro">产业系统围绕“记到自己名下”展开。先加入能开产业的势力，再买地契、牌照或铺契，之后才有资格种田、打造和开店。现在也能顺手接行会订单，把货路和名望串起来。</p>
      <h3 class="subsection-title">行会订单</h3>
      <div class="inventory-grid">${orderCards}</div>
      <h3 class="subsection-title">当前地点可购产业</h3>
      <div class="world-grid">${propertyCards}</div>
      <h3 class="subsection-title">名下田产</h3>
      <div class="inventory-grid">${farmCards}</div>
      <h3 class="subsection-title">名下工坊</h3>
      <div class="inventory-grid">${workshopCards}</div>
      <h3 class="subsection-title">名下铺面</h3>
      <div class="inventory-grid">${shopCards}</div>
    `;
  }

  function renderSectPanel() {
    const game = app.getGame();
    const sect = game.player.sect;
    const affiliation = app.getCurrentAffiliation?.();

    const factionCards = FACTIONS.map((faction) => {
      const joined = affiliation?.id === faction.id;
      return `
        <div class="npc-card ${joined ? "standout" : ""}">
          <div class="npc-top">
            <div>
              <h3 class="npc-name">${faction.name}</h3>
              <p class="npc-meta">${faction.desc}</p>
            </div>
            <span class="trait-chip">${faction.type === "sect" ? "宗门" : "势力"}</span>
          </div>
          <p class="npc-meta">所在：${LOCATION_MAP[faction.locationId]?.name || faction.locationId} · 可开：${faction.unlocks.join(" / ")}</p>
          <p class="npc-meta">入门条件：境界 ${app.getRankData(faction.joinRequirement.rankIndex).name}，声望 ${faction.joinRequirement.reputation}，灵石 ${faction.joinRequirement.money}</p>
          <div class="item-actions">
            <button class="item-button" data-join-faction="${faction.id}" ${joined || !app.canJoinFaction(faction.id) ? "disabled" : ""}>${joined ? `当前身份：${faction.titles[game.player.affiliationRank]}` : "加入此势力"}</button>
          </div>
        </div>
      `;
    }).join("");

    if (!sect) {
      const hasBanner = Boolean(app.findInventoryEntry("sect-banner"));
      dom.sectPanel.innerHTML = `
        <p class="panel-intro">这一页先处理“投门路”而不是“直接开宗”。先加入现有势力，解锁产业和资源，再谈自立山门。</p>
        <div class="summary-grid">
          <div class="summary-box"><span>当前归属</span><strong>${affiliation ? affiliation.name : "无"}</strong></div>
          <div class="summary-box"><span>门内身份</span><strong>${affiliation ? affiliation.titles[game.player.affiliationRank] : "白身"}</strong></div>
          <div class="summary-box"><span>门内贡献</span><strong>${affiliation ? round(game.player.factionStanding[affiliation.id] || 0, 1) : 0}</strong></div>
          <div class="summary-box"><span>自立山门资格</span><strong>${hasBanner ? "有旗幡" : "未备旗幡"}</strong></div>
        </div>
        <h3 class="subsection-title">可投势力</h3>
        <div class="npc-grid">${factionCards}</div>
        <h3 class="subsection-title">自立山门</h3>
        <div class="combat-card standout">
          <p class="auction-meta">需求：至少筑基、声望 68、灵石 3800、立宗旗幡 1。当前：境界 ${app.getRankData(game.player.rankIndex).name}、声望 ${formatNumber(game.player.reputation)}、灵石 ${formatNumber(game.player.money)}、旗幡 ${hasBanner ? "已备" : "未备"}。</p>
          <div class="auction-actions">
            <button class="item-button" data-create-sect="1">另立山门</button>
          </div>
        </div>
      `;
      return;
    }

    const buildingCards = Object.entries(SECT_BUILDINGS).map(([key, building]) => {
      const level = sect.buildings[key] || 0;
      const cost = building.baseCost * (level + 1);
      return `
        <div class="world-card">
          <span>${building.label}</span>
          <strong>${level} 级</strong>
          <p class="item-meta">${building.desc}</p>
          <div class="item-actions">
            <button class="item-button" data-upgrade-building="${key}">升级 ${cost} 灵石</button>
          </div>
        </div>
      `;
    }).join("");

    const disciples = sect.disciples.length
      ? sect.disciples.map((npcId) => {
          const npc = app.getNpc(npcId);
          const currentTeaching = sect.teachings.find((entry) => entry.npcId === npcId);
          if (!npc) return "";
          return `
            <div class="npc-card">
              <div class="npc-top">
                <div>
                  <h3 class="npc-name">${npc.name}</h3>
                  <p class="npc-meta">${npc.profession || npc.title} · ${app.getRankData(npc.rankIndex).name}</p>
                </div>
                <span class="trait-chip">修为 ${formatNumber(npc.cultivation)}</span>
              </div>
              <p class="npc-meta">最近动向：${npc.lastEvent}</p>
              <p class="npc-meta">当前传功：${currentTeaching ? `${app.getItem(currentTeaching.manualId)?.name || "未知功法"} · 进度 ${round(currentTeaching.progress, 1)}` : "尚未安排"}</p>
              <div class="teaching-actions">
                ${sect.manualLibrary.length ? sect.manualLibrary.map((manualId) => `<button class="npc-button" data-teach-npc="${npc.id}" data-manual-id="${manualId}">传授${app.getItem(manualId)?.name || "功法"}</button>`).join("") : `<span class="muted">藏经阁暂无可传功法</span>`}
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">门下暂无弟子，先在江湖中积攒威望和人脉。</div>`;

    const library = sect.manualLibrary.length
      ? sect.manualLibrary.map((manualId) => {
          const item = app.getItem(manualId);
          return `
            <div class="item-card">
              <div class="item-top">
                <div>
                  <h3 class="item-title">${item?.name || manualId}</h3>
                  <p class="item-meta">${item?.desc || "已收入藏经阁。"}</p>
                </div>
                <span class="rarity ${item ? RARITY_META[item.rarity].color : "common"}">${item ? RARITY_META[item.rarity].label : "功法"}</span>
              </div>
              <p class="item-meta">${item ? app.describeItemEffect(item) : ""}</p>
            </div>
          `;
        }).join("")
      : `<div class="empty-state">藏经阁尚无功法，可从行囊中把秘籍收入宗门。</div>`;

    dom.sectPanel.innerHTML = `
      <p class="panel-intro">你已经跨过“投门路”阶段，进入了真正的宗门经营。产业、弟子和传功都能逐步挂靠到自己的山门下。</p>
      <div class="summary-grid">
        <div class="summary-box"><span>宗门名称</span><strong>${sect.name}</strong></div>
        <div class="summary-box"><span>宗门等级</span><strong>${sect.level}</strong></div>
        <div class="summary-box"><span>威望</span><strong>${formatNumber(sect.prestige)}</strong></div>
        <div class="summary-box"><span>府库</span><strong>${formatNumber(sect.treasury)}</strong></div>
        <div class="summary-box"><span>粮草</span><strong>${formatNumber(sect.food)}</strong></div>
        <div class="summary-box"><span>门下弟子</span><strong>${sect.disciples.length}</strong></div>
      </div>
      <h3 class="subsection-title">可投势力</h3>
      <div class="npc-grid">${factionCards}</div>
      <h3 class="subsection-title">山门建筑</h3>
      <div class="world-grid">${buildingCards}</div>
      <h3 class="subsection-title">藏经阁</h3>
      <div class="inventory-grid">${library}</div>
      <h3 class="subsection-title">门下弟子</h3>
      <div class="npc-grid">${disciples}</div>
    `;
  }

  function renderWorldPanel() {
    const game = app.getGame();
    const activeRealm = game.world.realm.activeRealmId ? app.getRealm(game.world.realm.activeRealmId) : null;
    const locationCards = LOCATIONS.map((location) => {
      const residents = game.npcs.filter((npc) => npc.locationId === location.id).length;
      const stockValue = (game.market[location.id] || []).reduce((sum, listing) => sum + listing.price * listing.quantity, 0);
      const isPlayerHere = game.player.locationId === location.id;
      const realmHere = activeRealm && activeRealm.locationId === location.id;
      const factionsHere = FACTIONS.filter((faction) => location.factionIds?.includes(faction.id));
      return `
        <div class="world-card ${realmHere ? "standout" : ""}">
          <span>${location.name}</span>
          <strong>${location.region}</strong>
          <p class="item-meta">灵气 ${location.aura}，风险 ${location.danger}，市集 ${location.marketTier || 0} 阶，商货总值 ${formatNumber(stockValue)}，当前停留 NPC ${residents}</p>
          <p class="item-meta">势力：${factionsHere.length ? factionsHere.map((faction) => faction.name).join(" / ") : "暂无驻点"}</p>
          <div class="item-actions">
            <button class="item-button" data-focus-location="${location.id}">查看地图</button>
            <button class="item-button" data-world-travel="${location.id}" ${isPlayerHere ? "disabled" : ""}>${isPlayerHere ? "你在此地" : `前往${location.short}`}</button>
            ${realmHere ? `<button class="item-button" data-world-challenge="${activeRealm.id}">${isPlayerHere ? "挑战首领" : "赶赴秘境"}</button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    dom.worldPanel.innerHTML = `
      <p class="panel-intro">天机簿汇总天气、异象、各地资源与秘境动向，方便你决定挂机策略和路线。</p>
      <div class="summary-grid">
        <div class="summary-box"><span>今日天候</span><strong>${game.world.weather}</strong></div>
        <div class="summary-box"><span>异象征兆</span><strong>${game.world.omen}</strong></div>
        <div class="summary-box"><span>商帮好感</span><strong>${round(game.world.factionFavor.merchants, 1)}</strong></div>
        <div class="summary-box"><span>宗门风评</span><strong>${round(game.world.factionFavor.sect, 1)}</strong></div>
        <div class="summary-box"><span>现存势力</span><strong>${FACTIONS.length}</strong></div>
        <div class="summary-box"><span>活跃地点</span><strong>${LOCATIONS.length}</strong></div>
      </div>
      ${activeRealm ? `
        <h3 class="subsection-title">活跃秘境</h3>
        <div class="combat-card standout">
          <div class="auction-top">
            <div>
              <h3 class="auction-title">${activeRealm.name}</h3>
              <p class="auction-meta">${activeRealm.desc}</p>
            </div>
            <span class="rarity epic">${LOCATION_MAP[activeRealm.locationId].name}</span>
          </div>
          <p class="auction-meta">首领：${activeRealm.boss.name}，奖励：${activeRealm.rewards.items.map((itemId) => app.getItem(itemId)?.name || itemId).join("、")}</p>
          <div class="auction-actions">
            <button class="item-button" data-world-challenge="${activeRealm.id}">${game.player.locationId === activeRealm.locationId ? "立即挑战" : "赶赴并挑战"}</button>
          </div>
        </div>
      ` : ""}
      <h3 class="subsection-title">九州总览</h3>
      <div class="world-grid">${locationCards}</div>
    `;
  }

  function renderLog() {
    const game = app.getGame();
    dom.logList.innerHTML = game.log.length
      ? game.log.map((entry) => `
          <article class="log-item ${entry.type}">
            <time>${entry.stamp}</time>
            <div>${entry.text}</div>
          </article>
        `).join("")
      : `<div class="empty-state">江湖还很安静，新的故事即将开始。</div>`;
  }

  function renderTabs() {
    Array.from(dom.tabStrip.querySelectorAll(".tab-button")).forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === state.selectedTab);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${state.selectedTab}`);
    });
  }

  Object.assign(app, {
    renderTopBar,
    renderPlayerPanel,
    renderWorkbenchControls,
    renderProfileWindow,
    renderDockPanel,
    renderLocationDetail,
    renderInventoryPanel,
    renderMarketPanel,
    renderAuctionPanel,
    renderCombatPanel,
    renderNpcPanel,
    renderIndustryPanel,
    renderSectPanel,
    renderWorldPanel,
    renderLog,
    renderTabs,
  });
})();
