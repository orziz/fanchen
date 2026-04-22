import type {
  StoryBindingKey,
  StoryChoiceSpec,
  StoryConditionSpec,
  StoryDefinition,
  StoryEffectSpec,
  StoryNodeSpec,
  StoryTriggerSpec,
} from '../../config/story'
import { OPENING_TUTORIAL_FLAGS, OPENING_TUTORIAL_SCRIPT_IDS } from '../../config/tutorial'

export interface EditableStoryChoice extends Omit<StoryChoiceSpec, 'conditions' | 'effects'> {
  conditions: StoryConditionSpec[]
  effects: StoryEffectSpec[]
}

export interface EditableStoryNode extends Omit<StoryNodeSpec, 'choices' | 'effects'> {
  choices: EditableStoryChoice[]
  effects: StoryEffectSpec[]
}

export interface EditableStoryDefinition extends Omit<StoryDefinition, 'bindings' | 'trigger' | 'nodes'> {
  bindings: StoryBindingKey[]
  trigger: StoryTriggerSpec | null
  nodes: EditableStoryNode[]
}

export interface StoryIssue {
  severity: 'error' | 'warn'
  message: string
}

const FLAG_ALIAS_BY_VALUE = new Map<string, string>(
  Object.entries(OPENING_TUTORIAL_FLAGS).map(([key, value]) => [value, `OPENING_TUTORIAL_FLAGS.${key}`]),
)

const SCRIPT_ALIAS_BY_VALUE = new Map<string, string>(
  Object.entries(OPENING_TUTORIAL_SCRIPT_IDS).map(([key, value]) => [value, `OPENING_TUTORIAL_SCRIPT_IDS.${key}`]),
)

export function toEditableStoryDefinitions(definitions: StoryDefinition[]) {
  return definitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    summary: definition.summary,
    defaultPresentation: definition.defaultPresentation,
    startNodeId: definition.startNodeId,
    bindings: [...(definition.bindings || [])],
    trigger: definition.trigger
      ? {
          ...definition.trigger,
          conditions: cloneConditions(definition.trigger.conditions),
        }
      : null,
    nodes: Object.values(definition.nodes).map((node) => ({
      ...node,
      choices: (node.choices || []).map((choice) => ({
        ...choice,
        conditions: cloneConditions(choice.conditions),
        effects: cloneEffects(choice.effects),
      })),
      effects: cloneEffects(node.effects),
    })),
  }))
}

export function cloneStories(stories: EditableStoryDefinition[]) {
  return stories.map((story) => ({
    ...story,
    bindings: [...story.bindings],
    trigger: story.trigger
      ? {
          ...story.trigger,
          conditions: cloneConditions(story.trigger.conditions),
        }
      : null,
    nodes: story.nodes.map((node) => ({
      ...node,
      choices: node.choices.map((choice) => ({
        ...choice,
        conditions: cloneConditions(choice.conditions),
        effects: cloneEffects(choice.effects),
      })),
      effects: cloneEffects(node.effects),
    })),
  }))
}

export function normalizeStoryDefinitions(stories: EditableStoryDefinition[]) {
  const normalized: EditableStoryDefinition[] = []
  const usedStoryIds = new Set<string>()

  stories.forEach((story) => {
    const storyId = story.id.trim()
    if (!storyId || usedStoryIds.has(storyId)) return
    usedStoryIds.add(storyId)

    const nodes = normalizeNodes(story.nodes)
    normalized.push({
      id: storyId,
      title: story.title.trim(),
      summary: story.summary.trim(),
      defaultPresentation: story.defaultPresentation,
      startNodeId: story.startNodeId.trim() || nodes[0]?.id || '',
      bindings: [...new Set(story.bindings.map((binding) => binding.trim()).filter(Boolean) as StoryBindingKey[])],
      trigger: normalizeTrigger(story.trigger),
      nodes,
    })
  })

  return normalized
}

