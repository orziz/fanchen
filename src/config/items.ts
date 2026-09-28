import { KNOWLEDGE_ENTRIES } from '@/config/knowledge'

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
  { id: 'mist-herb', name: '雾心草', type: 'herb', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 16, desc: '河滩、林边到处都长，叶背发白。晒干了药铺收，自己嚼两片也能提提神。', effect: { qi: 4 }, directUse: true },
  { id: 'spirit-grain', name: '粗灵米', type: 'grain', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 10, desc: '糙米里掺着几粒泛青的灵谷，煮出来有股淡淡的甜味。穷人家的口粮。', effect: { stamina: 8 }, directUse: true },
  { id: 'timber', name: '杂木料', type: 'wood', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 12, desc: '山上随手砍的杂木，劈柴、修棚、做锄头把都用它。', effect: {} },
  { id: 'scrap-iron', name: '废铁料', type: 'ore', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 18, desc: '断了的锄头、锈穿的锅，收破烂的一担担挑去铁匠铺回炉。', effect: {} },
  { id: 'cloth-roll', name: '粗布卷', type: 'cloth', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 14, desc: '家织的粗布，扎手，却经穿。做衣裳、缝护具、铺摊子都用得上。', effect: {} },
  { id: 'seed-grain', name: '谷种包', type: 'seed', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 6, desc: '一小包挑过的谷种，种下去一季能收一茬粗灵米。', effect: {} },
  { id: 'seed-herb', name: '药种包', type: 'seed', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 12, desc: '拿油纸包着的雾心草种子。出苗慢，得勤浇水。', effect: {} },
  { id: 'lacquer-wood', name: '漆灵木', type: 'wood', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 32, desc: '木纹细密，刷一层漆能亮上好些年。木匠拿它做书匣和细木器。', effect: {} },
  { id: 'iron-sand', name: '精铁砂', type: 'ore', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 48, desc: '筛过几遍的铁砂，黑得发亮。学徒铁匠攒上一袋，就能打出一把像样的兵器。', effect: {} },
  { id: 'beast-hide', name: '兽皮', type: 'leather', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 46, desc: '山里野兽身上剥下来的皮，硝好了能做皮褂、刀鞘和甲片。', effect: {} },
  { id: 'blank-codex', name: '空白册页', type: 'paper', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 36, desc: '用韧纸装订的空册子，纸面吃墨不洇。抄功法、记心得都用它。', effect: {} },
  { id: 'spirit-ink', name: '灵墨', type: 'ink', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 44, desc: '墨里掺了磨细的灵砂，写出来的字在暗处隐隐发亮。抄功法的人离不了它。', effect: {} },
  { id: 'moonleaf', name: '月魄叶', type: 'herb', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 72, desc: '夜露最重的时候采下来，叶脉泛着银光。含一片在舌底，脑子会清醒许多。', effect: { qi: 6 }, directUse: true },
  { id: 'frost-silk', name: '霜纹丝', type: 'cloth', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 88, desc: '细丝上带着霜花似的纹路，摸上去凉凉的。裁缝拿它缝轻甲和书袋。', effect: {} },
  { id: 'sun-copper', name: '赤铜精', type: 'ore', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 82, desc: '从铜里炼出来的精华，握久了手心发烫。铁匠拿它给兵刃镶边。', effect: {} },
  { id: 'tide-amber', name: '潮纹琥珀', type: 'relic', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 680, desc: '琥珀里封着一道道潮水似的纹路。港口的商会拿它当压箱底的好货。', effect: { reputation: 1 } },
  { id: 'river-pearl', name: '河魄珠', type: 'relic', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 760, desc: '大河暗流里养出来的珠子，拿在手里微微发凉。送人最体面。', effect: { charisma: 1 } },
  { id: 'cold-crystal', name: '寒晶', type: 'ice', rarity: 'rare', tier: 3, minRankIndex: 2, baseValue: 720, desc: '雪山冰层底下凿出来的晶块，捧在手里，寒气往骨头里钻。冲关前握着它，心能定下来。', effect: { breakthrough: 8 } },
  { id: 'flame-sand', name: '赤焰砂', type: 'fire', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 2400, desc: '赤霞崖下挖来的红砂，隔着布袋都烫手。寻常铁匠铺连见都没见过。', effect: { power: 1.8 } },
  { id: 'star-scroll', name: '陨星残卷', type: 'scroll', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 3200, desc: '从星坠谷带出来的残卷，字迹时隐时现，能看懂几行的人不多。', effect: { insight: 4, breakthrough: 12 } },
]

