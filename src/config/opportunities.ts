import type { Season } from '@/config/calendar'

/** 各地每旬可能冒出的机缘；接下后引出同名事件。 */
export interface OpportunityTemplate {
  id: string
  title: string
  desc: string
  /** 预期所得，写在卡上；{faction} 换成当地门路的名字 */
  reward: string
  /** 茶馆里别人传这件事时的说法 */
  rumor: string
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
    id: 'herb-order', title: '药铺收药', desc: '药铺贴了告示，这一旬雾心草收得比平日贵。', reward: '雾心草一株十二灵石',
    rumor: '{location}的药铺在收雾心草，价钱给得高。',
    eventId: 'herb-order', days: 0, chance: 0.35, where: { tags: SETTLED },
  },
  {
    id: 'escort-grain', title: '押送粮车', desc: '乡社要往邻镇送一车粮，缺个押车的。这几天路上不太平。', reward: '灵石二十五，{faction}好感',
    rumor: '{location}的乡社要押一车粮去邻镇，还缺个人。',
    eventId: 'escort-grain', days: 3, chance: 0.3, where: { tags: ['town', 'village', 'market'] },
  },
  {
    id: 'beast-bounty', title: '悬赏除害', desc: '附近有野兽伤了人，猎社出了赏钱。', reward: '灵石三十，声望',
    rumor: '{location}那边有野兽伤了人，猎社悬了赏。',
    eventId: 'beast-bounty', days: 2, chance: 0.3, where: { minDanger: 1, notTags: ['city'] },
  },
  {
    id: 'wandering-daoist', title: '游方道人讲经', desc: '茶馆里来了个游方道人，要讲吐纳的法子。', reward: '修为，悟性',
    rumor: '{location}的茶馆来了个道人，讲吐纳的法子，听一回要五灵石。',
    eventId: 'wandering-daoist', days: 1, chance: 0.2, where: { tags: ['town', 'city', 'market', 'port'] },
  },
  {
    id: 'autumn-harvest', title: '秋收帮工', desc: '田里抢收，正缺人手，管两顿饭。', reward: '灵石十六，体魄',
    rumor: '{location}那边收稻子，正缺人手。',
    eventId: 'autumn-harvest', days: 0, chance: 0.6, where: { tags: ['village', 'town'] }, seasons: ['autumn'],
  },
  {
    id: 'summer-flood', title: '河堤告急', desc: '连下了几天暴雨，里正在招人上堤扛沙袋。', reward: '声望，{faction}好感',
    rumor: '{location}的河堤快顶不住了，里正满村喊人。',
    eventId: 'summer-flood', days: 0, chance: 0.3, where: { tags: ['village', 'town'] }, seasons: ['summer'],
  },
  {
    id: 'temple-fair', title: '赶庙会', desc: '镇上赶庙会，摆摊的、看戏的挤满了街。', reward: '灵石，或是吃喝玩乐',
    rumor: '{location}这几天赶庙会，热闹得很。',
    eventId: 'temple-fair', days: 1, chance: 0.4, where: { tags: ['town', 'city', 'market'] }, seasons: ['spring', 'autumn'],
  },
  {
    id: 'old-bookstall', title: '旧书摊', desc: '街角的旧书摊上摆着一本《养气入门诀》。', reward: '一门心法',
    rumor: '{location}街角有个旧书摊，摆着本《养气入门诀》。',
    eventId: 'old-bookstall', days: 0, chance: 0.45, where: { tags: ['town', 'city', 'market', 'port'] }, goal: 'heart', lasts: 3,
  },
  {
    id: 'npc-errand', title: '熟人托事', desc: '{npc}想托你帮个小忙。', reward: '灵石十五，交情',
    rumor: '{npc}在{location}到处问人，说是有点事想托人办。',
    eventId: 'npc-errand', days: 0, chance: 0.3, where: {}, needsNpc: true,
  },
  {
    id: 'jadegate-errand', title: '行院外务', desc: '玉阙行院的外务执事在找人跑腿。', reward: '灵石，行院好感',
    rumor: '玉阙行院的执事在{location}找人跑腿，给的钱不少。',
    eventId: 'jadegate-errand', days: 4, chance: 0.7, where: { locationIds: ['jadegate', 'yunling', 'danjing', 'yaogu', 'longji'] }, minRank: 1,
  },
  {
    id: 'jadegate-herb-garden', title: '行院药圃', desc: '行院的药圃生了虫，正招人捉虫翻土。', reward: '灵石，行院好感',
    rumor: '行院在{location}的药圃生了虫，正招人去捉。',
    eventId: 'jadegate-herb-garden', days: 0, chance: 0.5, where: { locationIds: ['jadegate', 'yaogu', 'danjing'] }, minRank: 1,
  },
  {
    id: 'jadegate-escort-furnace', title: '护送丹炉', desc: '行院订的新丹炉要运上山，缺个护送的人。', reward: '灵石，行院好感',
    rumor: '行院订的丹炉要从{location}运上山，缺个护送的。',
    eventId: 'jadegate-escort-furnace', days: 3, chance: 0.4, where: { locationIds: ['jadegate', 'longji', 'yunling'] }, minRank: 1,
  },
  {
    id: 'jadegate-trial', title: '行院入门试炼', desc: '外院收弟子，要过根骨、心性、身手三关。', reward: '拜入玉阙行院',
    rumor: '玉阙行院这一旬开了试炼，收外院弟子。',
    eventId: 'jadegate-trial', days: 1, chance: 1, where: { locationIds: ['jadegate'] }, goal: 'trial', lasts: 1,
  },
]