export function collectStoryIssues(stories: EditableStoryDefinition[]) {
  const issues: StoryIssue[] = []
  const storyIds = new Map<string, number>()

  stories.forEach((story, index) => {
    const storyLabel = story.title.trim() || story.id.trim() || `第 ${index + 1} 条剧情`
    const storyId = story.id.trim()
    if (!storyId) {
      issues.push({ severity: 'error', message: `${storyLabel} 缺少剧情 id。` })
    } else {
      storyIds.set(storyId, (storyIds.get(storyId) || 0) + 1)
    }

    if (!story.title.trim()) {
      issues.push({ severity: 'error', message: `${storyLabel} 缺少标题。` })
    }
    if (!story.summary.trim()) {
      issues.push({ severity: 'warn', message: `${storyLabel} 还没有摘要。` })
    }
    if (!story.nodes.length) {
      issues.push({ severity: 'error', message: `${storyLabel} 还没有任何节点。` })
      return
    }

    const nodeIds = new Map<string, number>()
    story.nodes.forEach((node) => {
      const nodeId = node.id.trim()
      if (!nodeId) {
        issues.push({ severity: 'error', message: `${storyLabel} 存在缺少 id 的节点。` })
        return
      }
      nodeIds.set(nodeId, (nodeIds.get(nodeId) || 0) + 1)
    })

    if (!story.startNodeId.trim()) {
      issues.push({ severity: 'error', message: `${storyLabel} 缺少起始节点。` })
    } else if (!nodeIds.has(story.startNodeId.trim())) {
      issues.push({ severity: 'error', message: `${storyLabel} 的起始节点 ${story.startNodeId.trim()} 不存在。` })
    }

    nodeIds.forEach((count, nodeId) => {
      if (count > 1) issues.push({ severity: 'error', message: `${storyLabel} 存在重复节点 id：${nodeId}。` })
    })

    const reachableNodeIds = getReachableNodeIds(story)
    if (story.trigger?.kind === 'npc-visit' && !story.bindings.includes('npc')) {
      issues.push({ severity: 'warn', message: `${storyLabel} 使用 npc-visit 触发，但未声明 npc 绑定。` })
    }

    collectConditionIssues(story.trigger?.conditions, `${storyLabel} 的触发条件`, issues)
    if (story.trigger?.scriptId !== undefined && !story.trigger.scriptId?.trim()) {
      issues.push({ severity: 'error', message: `${storyLabel} 的触发脚本 id 为空。` })
    }

    story.nodes.forEach((node) => {
      const nodeLabel = `${storyLabel} / 节点 ${node.id.trim() || '未命名'}`
      if (!node.text.trim()) {
        issues.push({ severity: 'warn', message: `${nodeLabel} 还没有正文。` })
      }
      if (node.next?.trim() && !nodeIds.has(node.next.trim())) {
        issues.push({ severity: 'error', message: `${nodeLabel} 的 next 指向了不存在的节点 ${node.next.trim()}。` })
      }
      if (node.id.trim() && !reachableNodeIds.has(node.id.trim())) {
        issues.push({ severity: 'warn', message: `${nodeLabel} 目前从起始节点不可达。` })
      }

      collectEffectIssues(node.effects, `${nodeLabel} 的节点效果`, issues)

      const choiceIds = new Map<string, number>()
      node.choices.forEach((choice) => {
        const choiceLabel = `${nodeLabel} / 选项 ${choice.id.trim() || '未命名'}`
        const choiceId = choice.id.trim()
        if (!choiceId) {
          issues.push({ severity: 'error', message: `${nodeLabel} 存在缺少 id 的选项。` })
        } else {
          choiceIds.set(choiceId, (choiceIds.get(choiceId) || 0) + 1)
        }
        if (!choice.text.trim()) {
          issues.push({ severity: 'warn', message: `${choiceLabel} 还没有文案。` })
        }
        if (choice.next?.trim() && !nodeIds.has(choice.next.trim())) {
          issues.push({ severity: 'error', message: `${choiceLabel} 指向了不存在的节点 ${choice.next.trim()}。` })
        }
        collectConditionIssues(choice.conditions, `${choiceLabel} 的条件`, issues)
        collectEffectIssues(choice.effects, `${choiceLabel} 的效果`, issues)
      })

      choiceIds.forEach((count, choiceId) => {
        if (count > 1) issues.push({ severity: 'error', message: `${nodeLabel} 存在重复选项 id：${choiceId}。` })
      })
    })
  })

  storyIds.forEach((count, storyId) => {
    if (count > 1) issues.push({ severity: 'error', message: `存在重复剧情 id：${storyId}。` })
  })

  return issues
}

