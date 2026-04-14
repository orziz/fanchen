(() => {
  const app = window.ShanHai;
  const { tables, utils, dom } = app;
  const { RARITY_META, LOCATION_MAP, FACTIONS, SECT_BUILDINGS } = tables;
  const { formatNumber, round } = utils;

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
        const memoir = (npc.lifeEvents || []).slice(-2).join("；");
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
            <p class="npc-meta">人生阶段：${npc.lifeStage} · ${npc.age} 岁${npc.factionId ? ` · 所属 ${app.getFaction(npc.factionId)?.name || "未知势力"}` : " · 尚无归属"}</p>
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
              <button class="npc-button" data-recruit-npc="${npc.id}" ${app.getGuardAttrs(app.canRecruitDisciple(npc.id), app.explainRecruitDisciple(npc.id))}>${app.canRecruitDisciple(npc.id) ? "收为弟子" : "查看收徒条件"}</button>
              <button class="npc-button" data-master-npc="${npc.id}" ${app.getGuardAttrs(app.canBecomeMaster(npc.id), app.explainMasterBond(npc.id))}>${app.canBecomeMaster(npc.id) ? "拜其为师" : "查看拜师条件"}</button>
              <button class="npc-button" data-partner-npc="${npc.id}" ${app.getGuardAttrs(app.canBecomePartner(npc.id), app.explainPartnerBond(npc.id))}>${app.canBecomePartner(npc.id) ? "结为道侣" : "查看结缘条件"}</button>
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

  function renderSectPanel() {
    const game = app.getGame();
    const sect = game.player.sect;
    const affiliation = app.getCurrentAffiliation?.();

    const factionCards = FACTIONS.map((faction) => {
      const joined = affiliation?.id === faction.id;
      const canJoin = app.canJoinFaction(faction.id);
      return `
        <div class="npc-card ${joined ? "standout" : ""}">
          <div class="npc-top">
            <div>
              <h3 class="npc-name">${faction.name}</h3>
              <p class="npc-meta">${faction.desc}</p>
            </div>
            <span class="trait-chip">${faction.type === "sect" ? "宗门" : "势力"}</span>
          </div>
          <p class="npc-meta">所在：${LOCATION_MAP[faction.locationId]?.name || faction.locationId} · 可开：${app.formatUnlockLabels(faction.unlocks)}</p>
          <p class="npc-meta">入门条件：境界 ${app.getRankData(faction.joinRequirement.rankIndex).name}，声望 ${faction.joinRequirement.reputation}，灵石 ${faction.joinRequirement.money}</p>
          <div class="item-actions">
            <button class="item-button" data-join-faction="${faction.id}" ${app.getGuardAttrs(!joined && canJoin, app.explainFactionJoin(faction.id))}>${joined ? `当前身份：${faction.titles[game.player.affiliationRank]}` : canJoin ? "加入此势力" : "查看加入条件"}</button>
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
          <div class="auction-actions"><button class="item-button" data-create-sect="1">另立山门</button></div>
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
          <div class="item-actions"><button class="item-button" data-upgrade-building="${key}">升级 ${cost} 灵石</button></div>
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

  Object.assign(app, {
    renderCombatPanel,
    renderNpcPanel,
    renderSectPanel,
  });
})();