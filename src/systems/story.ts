import { LOCATION_MAP } from '@/config'
import {
  STORY_DEFINITIONS,
  STORY_MAP,
  type StoryChoiceSpec,
  type StoryConditionSpec,
  type StoryDefinition,
  type StoryEffectSpec,
  type StoryNodeSpec,
  type StoryPresentationMode,
} from '@/config/story'
import { OPENING_TUTORIAL_SCRIPT_IDS } from '@/config/tutorial'
import { getContext } from '@/core/context'
import type { StoryBindings, StoryHistoryEntry, StoryProgressEntry, StorySuspendedEntry } from '@/types/game'
import { fillTemplate } from '@/utils'
import {
  grantOpeningTutorialStarterPack,
  openOpeningTutorialAffiliationView,
  openOpeningTutorialMapView,
} from './tutorial'

const STORY_HISTORY_LIMIT = 24

export interface StoryViewChoice {
  id: string
  text: string
  disabled: boolean
  reason: string | null
}

export interface ActiveStoryScene {
  storyId: string
  title: string
  summary: string
  speaker: string
  text: string
  choices: StoryViewChoice[]
  canContinue: boolean
  isTerminal: boolean
  presentation: StoryPresentationMode
}

interface StoryScriptPayload {
  definition: StoryDefinition
  node: StoryNodeSpec | null
  choice: StoryChoiceSpec | null
  bindings: StoryBindings
}

type StoryScriptHandler = (payload: StoryScriptPayload) => boolean | void

const STORY_SCRIPTS: Record<string, StoryScriptHandler> = {
  [OPENING_TUTORIAL_SCRIPT_IDS.openMap]: () => {
    openOpeningTutorialMapView()
    return true
  },
  [OPENING_TUTORIAL_SCRIPT_IDS.grantStarterPack]: () => {
    grantOpeningTutorialStarterPack()
    return true
  },
  [OPENING_TUTORIAL_SCRIPT_IDS.openAffiliation]: () => {
    openOpeningTutorialAffiliationView()
    return true
  },
  'npc-visit-bonus': ({ bindings }) => {
    const ctx = getContext()
    if (!bindings.npcId) return true
    const npc = ctx.getNpc(bindings.npcId)
    if (!npc) return true
    const trustBonus = npc.mood.curiosity >= 60 ? 1 : 0
    const affinityBonus = npc.mood.kindness >= 72 ? 1 : 0
    if (trustBonus || affinityBonus) {
      ctx.adjustRelation(npc.id, { trust: trustBonus, affinity: affinityBonus })
    }
    return true
  },
}

function getStoryState() {
  return getContext().game.story
}

function normalizeBindings(bindings: Partial<StoryBindings> = {}): StoryBindings {
  const ctx = getContext()
  const npc = bindings.npcId ? ctx.getNpc(bindings.npcId) : null
  return {
    npcId: npc?.id || bindings.npcId || null,
    locationId: bindings.locationId || npc?.locationId || ctx.game.player.locationId || null,
  }
}

function getStoryDefinition(storyId: string | null) {
  return storyId ? STORY_MAP.get(storyId) || null : null
}

function getActiveDefinition() {
  return getStoryDefinition(getStoryState().activeStoryId)
}

function getActiveNode() {
  const state = getStoryState()
  const definition = getActiveDefinition()
  return definition && state.activeNodeId ? definition.nodes[state.activeNodeId] || null : null
}

function buildStoryScene(
  definition: StoryDefinition,
  node: StoryNodeSpec,
  bindings: StoryBindings,
  presentation: StoryPresentationMode,
): ActiveStoryScene {
  const choices = (node.choices || []).map(choice => {
    const conditionCheck = conditionsPass(choice.conditions, bindings, { definition, node })
    return {
      id: choice.id,
      text: choice.text,
      disabled: !conditionCheck.passed,
      reason: conditionCheck.reason,
    }
  })

  return {
    storyId: definition.id,
    title: definition.title,
    summary: definition.summary,
    speaker: resolveSpeaker(node, bindings),
    text: resolveText(node.text, bindings),
    choices,
    canContinue: !choices.length && Boolean(node.next),
    isTerminal: !choices.length && !node.next,
    presentation,
  }
}