export function serializeStoryFile(stories: EditableStoryDefinition[]) {
  const normalized = normalizeStoryDefinitions(stories)
  const body = normalized.map((story) => formatStoryDefinition(story, 2)).join(',\n')

  return `import { OPENING_TUTORIAL_FLAGS, OPENING_TUTORIAL_SCRIPT_IDS } from './tutorial'

export type StoryPresentationMode = 'overlay' | 'rail' | 'embedded'
export type StoryBindingKey = 'npc' | 'location'
export type StorySpeakerMode = 'npc' | 'player' | 'narrator'
export type StoryTriggerKind = 'npc-visit' | 'manual'
export type StoryTriggerScope = 'global' | 'npc'

export interface StoryConditionSpec {
  kind: 'money-at-least' | 'affinity-at-least' | 'trust-at-least' | 'flag' | 'script'
  amount?: number
  flag?: string
  expected?: boolean
  scriptId?: string
}

export interface StoryEffectSpec {
  kind: 'add-relation' | 'add-money' | 'add-item' | 'append-log' | 'set-flag' | 'run-script' | 'set-presentation'
  affinity?: number
  trust?: number
  romance?: number
  rivalry?: number
  amount?: number
  itemId?: string
  quantity?: number
  text?: string
  logType?: string
  key?: string
  value?: boolean
  scriptId?: string
  presentation?: StoryPresentationMode
}

export interface StoryChoiceSpec {
  id: string
  text: string
  next?: string | null
  conditions?: StoryConditionSpec[]
  effects?: StoryEffectSpec[]
}

export interface StoryNodeSpec {
  id: string
  text: string
  speaker?: string
  speakerMode?: StorySpeakerMode
  next?: string | null
  choices?: StoryChoiceSpec[]
  effects?: StoryEffectSpec[]
}

export interface StoryTriggerSpec {
  kind: StoryTriggerKind
  scope?: StoryTriggerScope
  once?: boolean
  conditions?: StoryConditionSpec[]
  scriptId?: string
}

export interface StoryDefinition {
  id: string
  title: string
  summary: string
  defaultPresentation: StoryPresentationMode
  startNodeId: string
  bindings?: StoryBindingKey[]
  trigger?: StoryTriggerSpec
  nodes: Record<string, StoryNodeSpec>
}

export const STORY_DEFINITIONS: StoryDefinition[] = [
${body}
]

export const STORY_MAP = new Map(STORY_DEFINITIONS.map(story => [story.id, story]))
`
}

function cloneConditions(conditions: StoryConditionSpec[] | undefined) {
  return (conditions || []).map((condition) => ({ ...condition }))
}

function cloneEffects(effects: StoryEffectSpec[] | undefined) {
  return (effects || []).map((effect) => ({ ...effect }))
}

function normalizeNodes(nodes: EditableStoryNode[]) {
  const normalized: EditableStoryNode[] = []
  const usedNodeIds = new Set<string>()

  nodes.forEach((node) => {
    const nodeId = node.id.trim()
    if (!nodeId || usedNodeIds.has(nodeId)) return
    usedNodeIds.add(nodeId)
    normalized.push({
      id: nodeId,
      text: node.text.trim(),
      speaker: trimOptional(node.speaker),
      speakerMode: node.speakerMode,
      next: trimOptional(node.next),
      choices: normalizeChoices(node.choices),
      effects: normalizeEffects(node.effects),
    })
  })

  return normalized
}

