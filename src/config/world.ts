export interface LocationData {
  id: string
  name: string
  short: string
  x: number
  y: number
  region: string
  danger: number
  marketBias: string
  marketTier: number
  aura: number
  terrain: string
  desc: string
  actions: string[]
  neighbors: string[]
  resource: string
  realmId: string | null
  tags: string[]
  factionIds: string[]
}

export const LOCATIONS: LocationData[] = [
  { id: 'reedbank', name: '芦湾埠', short: '芦湾', x: 85, y: 525, region: '河港', danger: 1, marketBias: 'cloth', marketTier: 1, aura: 18, terrain: '芦荡河埠', desc: '通往州府与水乡的转运小港，官船、脚商和漕丁把南北货路系在这里。', actions: ['trade', 'quest', 'meditate'], neighbors: ['yunze'], resource: '河盐布包', realmId: null, tags: ['port', 'market', 'court', 'starter'], factionIds: ['river-transport-office'] },
  { id: 'yunze', name: '云泽渡', short: '云泽', x: 220, y: 390, region: '水乡', danger: 1, marketBias: 'herb', marketTier: 0, aura: 26, terrain: '水泽与古渡', desc: '水网纵横的商埠，药农、行脚商与散修在此交换第一手消息。', actions: ['meditate', 'hunt', 'trade'], neighbors: ['reedbank', 'qinghe', 'misty'], resource: '云泽灵草', realmId: 'marsh-manor', tags: ['market', 'starter'], factionIds: [] },
  { id: 'qinghe', name: '青禾镇', short: '青禾', x: 395, y: 445, region: '平原', danger: 1, marketBias: 'grain', marketTier: 0, aura: 20, terrain: '田镇与河道', desc: '凡人与低阶修士混居的小镇，资源平稳，适合练功和补给。', actions: ['meditate', 'train', 'trade'], neighbors: ['yunze', 'anping', 'blackforge'], resource: '青禾谷露', realmId: null, tags: ['town'], factionIds: ['qinghe-commons'] },
  { id: 'misty', name: '迷雾林', short: '迷林', x: 470, y: 250, region: '林海', danger: 2, marketBias: 'wood', marketTier: 1, aura: 34, terrain: '迷雾丛林', desc: '常年雾瘴不散，潜伏着灵兽与迷失剑客，适合搜寻稀有材料。', actions: ['hunt', 'quest', 'meditate'], neighbors: ['yunze', 'blackforge', 'snowpeak'], resource: '雾心藤', realmId: 'mist-hunt', tags: ['wild'], factionIds: ['mist-hunt-lodge'] },
  { id: 'blackforge', name: '玄铁城', short: '玄铁', x: 700, y: 390, region: '矿岭', danger: 3, marketBias: 'ore', marketTier: 2, aura: 30, terrain: '火山矿脉', desc: '铸器师与护镖修士聚集的重镇，装备交易旺盛，黑市拍卖隐于夜色。', actions: ['trade', 'train', 'auction'], neighbors: ['qinghe', 'misty', 'lantern', 'redcliff'], resource: '玄铁精砂', realmId: null, tags: ['market', 'forge'], factionIds: ['blackforge-guild'] },
  { id: 'snowpeak', name: '寒魄峰', short: '寒魄', x: 710, y: 115, region: '雪原', danger: 4, marketBias: 'ice', marketTier: 3, aura: 44, terrain: '雪峰洞府', desc: '冰脉环绕的高峰，适合闭关，也容易遭遇争夺寒魄精华的强敌。', actions: ['meditate', 'breakthrough', 'hunt'], neighbors: ['misty', 'starfall', 'jadegate'], resource: '寒魄晶', realmId: 'ice-cavern', tags: ['cultivation'], factionIds: [] },
  { id: 'lantern', name: '灯海古港', short: '古港', x: 890, y: 510, region: '海港', danger: 2, marketBias: 'relic', marketTier: 2, aura: 24, terrain: '海港与夜市', desc: '夜市不灭的港口，远航商队带来外海奇珍，也是拍卖行最活跃的城市。', actions: ['trade', 'auction', 'quest'], neighbors: ['blackforge', 'anping', 'wayrest', 'yanpass'], resource: '潮生珀', realmId: 'tide-ruins', tags: ['port', 'market'], factionIds: ['tide-market'] },
  { id: 'anping', name: '安平府', short: '安平', x: 565, y: 560, region: '州府', danger: 2, marketBias: 'cloth', marketTier: 2, aura: 28, terrain: '州府街廛', desc: '文书、税契和商旅都要在此过手，官府买卖讲规矩，也最看地方声望。', actions: ['trade', 'quest', 'train'], neighbors: ['qinghe', 'lantern', 'wayrest'], resource: '官绢文牒', realmId: null, tags: ['town', 'market', 'court'], factionIds: ['anping-yamen'] },
  { id: 'wayrest', name: '归帆驿', short: '归帆', x: 1015, y: 620, region: '驿道', danger: 2, marketBias: 'grain', marketTier: 1, aura: 19, terrain: '驿路集镇', desc: '横贯东西的驿站集市，最适合把长线货路拆成几段慢慢滚利润。', actions: ['trade', 'quest', 'train'], neighbors: ['anping', 'lantern', 'yanpass'], resource: '驼铃粮栈', realmId: null, tags: ['town', 'market'], factionIds: ['tide-market'] },
  { id: 'redcliff', name: '赤霞崖', short: '赤崖', x: 1085, y: 355, region: '绝壁', danger: 5, marketBias: 'fire', marketTier: 4, aura: 52, terrain: '丹霞绝壁', desc: '天火曾坠之地，秘境频开，适合高风险高收益的试炼和机缘争夺。', actions: ['hunt', 'quest', 'breakthrough'], neighbors: ['blackforge', 'yanpass', 'starfall'], resource: '赤焰砂', realmId: 'ember-palace', tags: ['boss'], factionIds: [] },
  { id: 'starfall', name: '星坠谷', short: '星谷', x: 1100, y: 125, region: '秘境', danger: 6, marketBias: 'scroll', marketTier: 5, aura: 60, terrain: '陨星裂谷', desc: '天地灵机浓郁的险地，古老残卷与异象齐现，适合寻找顶级功法。', actions: ['quest', 'hunt', 'breakthrough'], neighbors: ['snowpeak', 'redcliff', 'jadegate'], resource: '陨星残页', realmId: 'star-sanctum', tags: ['boss', 'endgame'], factionIds: [] },
  { id: 'jadegate', name: '玉阙行院', short: '玉阙', x: 1285, y: 295, region: '行院', danger: 3, marketBias: 'pill', marketTier: 3, aura: 56, terrain: '行院灵脉', desc: '玉阙体系设在山外的修行行院，可以闭关突破、拜访教习，也常卷入外务与派系角力。', actions: ['meditate', 'train', 'breakthrough', 'quest', 'sect'], neighbors: ['snowpeak', 'starfall', 'yanpass'], resource: '玉阙灵泉', realmId: null, tags: ['sect', 'cultivation'], factionIds: ['jadegate-courtyard'] },
  { id: 'yanpass', name: '雁回关', short: '雁关', x: 1240, y: 530, region: '边关', danger: 4, marketBias: 'ore', marketTier: 3, aura: 22, terrain: '关城商道', desc: '关隘昼夜开阖，镖队、军需和私货都从这里过，跑商利润高，麻烦也多。', actions: ['trade', 'train', 'quest'], neighbors: ['lantern', 'wayrest', 'redcliff', 'jadegate'], resource: '边关军需', realmId: null, tags: ['market', 'pass'], factionIds: ['yanpass-escort'] },
]

export const LOCATION_MAP = new Map(LOCATIONS.map((loc) => [loc.id, loc]))

export function getLocation(locationId: string): LocationData | undefined {
  return LOCATION_MAP.get(locationId)
}
