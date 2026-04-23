import { round } from '@/utils'
import { getItem, getManualItemBySkillId } from '@/config/items'
import type { LearnedTechniqueState, TechniqueKind } from '@/types/game'

export interface TechniqueScribeCost {
  itemId: string
  quantity: number
}

export interface TechniqueData {
  id: string
  name: string
  kind: TechniqueKind
  rarity: string
  tier: number
  minRankIndex: number
  minInsight: number
  masteryNeed: number
  maxStage: number
  desc: string
  effect: Record<string, number>
  stageBonus: Record<string, number>
  scribeCost: TechniqueScribeCost[]
  scribeQiCost: number
  tags: string[]
}

export interface TechniqueDiscoveryRecipe {
  id: string
  sourceSkillIds: string[]
  requiredMastered: boolean
  resultSkillId: string
  desc: string
}

export const HEART_TECHNIQUES: TechniqueData[] = [
  {
    id: 'heart-apprentice',
    name: '养气入门诀',
    kind: 'heart',
    rarity: 'uncommon',
    tier: 1,
    minRankIndex: 1,
    minInsight: 4,
    masteryNeed: 36,
    maxStage: 1,
    desc: '最基础的养气心法，适合寒门修士稳住根基后循序修行。',
    effect: { cultivation: 0.04, insight: 1 },
    stageBonus: { cultivation: 0.02, stamina: 4 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 1 }, { itemId: 'spirit-ink', quantity: 1 }],
    scribeQiCost: 6,
    tags: ['养气', '启蒙', '稳心'],
  },
  {
    id: 'heart-breath',
    name: '归息法',
    kind: 'heart',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 2,
    minInsight: 8,
    masteryNeed: 48,
    maxStage: 1,
    desc: '以收束气机为长，适合在奔波与战斗之间稳住自身节律。',
    effect: { cultivation: 0.08, insight: 3 },
    stageBonus: { cultivation: 0.03, breakthroughRate: 0.02, qi: 16 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 1 }],
    scribeQiCost: 9,
    tags: ['归息', '凝神', '调元'],
  },
  {
    id: 'heart-sect',
    name: '授业总谱',
    kind: 'heart',
    rarity: 'epic',
    tier: 4,
    minRankIndex: 4,
    minInsight: 12,
    masteryNeed: 70,
    maxStage: 1,
    desc: '偏重传功与授业的心法总纲，修成后对宗门教化尤有帮助。',
    effect: { sectTeaching: 0.18, charisma: 1 },
    stageBonus: { sectTeaching: 0.1, charisma: 1, insight: 1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 2 }],
    scribeQiCost: 12,
    tags: ['传功', '宗门', '教化'],
  },
  {
    id: 'heart-sun',
    name: '赤阳心法',
    kind: 'heart',
    rarity: 'legendary',
    tier: 6,
    minRankIndex: 5,
    minInsight: 18,
    masteryNeed: 96,
    maxStage: 1,
    desc: '以烈阳真意焚炼周身，偏重修行速度与战斗气势。',
    effect: { cultivation: 0.12, insight: 6, power: 1.8 },
    stageBonus: { cultivation: 0.04, power: 1.2, qi: 24 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 3 }, { itemId: 'spirit-ink', quantity: 2 }],
    scribeQiCost: 16,
    tags: ['火', '赤阳', '攻势'],
  },
  {
    id: 'heart-moon',
    name: '太阴御神诀',
    kind: 'heart',
    rarity: 'legendary',
    tier: 6,
    minRankIndex: 5,
    minInsight: 18,
    masteryNeed: 96,
    maxStage: 1,
    desc: '偏重神识与心境，适合走稳突破火候与心神御守的路子。',
    effect: { breakthroughRate: 0.08, charisma: 4, insight: 2 },
    stageBonus: { breakthroughRate: 0.04, charisma: 2, insight: 1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 3 }, { itemId: 'spirit-ink', quantity: 2 }],
    scribeQiCost: 16,
    tags: ['太阴', '御神', '心境'],
  },
  {
    id: 'heart-tide-mirror',
    name: '镜潮归元诀',
    kind: 'heart',
    rarity: 'epic',
    tier: 4,
    minRankIndex: 3,
    minInsight: 13,
    masteryNeed: 78,
    maxStage: 1,
    desc: '由归息与寒芒两路相印而生，擅长稳气、映敌、借势破关。',
    effect: { cultivation: 0.1, breakthroughRate: 0.04, insight: 4 },
    stageBonus: { cultivation: 0.03, breakthroughRate: 0.02, insight: 1, qi: 18 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 2 }],
    scribeQiCost: 14,
    tags: ['镜潮', '归元', '悟道'],
  },
]

