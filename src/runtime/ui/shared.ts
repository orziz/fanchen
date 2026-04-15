(() => {
  const app = window.ShanHai;
  const { tables, utils, dom } = app;
  const { MODE_OPTIONS } = tables;
  const { round, clamp } = utils;

  const MARKET_BIAS_LABELS = {
    herb: "药材",
    grain: "粮货",
    wood: "木料",
    ore: "矿料",
    ice: "寒材",
    relic: "异宝",
    fire: "火材",
    scroll: "残卷",
    pill: "丹药",
  };

  const UNLOCK_LABELS = {
    farm: "田产",
    workshop: "工坊",
    shop: "铺面",
    warehouse: "仓房",
    sect: "门内事务",
  };

  const FACTION_TYPE_LABELS = {
    village: "乡社",
    society: "行社",
    guild: "商帮",
    escort: "镖局",
    court: "官府",
    bureau: "转运司",
    garrison: "军府",
    order: "行院",
  };

  function renderSpeedButtons() {
    if (!dom.speedSwitch) return;
    Array.from(dom.speedSwitch.querySelectorAll<HTMLElement>(".speed-button")).forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.speed) === app.state.speed);
    });
  }

  function getModeLabel(modeId) {
    return MODE_OPTIONS.find((mode) => mode.id === modeId)?.label || modeId;
  }

  function getRoleLabel(role) {
    return {
      none: "路人",
      apprentice: "弟子",
      master: "师尊",
      partner: "道侣",
      rival: "仇敌",
    }[role || "none"];
  }

  function getFactionTypeLabel(type) {
    return FACTION_TYPE_LABELS[type] || "势力";
  }

  function getMarketBiasLabel(type) {
    return MARKET_BIAS_LABELS[type] || type || "杂市";
  }

  function getUnlockLabel(type) {
    return UNLOCK_LABELS[type] || type;
  }

  function formatUnlockLabels(unlocks = []) {
    return unlocks.map((entry) => getUnlockLabel(entry)).join("、");
  }

  function getGuardAttrs(enabled, reason = "当前条件不足，暂时无法执行。") {
    return enabled ? "" : `aria-disabled="true" data-disabled-reason="${reason}"`;
  }

  function showFeedback(text, type = "info") {
    if (!text || !dom.toastStack) return;

    const existing = dom.toastStack.querySelectorAll(".toast-item");
    if (existing.length >= 4) {
      existing[0].remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
      <span class="toast-badge">${type === "warn" ? "提示" : type === "loot" ? "收获" : "消息"}</span>
      <div class="toast-text">${text}</div>
    `;
    dom.toastStack.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add("visible");
    });

    window.setTimeout(() => {
      toast.classList.remove("visible");
      window.setTimeout(() => toast.remove(), 220);
    }, type === "warn" ? 3200 : 2400);
  }

  function describeItemEffect(item) {
    if (!item || !item.effect) return "";
    const labels = {
      hp: "气血",
      qi: "真气",
      stamina: "体力",
      power: "战力",
      insight: "悟性",
      charisma: "魅力",
      breakthrough: "突破火候",
      breakthroughRate: "突破率",
      cultivation: "修炼加成",
      realmSense: "秘境感应",
      sectTeaching: "传功效率",
      sectPrestige: "宗门威望",
      romance: "情缘",
      reputation: "声望",
    };

    return Object.entries(item.effect as Record<string, number | undefined>)
      .filter(([, value]) => value)
      .map(([key, value]) => `${labels[key] || key} ${typeof value === "number" && value < 1 ? `${Math.round(value * 100)}%` : value > 0 ? `+${round(value, 2)}` : round(value, 2)}`)
      .join("，");
  }

  function renderMeter(label, value, max, className = "") {
    const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
    return `
      <div>
        <div class="meter-label"><span>${label}</span><span>${Math.round(value)} / ${Math.round(max)}</span></div>
        <div class="meter-track"><div class="meter-fill ${className}" style="width:${percent}%"></div></div>
      </div>
    `;
  }

  Object.assign(app, {
    renderSpeedButtons,
    getModeLabel,
    getRoleLabel,
    getFactionTypeLabel,
    getMarketBiasLabel,
    getUnlockLabel,
    formatUnlockLabels,
    getGuardAttrs,
    showFeedback,
    describeItemEffect,
    renderMeter,
  });
})();
