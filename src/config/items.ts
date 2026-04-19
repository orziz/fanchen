import { KNOWLEDGE_ENTRIES } from './knowledge'

export type ManualCategory = 'heart' | 'spell' | 'knowledge'

export interface ItemData {
  id: string
  /** 名称 */
  name: string
  /** 类型 */
  type: string
  /** 稀有度 */
  rarity: string
  /** 品阶 */
  tier: number
  /** 最低可用等级索引 */
  minRankIndex: number
  /** 基础价值 */
  baseValue: number
  /** 描述 */
  desc: string
  /** 效果 */
  effect: Record<string, number>
  /** 手动技能ID */
  manualSkillId?: string
  /** 知识ID */
  knowledgeId?: string
  /** 手册分类 */
  manualCategory?: ManualCategory
  /** 仅可发现 */
  discoverOnly?: boolean
  /** 可直接使用 */
  directUse?: boolean
}

export const MATERIAL_RESOURCE_ITEMS: ItemData[] = [
  { id: 'mist-herb', name: '雾心草', type: 'herb', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 16, desc: '路边就能采到的草药，晒干后能卖几个铜灵。', effect: { qi: 4 }, directUse: true },
  { id: 'spirit-grain', name: '粗灵米', type: 'grain', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 10, desc: '最常见的口粮，凡人和低阶修士都吃得起。', effect: { stamina: 8 }, directUse: true },
  { id: 'timber', name: '杂木料', type: 'wood', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 12, desc: '修棚、做农具和制粗器最常用的木料。', effect: {} },
  { id: 'scrap-iron', name: '废铁料', type: 'ore', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 18, desc: '回炉后可再利用，是低阶工坊的起家材料。', effect: {} },
  { id: 'cloth-roll', name: '粗布卷', type: 'cloth', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 14, desc: '做衣裳、护具和摊布都用得上。', effect: {} },
  { id: 'seed-grain', name: '谷种包', type: 'seed', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 6, desc: '适合在自家小田里种一季粗灵米。', effect: {} },
  { id: 'seed-herb', name: '药种包', type: 'seed', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 12, desc: '培育低阶药草的种子，见效慢但稳定。', effect: {} },
  { id: 'lacquer-wood', name: '漆灵木', type: 'wood', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 32, desc: '适合做细木器和书匣的灵木，韧性比杂木好得多。', effect: {} },
  { id: 'iron-sand', name: '精铁砂', type: 'ore', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 48, desc: '学徒铁匠最想要的材料，可以打出正经兵器。', effect: {} },
  { id: 'beast-hide', name: '兽皮', type: 'leather', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 46, desc: '从低阶野兽身上剥下，可做皮具和甲片。', effect: {} },
  { id: 'blank-codex', name: '空白册页', type: 'paper', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 36, desc: '专为誊录术法与学识准备的册页，纸脉稳，能留住灵性墨痕。', effect: {} },
  { id: 'spirit-ink', name: '灵墨', type: 'ink', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 44, desc: '掺了细磨灵砂的墨，适合抄录会动灵机的册本。', effect: {} },
  { id: 'moonleaf', name: '月魄叶', type: 'herb', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 72, desc: '夜露最重时采下的叶片，药性温和却能安神定气。', effect: { qi: 6 }, directUse: true },
  { id: 'frost-silk', name: '霜纹丝', type: 'cloth', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 88, desc: '带寒纹的细丝，适合缝制轻甲和书袋。', effect: {} },
  { id: 'sun-copper', name: '赤铜精', type: 'ore', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 82, desc: '带着火相的铜精，常用来给兵器添一层灵性。', effect: {} },
  { id: 'tide-amber', name: '潮纹琥珀', type: 'relic', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 680, desc: '港口商会常把它当压箱底的好货。', effect: { reputation: 1 } },
  { id: 'river-pearl', name: '河魄珠', type: 'relic', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 760, desc: '在大河暗流里养成的珠子，常被拿去做人情或点缀礼器。', effect: { charisma: 1 } },
  { id: 'cold-crystal', name: '寒晶', type: 'ice', rarity: 'rare', tier: 3, minRankIndex: 2, baseValue: 720, desc: '能稳固心神的稀罕材料，低境修士不可多得。', effect: { breakthrough: 8 } },
  { id: 'flame-sand', name: '赤焰砂', type: 'fire', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 2400, desc: '高阶淬器材料，普通市井根本见不到。', effect: { power: 1.8 } },
  { id: 'star-scroll', name: '陨星残卷', type: 'scroll', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 3200, desc: '只有秘境和大宗拍卖才会流出的残卷。', effect: { insight: 4, breakthrough: 12 } },
]

