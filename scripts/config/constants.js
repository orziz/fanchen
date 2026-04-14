(() => {
  const app = window.ShanHai;

  const SAVE_KEY = "fan-chen-li-dao-save-v4";
  const AUTO_SAVE_INTERVAL = 45000;
  const MAX_LOG = 120;
  const LOOP_INTERVALS = {
    0.5: 12000,
    1: 7600,
    2: 4200,
    4: 2100,
    10: 900,
  };

  const SPEED_OPTIONS = [
    { value: 0.5, label: "半速" },
    { value: 1, label: "常速" },
    { value: 2, label: "双速" },
    { value: 4, label: "四倍速" },
    { value: 10, label: "十倍速" },
  ];

  const TIME_LABELS = ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"];

  const RARITY_META = {
    common: { label: "凡品", color: "common", value: 1 },
    uncommon: { label: "灵品", color: "uncommon", value: 1.45 },
    rare: { label: "玄品", color: "rare", value: 2.15 },
    epic: { label: "地品", color: "epic", value: 3.05 },
    legendary: { label: "天品", color: "legendary", value: 4.4 },
  };

  const RANKS = [
    { name: "凡胎", need: 0, qiMax: 28, hpMax: 72, staminaMax: 92 },
    { name: "练力", need: 120, qiMax: 36, hpMax: 88, staminaMax: 100 },
    { name: "感气", need: 360, qiMax: 52, hpMax: 102, staminaMax: 108 },
    { name: "炼气", need: 960, qiMax: 88, hpMax: 126, staminaMax: 116 },
    { name: "筑基", need: 2600, qiMax: 144, hpMax: 170, staminaMax: 126 },
    { name: "金丹", need: 6200, qiMax: 228, hpMax: 232, staminaMax: 136 },
    { name: "元婴", need: 14000, qiMax: 336, hpMax: 312, staminaMax: 146 },
  ];

  const MODE_OPTIONS = [
    { id: "manual", label: "手动操作", desc: "世界照常推进，但不会替你自动执行日常动作。" },
    { id: "balanced", label: "维生求进", desc: "在生计、修炼、跑腿和关系之间谨慎平衡。" },
    { id: "cultivation", label: "苦修养气", desc: "优先打坐、练体、感气和低风险冲关。" },
    { id: "merchant", label: "小本营生", desc: "优先跑商、经营摊位和积攒启动资产。" },
    { id: "adventure", label: "外出闯荡", desc: "优先低阶历练、机缘与战斗。" },
    { id: "sect", label: "门内差事", desc: "优先处理宗门任务、产业和门内成长。" },
  ];

  const ACTION_META = {
    meditate: { label: "静坐养气", cost: { stamina: 2, qi: 0 }, reward: { cultivation: 1.2, qi: 3, breakthrough: 0.3 } },
    train: { label: "练体打熬", cost: { stamina: 4, qi: 0 }, reward: { cultivation: 0.8, power: 0.25, hp: 0.6 } },
    hunt: { label: "低阶历练", cost: { stamina: 6, qi: 2 }, reward: { money: 4, cultivation: 0.6, reputation: 0.1, encounter: 0.45 } },
    trade: { label: "摆摊跑货", cost: { stamina: 3 }, reward: { money: 3, reputation: 0.1, market: 1 } },
    quest: { label: "奔走差事", cost: { stamina: 5, qi: 2 }, reward: { money: 6, reputation: 0.4, cultivation: 0.5, breakthrough: 0.5, encounter: 0.65 } },
    breakthrough: { label: "尝试破境", cost: { stamina: 8, qi: 6 }, reward: { breakthrough: 1.2 } },
    auction: { label: "查看拍市", cost: { stamina: 2 }, reward: { money: 1, reputation: 0.1 } },
    sect: { label: "门内值役", cost: { stamina: 3 }, reward: { sect: 1, reputation: 0.15 } },
  };

  app.config = {
    ...app.config,
    SAVE_KEY,
    AUTO_SAVE_INTERVAL,
    MAX_LOG,
    LOOP_INTERVALS,
  };

  app.tables = {
    ...app.tables,
    RARITY_META,
    SPEED_OPTIONS,
    TIME_LABELS,
    RANKS,
    MODE_OPTIONS,
    ACTION_META,
  };
})();