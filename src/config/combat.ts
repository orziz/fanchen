/**
 * 妖物：强弱由所在地点的险度决定（见 getDangerBaseline），模板只带相对特色——
 * 皮厚、力大、真气足，以及掉落门类。region 为专属出没地，没有专属妖物的地方，
 * 按险度从 tier 相近的妖物里挑。
 */
export interface MonsterTemplate {
  id: string
  name: string
  region: string
  /** 常见于几级险地 */
  tier: number
  hpMul: number
  powerMul: number
  qiMul: number
  lootTypes: string[]
}

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  /* 乡野小患：险一二之地 */
  { id: 'feral-dog', name: '野岭恶犬', region: '', tier: 1, hpMul: 0.85, powerMul: 0.9, qiMul: 0.8, lootTypes: ['leather', 'grain'] },
  { id: 'road-bandit', name: '拦路毛贼', region: '', tier: 1, hpMul: 1, powerMul: 1, qiMul: 0.9, lootTypes: ['cloth', 'weapon'] },
  { id: 'marsh-viper', name: '泽地青蛇', region: '', tier: 1, hpMul: 0.75, powerMul: 1.12, qiMul: 1, lootTypes: ['herb'] },
  { id: 'hill-boar', name: '山野獠猪', region: '', tier: 2, hpMul: 1.15, powerMul: 0.92, qiMul: 0.8, lootTypes: ['leather', 'grain'] },
  /* 各地专属 */
  { id: 'marsh-lizard', name: '沼鳞妖蜥', region: 'yunze', tier: 1, hpMul: 1.05, powerMul: 0.95, qiMul: 1, lootTypes: ['herb', 'grain'] },
  { id: 'mist-wolf', name: '雾隐狼妖', region: 'misty', tier: 2, hpMul: 1, powerMul: 1.08, qiMul: 1, lootTypes: ['herb', 'wood'] },
  { id: 'forge-puppet', name: '玄铁傀儡', region: 'blackforge', tier: 3, hpMul: 1.2, powerMul: 0.92, qiMul: 0.8, lootTypes: ['ore', 'weapon'] },
  { id: 'jade-traitor', name: '玉阙叛徒', region: 'jadegate', tier: 3, hpMul: 0.95, powerMul: 1.1, qiMul: 1.2, lootTypes: ['pill', 'manual'] },
  { id: 'snow-ape', name: '寒脊雪猿', region: 'snowpeak', tier: 4, hpMul: 1.15, powerMul: 1, qiMul: 1, lootTypes: ['ice', 'pill'] },
  { id: 'reef-specter', name: '潮渊海魇', region: 'lantern', tier: 4, hpMul: 0.9, powerMul: 1.1, qiMul: 1.3, lootTypes: ['relic', 'scroll'] },
  { id: 'blaze-bird', name: '赤翎炎雀', region: 'redcliff', tier: 5, hpMul: 0.9, powerMul: 1.15, qiMul: 1.1, lootTypes: ['fire', 'ore'] },
  { id: 'star-devourer', name: '噬星古兽', region: 'starfall', tier: 6, hpMul: 1.25, powerMul: 1.05, qiMul: 1.1, lootTypes: ['scroll', 'manual'] },
]

/**
 * 险度基准：险 d 之地一只寻常妖物的气血、力道、真气与所得。
 * 大致对应境界 d-1、未添装备的修士五六招内可胜、折损四成上下气血；再高一级便凶多吉少。
 */
export function getDangerBaseline(danger: number) {
  const d = Math.max(1, danger)
  return {
    hp: 22 + 20 * (d - 1),
    power: 5.5 + 1.0 * (d - 1) + 0.3 * (d - 1) ** 2,
    qi: 10 + 8 * (d - 1),
    money: 8 + 8 * (d - 1),
    cultivation: 3 + 3 * (d - 1),
    breakthrough: 1.2 + 0.8 * (d - 1),
  }
}

export interface MonsterAffix {
  id: string
  label: string
  desc: string
  mod: Record<string, number>
}