export const EQUIPMENT_ITEMS: ItemData[] = [
  { id: 'wood-spear', name: '木柄短枪', type: 'weapon', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 52, desc: '木匠和小作坊都做得出来的防身兵器。', effect: { power: 1.4 } },
  { id: 'hide-jerkin', name: '皮护短褂', type: 'armor', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 56, desc: '猎户常穿的护身衣物，比空手上山强得多。', effect: { hp: 10, stamina: 4 } },
  { id: 'bronze-halberd', name: '青铜戟', type: 'weapon', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 210, desc: '比木柄兵器更稳重，适合以力压人的路数。', effect: { power: 3.8 } },
  { id: 'scale-vest', name: '鳞光内甲', type: 'armor', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 240, desc: '轻薄的片甲，长途奔走时比重甲更实用。', effect: { hp: 14, stamina: 6 } },
  { id: 'iron-sword', name: '精铁剑', type: 'weapon', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 160, desc: '出自正经铁匠手里的精铁兵器，已经能上台面。', effect: { power: 3.2 } },
  { id: 'guard-armor', name: '护院铁甲', type: 'armor', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 180, desc: '镶铁的护甲，适合长期看店、押货和行路。', effect: { hp: 18 } },
  { id: 'marsh-bow', name: '泽角长弓', type: 'weapon', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 780, desc: '弓臂用泽角和韧木做成，擅长中距离压制。', effect: { power: 4.8, insight: 1 } },
  { id: 'silk-guard-cloak', name: '云纹护披', type: 'armor', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 860, desc: '在礼器和护具之间取了中道，既撑场面也能护身。', effect: { hp: 20, charisma: 1 } },
  { id: 'wind-sword', name: '流风剑', type: 'weapon', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1500, desc: '轻灵剑器，已有真正修士兵刃的样子。', effect: { power: 6 } },
  { id: 'stone-armor', name: '镇岳甲', type: 'armor', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1360, desc: '厚重如山的护甲，普通凡人根本用不起。', effect: { hp: 34 } },
]

export const UTILITY_ITEMS: ItemData[] = [
  { id: 'herb-paste', name: '草膏', type: 'pill', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 60, desc: '乡医就能调制的外敷药，能缓缓回气回血。', effect: { hp: 10, qi: 4 }, directUse: true },
  { id: 'marrow-pellet', name: '养元散', type: 'pill', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 90, desc: '偏补元气和体力的散剂，适合跑长路之前备着。', effect: { hp: 8, stamina: 10 }, directUse: true },
  { id: 'farm-deed', name: '薄田地契', type: 'deed', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 260, desc: '购得之后可以把一小块田挂到自己名下。', effect: { assetFarm: 1 } },
  { id: 'workshop-permit', name: '工坊牌照', type: 'permit', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 340, desc: '拿着它才有资格在城镇里经营自己的小作坊。', effect: { assetWorkshop: 1 } },
  { id: 'shop-deed', name: '铺面契书', type: 'deed', rarity: 'rare', tier: 2, minRankIndex: 1, baseValue: 620, desc: '一份正经铺契，可以把门面或货摊记到自己名下。', effect: { assetShop: 1 } },
  { id: 'focus-pellet', name: '明神丹', type: 'pill', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 560, desc: '偏提神与稳神的丹药，适合冲关前或抄录前用。', effect: { qi: 10, insight: 1 }, directUse: true },
  { id: 'jade-spring', name: '灵泉丸', type: 'pill', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 540, desc: '宗门药房才会稳定出售的回气药。', effect: { hp: 12, qi: 14 }, directUse: true },
  { id: 'compass-realm', name: '秘境罗盘', type: 'tool', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1800, desc: '唯有中阶修士才有资格拿它追踪秘境门户。', effect: { realmSense: 1 }, directUse: true },
  { id: 'bond-token', name: '同心玉佩', type: 'token', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 2600, desc: '多在宗门高层或世家联姻时流转。', effect: { romance: 5, charisma: 1 } },
  { id: 'sect-banner', name: '立宗旗幡', type: 'sect', rarity: 'rare', tier: 3, minRankIndex: 4, baseValue: 2200, desc: '想开宗立派，至少得先有资格和名器。', effect: { sectPrestige: 6 } },
]