function getTemplatePayload(bindings: StoryBindings) {
  const ctx = getContext()
  const npc = bindings.npcId ? ctx.getNpc(bindings.npcId) : null
  const location = LOCATION_MAP.get(bindings.locationId || ctx.game.player.locationId)
  return {
    npc: npc?.name || '对方',
    npcTitle: npc?.title || '江湖人',
    player: ctx.game.player.name,
    location: location?.name || '此地',
  }
}

function resolveText(text: string, bindings: StoryBindings) {
  return fillTemplate(text, getTemplatePayload(bindings))
}

function resolveSpeaker(node: StoryNodeSpec, bindings: StoryBindings) {
  const ctx = getContext()
  if (node.speaker) return resolveText(node.speaker, bindings)
  if (node.speakerMode === 'npc' && bindings.npcId) return ctx.getNpc(bindings.npcId)?.name || '对方'
  if (node.speakerMode === 'player') return ctx.game.player.name
  return node.speakerMode === 'narrator' ? '旁白' : ''
}

function resolveProgressKey(definition: StoryDefinition, bindings: StoryBindings) {
  if (definition.trigger?.scope === 'npc' && bindings.npcId) {
    return `${definition.id}:${bindings.npcId}`
  }
  return definition.id
}

function ensureProgress(progressKey: string): StoryProgressEntry {
  const state = getStoryState()
  state.progress[progressKey] = state.progress[progressKey] || {
    status: 'idle',
    seenNodeIds: [],
    triggerCount: 0,
    lastNodeId: null,
  }
  return state.progress[progressKey]
}

function runScript(scriptId: string | undefined, payload: StoryScriptPayload) {
  if (!scriptId) return true
  const handler = STORY_SCRIPTS[scriptId]
  if (!handler) return true
  return handler(payload) !== false
}

function getConditionFailure(
  condition: StoryConditionSpec,
  bindings: StoryBindings,
  options: { definition?: StoryDefinition | null; node?: StoryNodeSpec | null } = {},
): string | null {
  const ctx = getContext()
  const state = getStoryState()
  const relation = bindings.npcId ? ctx.ensurePlayerRelation(bindings.npcId) : null
  if (condition.kind === 'money-at-least') {
    const missing = Math.max(0, (condition.amount || 0) - ctx.game.player.money)
    return missing > 0 ? `还差 ${missing} 灵石` : null
  }
  if (condition.kind === 'affinity-at-least') {
    const missing = Math.max(0, (condition.amount || 0) - (relation?.affinity || 0))
    return missing > 0 ? `好感不足 ${missing}` : null
  }
  if (condition.kind === 'trust-at-least') {
    const missing = Math.max(0, (condition.amount || 0) - (relation?.trust || 0))
    return missing > 0 ? `信任不足 ${missing}` : null
  }
  if (condition.kind === 'flag') {
    const expected = condition.expected ?? true
    return state.flags[condition.flag || ''] === expected ? null : '前置未满足'
  }
  if (condition.kind === 'script') {
    const definition = options.definition || getActiveDefinition() || STORY_DEFINITIONS[0]
    return runScript(condition.scriptId, {
      definition,
      node: options.node ?? getActiveNode(),
      choice: null,
      bindings,
    }) ? null : '当前还不能这么做'
  }
  return null
}

function conditionsPass(
  conditions: StoryConditionSpec[] | undefined,
  bindings: StoryBindings,
  options: { definition?: StoryDefinition | null; node?: StoryNodeSpec | null } = {},
) {
  const firstFailure = conditions?.map(condition => getConditionFailure(condition, bindings, options)).find(Boolean) || null
  return { passed: !firstFailure, reason: firstFailure }
}

function applyEffect(effect: StoryEffectSpec, definition: StoryDefinition, node: StoryNodeSpec | null, choice: StoryChoiceSpec | null, bindings: StoryBindings) {
  const ctx = getContext()
  const state = getStoryState()
  if (effect.kind === 'add-relation' && bindings.npcId) {
    ctx.adjustRelation(bindings.npcId, {
      affinity: effect.affinity || 0,
      trust: effect.trust || 0,
      romance: effect.romance || 0,
      rivalry: effect.rivalry || 0,
    })
    return
  }
  if (effect.kind === 'add-money') {
    ctx.game.player.money = Math.max(0, ctx.game.player.money + (effect.amount || 0))
    return
  }
  if (effect.kind === 'add-item' && effect.itemId) {
    ctx.addItemToInventory(effect.itemId, effect.quantity || 1)
    return
  }
  if (effect.kind === 'append-log' && effect.text) {
    ctx.appendLog(resolveText(effect.text, bindings), effect.logType || 'info')
    return
  }
  if (effect.kind === 'set-flag' && effect.key) {
    state.flags[effect.key] = effect.value ?? true
    return
  }
  if (effect.kind === 'set-presentation' && effect.presentation) {
    state.presentation = effect.presentation
    return
  }
  if (effect.kind === 'run-script') {
    runScript(effect.scriptId, { definition, node, choice, bindings })
  }
}