function normalizeChoices(choices: EditableStoryChoice[]) {
  const normalized: EditableStoryChoice[] = []
  const usedChoiceIds = new Set<string>()

  choices.forEach((choice) => {
    const choiceId = choice.id.trim()
    if (!choiceId || usedChoiceIds.has(choiceId)) return
    usedChoiceIds.add(choiceId)
    normalized.push({
      id: choiceId,
      text: choice.text.trim(),
      next: trimOptional(choice.next),
      conditions: normalizeConditions(choice.conditions),
      effects: normalizeEffects(choice.effects),
    })
  })

  return normalized
}

function normalizeTrigger(trigger: StoryTriggerSpec | null) {
  if (!trigger) return null
  return {
    kind: trigger.kind,
    scope: trigger.scope,
    once: Boolean(trigger.once) || undefined,
    conditions: normalizeConditions(trigger.conditions),
    scriptId: trimOptional(trigger.scriptId),
  }
}

function normalizeConditions(conditions: StoryConditionSpec[] | undefined) {
  return (conditions || []).map((condition) => {
    if (condition.kind === 'money-at-least' || condition.kind === 'affinity-at-least' || condition.kind === 'trust-at-least') {
      return { kind: condition.kind, amount: toSafeInteger(condition.amount) } satisfies StoryConditionSpec
    }
    if (condition.kind === 'flag') {
      return { kind: condition.kind, flag: trimOptional(condition.flag), expected: condition.expected ?? true } satisfies StoryConditionSpec
    }
    return { kind: condition.kind, scriptId: trimOptional(condition.scriptId) } satisfies StoryConditionSpec
  })
}

function normalizeEffects(effects: StoryEffectSpec[] | undefined) {
  return (effects || []).map((effect) => ({
    kind: effect.kind,
    affinity: toOptionalInteger(effect.affinity),
    trust: toOptionalInteger(effect.trust),
    romance: toOptionalInteger(effect.romance),
    rivalry: toOptionalInteger(effect.rivalry),
    amount: toOptionalInteger(effect.amount),
    itemId: trimOptional(effect.itemId),
    quantity: toOptionalInteger(effect.quantity),
    text: trimOptional(effect.text),
    logType: trimOptional(effect.logType),
    key: trimOptional(effect.key),
    value: typeof effect.value === 'boolean' ? effect.value : undefined,
    scriptId: trimOptional(effect.scriptId),
    presentation: effect.presentation,
  }))
}

function trimOptional(value: string | null | undefined) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : undefined
}

function toSafeInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

function toOptionalInteger(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  return toSafeInteger(value)
}

function getReachableNodeIds(story: EditableStoryDefinition) {
  const reachable = new Set<string>()
  const pending = story.startNodeId.trim() ? [story.startNodeId.trim()] : []
  const nodeMap = new Map(story.nodes.map((node) => [node.id.trim(), node]))

  while (pending.length) {
    const nodeId = pending.shift()
    if (!nodeId || reachable.has(nodeId)) continue
    reachable.add(nodeId)
    const node = nodeMap.get(nodeId)
    if (!node) continue
    if (node.next?.trim()) pending.push(node.next.trim())
    node.choices.forEach((choice) => {
      if (choice.next?.trim()) pending.push(choice.next.trim())
    })
  }

  return reachable
}

function collectConditionIssues(conditions: StoryConditionSpec[] | undefined, label: string, issues: StoryIssue[]) {
  ;(conditions || []).forEach((condition, index) => {
    if ((condition.kind === 'money-at-least' || condition.kind === 'affinity-at-least' || condition.kind === 'trust-at-least') && !Number.isFinite(Number(condition.amount))) {
      issues.push({ severity: 'error', message: `${label} 第 ${index + 1} 条缺少数值。` })
    }
    if (condition.kind === 'flag' && !condition.flag?.trim()) {
      issues.push({ severity: 'error', message: `${label} 第 ${index + 1} 条缺少 flag。` })
    }
    if (condition.kind === 'script' && !condition.scriptId?.trim()) {
      issues.push({ severity: 'error', message: `${label} 第 ${index + 1} 条缺少 scriptId。` })
    }
  })
}