export const TECHNIQUE_MANUAL_ITEMS: ItemData[] = [
  { id: 'apprentice-manual', name: '养气入门诀', type: 'manual', manualCategory: 'heart', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 120, desc: '最基础的修行功课，多见于外门与学徒传承。', effect: { cultivation: 0.04, insight: 1 }, manualSkillId: 'heart-apprentice' },
  { id: 'manual-ember', name: '离火弹指诀', type: 'manual', manualCategory: 'spell', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 150, desc: '将离火压成一线指劲，出手快而狠，是初学术法时最常见的攻伐手段。', effect: { damageMultiplier: 1.62, burn: 2, qiCost: 10 }, manualSkillId: 'spell-ember-art' },
  { id: 'manual-breath', name: '归息法', type: 'manual', manualCategory: 'heart', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 980, desc: '正规门派才会拿来培养内门弟子的法门。', effect: { cultivation: 0.08, insight: 3 }, manualSkillId: 'heart-breath' },
  { id: 'manual-frost', name: '寒芒凝锋术', type: 'manual', manualCategory: 'spell', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 860, desc: '凝寒为锋，专破敌方气脉，适合稳扎稳打的术法路数。', effect: { damageMultiplier: 1.48, chill: 2, qiCost: 11 }, manualSkillId: 'spell-frost-bloom' },
  { id: 'manual-wind', name: '流风裂帛术', type: 'manual', manualCategory: 'spell', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 920, desc: '以流风斩开护势，擅长先打出破绽，再衔接下一轮攻势。', effect: { damageMultiplier: 1.58, expose: 2, qiCost: 12 }, manualSkillId: 'spell-wind-blade' },
  { id: 'manual-sect', name: '授业总谱', type: 'manual', manualCategory: 'heart', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 3800, desc: '可大幅提升宗门传功效率，不可能在凡俗市面出现。', effect: { sectTeaching: 0.18, charisma: 1 }, manualSkillId: 'heart-sect' },
  { id: 'manual-tide-mirror', name: '镜潮归元诀', type: 'manual', manualCategory: 'heart', rarity: 'epic', tier: 4, minRankIndex: 3, baseValue: 4200, desc: '由两门功法互证而悟出的镜潮心法，正常市面上买不到，只能靠自己练出来后再誊写。', effect: { cultivation: 0.1, breakthroughRate: 0.04, insight: 4 }, manualSkillId: 'heart-tide-mirror', discoverOnly: true },
  { id: 'manual-ember-tide', name: '潮火连环诀', type: 'manual', manualCategory: 'spell', rarity: 'epic', tier: 4, minRankIndex: 3, baseValue: 4600, desc: '将归息与离火反复演化后悟出的连环术法，只能靠悟道后再誊写成册。', effect: { damageMultiplier: 1.92, burn: 3, expose: 1, qiCost: 14 }, manualSkillId: 'spell-ember-tide', discoverOnly: true },
  { id: 'manual-sun', name: '赤阳心法', type: 'manual', manualCategory: 'heart', rarity: 'legendary', tier: 6, minRankIndex: 5, baseValue: 18000, desc: '真正的天品传承，只会出现在顶级秘境或宗门重库。', effect: { cultivation: 0.12, insight: 6, power: 1.8 }, manualSkillId: 'heart-sun' },
  { id: 'manual-moon', name: '太阴御神诀', type: 'manual', manualCategory: 'heart', rarity: 'legendary', tier: 6, minRankIndex: 5, baseValue: 19000, desc: '极罕的心法，不可能让凡人随便摸到。', effect: { breakthroughRate: 0.08, charisma: 4, insight: 2 }, manualSkillId: 'heart-moon' },
]

