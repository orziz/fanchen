(() => {
  const app = window.ShanHai;
  const { tables, utils, dom, state } = app;
  const { LOCATIONS, LOCATION_MAP, ACTION_META, FACTIONS } = tables;
  const { formatNumber, round } = utils;

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
    const travelReason = isCurrent ? "你已经在此地。" : reachable ? "可直接前往。" : "当前地脉尚未打通，暂时去不了这里。";

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
          <div class="world-card"><span>势力驻点</span><strong>${factionsHere.length ? factionsHere.map((faction) => faction.name).join("、") : "暂无"}</strong></div>
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
          <button class="item-button" data-travel-to="${selected.id}" ${app.getGuardAttrs(reachable && !isCurrent, travelReason)}>${isCurrent ? "已在此地" : reachable ? "前往此地" : "尚不可达"}</button>
          ${selected.actions.map((action) => `<button class="item-button" data-location-target="${selected.id}" data-location-action="${action}">${isCurrent ? `执行${ACTION_META[action]?.label || action}` : `前往后${ACTION_META[action]?.label || action}`}</button>`).join("")}
        </div>
        <p class="location-meta">常驻人物：${residents.length ? residents.map((npc) => `${npc.name}·${npc.personalityLabel}`).join("、") : "暂无熟悉面孔"}</p>
        <p class="location-meta">此地门路：${factionsHere.length ? factionsHere.map((faction) => `${faction.name}·可开${app.formatUnlockLabels(faction.unlocks)}`).join("；") : "暂无成型势力，可先路过打探。"}</p>
      </div>
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
          <p class="item-meta">势力：${factionsHere.length ? factionsHere.map((faction) => faction.name).join("、") : "暂无驻点"}</p>
          <div class="item-actions">
            <button class="item-button" data-focus-location="${location.id}">查看地图</button>
            <button class="item-button" data-world-travel="${location.id}" ${app.getGuardAttrs(!isPlayerHere, isPlayerHere ? "你已经在此地。" : "可以启程前往。")}>${isPlayerHere ? "你在此地" : `前往${location.short}`}</button>
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
    renderLocationDetail,
    renderWorldPanel,
    renderLog,
    renderTabs,
  });
})();