(() => {
  const app = window.ShanHai;

  const MONSTER_TEMPLATES = [
    { id: "marsh-lizard", name: "沼鳞妖蜥", region: "yunze", baseHp: 58, basePower: 10, baseQi: 18, rewards: { money: 10, cultivation: 4 }, lootTypes: ["herb", "grain"] },
    { id: "mist-wolf", name: "雾隐狼妖", region: "misty", baseHp: 76, basePower: 14, baseQi: 24, rewards: { money: 14, cultivation: 6 }, lootTypes: ["herb", "wood"] },
    { id: "forge-puppet", name: "玄铁傀儡", region: "blackforge", baseHp: 92, basePower: 17, baseQi: 26, rewards: { money: 16, cultivation: 7 }, lootTypes: ["ore", "weapon"] },
    { id: "snow-ape", name: "寒脊雪猿", region: "snowpeak", baseHp: 112, basePower: 21, baseQi: 32, rewards: { money: 20, cultivation: 9 }, lootTypes: ["ice", "pill"] },
    { id: "reef-specter", name: "潮渊海魇", region: "lantern", baseHp: 124, basePower: 24, baseQi: 36, rewards: { money: 24, cultivation: 10 }, lootTypes: ["relic", "scroll"] },
    { id: "blaze-bird", name: "赤翎炎雀", region: "redcliff", baseHp: 156, basePower: 30, baseQi: 42, rewards: { money: 30, cultivation: 12 }, lootTypes: ["fire", "ore"] },
    { id: "star-devourer", name: "噬星古兽", region: "starfall", baseHp: 192, basePower: 36, baseQi: 50, rewards: { money: 38, cultivation: 15 }, lootTypes: ["scroll", "manual"] },
    { id: "jade-traitor", name: "玉阙叛徒", region: "jadegate", baseHp: 148, basePower: 28, baseQi: 40, rewards: { money: 28, cultivation: 11 }, lootTypes: ["pill", "manual"] },
  ];

  const MONSTER_AFFIXES = [
    { id: "swift", label: "疾风", desc: "先手更快，闪避更高。", mod: { speed: 0.28, dodge: 0.12 } },
    { id: "ironhide", label: "铁甲", desc: "承伤下降，生命更厚。", mod: { defense: 0.18, hp: 0.22 } },
    { id: "soul-drain", label: "噬灵", desc: "攻击时会额外吸取真气。", mod: { qiBurn: 4, power: 0.08 } },
    { id: "feral", label: "凶煞", desc: "暴击更高，输出更猛。", mod: { crit: 0.16, power: 0.16 } },
    { id: "mirror-step", label: "镜影", desc: "有概率闪避本回合攻击。", mod: { dodge: 0.2 } },
    { id: "ember", label: "玄火", desc: "会给你附加灼烧。", mod: { burn: 3, power: 0.1 } },
    { id: "frostmail", label: "霜甲", desc: "攻击附带凝滞，降低体力恢复。", mod: { chill: 2, defense: 0.1 } },
  ];

  const REALM_TEMPLATES = [
    {
      id: "marsh-manor",
      name: "云梦遗府",
      locationId: "yunze",
      unlockRep: 0,
      desc: "泽底旧府偶现光影，守关首领会掉落早期珍材。",
      boss: { name: "泽主残魂", baseHp: 220, basePower: 24, baseQi: 44, affixes: ["mirror-step", "soul-drain"] },
      rewards: { money: 70, prestige: 4, items: ["mist-herb", "compass-realm"] },
    },
    {
      id: "mist-hunt",
      name: "迷林狩境",
      locationId: "misty",
      unlockRep: 8,
      desc: "迷雾林深处开启猎场，狼王与迷行剑魄同在。",
      boss: { name: "魇雾狼王", baseHp: 290, basePower: 30, baseQi: 56, affixes: ["swift", "feral"] },
      rewards: { money: 92, prestige: 6, items: ["wind-sword", "mist-herb"] },
    },
    {
      id: "ice-cavern",
      name: "寒魄冰窟",
      locationId: "snowpeak",
      unlockRep: 18,
      desc: "万年冰窟灵压极重，适合冲关者搏一线机缘。",
      boss: { name: "裂冰古猿", baseHp: 380, basePower: 38, baseQi: 62, affixes: ["ironhide", "frostmail"] },
      rewards: { money: 120, prestige: 8, items: ["cold-crystal", "jade-spring"] },
    },
    {
      id: "tide-ruins",
      name: "潮渊遗墟",
      locationId: "lantern",
      unlockRep: 14,
      desc: "港外遗墟在涨潮时露出入口，海魇首领守着旧朝宝库。",
      boss: { name: "深潮主祭", baseHp: 350, basePower: 34, baseQi: 70, affixes: ["soul-drain", "mirror-step"] },
      rewards: { money: 132, prestige: 7, items: ["tide-amber", "star-scroll"] },
    },
    {
      id: "ember-palace",
      name: "赤焰宫阙",
      locationId: "redcliff",
      unlockRep: 26,
      desc: "赤霞崖地火漫天，宫阙一现便意味着大机缘与大凶险。",
      boss: { name: "离火真君遗魄", baseHp: 480, basePower: 46, baseQi: 90, affixes: ["ember", "feral", "ironhide"] },
      rewards: { money: 180, prestige: 12, items: ["flame-sand", "manual-sect"] },
    },
    {
      id: "star-sanctum",
      name: "星陨圣阙",
      locationId: "starfall",
      unlockRep: 40,
      desc: "最强秘境之一，只有真正的大修才敢踏入。",
      boss: { name: "吞星龙骸", baseHp: 680, basePower: 58, baseQi: 118, affixes: ["swift", "soul-drain", "ember", "mirror-step"] },
      rewards: { money: 260, prestige: 18, items: ["manual-sun", "manual-moon", "bond-token"] },
    },
  ];

  app.tables = {
    ...app.tables,
    MONSTER_TEMPLATES,
    MONSTER_AFFIXES,
    REALM_TEMPLATES,
  };
})();