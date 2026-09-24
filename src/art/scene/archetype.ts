import type { LocationData } from '@/config'

/** 地貌：决定远中景山形。 */
export type Relief = 'plain' | 'hills' | 'peaks' | 'karst' | 'snow' | 'cliffs' | 'dunes' | 'gorge' | 'volcanic'
/** 水面：决定中景是否铺水。 */
export type Water = 'none' | 'river' | 'marsh' | 'lake' | 'sea'
/** 人烟：中景建筑。 */
export type Settlement = 'none' | 'village' | 'town' | 'city' | 'fort' | 'sect' | 'port' | 'post'
/** 草木：近中景植被。 */
export type Flora = 'pine' | 'forest' | 'reeds' | 'willow' | 'maple' | 'bamboo' | 'lotus' | 'sparse'

export interface SceneArchetype {
  relief: Relief
  water: Water
  settlement: Settlement
  flora: Flora[]
  smoke: boolean
  mystic: boolean
  snowCover: boolean
  fields: boolean
  /** 暖色倾向 0..1（赤崖、荒原、沙坂） */
  warm: number
  seed: string
}

const OVERRIDES: Record<string, Partial<SceneArchetype>> = {
  qinghe: { relief: 'hills', water: 'river', settlement: 'town', flora: ['willow', 'sparse'], fields: true },
  hemingtai: { relief: 'karst', settlement: 'sect', flora: ['pine'] },
  danjing: { relief: 'peaks', settlement: 'sect', flora: ['pine'], smoke: true },
  snowpeak: { relief: 'snow', snowCover: true, flora: ['pine'] },
  hanxi: { relief: 'snow', water: 'river', snowCover: true, flora: ['pine'] },
  starfall: { relief: 'gorge', mystic: true, flora: ['sparse'] },
  qingsong: { relief: 'peaks', flora: ['pine', 'forest'] },
  yaogu: { relief: 'karst', water: 'marsh', flora: ['bamboo', 'sparse'], fields: true },
  songtao: { relief: 'hills', water: 'sea', settlement: 'post', flora: ['pine'] },
  tianchi: { relief: 'peaks', water: 'lake', flora: ['pine'] },
  shuangqiao: { relief: 'snow', water: 'river', settlement: 'town', snowCover: true, flora: ['pine'] },
  misty: { relief: 'hills', flora: ['forest', 'pine'] },
  songlan: { relief: 'hills', settlement: 'village', flora: ['pine', 'forest'], fields: true },
  yunling: { relief: 'karst', settlement: 'post', flora: ['pine'] },
  yuelu: { relief: 'gorge', settlement: 'post', smoke: true, flora: ['sparse'], warm: 0.25 },
  jadegate: { relief: 'karst', settlement: 'sect', flora: ['pine', 'bamboo'] },
  blackforge: { relief: 'volcanic', settlement: 'city', smoke: true, flora: ['sparse'], warm: 0.3 },
  longji: { relief: 'peaks', settlement: 'fort', flora: ['sparse'] },
  tonglu: { relief: 'cliffs', settlement: 'fort', smoke: true, flora: ['sparse'], warm: 0.2 },
  redcliff: { relief: 'cliffs', mystic: true, flora: ['sparse'], warm: 0.8 },
  yunze: { relief: 'hills', water: 'marsh', settlement: 'port', flora: ['reeds', 'willow'] },
  fenyuan: { relief: 'dunes', flora: ['sparse'], warm: 0.7, smoke: true },
  duanyun: { relief: 'gorge', mystic: true, flora: ['pine'] },
  yanzhu: { relief: 'plain', water: 'marsh', flora: ['reeds'] },
  yanpass: { relief: 'peaks', settlement: 'fort', flora: ['sparse'], warm: 0.15 },
  fenglin: { relief: 'hills', settlement: 'village', flora: ['maple', 'forest'] },
  reedbank: { relief: 'plain', water: 'river', settlement: 'port', flora: ['reeds', 'willow'] },
  anping: { relief: 'hills', water: 'river', settlement: 'city', flora: ['willow'] },
  wayrest: { relief: 'plain', settlement: 'post', flora: ['willow'], fields: true },
  lantern: { relief: 'hills', water: 'sea', settlement: 'city', flora: ['sparse'] },
  huangsha: { relief: 'dunes', settlement: 'post', flora: ['sparse'], warm: 0.55 },
  heyuan: { relief: 'plain', water: 'marsh', settlement: 'village', flora: ['lotus', 'willow'] },
  shiliangbao: { relief: 'cliffs', settlement: 'fort', flora: ['sparse'], warm: 0.1 },
  fengta: { relief: 'plain', water: 'river', settlement: 'town', flora: ['willow'], fields: true },
  qionglin: { relief: 'gorge', water: 'river', flora: ['forest', 'bamboo'], mystic: true },
  hezhou: { relief: 'plain', water: 'river', settlement: 'port', flora: ['reeds'] },
  baishi: { relief: 'hills', water: 'river', settlement: 'village', flora: ['sparse'], fields: true },
  sangluo: { relief: 'plain', water: 'river', settlement: 'village', flora: ['forest', 'willow'], fields: true },
  jinxi: { relief: 'plain', water: 'river', settlement: 'town', flora: ['willow'] },
  luqiao: { relief: 'plain', water: 'river', settlement: 'post', flora: ['reeds', 'willow'] },
  liuting: { relief: 'plain', water: 'river', settlement: 'village', flora: ['willow'], fields: true },
  hejin: { relief: 'hills', water: 'river', settlement: 'port', flora: ['willow'] },
  yuhuo: { relief: 'plain', water: 'sea', settlement: 'port', flora: ['reeds'] },
  taoxi: { relief: 'hills', water: 'river', settlement: 'village', flora: ['maple', 'willow'], fields: true },
  kuishan: { relief: 'peaks', settlement: 'post', flora: ['pine'] },
  cangwu: { relief: 'hills', settlement: 'village', flora: ['sparse', 'willow'], fields: true },
  guyue: { relief: 'plain', water: 'sea', settlement: 'port', flora: ['sparse'] },
  baijiao: { relief: 'hills', water: 'sea', settlement: 'port', flora: ['pine'] },
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text)
}

