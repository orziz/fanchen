export interface FactionData {
  id: string
  name: string
  type: string
  locationId: string
  desc: string
  joinRequirement: { money: number; reputation: number; rankIndex: number }
  titles: string[]
  unlocks: string[]
}

/* ─── Factions ─── */
export const FACTIONS: FactionData[] = [
  {
    id: 'qinghe-commons', name: '青禾乡社', type: 'village', locationId: 'qinghe',
    desc: '青禾镇的佃户、店家和乡勇凑起来的乡社。谁家修堤、谁家办丧事，都是乡社出人。',
    joinRequirement: { money: 0, reputation: 0, rankIndex: 0 },
    titles: ['帮工', '佃户', '里正助手', '乡社掌事'], unlocks: ['farm', 'shop'],
  },
  {
    id: 'mist-hunt-lodge', name: '迷林猎社', type: 'society', locationId: 'misty',
    desc: '靠采药、打猎过日子的一帮人，常年在迷雾林和青松坳一带出没。门口挂满了兽头。',
    joinRequirement: { money: 12, reputation: 2, rankIndex: 0 },
    titles: ['杂役猎手', '见习猎手', '正社猎手', '执事猎官'], unlocks: ['farm', 'workshop'],
  },
  {
    id: 'blackforge-guild', name: '玄铁工盟', type: 'guild', locationId: 'blackforge',
    desc: '玄铁城的铁匠和镖师结成的工盟。城里的炉子，一大半归他们管。',
    joinRequirement: { money: 40, reputation: 4, rankIndex: 1 },
    titles: ['学徒', '匠工', '监造', '工坊主'], unlocks: ['workshop', 'shop'],
  },
  {
    id: 'tide-market', name: '听潮商盟', type: 'guild', locationId: 'lantern',
    desc: '灯海古港的大商帮。外海来的货，十船有七船要过他们的手。',
    joinRequirement: { money: 60, reputation: 6, rankIndex: 1 },
    titles: ['脚商', '行商', '分号执事', '掌柜'], unlocks: ['shop'],
  },
  {
    id: 'river-transport-office', name: '漕河转运司', type: 'bureau', locationId: 'reedbank',
    desc: '管漕河运粮运货的衙门，一半像官府，一半像商号。河上的船都得看它的脸色。',
    joinRequirement: { money: 36, reputation: 5, rankIndex: 1 },
    titles: ['河埠脚夫', '押舱行役', '转运书吏', '河路总办'], unlocks: ['farm', 'shop'],
  },
  {
    id: 'anping-yamen', name: '安平府衙', type: 'court', locationId: 'anping',
    desc: '管税契、路引和缉捕的州府衙门。讲规矩，也看你在地方上有没有名声。',
    joinRequirement: { money: 48, reputation: 7, rankIndex: 1 },
    titles: ['缉事白役', '巡街快手', '书办典吏', '都捕头'], unlocks: ['farm', 'shop', 'workshop'],
  },
  {
    id: 'yanpass-escort', name: '雁回镖局', type: 'escort', locationId: 'yanpass',
    desc: '吃边关饭的老镖局，押军粮、护商队。雁回关一带的路，没有他们不熟的。',
    joinRequirement: { money: 54, reputation: 7, rankIndex: 1 },
    titles: ['趟子手', '镖师', '押队头', '总镖头'], unlocks: ['workshop', 'shop'],
  },
  {
    id: 'jadegate-courtyard', name: '玉阙行院', type: 'order', locationId: 'jadegate',
    desc: '玉阙在山外设的行院，收外院弟子，也替山上打理外头的杂事。',
    joinRequirement: { money: 20, reputation: 8, rankIndex: 1 },
    titles: ['听差行走', '外院弟子', '采办执事', '巡山统筹'], unlocks: ['farm', 'workshop', 'shop'],
  },
]

export const FACTION_MAP = new Map(FACTIONS.map(f => [f.id, f]))
export function getFactionData(id: string) { return FACTION_MAP.get(id) }

export interface PropertyDef {
  id: string
  label: string
  kind: string
  cost: number
  locationTags: string[]
  allowedFactionIds: string[]
  capacity: number
  desc: string
}

/* ─── Properties ─── */
export const PROPERTY_DEFS: PropertyDef[] = [
  {
    id: 'village-farm', label: '薄田一亩', kind: 'farm', cost: 120,
    locationTags: ['town', 'starter'],
    allowedFactionIds: ['qinghe-commons', 'mist-hunt-lodge', 'river-transport-office', 'anping-yamen', 'jadegate-courtyard'],
    capacity: 1, desc: '一亩薄田，种粮种药都行，收成看天。',
  },
  {
    id: 'herb-garden', label: '药圃小院', kind: 'farm', cost: 260,
    locationTags: ['town', 'sect', 'cultivation'],
    allowedFactionIds: ['mist-hunt-lodge', 'anping-yamen', 'jadegate-courtyard'],
    capacity: 2, desc: '带院墙的药圃，能种药草和灵谷。要有熟人引荐才租得到。',
  },
  {
    id: 'forge-bench', label: '小铁匠棚', kind: 'workshop', cost: 320,
    locationTags: ['forge', 'town'],
    allowedFactionIds: ['blackforge-guild', 'anping-yamen', 'yanpass-escort', 'jadegate-courtyard'],
    capacity: 2, desc: '一个能生火打铁的棚子，打些刀枪和护具。',
  },
  {
    id: 'market-stall', label: '街边小铺', kind: 'shop', cost: 380,
    locationTags: ['market', 'port', 'town'],
    allowedFactionIds: ['qinghe-commons', 'tide-market', 'blackforge-guild', 'river-transport-office', 'anping-yamen', 'yanpass-escort', 'jadegate-courtyard'],
    capacity: 1, desc: '街边一间小门面，进货卖货，赚点差价。',
  },
]