function applyEffects(effects: StoryEffectSpec[] | undefined, definition: StoryDefinition, node: StoryNodeSpec | null, choice: StoryChoiceSpec | null, bindings: StoryBindings) {
  effects?.forEach(effect => applyEffect(effect, definition, node, choice, bindings))
}

function pushHistory(definition: StoryDefinition, node: StoryNodeSpec, bindings: StoryBindings, progressKey: string) {
  const state = getStoryState()
  const ctx = getContext()
  const entry: StoryHistoryEntry = {
    storyId: definition.id,
    progressKey,
    nodeId: node.id,
    title: definition.title,
    speaker: resolveSpeaker(node, bindings),
    text: resolveText(node.text, bindings),
    day: ctx.game.world.day,
    hour: ctx.game.world.hour,
  }
  state.history = [entry, ...state.history].slice(0, STORY_HISTORY_LIMIT)
}

function enterNode() {
  const state = getStoryState()
  const definition = getActiveDefinition()
  const node = getActiveNode()
  if (!definition || !node || !state.activeProgressKey) return false
  const progress = ensureProgress(state.activeProgressKey)
  progress.status = 'active'
  progress.lastNodeId = node.id
  if (!progress.seenNodeIds.includes(node.id)) {
    progress.seenNodeIds.push(node.id)
  }
  pushHistory(definition, node, state.bindings, state.activeProgressKey)
  applyEffects(node.effects, definition, node, null, state.bindings)
  return true
}

function clearActiveStoryState() {
  const state = getStoryState()
  state.activeStoryId = null
  state.activeNodeId = null
  state.activeProgressKey = null
  state.presentation = null
  state.bindings = { npcId: null, locationId: null }
}

function suspendActiveStory() {
  const state = getStoryState()
  if (!state.activeStoryId || !state.activeNodeId || !state.activeProgressKey) {
    state.suspended = null
    return
  }

  state.suspended = {
    storyId: state.activeStoryId,
    nodeId: state.activeNodeId,
    progressKey: state.activeProgressKey,
    presentation: state.presentation,
    bindings: { ...state.bindings },
  } satisfies StorySuspendedEntry
}

function completeActiveStory() {
  const state = getStoryState()
  if (state.activeProgressKey) {
    const progress = ensureProgress(state.activeProgressKey)
    progress.status = 'completed'
    progress.lastNodeId = state.activeNodeId
  }
  state.suspended = null
  clearActiveStoryState()
}

function setActiveNode(nodeId: string | null) {
  const state = getStoryState()
  if (!nodeId) {
    completeActiveStory()
    return true
  }
  state.activeNodeId = nodeId
  return enterNode()
}

export function canStartStory(storyId: string, bindings: Partial<StoryBindings> = {}) {
  const definition = getStoryDefinition(storyId)
  if (!definition) return false
  const state = getStoryState()
  if (state.activeStoryId) return false
  const nextBindings = normalizeBindings(bindings)
  const progressKey = resolveProgressKey(definition, nextBindings)
  const progress = state.progress[progressKey]
  if (definition.trigger?.once && progress?.status === 'completed') return false
  if (definition.trigger?.kind === 'npc-visit' && !nextBindings.npcId) return false
  const conditionCheck = conditionsPass(definition.trigger?.conditions, nextBindings, {
    definition,
    node: definition.nodes[definition.startNodeId] || null,
  })
  if (!conditionCheck.passed) return false
  return runScript(definition.trigger?.scriptId, {
    definition,
    node: definition.nodes[definition.startNodeId] || null,
    choice: null,
    bindings: nextBindings,
  })
}

