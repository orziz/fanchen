import type {
  StoryBindingKey,
  StoryConditionSpec,
  StoryEffectSpec,
  StoryPresentationMode,
  StorySpeakerMode,
  StoryTriggerKind,
  StoryTriggerScope,
} from '@/config/story'

type ValueOf<T> = T[keyof T]

export interface StoryEditorOption<Value extends string = string> {
  value: Value | ''
  label: string
}

export const STORY_EDITOR_STATUS_TONES = {
  neutral: 'neutral',
  success: 'success',
  error: 'error',
} as const

export type StatusTone = ValueOf<typeof STORY_EDITOR_STATUS_TONES>

export const STORY_EDITOR_CONDITION_GROUPS = {
  trigger: 'trigger-conditions',
  choice: 'choice-conditions',
} as const

export type ConditionGroup = ValueOf<typeof STORY_EDITOR_CONDITION_GROUPS>

export const STORY_EDITOR_EFFECT_GROUPS = {
  node: 'node-effects',
  choice: 'choice-effects',
} as const

export type EffectGroup = ValueOf<typeof STORY_EDITOR_EFFECT_GROUPS>

export const STORY_EDITOR_GRAPH_EDGE_TONES = {
  next: 'next',
  choice: 'choice',
} as const

export type StoryGraphEdgeTone = ValueOf<typeof STORY_EDITOR_GRAPH_EDGE_TONES>

export const STORY_EDITOR_PRESENTATIONS = {
  overlay: 'overlay',
  rail: 'rail',
  embedded: 'embedded',
} as const satisfies Record<string, StoryPresentationMode>

export const STORY_EDITOR_TRIGGER_KINDS = {
  manual: 'manual',
  npcVisit: 'npc-visit',
} as const satisfies Record<string, StoryTriggerKind>

export const STORY_EDITOR_TRIGGER_SCOPES = {
  global: 'global',
  npc: 'npc',
} as const satisfies Record<string, StoryTriggerScope>

export const STORY_EDITOR_SPEAKER_MODES = {
  npc: 'npc',
  player: 'player',
  narrator: 'narrator',
} as const satisfies Record<string, StorySpeakerMode>

export const STORY_EDITOR_BINDINGS = {
  npc: 'npc',
  location: 'location',
} as const satisfies Record<string, StoryBindingKey>

export const STORY_EDITOR_CONDITION_KINDS = {
  moneyAtLeast: 'money-at-least',
  affinityAtLeast: 'affinity-at-least',
  trustAtLeast: 'trust-at-least',
  flag: 'flag',
  script: 'script',
} as const satisfies Record<string, StoryConditionSpec['kind']>

export const STORY_EDITOR_EFFECT_KINDS = {
  addRelation: 'add-relation',
  addMoney: 'add-money',
  addItem: 'add-item',
  appendLog: 'append-log',
  setFlag: 'set-flag',
  runScript: 'run-script',
  setPresentation: 'set-presentation',
} as const satisfies Record<string, StoryEffectSpec['kind']>

export const STORY_EDITOR_PRESENTATION_OPTIONS: readonly StoryEditorOption<StoryPresentationMode>[] = [
  { value: STORY_EDITOR_PRESENTATIONS.overlay, label: '浮层' },
  { value: STORY_EDITOR_PRESENTATIONS.rail, label: '卷栏' },
  { value: STORY_EDITOR_PRESENTATIONS.embedded, label: '嵌入' },
]

export const STORY_EDITOR_TRIGGER_KIND_OPTIONS: readonly StoryEditorOption<StoryTriggerKind>[] = [
  { value: STORY_EDITOR_TRIGGER_KINDS.manual, label: '手动开启' },
  { value: STORY_EDITOR_TRIGGER_KINDS.npcVisit, label: '拜访 NPC' },
]

export const STORY_EDITOR_TRIGGER_SCOPE_OPTIONS: readonly StoryEditorOption<StoryTriggerScope>[] = [
  { value: '', label: '未指定' },
  { value: STORY_EDITOR_TRIGGER_SCOPES.global, label: '全局' },
  { value: STORY_EDITOR_TRIGGER_SCOPES.npc, label: '绑定 NPC' },
]

export const STORY_EDITOR_SPEAKER_MODE_OPTIONS: readonly StoryEditorOption<StorySpeakerMode>[] = [
  { value: '', label: '未指定' },
  { value: STORY_EDITOR_SPEAKER_MODES.npc, label: 'NPC' },
  { value: STORY_EDITOR_SPEAKER_MODES.player, label: '玩家' },
  { value: STORY_EDITOR_SPEAKER_MODES.narrator, label: '旁白' },
]

export const STORY_EDITOR_BINDING_OPTIONS: readonly StoryEditorOption<StoryBindingKey>[] = [
  { value: STORY_EDITOR_BINDINGS.npc, label: '绑定 NPC' },
  { value: STORY_EDITOR_BINDINGS.location, label: '绑定地点' },
]

export const STORY_EDITOR_CONDITION_KIND_OPTIONS: readonly StoryEditorOption<StoryConditionSpec['kind']>[] = [
  { value: STORY_EDITOR_CONDITION_KINDS.moneyAtLeast, label: '灵石至少' },
  { value: STORY_EDITOR_CONDITION_KINDS.affinityAtLeast, label: '好感至少' },
  { value: STORY_EDITOR_CONDITION_KINDS.trustAtLeast, label: '信任至少' },
  { value: STORY_EDITOR_CONDITION_KINDS.flag, label: '旗标' },
  { value: STORY_EDITOR_CONDITION_KINDS.script, label: '脚本' },
]

export const STORY_EDITOR_EFFECT_KIND_OPTIONS: readonly StoryEditorOption<StoryEffectSpec['kind']>[] = [
  { value: STORY_EDITOR_EFFECT_KINDS.addRelation, label: '关系变动' },
  { value: STORY_EDITOR_EFFECT_KINDS.addMoney, label: '灵石增减' },
  { value: STORY_EDITOR_EFFECT_KINDS.addItem, label: '给予物品' },
  { value: STORY_EDITOR_EFFECT_KINDS.appendLog, label: '追加日志' },
  { value: STORY_EDITOR_EFFECT_KINDS.setFlag, label: '设置旗标' },
  { value: STORY_EDITOR_EFFECT_KINDS.runScript, label: '运行脚本' },
  { value: STORY_EDITOR_EFFECT_KINDS.setPresentation, label: '切换呈现' },
]

export function getSpeakerModeLabel(value: StorySpeakerMode | undefined) {
  if (value === STORY_EDITOR_SPEAKER_MODES.npc) return 'NPC'
  if (value === STORY_EDITOR_SPEAKER_MODES.player) return '玩家'
  if (value === STORY_EDITOR_SPEAKER_MODES.narrator) return '旁白'
  return '未署说话人'
}

export function renderOptionsMarkup(options: readonly StoryEditorOption[], selectedValue = '') {
  return options
    .map((option) => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`)
    .join('')
}