export const PROPERTY_MAP = new Map(PROPERTY_DEFS.map(p => [p.id, p]))
export function getPropertyDefData(id: string) { return PROPERTY_MAP.get(id) }

export interface CropData {
  id: string
  label: string
  seedItemId: string
  harvestItemId: string
  growDays: number
  yield: number
  desc: string
}

/* ─── Crops ─── */
export const CROPS: CropData[] = [
  { id: 'grain-crop', label: '粗灵米', seedItemId: 'seed-grain', harvestItemId: 'spirit-grain', growDays: 3, yield: 3, desc: '好种，收得快，饿不死人。' },
  { id: 'herb-crop', label: '雾心草', seedItemId: 'seed-herb', harvestItemId: 'mist-herb', growDays: 4, yield: 2, desc: '长得慢些，卖得比粮食贵。' },
]

export const CROP_MAP = new Map(CROPS.map(c => [c.id, c]))
export function getCropData(id: string) { return CROP_MAP.get(id) }

export interface CraftInput {
  itemId: string
  quantity: number
}

export interface CraftRecipe {
  id: string
  label: string
  outputItemId: string
  outputQuantity: number
  cost: number
  requiresPropertyKind: string
  minRankIndex: number
  inputs: CraftInput[]
}

/* ─── Craft Recipes ─── */
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft-wood-spear', label: '打造木柄短枪', outputItemId: 'wood-spear', outputQuantity: 1,
    cost: 12, requiresPropertyKind: 'workshop', minRankIndex: 0,
    inputs: [{ itemId: 'timber', quantity: 2 }, { itemId: 'scrap-iron', quantity: 1 }],
  },
  {
    id: 'craft-hide-jerkin', label: '缝制皮护短褂', outputItemId: 'hide-jerkin', outputQuantity: 1,
    cost: 14, requiresPropertyKind: 'workshop', minRankIndex: 0,
    inputs: [{ itemId: 'cloth-roll', quantity: 1 }, { itemId: 'beast-hide', quantity: 1 }],
  },
  {
    id: 'craft-iron-sword', label: '打造精铁剑', outputItemId: 'iron-sword', outputQuantity: 1,
    cost: 38, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'iron-sand', quantity: 2 }, { itemId: 'scrap-iron', quantity: 2 }],
  },
  {
    id: 'craft-guard-armor', label: '铆制护院铁甲', outputItemId: 'guard-armor', outputQuantity: 1,
    cost: 42, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'iron-sand', quantity: 2 }, { itemId: 'beast-hide', quantity: 1 }, { itemId: 'cloth-roll', quantity: 1 }],
  },
  {
    id: 'craft-herb-paste', label: '调制草膏', outputItemId: 'herb-paste', outputQuantity: 1,
    cost: 10, requiresPropertyKind: 'workshop', minRankIndex: 0,
    inputs: [{ itemId: 'mist-herb', quantity: 2 }, { itemId: 'spirit-grain', quantity: 1 }],
  },
  {
    id: 'craft-blank-codex', label: '装订空白册页', outputItemId: 'blank-codex', outputQuantity: 1,
    cost: 14, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'cloth-roll', quantity: 1 }, { itemId: 'lacquer-wood', quantity: 1 }],
  },
  {
    id: 'craft-spirit-ink', label: '研磨灵墨', outputItemId: 'spirit-ink', outputQuantity: 1,
    cost: 16, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'mist-herb', quantity: 1 }, { itemId: 'scrap-iron', quantity: 1 }],
  },
  {
    id: 'craft-marrows-pellet', label: '调制养元散', outputItemId: 'marrow-pellet', outputQuantity: 1,
    cost: 18, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'mist-herb', quantity: 2 }, { itemId: 'moonleaf', quantity: 1 }, { itemId: 'spirit-grain', quantity: 1 }],
  },
  {
    id: 'craft-focus-pellet', label: '炼制明神丹', outputItemId: 'focus-pellet', outputQuantity: 1,
    cost: 24, requiresPropertyKind: 'workshop', minRankIndex: 2,
    inputs: [{ itemId: 'moonleaf', quantity: 1 }, { itemId: 'cold-crystal', quantity: 1 }],
  },
  {
    id: 'craft-bronze-halberd', label: '打造青铜戟', outputItemId: 'bronze-halberd', outputQuantity: 1,
    cost: 28, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'sun-copper', quantity: 2 }, { itemId: 'lacquer-wood', quantity: 1 }],
  },
  {
    id: 'craft-scale-vest', label: '缝制鳞光内甲', outputItemId: 'scale-vest', outputQuantity: 1,
    cost: 26, requiresPropertyKind: 'workshop', minRankIndex: 1,
    inputs: [{ itemId: 'beast-hide', quantity: 1 }, { itemId: 'frost-silk', quantity: 1 }],
  },
]

export const RECIPE_MAP = new Map(CRAFT_RECIPES.map(r => [r.id, r]))
export function getRecipeData(id: string) { return RECIPE_MAP.get(id) }