/** 由地点名、地貌与标签推断场景原型；手工覆写优先，编辑器新增地点也能得到合理画面。 */
export function resolveArchetype(location: Pick<LocationData, 'id' | 'name' | 'terrain' | 'region' | 'tags'>): SceneArchetype {
  const text = `${location.name}${location.terrain}${location.region}`
  const tags = new Set(location.tags)
  const inferred: SceneArchetype = {
    relief: 'hills',
    water: 'none',
    settlement: 'none',
    flora: ['sparse'],
    smoke: tags.has('forge'),
    mystic: tags.has('boss') || tags.has('endgame'),
    snowCover: has(text, /雪|霜|寒|冰/),
    fields: has(text, /田|禾|仓|庄|陌/),
    warm: has(text, /赤|焚|火|沙|丹霞/) ? 0.5 : 0,
    seed: location.id,
  }

  if (has(text, /雪|寒|冰/)) inferred.relief = 'snow'
  else if (has(text, /峡|谷|涧|裂/)) inferred.relief = 'gorge'
  else if (has(text, /崖|壁/)) inferred.relief = 'cliffs'
  else if (has(text, /沙|坂|荒原/)) inferred.relief = 'dunes'
  else if (has(text, /峰|台|岭|阙|梯/)) inferred.relief = 'peaks'
  else if (has(text, /平|原|川|野|府|州/)) inferred.relief = 'plain'

  if (has(text, /港|海|湾|岬|渔/)) inferred.water = 'sea'
  else if (has(text, /泽|渚|荷|芦荡/)) inferred.water = 'marsh'
  else if (has(text, /池|湖/)) inferred.water = 'lake'
  else if (has(text, /渡|埠|津|溪|河|桥|汀/)) inferred.water = 'river'

  if (tags.has('sect')) inferred.settlement = 'sect'
  else if (tags.has('city')) inferred.settlement = 'city'
  else if (tags.has('port')) inferred.settlement = 'port'
  else if (has(text, /关|堡|寨/)) inferred.settlement = 'fort'
  else if (tags.has('town')) inferred.settlement = 'village'
  else if (tags.has('pass') || has(text, /驿/)) inferred.settlement = 'post'

  if (has(text, /林|松/)) inferred.flora = ['forest', 'pine']
  else if (has(text, /枫/)) inferred.flora = ['maple']
  else if (has(text, /芦|苇/)) inferred.flora = ['reeds']
  else if (inferred.water !== 'none') inferred.flora = ['willow']

  return { ...inferred, ...OVERRIDES[location.id], seed: location.id }
}