export const MONSTER_AFFIXES: MonsterAffix[] = [
  { id: 'swift', label: '疾风', desc: '先手更快，闪避更高。', mod: { speed: 0.28, dodge: 0.12 } },
  { id: 'ironhide', label: '铁甲', desc: '承伤下降，生命更厚。', mod: { defense: 0.18, hp: 0.22 } },
  { id: 'soul-drain', label: '噬灵', desc: '攻击时会额外吸取真气。', mod: { qiBurn: 4, power: 0.08 } },
  { id: 'feral', label: '凶煞', desc: '暴击更高，输出更猛。', mod: { crit: 0.16, power: 0.16 } },
  { id: 'mirror-step', label: '镜影', desc: '有概率闪避本回合攻击。', mod: { dodge: 0.2 } },
  { id: 'ember', label: '玄火', desc: '会给你附加灼烧。', mod: { burn: 3, power: 0.1 } },
  { id: 'frostmail', label: '霜甲', desc: '攻击附带凝滞，降低体力恢复。', mod: { chill: 2, defense: 0.1 } },
]

/** 秘境首领：以所在地险度加一为基准，皮更厚、力更沉。 */
export interface RealmBoss {
  name: string
  hpMul: number
  powerMul: number
  affixes: string[]
}

export interface RealmTemplate {
  id: string
  name: string
  locationId: string
  unlockRep: number
  desc: string
  boss: RealmBoss
  rewards: { money: number; prestige: number; items: string[] }
}

export const REALM_TEMPLATES: RealmTemplate[] = [
  {
    id: 'marsh-manor', name: '云梦遗府', locationId: 'yunze', unlockRep: 0,
    desc: '云泽底下沉着一座旧宅子，水浅的日子能看见屋脊。夜里偶尔有光从水底透上来。',
    boss: { name: '泽主残魂', hpMul: 2.2, powerMul: 1.1, affixes: ['mirror-step', 'soul-drain'] },
    rewards: { money: 70, prestige: 4, items: ['mist-herb', 'compass-realm'] },
  },
  {
    id: 'mist-hunt', name: '迷林狩境', locationId: 'misty', unlockRep: 8,
    desc: '迷雾林最深处有片林子，猎户们管那儿叫狩境。进去过的人说，雾里有狼叫，还有剑鸣。',
    boss: { name: '魇雾狼王', hpMul: 2.2, powerMul: 1.15, affixes: ['swift', 'feral'] },
    rewards: { money: 92, prestige: 6, items: ['wind-sword', 'mist-herb'] },
  },
  {
    id: 'ice-cavern', name: '寒魄冰窟', locationId: 'snowpeak', unlockRep: 18,
    desc: '寒魄峰腰上裂开一个冰窟，里头冷得喘气都疼。听说有人在里面坐过一夜，下山就破了境。',
    boss: { name: '裂冰古猿', hpMul: 2.4, powerMul: 1.1, affixes: ['ironhide', 'frostmail'] },
    rewards: { money: 120, prestige: 8, items: ['cold-crystal', 'jade-spring'] },
  },
  {
    id: 'tide-ruins', name: '潮渊遗墟', locationId: 'lantern', unlockRep: 14,
    desc: '涨潮的时候，港外的海面上会露出一截石门。老渔民说，那是前朝沉下去的宫殿。',
    boss: { name: '深潮主祭', hpMul: 2.2, powerMul: 1.15, affixes: ['soul-drain', 'mirror-step'] },
    rewards: { money: 132, prestige: 7, items: ['tide-amber', 'star-scroll'] },
  },
  {
    id: 'ember-palace', name: '赤焰宫阙', locationId: 'redcliff', unlockRep: 26,
    desc: '赤霞崖的地火烧红了半边天，火里隐约现出一座宫殿的影子。',
    boss: { name: '离火真君遗魄', hpMul: 2.4, powerMul: 1.18, affixes: ['ember', 'feral', 'ironhide'] },
    rewards: { money: 180, prestige: 12, items: ['flame-sand', 'manual-sect'] },
  },
  {
    id: 'star-sanctum', name: '星陨圣阙', locationId: 'starfall', unlockRep: 40,
    desc: '星坠谷最深处有座石殿，门口的台阶上刻满了名字。刻名字的人，没一个出来过。',
    boss: { name: '吞星龙骸', hpMul: 2.6, powerMul: 1.2, affixes: ['swift', 'soul-drain', 'ember', 'mirror-step'] },
    rewards: { money: 260, prestige: 18, items: ['manual-sun', 'manual-moon', 'bond-token'] },
  },
]
