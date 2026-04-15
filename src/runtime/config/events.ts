(() => {
  const app = window.ShanHai;

  const WORLD_EVENT_TEMPLATES = [
    { id: "realm-ripple", text: "{location}传出异象，秘境门户正在松动。", type: "npc" },
    { id: "trade-wave", text: "{location}商路大开，{resource}价格明显上扬。", type: "info" },
    { id: "sect-call", text: "{location}发布宗门悬赏，散修纷纷赶往。", type: "npc" },
    { id: "black-market", text: "{location}黑市出现神秘拍品，拍卖行气氛骤热。", type: "npc" },
  ];

  const TRAVEL_EVENT_TEMPLATES = [
    { id: "escort", kind: "money", text: "途经{location}时帮人护送货车，得到{value}灵石。" },
    { id: "salvage", kind: "item", text: "你在{terrain}拾得了{item}。" },
    { id: "pressure", kind: "injury", text: "旅途灵压翻涌，你受了些伤，却也顺势磨砺了心神。" },
  ];

  const SOCIAL_EVENT_TEMPLATES = [
    { id: "gift", text: "{npc}因欣赏你的为人，私下赠你一份薄礼。", type: "npc" },
    { id: "teaching", text: "{npc}指点你一式诀窍，你对武学又有新悟。", type: "npc" },
    { id: "rival", text: "{npc}在众人面前与你叫板，宿怨又深了一层。", type: "warn" },
    { id: "partner", text: "{npc}与你并肩而行，双方心意渐明。", type: "npc" },
  ];

  const SECT_EVENT_TEMPLATES = [
    { id: "tribute", text: "外门弟子上缴了{value}灵石供奉。", type: "info" },
    { id: "teaching-progress", text: "{npc}在传功中有所精进，宗门威望增加。", type: "info" },
    { id: "raid", text: "宿敌势力试探山门，幸好被弟子合力挡下。", type: "warn" },
  ];

  app.tables = {
    ...app.tables,
    WORLD_EVENT_TEMPLATES,
    TRAVEL_EVENT_TEMPLATES,
    SOCIAL_EVENT_TEMPLATES,
    SECT_EVENT_TEMPLATES,
  };
})();