function collectEffectIssues(effects: StoryEffectSpec[] | undefined, label: string, issues: StoryIssue[]) {
  ;(effects || []).forEach((effect, index) => {
    const indexLabel = `${label} 第 ${index + 1} 条`
    if (effect.kind === 'add-item') {
      if (!effect.itemId?.trim()) issues.push({ severity: 'error', message: `${indexLabel} 缺少 itemId。` })
      if (!Number.isFinite(Number(effect.quantity))) issues.push({ severity: 'error', message: `${indexLabel} 缺少 quantity。` })
    }
    if (effect.kind === 'append-log' && !effect.text?.trim()) {
      issues.push({ severity: 'error', message: `${indexLabel} 缺少日志文本。` })
    }
    if (effect.kind === 'set-flag' && !effect.key?.trim()) {
      issues.push({ severity: 'error', message: `${indexLabel} 缺少 flag key。` })
    }
    if (effect.kind === 'run-script' && !effect.scriptId?.trim()) {
      issues.push({ severity: 'error', message: `${indexLabel} 缺少 scriptId。` })
    }
    if (effect.kind === 'set-presentation' && !effect.presentation) {
      issues.push({ severity: 'error', message: `${indexLabel} 缺少 presentation。` })
    }
  })
}

function formatStoryDefinition(story: EditableStoryDefinition, indent: number) {
  const pad = ' '.repeat(indent)
  const lines = [
    `${pad}{`,
    `${pad}  id: ${JSON.stringify(story.id)},`,
    `${pad}  title: ${JSON.stringify(story.title)},`,
    `${pad}  summary: ${JSON.stringify(story.summary)},`,
    `${pad}  defaultPresentation: ${JSON.stringify(story.defaultPresentation)},`,
    `${pad}  startNodeId: ${JSON.stringify(story.startNodeId)},`,
  ]

  if (story.bindings.length) {
    lines.push(`${pad}  bindings: ${formatStringArray(story.bindings)},`)
  }
  if (story.trigger) {
    lines.push(`${pad}  trigger: ${formatTrigger(story.trigger, indent + 4)},`)
  }

  lines.push(`${pad}  nodes: ${formatNodes(story.nodes, indent + 4)}`)
  lines.push(`${pad}}`)
  return lines.join('\n')
}

function formatNodes(nodes: EditableStoryNode[], indent: number) {
  if (!nodes.length) return '{}'
  const pad = ' '.repeat(indent)
  const closePad = ' '.repeat(indent - 2)
  return `{
${nodes.map((node) => `${pad}${formatObjectKey(node.id)}: ${formatNode(node, indent + 2)},`).join('\n')}
${closePad}}`
}

function formatNode(node: EditableStoryNode, indent: number) {
  const fields = [
    `id: ${JSON.stringify(node.id)},`,
    `text: ${JSON.stringify(node.text)},`,
  ]

  if (node.speaker) fields.push(`speaker: ${JSON.stringify(node.speaker)},`)
  if (node.speakerMode) fields.push(`speakerMode: ${JSON.stringify(node.speakerMode)},`)
  if (node.next) fields.push(`next: ${JSON.stringify(node.next)},`)
  if (node.choices.length) fields.push(`choices: ${formatArrayBlock(node.choices, formatChoice, indent + 2)},`)
  if (node.effects.length) fields.push(`effects: ${formatArrayBlock(node.effects, formatEffect, indent + 2)},`)
  return formatObjectBlock(fields, indent)
}

function formatChoice(choice: EditableStoryChoice, indent: number) {
  const fields = [
    `id: ${JSON.stringify(choice.id)},`,
    `text: ${JSON.stringify(choice.text)},`,
  ]

  if (choice.next) fields.push(`next: ${JSON.stringify(choice.next)},`)
  if (choice.conditions.length) fields.push(`conditions: ${formatArrayBlock(choice.conditions, formatCondition, indent + 2)},`)
  if (choice.effects.length) fields.push(`effects: ${formatArrayBlock(choice.effects, formatEffect, indent + 2)},`)
  return formatObjectBlock(fields, indent)
}