export const EQUIPMENT_ITEMS: ItemData[] = [
  { id: 'wood-spear', name: '木柄短枪', type: 'weapon', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 52, desc: '枪头包着铁皮，杆子是山里的硬木。庄户人家防野兽、防贼都靠它。', effect: { power: 1.4 } },
  { id: 'hide-jerkin', name: '皮护短褂', type: 'armor', rarity: 'common', tier: 0, minRankIndex: 0, baseValue: 56, desc: '猎户穿的皮褂子，前胸缝了两层。上山挨一口，不至于见骨头。', effect: { hp: 10, stamina: 4 } },
  { id: 'bronze-halberd', name: '青铜戟', type: 'weapon', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 210, desc: '沉甸甸的一杆戟，抡起来带风。力气不够的人，连举都举不稳。', effect: { power: 3.8 } },
  { id: 'scale-vest', name: '鳞光内甲', type: 'armor', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 240, desc: '一片片薄甲缝在软衬上，穿在里头看不出来。走远路的人图它轻。', effect: { hp: 14, stamina: 6 } },
  { id: 'iron-sword', name: '精铁剑', type: 'weapon', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 160, desc: '正经铁匠铺打出来的剑，剑身上还留着淬火的波纹。', effect: { power: 3.2 } },
  { id: 'guard-armor', name: '护院铁甲', type: 'armor', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 180, desc: '大户人家护院穿的铁甲，镶满了铁片，穿上一整天肩膀都酸。', effect: { hp: 18 } },
  { id: 'marsh-bow', name: '泽角长弓', type: 'weapon', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 780, desc: '弓臂用泽地野牛的角和韧木粘成，拉满要一把好力气。', effect: { power: 4.8, insight: 1 } },
  { id: 'silk-guard-cloak', name: '云纹护披', type: 'armor', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 860, desc: '面子上绣着云纹，里子衬着软甲。穿出去体面，挨一刀也扛得住。', effect: { hp: 20, charisma: 1 } },
  { id: 'wind-sword', name: '流风剑', type: 'weapon', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1500, desc: '剑身薄得透光，挥起来几乎没有声音，是修士手里的兵刃。', effect: { power: 6 } },
  { id: 'stone-armor', name: '镇岳甲', type: 'armor', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1360, desc: '厚得像一堵墙，穿上以后走路都震地。寻常人家买不起，也穿不动。', effect: { hp: 34 } },
]

export const UTILITY_ITEMS: ItemData[] = [
  { id: 'herb-paste', name: '草膏', type: 'pill', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 60, desc: '乡下郎中拿几味草药捣成的膏子，敷在伤口上凉丝丝的。', effect: { hp: 10, qi: 4 }, directUse: true },
  { id: 'marrow-pellet', name: '养元散', type: 'pill', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 90, desc: '药铺配的散剂，一包冲一碗。练力的人冲关前都要备上一包。', effect: { hp: 8, stamina: 10 }, directUse: true },
  { id: 'farm-deed', name: '薄田地契', type: 'deed', rarity: 'uncommon', tier: 1, minRankIndex: 0, baseValue: 260, desc: '一亩薄田的地契，按了手印，田就是你的了。', effect: { assetFarm: 1 } },
  { id: 'workshop-permit', name: '工坊牌照', type: 'permit', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 340, desc: '在城里开作坊，得有衙门发的这块牌子。', effect: { assetWorkshop: 1 } },
  { id: 'shop-deed', name: '铺面契书', type: 'deed', rarity: 'rare', tier: 2, minRankIndex: 1, baseValue: 620, desc: '一间门面的契书，写着四至和年限。', effect: { assetShop: 1 } },
  { id: 'focus-pellet', name: '明神丹', type: 'pill', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 560, desc: '黄豆大的丹丸，闻着一股清苦味。吃下去脑子清明，冲感气前服一颗最好。', effect: { qi: 10, insight: 1 }, directUse: true },
  { id: 'jade-spring', name: '灵泉丸', type: 'pill', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 540, desc: '拿灵泉水和药搓成的丸子，行院药房才有得卖。冲炼气前服一颗，气更足。', effect: { hp: 12, qi: 14 }, directUse: true },
  { id: 'compass-realm', name: '秘境罗盘', type: 'tool', rarity: 'rare', tier: 3, minRankIndex: 3, baseValue: 1800, desc: '盘面上的指针不指南北，只朝着灵气乱的地方转。', effect: { realmSense: 1 }, directUse: true },
  { id: 'bond-token', name: '同心玉佩', type: 'token', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 2600, desc: '一对玉佩，合起来是一整块。多是世家结亲时交换的信物。', effect: { romance: 5, charisma: 1 } },
  { id: 'sect-banner', name: '立宗旗幡', type: 'sect', rarity: 'rare', tier: 3, minRankIndex: 4, baseValue: 2200, desc: '想开宗立派，总得先有一面旗。旗面空着，等人写上名号。', effect: { sectPrestige: 6 } },
]

