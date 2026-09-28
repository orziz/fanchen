import type { InventoryEntry } from '@/types/game'
import type { Season } from '@/config/calendar'

/* ─── 检定与得失 ─── */

/** 检定所用的属性：体魄、悟性、魅力。 */
export type CheckStat = 'power' | 'insight' | 'charisma'

/** 一次结果带来的得失；正数为得、负数为失。 */
export interface LifeEffects {
  money?: number
  cultivation?: number
  hp?: number
  /** 伤势升降（伤 0–3 级） */
  injury?: number
  reputation?: number
  power?: number
  insight?: number
  charisma?: number
  items?: InventoryEntry[]
  removeItems?: InventoryEntry[]
  /** 所在地主事势力的好感 */
  standing?: number
  /** 与事件里那位人物的好感 */
  affinity?: number
  flag?: string
  /** 额外耗去的日子 */
  days?: number
}

/* ─── 事件定义（配置） ─── */

export type LifeEventKind = 'wild' | 'town' | 'travel' | 'meditate' | 'work' | 'visit' | 'opportunity' | 'story'

export interface LifeEventWhen {
  kinds: LifeEventKind[]
  minDanger?: number
  maxDanger?: number
  /** 地点须带其中之一的标签 */
  tags?: string[]
  /** 地点不得带这些标签 */
  notTags?: string[]
  seasons?: Season[]
  minRank?: number
  maxRank?: number
  weight?: number
  /** 一世只遇一次 */
  once?: boolean
}

export interface EventOutcome {
  text: string
  effects?: LifeEffects
  /** 接着触发的事件 */
  next?: string
  /** 规则层的特殊落实：破境、学功法、拜入门下等 */
  hook?: string
}

export interface EventChoiceDef {
  label: string
  /** 选之前能看到的一句说明 */
  hint?: string
  cost?: { money?: number; items?: InventoryEntry[] }
  requires?: { rankIndex?: number; money?: number; itemId?: string; flag?: string; notFlag?: string }
  check?: { stat: CheckStat; difficulty: number }
  /** 动态事件直接给定的把握（如冲关） */
  fixedOdds?: number
  /** 动态事件算好的不可选原因 */
  blocked?: string
  /** 力战：打赢算成，打输或逃走算败 */
  fight?: { templateId?: string; danger?: number; name?: string; boss?: boolean; hpMul?: number; powerMul?: number; realmId?: string }
  success: EventOutcome
  failure?: EventOutcome
}

export interface LifeEventDef {
  id: string
  title: string
  /** 可用占位：{location} {npc} {item} */
  text: string
  when?: LifeEventWhen
  choices: EventChoiceDef[]
}

/* ─── 运行态（存档） ─── */

/** 各地冒出的机缘，过期作废。 */
export interface OpportunityCard {
  id: string
  templateId: string
  locationId: string
  title: string
  desc: string
  days: number
  expiresDay: number
  eventId: string
  npcId: string | null
  /** 预期所得的一句话 */
  reward: string
}

export interface EventResultView {
  /** null：没有检定的选择 */
  success: boolean | null
  text: string
  gains: string[]
}

export interface ActiveEvent {
  eventId: string
  locationId: string
  npcId: string | null
  stage: 'choose' | 'fighting' | 'result'
  choiceIndex: number | null
  result: EventResultView | null
  /** 为 UI 预先算好的把握（与 choices 同序；-1 表示无检定） */
  odds: number[]
  /** 结果看完后接着开的事件 */
  nextId: string | null
}

export type RunnerStep =
  | { kind: 'pass'; days: number; activity: string }
  | { kind: 'event'; eventId: string; npcId?: string | null }
  | { kind: 'wildEvent'; eventKind: LifeEventKind }
  | { kind: 'move'; toId: string; days: number }
  | { kind: 'breakthrough' }
  | { kind: 'reward'; effects: LifeEffects; text?: string }
  | { kind: 'study'; itemId: string }

/** 正在做的一件事：拆成若干步依次执行，遇到事件就停下等玩家选择。 */
export interface RunnerState {
  activityId: string
  label: string
  steps: RunnerStep[]
  daysSpent: number
  gains: Record<string, number>
  items: InventoryEntry[]
  notes: string[]
  /** 途中打输了，后续步骤作废 */
  aborted: boolean
}

/** 一件事做完后的小结，供界面展示。 */
export interface ActivitySummary {
  label: string
  days: number
  lines: string[]
  day: number
}

/** 一生结算。 */
export interface LifeSummary {
  name: string
  age: number
  rankIndex: number
  reputation: number
  deeds: string[]
  cause: string
  day: number
}

export interface LifeState {
  version: number
  /** 第几世 */
  generation: number
  opportunities: Record<string, OpportunityCard[]>
  opportunityXun: number
  lastMonth: number
  runner: RunnerState | null
  event: ActiveEvent | null
  lastSummary: ActivitySummary | null
  /** 这一世的事迹，寿尽时结算 */
  deeds: string[]
  goalsDone: string[]
  seenEvents: string[]
  ended: LifeSummary | null
  /** 上一世留下的传承 */
  legacy: { insight: number; power: number; items: InventoryEntry[] }
}
