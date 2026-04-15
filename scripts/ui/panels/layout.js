(() => {
  const app = window.ShanHai;
  const { tables, utils, dom, state } = app;
  const { ACTION_META, TIME_LABELS, LOCATION_MAP } = tables;
  const { formatNumber, round } = utils;

  function getPercent(value, max) {
    if (!max) return 0;
    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  }

  function getCurrentFocusSummary(game, activeRealm, activeTradeRun) {
    if (activeTradeRun) return `跑商·${activeTradeRun.destinationName}`;
    if (activeRealm) return `秘境·${activeRealm.name}`;
    if (game.player.hp < game.player.maxHp * 0.42 || game.player.qi < game.player.maxQi * 0.34) return "调息回稳";
    if (game.player.breakthrough >= app.getNextBreakthroughNeed() * 0.85) return "可试冲关";
    return "平稳推进";
  }

  function getCurrentRouteSummary(game, affiliation, sect) {
    if (affiliation) return affiliation.name;
    if (sect) return sect.name;
    return "尚未投势";
  }

  function getManualActions(game, sect, affiliation) {
    return [
      { key: "meditate", label: "手动修炼", desc: "静坐一轮，补修为与真气。", theme: "补修为" },
      { key: "breakthrough", label: "主动冲关", desc: "火候够了就立刻试破境。", theme: "抢关口" },
      { key: "quest", label: "追查机缘", desc: "跑一趟差事，碰碰风闻与奇遇。", theme: "探风闻" },
      {
        key: "trade",
        label: game.player.tradeRun ? (app.getCurrentLocation().id === game.player.tradeRun.destinationId ? "交割货队" : "继续跑商") : "顺手做买卖",
        desc: game.player.tradeRun ? `${game.player.tradeRun.originName}到${game.player.tradeRun.destinationName}的货路还在跑。` : "跑一笔货，快进一轮营生。",
        theme: "滚营生",
      },
      { key: "rest", label: "短暂调息", desc: "先把状态拉回安全线。", theme: "回状态" },
      {
        key: sect ? "sect" : "affiliation",
        label: sect ? "处理宗门事务" : affiliation ? "查看门内事务" : "去投门路",
        desc: sect ? "去处理山门、弟子和传功。" : affiliation ? "去处理当前门路。" : "先去势力页找个落脚点。",
        theme: sect ? "理山门" : "看门路",
      },
    ];
  }

  function getCommandRecommendation(game, location, activeRealm, affiliation, sect, assetCount) {
    const breakthroughNeed = app.getNextBreakthroughNeed();
    const breakthroughPercent = getPercent(game.player.breakthrough, breakthroughNeed);

    if (activeRealm) {
      return {
        title: `${activeRealm.name}现世，当前先决定去不去。`,
        desc: `异象压城，正是探风闯局的时候。要么放胆外出，要么先试一趟风声，别把机会磨过去。`,
        preferredMode: "adventure",
        actions: [
          { label: "切为外出闯荡", attrs: 'data-mode="adventure"', style: "primary" },
          { label: "手动追查机缘", attrs: 'data-quick-action="quest"', style: "ghost" },
        ],
      };
    }

    if (game.player.hp < game.player.maxHp * 0.42 || game.player.qi < game.player.maxQi * 0.34 || game.player.stamina < game.player.maxStamina * 0.3) {
      return {
        title: "根基偏虚，先收手回息。",
        desc: "此时强撑只会伤身，先把气血、真气和体力拉稳，再谈闯荡和冲关。",
        preferredMode: "cultivation",
        actions: [
          { label: "立即短暂调息", attrs: 'data-quick-action="rest"', style: "primary" },
          { label: "切为苦修养气", attrs: 'data-mode="cultivation"', style: "ghost" },
        ],
      };
    }

    if (breakthroughPercent >= 85 && location.actions.includes("breakthrough")) {
      return {
        title: "火候已近圆满，可以主动试冲一关。",
        desc: `你在${location.name}已有足够火候。若想继续稳一手，也可以先补真气再破境。`,
        preferredMode: "cultivation",
        actions: [
          { label: "立刻主动冲关", attrs: 'data-quick-action="breakthrough"', style: "primary" },
          { label: "手动修炼一轮", attrs: 'data-quick-action="meditate"', style: "ghost" },
        ],
      };
    }

    if (!sect && !affiliation) {
      return {
        title: "还没站稳门路，先找个靠山或落脚点。",
        desc: "目前仍是白身，更适合边维生边探路。先别把节奏拉得太险，靠手动差事和稳态挂机把下一步门路摸出来。",
        preferredMode: "balanced",
        actions: [
          { label: "切为维生求进", attrs: 'data-mode="balanced"', style: "primary" },
          { label: "手动追查机缘", attrs: 'data-quick-action="quest"', style: "ghost" },
        ],
      };
    }

    if (!assetCount && game.player.money >= 120) {
      return {
        title: "手里已有启动本钱，可以开始摸第一笔产业。",
        desc: "这时最怕继续空转。把挂机节奏偏向营生，再穿插几次手动跑货，通常比继续平均撒力更快起盘。",
        preferredMode: "merchant",
        actions: [
          { label: "切为小本营生", attrs: 'data-mode="merchant"', style: "primary" },
          { label: "手动做买卖", attrs: 'data-quick-action="trade"', style: "ghost" },
        ],
      };
    }

    if (game.player.mode === "manual") {
      return {
        title: "当前为手动操作，世界会走，你不再自动出手。",
        desc: "你亲自盯局时，修炼、跑商和追查都得自己开口。",
        preferredMode: "manual",
        actions: [
          { label: "手动修炼一轮", attrs: 'data-quick-action="meditate"', style: "primary" },
          { label: "手动追查机缘", attrs: 'data-quick-action="quest"', style: "ghost" },
        ],
      };
    }

    return {
      title: `当前策略偏向“${app.getModeLabel(game.player.mode)}”，按局势稳步推进。`,
      desc: `你落脚${location.name}，灵气${location.aura}，险度${location.danger}。可顺势稳推，也可临时改换门路，把局势拧到自己手里。`,
      preferredMode: game.player.mode === "manual" ? "balanced" : game.player.mode,
      actions: [
        { label: game.player.mode === "balanced" ? "手动追查机缘" : `切为${app.getModeLabel(game.player.mode === "manual" ? "balanced" : game.player.mode)}`, attrs: game.player.mode === "balanced" ? 'data-quick-action="quest"' : `data-mode="${game.player.mode === "manual" ? "balanced" : game.player.mode}"`, style: "primary" },
        { label: "手动修炼一轮", attrs: 'data-quick-action="meditate"', style: "ghost" },
      ],
    };
  }

  function renderTopBar() {
    const game = app.getGame();
    const activeRealm = game.world.realm.activeRealmId ? app.getRealm(game.world.realm.activeRealmId) : null;
    const activeTradeRun = app.getActiveTradeRun?.();
    const affiliation = app.getCurrentAffiliation?.();
    dom.dayLabel.textContent = String(game.world.day);
    dom.timeLabel.textContent = TIME_LABELS[game.world.hour];
    dom.reputationLabel.textContent = formatNumber(game.player.reputation);
    dom.saveStateLabel.textContent = state.saveState;
    if (dom.heroFocusLabel) dom.heroFocusLabel.textContent = getCurrentFocusSummary(game, activeRealm, activeTradeRun);
    if (dom.heroRouteLabel) dom.heroRouteLabel.textContent = getCurrentRouteSummary(game, affiliation, game.player.sect);
    dom.currentLocationLabel.textContent = app.getCurrentLocation().name;
    dom.modeLabel.textContent = app.getModeLabel(game.player.mode);
    dom.actionLabel.textContent = ACTION_META[game.player.action]?.label || game.player.action;
    app.renderSpeedButtons();
  }

  function renderPlayerPanel() {
    const game = app.getGame();
    const rank = app.getRankData(game.player.rankIndex);
    const nextNeed = app.getNextBreakthroughNeed();
    const location = app.getCurrentLocation();
    const sect = game.player.sect;
    const affiliation = app.getCurrentAffiliation?.();

    dom.playerPanel.innerHTML = `
      <div class="player-layout">
        <div class="player-header">
          <div>
            <p class="section-kicker">角色</p>
            <h2 class="player-name">${game.player.name}</h2>
            <p class="player-title">${game.player.title}，现居${location.name}${sect ? `，掌${sect.name}` : affiliation ? `，隶属${affiliation.name}` : "，尚无门路"}</p>
          </div>
          <div class="inline-list">
            <span class="tag">境界 ${rank.name}</span>
            <span class="tag">灵石 ${formatNumber(game.player.money)}</span>
            <span class="tag">悟性 ${round(app.getPlayerInsight())}</span>
            <span class="tag">战力 ${round(app.getPlayerPower())}</span>
          </div>
        </div>

        <div class="badge-row">
          <div class="status-badge">
            <span class="micro-label">当前地点灵气</span>
            <strong>${location.aura}</strong>
          </div>
          <div class="status-badge">
            <span class="micro-label">世界异象</span>
            <strong>${game.world.omen}</strong>
          </div>
        </div>

        <div class="meter-stack">
          ${app.renderMeter("气血", game.player.hp, game.player.maxHp, "hp")}
          ${app.renderMeter("真气", game.player.qi, game.player.maxQi, "qi")}
          ${app.renderMeter("体力", game.player.stamina, game.player.maxStamina, "stamina")}
          ${app.renderMeter("突破火候", game.player.breakthrough, nextNeed, "breakthrough")}
          ${app.renderMeter("修为积累", game.player.cultivation, nextNeed)}
        </div>

        <div class="stat-grid">
          <div class="stat-box"><span>魅力</span><strong>${round(app.getPlayerCharisma())}</strong></div>
          <div class="stat-box"><span>突破率</span><strong>${Math.round((game.player.breakthroughRate || 0.55) * 100)}%</strong></div>
          <div class="stat-box"><span>修炼加成</span><strong>${Math.round((1 + (game.player.cultivationBonus || 0)) * 100)}%</strong></div>
          <div class="stat-box"><span>江湖归属</span><strong>${sect ? sect.name : affiliation ? affiliation.titles[game.player.affiliationRank] : "白身"}</strong></div>
        </div>
      </div>
    `;
  }

  function renderWorkbenchControls() {
    const game = app.getGame();
    const location = app.getCurrentLocation();
    const sect = game.player.sect;
    const affiliation = app.getCurrentAffiliation?.();
    const currentMode = tables.MODE_OPTIONS.find((mode) => mode.id === game.player.mode);
    const activeRealm = game.world.realm.activeRealmId ? app.getRealm(game.world.realm.activeRealmId) : null;
    const assetCount = game.player.assets.farms.length + game.player.assets.workshops.length + game.player.assets.shops.length;
    const commandOpen = app.ensureWindowState("command").open;
    const recommendation = getCommandRecommendation(game, location, activeRealm, affiliation, sect, assetCount);
    const hpPercent = getPercent(game.player.hp, game.player.maxHp);
    const qiPercent = getPercent(game.player.qi, game.player.maxQi);
    const staminaPercent = getPercent(game.player.stamina, game.player.maxStamina);
    const breakthroughNeed = app.getNextBreakthroughNeed();
    const breakthroughPercent = getPercent(game.player.breakthrough, breakthroughNeed);

    if (dom.openCommandButton) {
      dom.openCommandButton.textContent = currentMode?.label || game.player.mode;
      dom.openCommandButton.title = `当前挂机策略：${currentMode?.label || game.player.mode}，点击打开策略盘`;
      dom.openCommandButton.classList.toggle("active", commandOpen);
    }

    if (!dom.commandDetail) return;

    dom.commandDetail.innerHTML = `
      <div class="command-layout refined command-hub">
        <section class="command-hero standout">
          <div class="command-hero-top">
            <div class="command-hero-copy">
              <p class="section-kicker">局势判断</p>
              <h3 class="command-hero-title">${recommendation.title}</h3>
              <p class="panel-intro compact">${recommendation.desc}</p>
            </div>
            <div class="command-reading-grid">
              <article class="command-reading-card">
                <span>根基状态</span>
                <strong>${Math.min(hpPercent, qiPercent, staminaPercent)}%</strong>
                <p>气血 ${hpPercent}% / 真气 ${qiPercent}% / 体力 ${staminaPercent}%</p>
              </article>
              <article class="command-reading-card">
                <span>破境火候</span>
                <strong>${breakthroughPercent}%</strong>
                <p>${breakthroughPercent >= 85 ? "已接近可冲关线" : `距下一境尚差 ${formatNumber(Math.max(0, breakthroughNeed - game.player.breakthrough))}`}</p>
              </article>
              <article class="command-reading-card">
                <span>当前门路</span>
                <strong>${sect ? sect.name : affiliation ? affiliation.name : "白身"}</strong>
                <p>${sect ? "已立山门，可直接处理门内事务。" : affiliation ? `现为${affiliation.titles[game.player.affiliationRank]}。` : `资产 ${assetCount} 处，仍需继续摸门路。`}</p>
              </article>
            </div>
          </div>
          <div class="command-chip-row">
            <span class="command-chip active">当前策略：${currentMode?.label || game.player.mode}</span>
            <span class="command-chip">落脚：${location.name}</span>
            <span class="command-chip">灵气 ${location.aura}</span>
            <span class="command-chip ${location.danger >= 6 ? "warn" : location.danger >= 4 ? "steady" : "good"}">险度 ${location.danger}</span>
            <span class="command-chip ${activeRealm ? "active" : ""}">${activeRealm ? `${activeRealm.name}现世` : game.world.omen}</span>
          </div>
        </section>

        <section class="command-section standout">
          <div class="section-head compact">
            <div>
              <p class="section-kicker">挂机策略</p>
              <h3>今日主路</h3>
            </div>
            <span class="tag">推荐：${app.getModeLabel(recommendation.preferredMode || game.player.mode)}</span>
          </div>
          <p class="panel-intro compact">此处只定长线门路，短手动作仍归你临机掌握。</p>
          <div class="mode-grid command-mode-grid command-strategy-stack">
            ${tables.MODE_OPTIONS.map((mode) => `
              <button class="mode-button mode-button-card command-strategy-card ${mode.id === game.player.mode ? "active" : ""} ${mode.id === recommendation.preferredMode ? "recommended" : ""}" data-mode="${mode.id}" title="${mode.desc}">
                <div class="command-strategy-meta">
                  <strong>${mode.label}</strong>
                  <span class="command-badge-row">
                    ${mode.id === game.player.mode ? '<span class="command-pill current">当前</span>' : ""}
                    ${mode.id === recommendation.preferredMode ? '<span class="command-pill recommended">局势推荐</span>' : ""}
                  </span>
                </div>
                <span>${mode.desc}</span>
              </button>
            `).join("")}
          </div>
          <div class="command-footnote ${game.player.mode === "manual" ? "manual" : ""}">
            <strong>${game.player.mode === "manual" ? "手动操作已接管" : `当前自动遵循“${currentMode?.label || game.player.mode}”`}</strong>
            <span>${game.player.mode === "manual" ? "世界仍会照常流转，但不会替你自动修炼、跑商或接差事。" : "局势一变，就立刻改换门路，别让人和货空耗在路上。"}</span>
          </div>
        </section>
      </div>
    `;
  }

  function renderProfileWindow() {
    const game = app.getGame();
    if (!dom.profileDetail) return;
    const rank = app.getRankData(game.player.rankIndex);
    const affiliation = app.getCurrentAffiliation?.();
    const sect = game.player.sect;
    const assetCount = game.player.assets.farms.length + game.player.assets.workshops.length + game.player.assets.shops.length;
    const master = game.player.masterId ? app.getNpc(game.player.masterId) : null;
    const partner = game.player.partnerId ? app.getNpc(game.player.partnerId) : null;
    const disciples = sect?.disciples?.map((npcId) => app.getNpc(npcId)).filter(Boolean) || [];
    const lineageText = [
      master ? `师承 ${master.name}` : "暂无师承",
      partner ? `道侣 ${partner.name}` : "暂无道侣",
      disciples.length ? `门下 ${disciples.map((npc) => npc.name).join("、")}` : "门下暂无弟子",
    ].join(" · ");

    dom.profileDetail.innerHTML = `
      <div class="profile-sheet">
        <div class="item-card">
          <div class="item-top">
            <div>
              <p class="section-kicker">人物概览</p>
              <h3 class="item-title">${game.player.name}</h3>
              <p class="item-meta">${game.player.title} · ${rank.name} · ${app.getCurrentLocation().name}</p>
            </div>
            <span class="rarity uncommon">声望 ${formatNumber(game.player.reputation)}</span>
          </div>
          <p class="item-meta">当前归属：${sect ? sect.name : affiliation ? affiliation.name : "无"}</p>
          <p class="item-meta">当前营生：农 ${round(game.player.skills.farming)} / 工 ${round(game.player.skills.crafting)} / 商 ${round(game.player.skills.trading)}</p>
          <p class="item-meta">师承谱系：${lineageText}</p>
        </div>

        <div class="item-card">
          <div class="item-top">
            <div>
              <p class="section-kicker">关系脉络</p>
              <h3 class="item-title">门路与传承</h3>
            </div>
            <span class="rarity rare">关系 ${disciples.length + (master ? 1 : 0) + (partner ? 1 : 0)}</span>
          </div>
          <p class="item-meta">${master ? `${master.name}曾为你开门引路。` : "尚未拜得师门。"}</p>
          <p class="item-meta">${partner ? `你与${partner.name}已结道侣。` : "尚未与人结成道侣。"}</p>
          <p class="item-meta">${disciples.length ? `当前门下弟子：${disciples.map((npc) => `${npc.name}·${app.getRankData(npc.rankIndex).name}`).join("、")}` : "还未建立自己的传承链。"}</p>
        </div>

        <div>
          <h3 class="subsection-title">个人记录</h3>
          <div class="summary-grid">
            <div class="summary-box"><span>击退强敌</span><strong>${formatNumber(game.player.stats.enemiesDefeated)}</strong></div>
            <div class="summary-box"><span>斩落首领</span><strong>${formatNumber(game.player.stats.bossKills)}</strong></div>
            <div class="summary-box"><span>成交买卖</span><strong>${formatNumber(game.player.stats.tradesCompleted)}</strong></div>
            <div class="summary-box"><span>跑商趟数</span><strong>${formatNumber(game.player.stats.tradeRoutesCompleted)}</strong></div>
            <div class="summary-box"><span>完成机缘</span><strong>${formatNumber(game.player.stats.questsFinished)}</strong></div>
            <div class="summary-box"><span>拍得奇珍</span><strong>${formatNumber(game.player.stats.auctionsWon)}</strong></div>
            <div class="summary-box"><span>传功次数</span><strong>${formatNumber(game.player.stats.disciplesTaught)}</strong></div>
            <div class="summary-box"><span>名下产业</span><strong>${assetCount}</strong></div>
            <div class="summary-box"><span>收成总量</span><strong>${formatNumber(game.player.stats.cropsHarvested)}</strong></div>
            <div class="summary-box"><span>打造物件</span><strong>${formatNumber(game.player.stats.craftedItems)}</strong></div>
            <div class="summary-box"><span>铺面收账</span><strong>${formatNumber(game.player.stats.shopCollections)}</strong></div>
            <div class="summary-box"><span>当前灵石</span><strong>${formatNumber(game.player.money)}</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDockPanel() {
    const game = app.getGame();
    const activeTradeRun = app.getActiveTradeRun?.();
    const affiliation = app.getCurrentAffiliation?.();
    const manualActions = getManualActions(game, game.player.sect, affiliation);

    dom.dockPanel.innerHTML = `
      <div class="dock-layout">
        <div class="section-head compact">
          <div>
            <p class="section-kicker">即时</p>
            <h2>手动操作</h2>
          </div>
          <span class="tag">不改自动循环</span>
        </div>

        <div class="quick-actions command-action-grid">
          ${manualActions.map((action) => `
            <button class="mini-button action-button-card command-action-card" data-quick-action="${action.key}">
              <span class="command-action-theme">${action.theme}</span>
              <strong>${action.label}</strong>
              <span>${action.desc}</span>
            </button>
          `).join("")}
        </div>

        <div class="dock-callout ${activeTradeRun ? "standout" : ""}">
          <p class="section-kicker">操作说明</p>
          <p class="item-meta">这些动作都只执行一次，不会改掉长期挂机策略。想换长期节奏，去右侧打开策略盘。</p>
          <div class="item-actions">
            <button class="item-button" data-open-window="command">打开策略盘</button>
            ${!affiliation && !game.player.sect ? `<button class="item-button" data-switch-tab="sect">去找一条门路</button>` : activeTradeRun ? `<button class="item-button" data-continue-trade-run="1">${game.player.locationId === activeTradeRun.destinationId ? "交割货队" : `继续前往${activeTradeRun.destinationName}`}</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  Object.assign(app, {
    renderTopBar,
    renderPlayerPanel,
    renderWorkbenchControls,
    renderProfileWindow,
    renderDockPanel,
  });
})();