(() => {
  const app = window.ShanHai;
  const { tables, utils } = app;
  const { SOCIAL_EVENT_TEMPLATES } = tables;
  const { sample, clamp } = utils;

  function processRelationshipTick() {
    const game = app.getGame();
    game.npcs.forEach((npc) => {
      const relation = app.getRelation(npc.id);
      if (relation.role === "partner" && Math.random() < 0.1) {
        game.player.breakthrough += 1.2;
        relation.affinity = clamp(relation.affinity + 1, -100, 100);
        if (Math.random() < 0.24) {
          const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "partner"));
          app.appendLog(template.text.split("{npc}").join(npc.name), template.type);
        }
      }
      if (relation.role === "master" && Math.random() < 0.14) {
        game.player.cultivation += 0.6;
        relation.trust = clamp(relation.trust + 1, -100, 100);
      }
      if (relation.role === "rival" && Math.random() < 0.12) {
        relation.rivalry = clamp(relation.rivalry + 2, 0, 100);
        game.player.reputation += 0.1;
        if (Math.random() < 0.4) {
          const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "rival"));
          app.appendLog(template.text.split("{npc}").join(npc.name), template.type);
        }
      }
    });
  }

  function visitNpc(npcId) {
    const game = app.getGame();
    const npc = app.getNpc(npcId);
    if (!npc) return;
    const relation = app.getRelation(npcId);
    if (npc.locationId !== game.player.locationId) {
      app.appendLog(`${npc.name}目前在${tables.LOCATION_MAP[npc.locationId].name}，暂时见不到。`, "warn");
      if (app.render) app.render();
      return;
    }
    const attitude = relation.affinity > 20 ? "坦诚" : relation.affinity > 0 ? "平和" : "疏离";
    const cost = 10 + Math.max(0, relation.rivalry > 10 ? 8 : 0);
    if (game.player.money < cost) {
      app.appendLog("灵石不够备礼，对方并不想多聊。", "warn");
      return;
    }
    game.player.money -= cost;
    app.adjustRelation(npcId, {
      affinity: npc.mood.kindness > 58 ? 5 : 2,
      trust: 3,
      romance: npc.mood.kindness > 70 ? 1 : 0,
      rivalry: relation.role === "rival" ? -2 : 0,
    });
    app.appendLog(`你与${npc.name}在${tables.LOCATION_MAP[npc.locationId].name}交谈，对方态度${attitude}。`, "npc");
    if (Math.random() < 0.26) {
      const template = sample(SOCIAL_EVENT_TEMPLATES.filter((entry) => entry.id === "teaching" || entry.id === "gift"));
      app.appendLog(template.text.split("{npc}").join(npc.name), template.type);
      if (template.id === "gift") {
        app.addItemToInventory(sample(["mist-herb", "spirit-grain", "jade-spring"]), 1);
      }
      if (template.id === "teaching") {
        game.player.insight += 0.4;
      }
    }
    if (app.render) app.render();
  }

  Object.assign(app, {
    processRelationshipTick,
    visitNpc,
  });
})();