export const SPELL_TECHNIQUES: TechniqueData[] = [
  {
    id: 'spell-ember-art',
    name: '离火弹指诀',
    kind: 'spell',
    rarity: 'uncommon',
    tier: 1,
    minRankIndex: 1,
    minInsight: 5,
    masteryNeed: 40,
    maxStage: 1,
    desc: '将离火凝在指尖，一触即燃，适合早期以真气换爆发。',
    effect: { damageMultiplier: 1.62, burn: 2, qiCost: 10 },
    stageBonus: { damageMultiplier: 0.24, burn: 1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 1 }, { itemId: 'spirit-ink', quantity: 1 }],
    scribeQiCost: 6,
    tags: ['火', '术法', '爆发'],
  },
  {
    id: 'spell-frost-bloom',
    name: '寒芒凝锋术',
    kind: 'spell',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 2,
    minInsight: 7,
    masteryNeed: 44,
    maxStage: 1,
    desc: '以寒气聚锋压住敌势，伤害不算极端，但能拖慢对手节奏。',
    effect: { damageMultiplier: 1.48, chill: 2, qiCost: 11 },
    stageBonus: { damageMultiplier: 0.2, chill: 1, qiCost: -1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 1 }],
    scribeQiCost: 9,
    tags: ['寒', '术法', '控场'],
  },
  {
    id: 'spell-wind-blade',
    name: '流风裂帛术',
    kind: 'spell',
    rarity: 'rare',
    tier: 2,
    minRankIndex: 2,
    minInsight: 8,
    masteryNeed: 46,
    maxStage: 1,
    desc: '借流风切开护势，擅长撕出破绽后再追击。',
    effect: { damageMultiplier: 1.58, expose: 2, qiCost: 12 },
    stageBonus: { damageMultiplier: 0.22, expose: 1, qiCost: -1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 1 }],
    scribeQiCost: 10,
    tags: ['风', '术法', '破势'],
  },
  {
    id: 'spell-ember-tide',
    name: '潮火连环诀',
    kind: 'spell',
    rarity: 'epic',
    tier: 4,
    minRankIndex: 3,
    minInsight: 13,
    masteryNeed: 80,
    maxStage: 1,
    desc: '借潮势裹火，一击数转，既能灼身也能撕开敌方空门。',
    effect: { damageMultiplier: 1.92, burn: 3, expose: 1, qiCost: 14 },
    stageBonus: { damageMultiplier: 0.28, burn: 1, expose: 1 },
    scribeCost: [{ itemId: 'blank-codex', quantity: 2 }, { itemId: 'spirit-ink', quantity: 2 }],
    scribeQiCost: 14,
    tags: ['潮火', '术法', '悟道'],
  },
]

export const TECHNIQUES: TechniqueData[] = [...HEART_TECHNIQUES, ...SPELL_TECHNIQUES]

export const TECHNIQUE_MAP = new Map(TECHNIQUES.map((technique) => [technique.id, technique]))

export const TECHNIQUE_DISCOVERY_RECIPES: TechniqueDiscoveryRecipe[] = [
  {
    id: 'recipe-tide-mirror',
    sourceSkillIds: ['heart-breath', 'spell-frost-bloom'],
    requiredMastered: true,
    resultSkillId: 'heart-tide-mirror',
    desc: '将归息与寒芒都练到一定火候后，可悟得镜潮归元之理。',
  },
  {
    id: 'recipe-ember-tide',
    sourceSkillIds: ['heart-breath', 'spell-ember-art'],
    requiredMastered: true,
    resultSkillId: 'spell-ember-tide',
    desc: '归息法稳住内息，再以离火弹指诀催运外势，可悟出潮火连环诀。',
  },
]

export function getTechnique(skillId: string) {
  return TECHNIQUE_MAP.get(skillId)
}

export function getTechniqueResolvedEffectValue(
  technique: Pick<TechniqueData, 'effect' | 'stageBonus' | 'masteryNeed'> | undefined,
  state: Pick<LearnedTechniqueState, 'mastery'> | null | undefined,
  key: string,
) {
  if (!technique) return 0
  const base = technique.effect[key] || 0
  const bonus = (state?.mastery || 0) >= technique.masteryNeed ? technique.stageBonus[key] || 0 : 0
  return round(base + bonus, 4)
}

export function getTechniqueByItemId(itemId: string) {
  const item = getItem(itemId)
  return item?.manualSkillId ? getTechnique(item.manualSkillId) : undefined
}

export function getTechniqueBookItem(skillId: string) {
  return getManualItemBySkillId(skillId)
}
