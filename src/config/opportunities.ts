import type { Season } from '@/config/calendar'

/** 各地每旬可能冒出的机缘；接下后引出同名事件。 */
export interface OpportunityTemplate {
  id: string
  title: string
  desc: string
  /** 预期所得，写在卡上 */
  reward: string
  eventId: string
  /** 接下后先耗的日子（事件在其后发生） */
  days: number
  /** 每旬在合适的地点出现的机率 */
  chance: number
  where: {
    tags?: string[]
    notTags?: string[]
    minDanger?: number
    maxDanger?: number
    locationIds?: string[]
  }
  seasons?: Season[]
  /** 只在这条志向进行时出现 */
  goal?: string
  minRank?: number
  /** 要一位在当地的熟人来托 */
  needsNpc?: boolean
  /** 能留几旬，默认两旬 */
  lasts?: number
}

const SETTLED = ['town', 'city', 'port', 'market', 'village']

export const OPPORTUNITY_TEMPLATES: OpportunityTemplate[] = [
  {
    id: 'herb-order', title: '药铺收药', desc: '本旬雾心草收价高出一截。', reward: '雾心草一株十二文',
    eventId: 'herb-order', days: 0, chance: 0.35, where: { tags: SETTLED },
  },
  {
    id: 'escort-grain', title: '押送粮车', desc: '乡社缺个押车的，路上不太平。', reward: '灵石二十五，门路好感',
    eventId: 'escort-grain', days: 3, chance: 0.3, where: { tags: ['town', 'village', 'market'] },
  },
  {
    id: 'beast-bounty', title: '悬赏除害', desc: '附近有野兽伤人，猎社悬赏。', reward: '灵石三十，声望',
    eventId: 'beast-bounty', days: 2, chance: 0.3, where: { minDanger: 1, notTags: ['city'] },
  },
  {
    id: 'wandering-daoist', title: '游方道人讲经', desc: '茶馆里来了个讲吐纳功夫的道人。', reward: '修为，悟性',
    eventId: 'wandering-daoist', days: 1, chance: 0.2, where: { tags: ['town', 'city', 'market', 'port'] },
  },
  {
    id: 'autumn-harvest', title: '秋收帮工', desc: '田里抢收，正缺人手。', reward: '灵石十六，体魄',
    eventId: 'autumn-harvest', days: 0, chance: 0.6, where: { tags: ['village', 'town'] }, seasons: ['autumn'],
  },
  {
    id: 'summer-flood', title: '河堤告急', desc: '暴雨连日，乡里招人护堤。', reward: '声望，门路好感',
    eventId: 'summer-flood', days: 0, chance: 0.3, where: { tags: ['village', 'town'] }, seasons: ['summer'],
  },
  {
    id: 'temple-fair', title: '赶庙会', desc: '镇上赶庙会，热闹得很。', reward: '灵石，或是一身松快',
    eventId: 'temple-fair', days: 1, chance: 0.4, where: { tags: ['town', 'city', 'market'] }, seasons: ['spring', 'autumn'],
  },
  {
    id: 'old-bookstall', title: '旧书摊', desc: '有人在卖《养气入门诀》。', reward: '一门心法',
    eventId: 'old-bookstall', days: 0, chance: 0.45, where: { tags: ['town', 'city', 'market', 'port'] }, goal: 'heart', lasts: 3,
  },
  {
    id: 'npc-errand', title: '熟人托事', desc: '{npc}想托你帮个小忙。', reward: '灵石十五，交情',
    eventId: 'npc-errand', days: 0, chance: 0.3, where: {}, needsNpc: true,
  },
  {
    id: 'jadegate-errand', title: '行院外务', desc: '玉阙行院的执事在找人跑腿。', reward: '灵石，行院好感',
    eventId: 'jadegate-errand', days: 4, chance: 0.7, where: { locationIds: ['jadegate', 'yunling', 'danjing', 'yaogu', 'longji'] }, minRank: 1,
  },
  {
    id: 'jadegate-herb-garden', title: '行院药圃', desc: '行院的药圃遭了虫害，正招人帮忙。', reward: '灵石，行院好感',
    eventId: 'jadegate-herb-garden', days: 0, chance: 0.5, where: { locationIds: ['jadegate', 'yaogu', 'danjing'] }, minRank: 1,
  },
  {
    id: 'jadegate-escort-furnace', title: '护送丹炉', desc: '行院的新丹炉要运上山，缺个护送的人。', reward: '灵石，行院好感',
    eventId: 'jadegate-escort-furnace', days: 3, chance: 0.4, where: { locationIds: ['jadegate', 'longji', 'yunling'] }, minRank: 1,
  },
  {
    id: 'jadegate-trial', title: '行院入门试炼', desc: '外院弟子的入门试炼，三关都过才收。', reward: '拜入玉阙行院',
    eventId: 'jadegate-trial', days: 1, chance: 1, where: { locationIds: ['jadegate'] }, goal: 'trial', lasts: 1,
  },
]