function formatTrigger(trigger: StoryTriggerSpec, indent: number) {
  const fields = [`kind: ${JSON.stringify(trigger.kind)},`]
  if (trigger.scope) fields.push(`scope: ${JSON.stringify(trigger.scope)},`)
  if (trigger.once) fields.push('once: true,')
  if (trigger.conditions?.length) fields.push(`conditions: ${formatArrayBlock(trigger.conditions, formatCondition, indent + 2)},`)
  if (trigger.scriptId) fields.push(`scriptId: ${formatStoryReference(trigger.scriptId, 'script')},`)
  return formatObjectBlock(fields, indent)
}

function formatCondition(condition: StoryConditionSpec, indent: number) {
  const fields = [`kind: ${JSON.stringify(condition.kind)},`]
  if (condition.kind === 'money-at-least' || condition.kind === 'affinity-at-least' || condition.kind === 'trust-at-least') {
    fields.push(`amount: ${toSafeInteger(condition.amount)},`)
  }
  if (condition.kind === 'flag' && condition.flag) {
    fields.push(`flag: ${formatStoryReference(condition.flag, 'flag')},`)
    if (condition.expected === false) fields.push('expected: false,')
  }
  if (condition.kind === 'script' && condition.scriptId) {
    fields.push(`scriptId: ${formatStoryReference(condition.scriptId, 'script')},`)
  }
  return formatObjectBlock(fields, indent)
}

function formatEffect(effect: StoryEffectSpec, indent: number) {
  const fields = [`kind: ${JSON.stringify(effect.kind)},`]
  if (effect.affinity !== undefined) fields.push(`affinity: ${toSafeInteger(effect.affinity)},`)
  if (effect.trust !== undefined) fields.push(`trust: ${toSafeInteger(effect.trust)},`)
  if (effect.romance !== undefined) fields.push(`romance: ${toSafeInteger(effect.romance)},`)
  if (effect.rivalry !== undefined) fields.push(`rivalry: ${toSafeInteger(effect.rivalry)},`)
  if (effect.amount !== undefined) fields.push(`amount: ${toSafeInteger(effect.amount)},`)
  if (effect.itemId) fields.push(`itemId: ${JSON.stringify(effect.itemId)},`)
  if (effect.quantity !== undefined) fields.push(`quantity: ${toSafeInteger(effect.quantity)},`)
  if (effect.text) fields.push(`text: ${JSON.stringify(effect.text)},`)
  if (effect.logType) fields.push(`logType: ${JSON.stringify(effect.logType)},`)
  if (effect.key) fields.push(`key: ${JSON.stringify(effect.key)},`)
  if (effect.value === false) fields.push('value: false,')
  if (effect.scriptId) fields.push(`scriptId: ${formatStoryReference(effect.scriptId, 'script')},`)
  if (effect.presentation) fields.push(`presentation: ${JSON.stringify(effect.presentation)},`)
  return formatObjectBlock(fields, indent)
}

function formatArrayBlock<T>(entries: T[], formatter: (entry: T, indent: number) => string, indent: number) {
  if (!entries.length) return '[]'
  const pad = ' '.repeat(indent)
  const closePad = ' '.repeat(indent - 2)
  return `[
${entries.map((entry) => `${pad}${formatter(entry, indent + 2)},`).join('\n')}
${closePad}]`
}

function formatObjectBlock(fields: string[], indent: number) {
  const pad = ' '.repeat(indent)
  const closePad = ' '.repeat(indent - 2)
  return `{
${fields.map((field) => `${pad}${field}`).join('\n')}
${closePad}}`
}

function formatStringArray(values: string[]) {
  if (!values.length) return '[]'
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`
}

function formatObjectKey(key: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key)
}

function formatStoryReference(value: string, kind: 'flag' | 'script') {
  const alias = kind === 'flag' ? FLAG_ALIAS_BY_VALUE.get(value) : SCRIPT_ALIAS_BY_VALUE.get(value)
  return alias || JSON.stringify(value)
}