import type { StoryConditionSpec, StoryEffectSpec } from '../../config/story'

import type { EditableStoryChoice, EditableStoryDefinition, EditableStoryNode, StoryIssue } from '../shared/storyFile'

import {
  STORY_EDITOR_CONDITION_KINDS,
  STORY_EDITOR_EFFECT_KINDS,
  STORY_EDITOR_GRAPH_EDGE_TONES,
  STORY_EDITOR_PRESENTATIONS,
  STORY_EDITOR_SPEAKER_MODES,
  getSpeakerModeLabel,
} from './enums'
import type { EditorState, StoryGraphLayout, StoryGraphNode } from './types'

export function query<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`missing_element:${selector}`)
  return element
}

export function createStory(storyId: string): EditableStoryDefinition {
  const initialNode = createNode('intro')
  return {
    id: storyId,
    title: '新剧情',
    summary: '待补剧情摘要。',
    defaultPresentation: STORY_EDITOR_PRESENTATIONS.overlay,
    startNodeId: initialNode.id,
    bindings: [],
    trigger: null,
    nodes: [initialNode],
  }
}

export function createNode(nodeId: string): EditableStoryNode {
  return {
    id: nodeId,
    text: '',
    speaker: undefined,
    speakerMode: undefined,
    next: undefined,
    choices: [],
    effects: [],
  }
}

export function createChoice(choiceId: string): EditableStoryChoice {
  return {
    id: choiceId,
    text: '',
    next: undefined,
    conditions: [],
    effects: [],
  }
}

export function createConditionOfKind(kind: StoryConditionSpec['kind']): StoryConditionSpec {
  switch (kind) {
    case STORY_EDITOR_CONDITION_KINDS.moneyAtLeast:
    case STORY_EDITOR_CONDITION_KINDS.affinityAtLeast:
    case STORY_EDITOR_CONDITION_KINDS.trustAtLeast:
      return { kind, amount: 0 }
    case STORY_EDITOR_CONDITION_KINDS.script:
      return { kind, scriptId: '' }
    default:
      return { kind: STORY_EDITOR_CONDITION_KINDS.flag, flag: '', expected: true }
  }
}

export function createEffectOfKind(kind: StoryEffectSpec['kind']): StoryEffectSpec {
  switch (kind) {
    case STORY_EDITOR_EFFECT_KINDS.addRelation:
      return { kind, affinity: 0, trust: 0, romance: 0, rivalry: 0 }
    case STORY_EDITOR_EFFECT_KINDS.addMoney:
      return { kind, amount: 0 }
    case STORY_EDITOR_EFFECT_KINDS.addItem:
      return { kind, itemId: '', quantity: 1 }
    case STORY_EDITOR_EFFECT_KINDS.setFlag:
      return { kind, key: '', value: true }
    case STORY_EDITOR_EFFECT_KINDS.runScript:
      return { kind, scriptId: '' }
    case STORY_EDITOR_EFFECT_KINDS.setPresentation:
      return { kind, presentation: STORY_EDITOR_PRESENTATIONS.overlay }
    default:
      return { kind: STORY_EDITOR_EFFECT_KINDS.appendLog, text: '', logType: 'info' }
  }
}

export function createUniqueId(existingIds: string[], prefix: string) {
  if (!existingIds.includes(prefix)) return prefix
  let index = 2
  while (existingIds.includes(`${prefix}-${index}`)) {
    index += 1
  }
  return `${prefix}-${index}`
}

export function syncSelection(state: EditorState) {
  const selectedStory = getSelectedStory(state) || state.stories[0] || null
  state.selectedStoryId = selectedStory?.id || null

  const selectedNode = selectedStory?.nodes.find((node) => node.id === state.selectedNodeId) || selectedStory?.nodes[0] || null
  state.selectedNodeId = selectedNode?.id || null

  const selectedChoice = selectedNode?.choices.find((choice) => choice.id === state.selectedChoiceId) || selectedNode?.choices[0] || null
  state.selectedChoiceId = selectedChoice?.id || null
}

export function getSelectedStory(state: EditorState) {
  return state.stories.find((story) => story.id === state.selectedStoryId) || null
}

export function getSelectedNode(state: EditorState) {
  const story = getSelectedStory(state)
  return story?.nodes.find((node) => node.id === state.selectedNodeId) || null
}

export function getSelectedChoice(state: EditorState) {
  const node = getSelectedNode(state)
  return node?.choices.find((choice) => choice.id === state.selectedChoiceId) || null
}

export function renameNode(story: EditableStoryDefinition, currentId: string, nextId: string) {
  story.nodes.forEach((node) => {
    if (node.id === currentId) node.id = nextId
    if (node.next === currentId) node.next = nextId
    node.choices.forEach((choice) => {
      if (choice.next === currentId) choice.next = nextId
    })
  })

  if (story.startNodeId === currentId) {
    story.startNodeId = nextId
  }
}

export function removeNode(story: EditableStoryDefinition, nodeId: string) {
  story.nodes = story.nodes.filter((node) => node.id !== nodeId)
  story.nodes.forEach((node) => {
    if (node.next === nodeId) node.next = undefined
    node.choices.forEach((choice) => {
      if (choice.next === nodeId) choice.next = undefined
    })
  })
  if (story.startNodeId === nodeId) {
    story.startNodeId = story.nodes[0]?.id || ''
  }
}