export function startStory(storyId: string, bindings: Partial<StoryBindings> = {}, presentation?: StoryPresentationMode) {
  const definition = getStoryDefinition(storyId)
  if (!definition) return false
  const nextBindings = normalizeBindings(bindings)
  if (!canStartStory(storyId, nextBindings)) return false
  const state = getStoryState()
  state.suspended = null
  const progressKey = resolveProgressKey(definition, nextBindings)
  const progress = ensureProgress(progressKey)
  progress.status = 'active'
  progress.triggerCount += 1
  progress.lastNodeId = definition.startNodeId
  state.activeStoryId = definition.id
  state.activeNodeId = definition.startNodeId
  state.activeProgressKey = progressKey
  state.presentation = presentation || definition.defaultPresentation
  state.bindings = nextBindings
  return enterNode()
}

export function tryStartNpcVisitStory(npcId: string) {
  const bindings = normalizeBindings({ npcId })
  for (const definition of STORY_DEFINITIONS) {
    if (definition.trigger?.kind !== 'npc-visit') continue
    if (!canStartStory(definition.id, bindings)) continue
    return startStory(definition.id, bindings, definition.defaultPresentation)
  }
  return false
}

export function hasNpcVisitStory(npcId: string) {
  const bindings = normalizeBindings({ npcId })
  return STORY_DEFINITIONS.some(definition => definition.trigger?.kind === 'npc-visit' && canStartStory(definition.id, bindings))
}

export function chooseStoryOption(choiceId: string) {
  const state = getStoryState()
  const definition = getActiveDefinition()
  const node = getActiveNode()
  if (!definition || !node) return false
  const choice = node.choices?.find(entry => entry.id === choiceId)
  if (!choice) return false
  const conditionCheck = conditionsPass(choice.conditions, state.bindings, { definition, node })
  if (!conditionCheck.passed) return false
  applyEffects(choice.effects, definition, node, choice, state.bindings)
  return setActiveNode(choice.next ?? null)
}

export function continueStory() {
  const node = getActiveNode()
  if (!node) return false
  return setActiveNode(node.next ?? null)
}

export function closeStory() {
  const state = getStoryState()
  const node = getActiveNode()
  const isTerminal = Boolean(node && !node.choices?.length && !node.next)
  if (state.activeProgressKey) {
    const progress = ensureProgress(state.activeProgressKey)
    progress.lastNodeId = state.activeNodeId
    progress.status = isTerminal ? 'completed' : 'idle'
  }
  if (isTerminal) state.suspended = null
  else suspendActiveStory()
  clearActiveStoryState()
}

export function resumeSuspendedStory(presentation: StoryPresentationMode = 'overlay') {
  const state = getStoryState()
  const suspended = state.suspended
  if (!suspended || state.activeStoryId) return false

  const definition = getStoryDefinition(suspended.storyId)
  const node = definition?.nodes[suspended.nodeId] || null
  if (!definition || !node) {
    state.suspended = null
    return false
  }

  const progress = ensureProgress(suspended.progressKey)
  progress.status = 'active'
  progress.lastNodeId = suspended.nodeId

  state.activeStoryId = suspended.storyId
  state.activeNodeId = suspended.nodeId
  state.activeProgressKey = suspended.progressKey
  state.presentation = presentation || suspended.presentation || definition.defaultPresentation
  state.bindings = { ...suspended.bindings }
  state.suspended = null
  return true
}

export function showStoryOverlay() {
  const state = getStoryState()
  if (!state.activeStoryId) return
  state.presentation = 'overlay'
}

export function showStoryInRail() {
  const state = getStoryState()
  if (!state.activeStoryId) return
  state.presentation = 'rail'
}

export function getSuspendedStoryScene(): ActiveStoryScene | null {
  const state = getStoryState()
  const suspended = state.suspended
  if (!suspended) return null

  const definition = getStoryDefinition(suspended.storyId)
  const node = definition?.nodes[suspended.nodeId] || null
  if (!definition || !node) return null

  return buildStoryScene(
    definition,
    node,
    suspended.bindings,
    suspended.presentation || definition.defaultPresentation,
  )
}

export function getActiveStoryScene(): ActiveStoryScene | null {
  const state = getStoryState()
  const definition = getActiveDefinition()
  const node = getActiveNode()
  if (!definition || !node) return null
  return buildStoryScene(definition, node, state.bindings, state.presentation || definition.defaultPresentation)
}