export interface KnowledgeData {
  id: string
  itemId: string
  name: string
  rarity: string
  tier: number
  minRankIndex: number
  minInsight: number
  baseValue: number
  desc: string
  effect: Record<string, number>
  tags: string[]
}

export const KNOWLEDGE_ENTRIES: KnowledgeData[] = [
  {
    id: 'knowledge-field-rotation',
    itemId: 'field-rotation-notes',
    name: '田亩轮作札记',
    rarity: 'uncommon',
    tier: 1,
    minRankIndex: 0,
    minInsight: 4,
    baseValue: 180,
    desc: '一个老农口述、旁人代笔的种地心得：哪块地该歇，哪季该换种，怎么省种子。',
    effect: { farming: 1, insight: 1 },
    tags: ['农学', '轮作', '启蒙'],
  },
  {
    id: 'knowledge-forge-primer',
    itemId: 'forge-opening-record',
    name: '百工开炉要录',
    rarity: 'uncommon',
    tier: 1,
    minRankIndex: 1,
    minInsight: 5,
    baseValue: 220,
    desc: '老铁匠留下的笔记，讲火候、翻锤和看料，页边上全是油手印。',
    effect: { crafting: 1, power: 0.8 },
    tags: ['工学', '开炉', '锻打'],
  },
  {
    id: 'knowledge-merchant-ledger',
    itemId: 'merchant-ledger',
    name: '行商算筹录',
    rarity: 'uncommon',
    tier: 1,
    minRankIndex: 1,
    minInsight: 5,
    baseValue: 240,
    desc: '跑了半辈子买卖的人记下的心得：什么时候压货，怎么还价，路费怎么算。',
    effect: { trading: 1, charisma: 1 },
    tags: ['商学', '账册', '压货'],
  },
  {
    id: 'knowledge-etiquette-handbook',
    itemId: 'etiquette-handbook',
    name: '门礼应对篇',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 1,
    minInsight: 7,
    baseValue: 360,
    desc: '见宗门长老怎么说话，见官老爷怎么行礼，跟商会掌柜怎么打交道，一样样都写着。',
    effect: { charisma: 2, trading: 1 },
    tags: ['礼法', '应对', '门路'],
  },
  {
    id: 'knowledge-pulse-observation',
    itemId: 'pulse-observation-record',
    name: '望气辨脉录',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 2,
    minInsight: 8,
    baseValue: 420,
    desc: '教人看自己身上的气走到了哪儿。读通了，修行时心里有数。',
    effect: { insight: 2, power: 0.4 },
    tags: ['望气', '辨脉', '识机'],
  },
  {
    id: 'knowledge-route-gazetteer',
    itemId: 'route-gazetteer',
    name: '驿路地志抄',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 2,
    minInsight: 8,
    baseValue: 460,
    desc: '按水路、驿路和关隘抄录的各地物产和风俗，边上还有人批注哪家客栈黑。',
    effect: { trading: 1, insight: 1, farming: 1 },
    tags: ['地志', '驿路', '货路'],
  },
]

export const KNOWLEDGE_MAP = new Map(KNOWLEDGE_ENTRIES.map((knowledge) => [knowledge.id, knowledge]))

export function getKnowledge(knowledgeId: string) {
  return KNOWLEDGE_MAP.get(knowledgeId)
}