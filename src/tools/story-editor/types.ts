import type { EditableStoryDefinition } from '../shared/storyFile'
import type { ConditionGroup, EffectGroup, StatusTone, StoryGraphEdgeTone } from './enums'

export interface EditorState {
  stories: EditableStoryDefinition[]
  baseline: EditableStoryDefinition[]
  selectedStoryId: string | null
  selectedNodeId: string | null
  selectedChoiceId: string | null
  storySearch: string
  nodeSearch: string
  dirty: boolean
  saving: boolean
  statusMessage: string
  statusTone: StatusTone
}

export interface StoryGraphNode {
  id: string
  title: string
  text: string
  x: number
  y: number
  width: number
  height: number
  isSelected: boolean
  isReachable: boolean
  isStart: boolean
  isTerminal: boolean
  choiceCount: number
}

export interface StoryGraphEdge {
  fromId: string
  toId: string
  tone: StoryGraphEdgeTone
  label: string | null
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export interface StoryGraphLayout {
  width: number
  height: number
  nodes: StoryGraphNode[]
  edges: StoryGraphEdge[]
}

export interface StoryEditorElements {
  addStoryButton: HTMLButtonElement
  deleteStoryButton: HTMLButtonElement
  addNodeButton: HTMLButtonElement
  deleteNodeButton: HTMLButtonElement
  addChoiceButton: HTMLButtonElement
  deleteChoiceButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  resetTriggerButton: HTMLButtonElement
  addTriggerConditionButton: HTMLButtonElement
  addNodeEffectButton: HTMLButtonElement
  addChoiceConditionButton: HTMLButtonElement
  addChoiceEffectButton: HTMLButtonElement
  storySearchInput: HTMLInputElement
  nodeSearchInput: HTMLInputElement
  storyCount: HTMLSpanElement
  nodeCount: HTMLSpanElement
  storyList: HTMLDivElement
  nodeList: HTMLDivElement
  graphTitle: HTMLSpanElement
  graphMeta: HTMLSpanElement
  graphStage: HTMLDivElement
  preview: HTMLDivElement
  storyForm: HTMLFormElement
  storyBindings: HTMLDivElement
  triggerForm: HTMLFormElement
  triggerConditions: HTMLDivElement
  nodeForm: HTMLFormElement
  nodeEffects: HTMLDivElement
  choiceList: HTMLDivElement
  choiceForm: HTMLFormElement
  choiceConditions: HTMLDivElement
  choiceEffects: HTMLDivElement
  issues: HTMLUListElement
  status: HTMLSpanElement
}