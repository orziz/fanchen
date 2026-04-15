(() => {
  const app = window.ShanHai;

  const PERSONALITIES = [
    {
      id: "ambitious",
      label: "野心",
      desc: "偏爱高风险任务和高价竞拍，会主动抢占稀有资源。",
      moodBias: { greed: 18, courage: 16, sociability: -2 },
    },
    {
      id: "merciful",
      label: "仁心",
      desc: "常在城镇扶助他人，更愿意提供援手，关系提升更快。",
      moodBias: { kindness: 20, greed: -12, patience: 10 },
    },
    {
      id: "schemer",
      label: "机心",
      desc: "善于套利与布局，偏好商贸和拍卖，也容易引发口舌风波。",
      moodBias: { greed: 14, intellect: 18, honor: -10 },
    },
    {
      id: "wanderer",
      label: "游侠",
      desc: "常年游历四方，机缘多但不易深交，更常触发旅途事件。",
      moodBias: { curiosity: 20, courage: 10, patience: -8 },
    },
    {
      id: "stoic",
      label: "苦修",
      desc: "以修炼为先，闭关频率高，不轻易参与拍卖和人情往来。",
      moodBias: { patience: 20, greed: -14, courage: 6 },
    },
  ];

  const NPC_ARCHETYPES = [
    {
      title: "剑修",
      styles: ["青锋", "断岳", "流影"],
      skillBias: { combat: 1.2, trade: 0.9, meditate: 1.05 },
      favoriteItems: ["weapon", "manual"],
    },
    {
      title: "丹师",
      styles: ["丹火", "药王", "灵泉"],
      skillBias: { combat: 0.82, trade: 1.18, meditate: 1.1 },
      favoriteItems: ["pill", "herb"],
    },
    {
      title: "散商",
      styles: ["行舟", "千机", "墨羽"],
      skillBias: { combat: 0.88, trade: 1.32, meditate: 0.92 },
      favoriteItems: ["ore", "relic", "material"],
    },
    {
      title: "体修",
      styles: ["撼山", "裂风", "苍拳"],
      skillBias: { combat: 1.32, trade: 0.82, meditate: 0.94 },
      favoriteItems: ["armor", "material"],
    },
    {
      title: "符师",
      styles: ["天符", "夜烛", "云箓"],
      skillBias: { combat: 0.98, trade: 1.1, meditate: 1.08 },
      favoriteItems: ["scroll", "relic"],
    },
  ];

  const RELATION_ROLES = {
    none: "普通",
    master: "师尊",
    apprentice: "弟子",
    partner: "道侣",
    rival: "宿敌",
  };

  const SECT_NAME_PARTS = {
    prefix: ["问道", "凌霄", "听潮", "归元", "玄岳", "流云", "星河", "烛龙"],
    suffix: ["宗", "门", "阁", "殿", "山", "盟"],
  };

  const SECT_BUILDINGS = {
    hall: { label: "议事大殿", baseCost: 180, desc: "提升宗门威望与招募上限。" },
    dojo: { label: "演武场", baseCost: 220, desc: "提升弟子战斗成长。" },
    library: { label: "藏经阁", baseCost: 260, desc: "提升传功效率与悟性成长。" },
    market: { label: "外门坊市", baseCost: 240, desc: "提升宗门灵石收入。" },
  };

  app.tables = {
    ...app.tables,
    PERSONALITIES,
    NPC_ARCHETYPES,
    RELATION_ROLES,
    SECT_NAME_PARTS,
    SECT_BUILDINGS,
  };
})();