export const KNOWLEDGE_MANUAL_ITEMS: ItemData[] = KNOWLEDGE_ENTRIES.map((knowledge) => ({
  id: knowledge.itemId,
  name: knowledge.name,
  type: 'manual',
  manualCategory: 'knowledge',
  rarity: knowledge.rarity,
  tier: knowledge.tier,
  minRankIndex: knowledge.minRankIndex,
  baseValue: knowledge.baseValue,
  desc: knowledge.desc,
  effect: knowledge.effect,
  knowledgeId: knowledge.id,
}))

export const ITEMS: ItemData[] = [
  ...MATERIAL_RESOURCE_ITEMS,
  ...EQUIPMENT_ITEMS,
  ...UTILITY_ITEMS,
  ...TECHNIQUE_MANUAL_ITEMS,
  ...KNOWLEDGE_MANUAL_ITEMS,
]

export const ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]))
export const DISTRIBUTABLE_ITEMS = ITEMS.filter((item) => !item.discoverOnly)
export const MANUAL_ITEM_MAP = new Map(
  ITEMS.filter((item) => item.manualSkillId).map((item) => [item.manualSkillId as string, item]),
)
export const KNOWLEDGE_ITEM_MAP = new Map(
  ITEMS.filter((item) => item.knowledgeId).map((item) => [item.knowledgeId as string, item]),
)

export function getItem(itemId: string): ItemData | undefined {
  return ITEM_MAP.get(itemId)
}

export function getManualItemBySkillId(skillId: string): ItemData | undefined {
  return MANUAL_ITEM_MAP.get(skillId)
}

export function getKnowledgeItemById(knowledgeId: string): ItemData | undefined {
  return KNOWLEDGE_ITEM_MAP.get(knowledgeId)
}

export function hasAssetClaimEffect(item: Pick<ItemData, 'effect'> | null | undefined) {
  if (!item) return false
  return Boolean(item.effect.assetFarm || item.effect.assetWorkshop || item.effect.assetShop)
}

export function canUseItemDirectly(item: ItemData | null | undefined) {
  if (!item) return false
  if (item.type === 'weapon' || item.type === 'armor' || item.type === 'manual') return true
  if (hasAssetClaimEffect(item)) return true
  return Boolean(item.directUse)
}

export function getItemUsageSummary(item: ItemData | null | undefined) {
  if (!item) return '当前没有直接使用效果'
  if (item.type === 'weapon' || item.type === 'armor') return '可直接装备'
  if (item.type === 'manual') {
    if (item.manualCategory === 'knowledge') return '用于研读学识札记'
    return '用于学习功法秘籍'
  }
  if (item.effect.assetFarm) return '可在合适地点落成田产'
  if (item.effect.assetWorkshop) return '可在城镇落成工坊'
  if (item.effect.assetShop) return '可在城镇落成铺面'
  if (item.directUse) {
    if (item.type === 'tool') return '可直接启用'
    return '可直接服用'
  }
  switch (item.type) {
    case 'paper':
      return '用于誊写秘籍与学识札记'
    case 'ink':
      return '用于誊写秘籍'
    case 'seed':
      return '用于田产种植'
    case 'wood':
    case 'ore':
    case 'cloth':
    case 'leather':
      return '用于制造、装订或经营'
    case 'herb':
    case 'grain':
      return '用于补给或制造'
    case 'relic':
    case 'ice':
    case 'fire':
    case 'scroll':
      return '用于高阶交易、悟道或配方'
    case 'sect':
      return '用于宗门相关玩法'
    case 'token':
      return '用于人情、关系或特殊剧情'
    case 'tool':
      return '用于探索或特定功能'
    default:
      return '当前没有直接使用效果'
  }
}