export function buildStoryGraphLayout(story: EditableStoryDefinition | null, selectedNodeId: string | null): StoryGraphLayout | null {
  if (!story || !story.nodes.length) return null

  const columnStep = 332
  const rowStep = 152
  const nodeWidth = 208
  const nodeHeight = 104

  const nodeMap = new Map(story.nodes.map((node) => [node.id, node]))
  const adjacency = new Map<string, string[]>()
  story.nodes.forEach((node) => {
    const targets = new Set<string>()
    if (node.next && nodeMap.has(node.next)) targets.add(node.next)
    node.choices.forEach((choice) => {
      if (choice.next && nodeMap.has(choice.next)) targets.add(choice.next)
    })
    adjacency.set(node.id, [...targets])
  })

  const reachable = new Set<string>()
  const queue = story.startNodeId && nodeMap.has(story.startNodeId) ? [story.startNodeId] : []
  while (queue.length) {
    const nodeId = queue.shift()
    if (!nodeId || reachable.has(nodeId)) continue
    reachable.add(nodeId)
    adjacency.get(nodeId)?.forEach((targetId) => queue.push(targetId))
  }

  const depthById = new Map<string, number>()
  const depthQueue = story.startNodeId && nodeMap.has(story.startNodeId) ? [{ id: story.startNodeId, depth: 0 }] : []
  while (depthQueue.length) {
    const entry = depthQueue.shift()
    if (!entry || !nodeMap.has(entry.id)) continue
    const currentDepth = depthById.get(entry.id)
    if (currentDepth !== undefined && currentDepth <= entry.depth) continue
    depthById.set(entry.id, entry.depth)
    adjacency.get(entry.id)?.forEach((targetId) => depthQueue.push({ id: targetId, depth: entry.depth + 1 }))
  }

  const fallbackDepth = depthById.size ? Math.max(...depthById.values()) + 1 : 0
  story.nodes.forEach((node) => {
    if (!depthById.has(node.id)) depthById.set(node.id, fallbackDepth)
  })

  const columns = new Map<number, EditableStoryNode[]>()
  story.nodes.forEach((node) => {
    const depth = depthById.get(node.id) || 0
    columns.set(depth, [...(columns.get(depth) || []), node])
  })

  const nodeLayouts = new Map<string, StoryGraphNode>()
  const sortedDepths = [...columns.keys()].sort((left, right) => left - right)
  sortedDepths.forEach((depth) => {
    const columnNodes = columns.get(depth) || []
    columnNodes.forEach((node, rowIndex) => {
      nodeLayouts.set(node.id, {
        id: node.id,
        title: node.speaker || getSpeakerLabel(node),
        text: node.text,
        x: 72 + depth * columnStep,
        y: 48 + rowIndex * rowStep,
        width: nodeWidth,
        height: nodeHeight,
        isSelected: node.id === selectedNodeId,
        isReachable: reachable.has(node.id),
        isStart: node.id === story.startNodeId,
        isTerminal: !node.next && !node.choices.some((choice) => choice.next),
        choiceCount: node.choices.length,
      })
    })
  })

  const edges = story.nodes.flatMap((node) => {
    const fromNode = nodeLayouts.get(node.id)
    if (!fromNode) return []

    const nextEdges = node.next && nodeLayouts.has(node.next)
      ? [createEdge(fromNode, nodeLayouts.get(node.next) as StoryGraphNode, STORY_EDITOR_GRAPH_EDGE_TONES.next, null)]
      : []

    const choiceEdges = node.choices
      .filter((choice) => choice.next && nodeLayouts.has(choice.next))
      .map((choice) => createEdge(
        fromNode,
        nodeLayouts.get(choice.next as string) as StoryGraphNode,
        STORY_EDITOR_GRAPH_EDGE_TONES.choice,
        truncateLabel(choice.text),
      ))

    return [...nextEdges, ...choiceEdges]
  })

  return {
    width: Math.max(720, 96 + sortedDepths.length * columnStep),
    height: Math.max(400, 132 + Math.max(...[...columns.values()].map((column) => column.length)) * rowStep),
    nodes: story.nodes.map((node) => nodeLayouts.get(node.id) as StoryGraphNode),
    edges,
  }
}

export function hasBlockingIssues(issues: StoryIssue[]) {
  return issues.some((issue) => issue.severity === 'error')
}

function createEdge(fromNode: StoryGraphNode, toNode: StoryGraphNode, tone: StoryGraphLayout['edges'][number]['tone'], label: string | null) {
  return {
    fromId: fromNode.id,
    toId: toNode.id,
    tone,
    label,
    fromX: fromNode.x + fromNode.width,
    fromY: fromNode.y + fromNode.height / 2,
    toX: toNode.x,
    toY: toNode.y + toNode.height / 2,
  }
}

function getSpeakerLabel(node: EditableStoryNode) {
  const label = getSpeakerModeLabel(node.speakerMode)
  if (node.speakerMode === STORY_EDITOR_SPEAKER_MODES.npc) return `${label} 口吻`
  if (node.speakerMode === STORY_EDITOR_SPEAKER_MODES.player) return `${label} 口吻`
  return label
}

function truncateLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > 6 ? `${trimmed.slice(0, 6)}…` : trimmed
}