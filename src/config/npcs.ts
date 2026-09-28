export interface PersonalityData {
  id: string
  label: string
  desc: string
  moodBias: Record<string, number>
}

export const PERSONALITIES: PersonalityData[] = [
  { id: 'ambitious', label: '心气高', desc: '什么都想争一争。看上的东西，价钱再高也要弄到手。', moodBias: { greed: 18, courage: 16, sociability: -2 } },
  { id: 'merciful', label: '心软', desc: '街坊有难处总肯搭把手，借出去的钱常常忘了要。', moodBias: { kindness: 20, greed: -12, patience: 10 } },
  { id: 'schemer', label: '精明', desc: '算盘打得响，一文钱掰成两半花。说话常留半句。', moodBias: { greed: 14, intellect: 18, honor: -10 } },
  { id: 'wanderer', label: '好游', desc: '在一个地方待不住，隔些日子就收拾包袱出门。朋友满天下，交心的没几个。', moodBias: { curiosity: 20, courage: 10, patience: -8 } },
  { id: 'stoic', label: '寡言', desc: '话少，一门心思练功。人情往来，能推就推。', moodBias: { patience: 20, greed: -14, courage: 6 } },
]

export interface NpcArchetype {
  title: string
  styles: string[]
  skillBias: Record<string, number>
  favoriteItems: string[]
}

export const NPC_ARCHETYPES: NpcArchetype[] = [
  { title: '剑修', styles: ['青锋', '断岳', '流影'], skillBias: { combat: 1.2, trade: 0.9, meditate: 1.05 }, favoriteItems: ['weapon', 'manual'] },
  { title: '丹师', styles: ['丹火', '药王', '灵泉'], skillBias: { combat: 0.82, trade: 1.18, meditate: 1.1 }, favoriteItems: ['pill', 'herb'] },
  { title: '散商', styles: ['行舟', '千机', '墨羽'], skillBias: { combat: 0.88, trade: 1.32, meditate: 0.92 }, favoriteItems: ['ore', 'relic', 'material'] },
  { title: '体修', styles: ['撼山', '裂风', '苍拳'], skillBias: { combat: 1.32, trade: 0.82, meditate: 0.94 }, favoriteItems: ['armor', 'material'] },
  { title: '符师', styles: ['天符', '夜烛', '云箓'], skillBias: { combat: 0.98, trade: 1.1, meditate: 1.08 }, favoriteItems: ['scroll', 'relic'] },
]

export const RELATION_ROLES: Record<string, string> = {
  none: '普通',
  master: '师尊',
  apprentice: '弟子',
  partner: '道侣',
  rival: '宿敌',
}

export const SECT_NAME_PARTS = {
  prefix: ['问道', '凌霄', '听潮', '归元', '玄岳', '流云', '星河', '烛龙'],
  suffix: ['宗', '门', '阁', '殿', '山', '盟'],
}

export interface SectBuildingDef {
  label: string
  baseCost: number
  desc: string
}

export const SECT_BUILDINGS: Record<string, SectBuildingDef> = {
  hall: { label: '议事大殿', baseCost: 180, desc: '提升宗门威望与招募上限。' },
  dojo: { label: '演武场', baseCost: 220, desc: '提升弟子战斗成长。' },
  library: { label: '藏经阁', baseCost: 260, desc: '提升传功效率与悟性成长。' },
  market: { label: '外门坊市', baseCost: 240, desc: '提升宗门灵石收入。' },
}