export const TECHNIQUE_MANUAL_ITEMS: ItemData[] = [
  { id: 'apprentice-manual', name: '养气入门诀', type: 'manual', manualCategory: 'heart', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 120, desc: '薄薄一册，讲的是怎么坐、怎么喘气、怎么把气往丹田里引。外门弟子人手一本。', effect: { cultivation: 0.04, insight: 1 }, manualSkillId: 'heart-apprentice' },
  { id: 'manual-ember', name: '离火弹指诀', type: 'manual', manualCategory: 'spell', rarity: 'uncommon', tier: 1, minRankIndex: 1, baseValue: 150, desc: '把一缕火气压在指尖弹出去，快，也狠。初学术法的人多从这一门起手。', effect: { damageMultiplier: 1.62, burn: 2, qiCost: 10 }, manualSkillId: 'spell-ember-art' },
  { id: 'manual-breath', name: '归息法', type: 'manual', manualCategory: 'heart', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 980, desc: '门派里教给内门弟子的吐纳法，一呼一吸都有讲究。', effect: { cultivation: 0.08, insight: 3 }, manualSkillId: 'heart-breath' },
  { id: 'manual-frost', name: '寒芒凝锋术', type: 'manual', manualCategory: 'spell', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 860, desc: '把寒气凝成锋刃，专往人的气脉上扎。出手不快，但稳。', effect: { damageMultiplier: 1.48, chill: 2, qiCost: 11 }, manualSkillId: 'spell-frost-bloom' },
  { id: 'manual-wind', name: '流风裂帛术', type: 'manual', manualCategory: 'spell', rarity: 'rare', tier: 2, minRankIndex: 2, baseValue: 920, desc: '一道风刃先撕开对方的架势，下一招才是杀手。', effect: { damageMultiplier: 1.58, expose: 2, qiCost: 12 }, manualSkillId: 'spell-wind-blade' },
  { id: 'manual-sect', name: '授业总谱', type: 'manual', manualCategory: 'heart', rarity: 'epic', tier: 4, minRankIndex: 4, baseValue: 3800, desc: '一个宗门教徒弟的全套章程，从入门到出师都写在里头。', effect: { sectTeaching: 0.18, charisma: 1 }, manualSkillId: 'heart-sect' },
  { id: 'manual-tide-mirror', name: '镜潮归元诀', type: 'manual', manualCategory: 'heart', rarity: 'epic', tier: 4, minRankIndex: 3, baseValue: 4200, desc: '两门功法互相印证悟出来的心法。市面上没有，只能自己练出来，再抄成册。', effect: { cultivation: 0.1, breakthroughRate: 0.04, insight: 4 }, manualSkillId: 'heart-tide-mirror', discoverOnly: true },
  { id: 'manual-ember-tide', name: '潮火连环诀', type: 'manual', manualCategory: 'spell', rarity: 'epic', tier: 4, minRankIndex: 3, baseValue: 4600, desc: '把归息法和离火诀揉在一起，反复练出来的连环术法。只能自己悟出来，再抄成册。', effect: { damageMultiplier: 1.92, burn: 3, expose: 1, qiCost: 14 }, manualSkillId: 'spell-ember-tide', discoverOnly: true },
  { id: 'manual-sun', name: '赤阳心法', type: 'manual', manualCategory: 'heart', rarity: 'legendary', tier: 6, minRankIndex: 5, baseValue: 18000, desc: '纸页摸上去是热的，字是拿朱砂写的。见过这本书的人，世上没几个。', effect: { cultivation: 0.12, insight: 6, power: 1.8 }, manualSkillId: 'heart-sun' },
  { id: 'manual-moon', name: '太阴御神诀', type: 'manual', manualCategory: 'heart', rarity: 'legendary', tier: 6, minRankIndex: 5, baseValue: 19000, desc: '只在月圆的夜里才读得清的心法，白天翻开是一片空白。', effect: { breakthroughRate: 0.08, charisma: 4, insight: 2 }, manualSkillId: 'heart-moon' },
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
