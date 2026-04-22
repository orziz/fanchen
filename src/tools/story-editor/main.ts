import '../../styles/tools.css'
import '../../styles/story-editor.css'

import { STORY_DEFINITIONS } from '../../config/story'

import { saveStories } from '../shared/api'
import {
  cloneStories,
  collectStoryIssues,
  normalizeStoryDefinitions,
  toEditableStoryDefinitions,
  type EditableStoryDefinition,
} from '../shared/storyFile'

import {
  renderBindingsMarkup,
  renderChoiceListMarkup,
  renderConditionListMarkup,
  renderEffectListMarkup,
  renderGraphMarkup,
  renderIssuesMarkup,
  renderNodeListMarkup,
  renderPreviewMarkup,
  renderStoryListMarkup,
} from './render'
import {
  buildStoryGraphLayout,
  createChoice,
  createConditionOfKind,
  createEffectOfKind,
  createNode,
  createStory,
  createUniqueId,
  getSelectedChoice,
  getSelectedNode,
  getSelectedStory,
  hasBlockingIssues,
  query,
  removeNode,
  renameNode,
  syncSelection,
} from './support'
import {
  type ConditionGroup,
  type EffectGroup,
  type StatusTone,
  STORY_EDITOR_CONDITION_GROUPS,
  STORY_EDITOR_CONDITION_KINDS,
  STORY_EDITOR_EFFECT_GROUPS,
  STORY_EDITOR_EFFECT_KINDS,
  STORY_EDITOR_PRESENTATIONS,
  STORY_EDITOR_STATUS_TONES,
  STORY_EDITOR_TRIGGER_KINDS,
} from './enums'
import { createStoryEditorTemplate } from './template'
import type { EditorState, StoryEditorElements } from './types'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) throw new Error('missing_app_root')

const initialStories = toEditableStoryDefinitions(STORY_DEFINITIONS)

const state: EditorState = {
  stories: cloneStories(initialStories),
  baseline: cloneStories(initialStories),
  selectedStoryId: initialStories[0]?.id ?? null,
  selectedNodeId: initialStories[0]?.nodes[0]?.id ?? null,
  selectedChoiceId: initialStories[0]?.nodes[0]?.choices[0]?.id ?? null,
  storySearch: '',
  nodeSearch: '',
  dirty: false,
  saving: false,
  statusMessage: '开发态工具页。保存会直接回写 src/config/story.ts。',
  statusTone: STORY_EDITOR_STATUS_TONES.neutral,
}

root.innerHTML = createStoryEditorTemplate()

const elements: StoryEditorElements = {
  addStoryButton: query('#story-add'),
  deleteStoryButton: query('#story-delete'),
  addNodeButton: query('#node-add'),
  deleteNodeButton: query('#node-delete'),
  addChoiceButton: query('#choice-add'),
  deleteChoiceButton: query('#choice-delete'),
  resetButton: query('#story-reset'),
  saveButton: query('#story-save'),
  resetTriggerButton: query('#trigger-reset'),
  addTriggerConditionButton: query('#trigger-condition-add'),
  addNodeEffectButton: query('#node-effect-add'),
  addChoiceConditionButton: query('#choice-condition-add'),
  addChoiceEffectButton: query('#choice-effect-add'),
  storySearchInput: query('#story-search'),
  nodeSearchInput: query('#node-search'),
  storyCount: query('#story-count'),
  nodeCount: query('#node-count'),
  storyList: query('#story-list'),
  nodeList: query('#node-list'),
  graphTitle: query('#graph-title'),
  graphMeta: query('#graph-meta'),
  graphStage: query('#story-graph-stage'),
  preview: query('#story-preview'),
  storyForm: query('#story-form'),
  storyBindings: query('#story-bindings'),
  triggerForm: query('#trigger-form'),
  triggerConditions: query('#trigger-conditions'),
  nodeForm: query('#node-form'),
  nodeEffects: query('#node-effects'),
  choiceList: query('#choice-list'),
  choiceForm: query('#choice-form'),
  choiceConditions: query('#choice-conditions'),
  choiceEffects: query('#choice-effects'),
  issues: query('#story-issues'),
  status: query('#story-status'),
}

const storyFields = {
  id: elements.storyForm.elements.namedItem('id') as HTMLInputElement,
  title: elements.storyForm.elements.namedItem('title') as HTMLInputElement,
  summary: elements.storyForm.elements.namedItem('summary') as HTMLTextAreaElement,
  defaultPresentation: elements.storyForm.elements.namedItem('defaultPresentation') as HTMLSelectElement,
  startNodeId: elements.storyForm.elements.namedItem('startNodeId') as HTMLSelectElement,
}

const triggerFields = {
  kind: elements.triggerForm.elements.namedItem('kind') as HTMLSelectElement,
  scope: elements.triggerForm.elements.namedItem('scope') as HTMLSelectElement,
  scriptId: elements.triggerForm.elements.namedItem('scriptId') as HTMLInputElement,
  once: elements.triggerForm.elements.namedItem('once') as HTMLInputElement,
}

const nodeFields = {
  id: elements.nodeForm.elements.namedItem('id') as HTMLInputElement,
  speakerMode: elements.nodeForm.elements.namedItem('speakerMode') as HTMLSelectElement,
  speaker: elements.nodeForm.elements.namedItem('speaker') as HTMLInputElement,
  next: elements.nodeForm.elements.namedItem('next') as HTMLSelectElement,
  text: elements.nodeForm.elements.namedItem('text') as HTMLTextAreaElement,
}

const choiceFields = {
  id: elements.choiceForm.elements.namedItem('id') as HTMLInputElement,
  next: elements.choiceForm.elements.namedItem('next') as HTMLSelectElement,
  text: elements.choiceForm.elements.namedItem('text') as HTMLTextAreaElement,
}

bindEvents()
renderAll()

function bindEvents() {
  elements.storySearchInput.addEventListener('input', () => {
    state.storySearch = elements.storySearchInput.value
    renderStoryList()
  })

  elements.nodeSearchInput.addEventListener('input', () => {
    state.nodeSearch = elements.nodeSearchInput.value
    renderNodeList()
  })

  elements.storyList.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-story-id]')
    if (!target?.dataset.storyId) return
    state.selectedStoryId = target.dataset.storyId
    state.selectedNodeId = null
    state.selectedChoiceId = null
    syncSelection(state)
    renderAll()
  })

  elements.nodeList.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-node-id]')
    if (!target?.dataset.nodeId) return
    state.selectedNodeId = target.dataset.nodeId
    state.selectedChoiceId = null
    syncSelection(state)
    renderAll()
  })

  elements.choiceList.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-choice-id]')
    if (!target?.dataset.choiceId) return
    state.selectedChoiceId = target.dataset.choiceId
    renderAll()
  })

  elements.graphStage.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-node-id]')
    if (!target?.dataset.nodeId) return
    state.selectedNodeId = target.dataset.nodeId
    state.selectedChoiceId = null
    syncSelection(state)
    renderAll()
  })

  elements.addStoryButton.addEventListener('click', () => {
    const story = createStory(createUniqueId(state.stories.map((entry) => entry.id), 'story'))
    state.stories.push(story)
    state.selectedStoryId = story.id
    state.selectedNodeId = story.startNodeId
    state.selectedChoiceId = null
    touchDirty('已新增剧情。')
    renderAll()
  })

  elements.deleteStoryButton.addEventListener('click', () => {
    const story = getSelectedStory(state)
    if (!story) return
    if (!window.confirm(`确认删除剧情 ${story.title || story.id} 吗？`)) return
    state.stories = state.stories.filter((entry) => entry.id !== story.id)
    syncSelection(state)
    touchDirty('剧情已删除。')
    renderAll()
  })

  elements.addNodeButton.addEventListener('click', () => {
    const story = getSelectedStory(state)
    if (!story) return
    const node = createNode(createUniqueId(story.nodes.map((entry) => entry.id), 'node'))
    story.nodes.push(node)
    if (!story.startNodeId) story.startNodeId = node.id
    state.selectedNodeId = node.id
    state.selectedChoiceId = null
    touchDirty('已新增节点。')
    renderAll()
  })

  elements.deleteNodeButton.addEventListener('click', () => {
    const story = getSelectedStory(state)
    const node = getSelectedNode(state)
    if (!story || !node) return
    if (!window.confirm(`确认删除节点 ${node.id} 吗？`)) return
    removeNode(story, node.id)
    state.selectedNodeId = null
    state.selectedChoiceId = null
    syncSelection(state)
    touchDirty('节点已删除。')
    renderAll()
  })

  elements.addChoiceButton.addEventListener('click', () => {
    const node = getSelectedNode(state)
    if (!node) return
    const choice = createChoice(createUniqueId(node.choices.map((entry) => entry.id), 'choice'))
    node.choices.push(choice)
    state.selectedChoiceId = choice.id
    touchDirty('已新增选项。')
    renderAll()
  })

  elements.deleteChoiceButton.addEventListener('click', () => {
    const node = getSelectedNode(state)
    const choice = getSelectedChoice(state)
    if (!node || !choice) return
    node.choices = node.choices.filter((entry) => entry.id !== choice.id)
    state.selectedChoiceId = null
    syncSelection(state)
    touchDirty('选项已删除。')
    renderAll()
  })

  elements.resetButton.addEventListener('click', () => {
    state.stories = cloneStories(state.baseline)
    state.dirty = false
    syncSelection(state)
    setStatus('已撤回未保存改动。', 'success')
    renderAll()
  })

  elements.saveButton.addEventListener('click', async () => {
    const issues = collectStoryIssues(state.stories)
    if (hasBlockingIssues(issues)) {
      setStatus('当前还有结构错误，先处理右侧校验结果再保存。', 'error')
      renderIssues()
      return
    }

    state.saving = true
    renderToolbar()
    try {
      const normalized = normalizeStoryDefinitions(state.stories)
      await saveStories(normalized)
      state.stories = cloneStories(normalized)
      state.baseline = cloneStories(normalized)
      state.dirty = false
      syncSelection(state)
      setStatus(`剧情已保存，共 ${normalized.length} 条。`, 'success')
      renderAll()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '剧情保存失败。', 'error')
    } finally {
      state.saving = false
      renderToolbar()
    }
  })

  elements.storyForm.addEventListener('change', (event) => {
    const story = getSelectedStory(state)
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!story || !target.name) return

    if (target.name === 'id') {
      const nextId = target.value.trim()
      if (!nextId) {
        setStatus('剧情 id 不能为空。', 'error')
        renderForms()
        return
      }
      if (state.stories.some((entry) => entry.id === nextId && entry !== story)) {
        setStatus(`剧情 id ${nextId} 已存在。`, 'error')
        renderForms()
        return
      }
      story.id = nextId
      state.selectedStoryId = nextId
    } else if (target.name === 'title') {
      story.title = target.value
    } else if (target.name === 'summary') {
      story.summary = target.value
    } else if (target.name === 'defaultPresentation') {
      story.defaultPresentation = target.value as EditableStoryDefinition['defaultPresentation']
    } else if (target.name === 'startNodeId') {
      story.startNodeId = target.value
      state.selectedNodeId = target.value || state.selectedNodeId
    }

    touchDirty('剧情设定已更新。')
    renderAll()
  })

  elements.storyBindings.addEventListener('change', () => {
    const story = getSelectedStory(state)
    if (!story) return
    story.bindings = Array.from(elements.storyBindings.querySelectorAll<HTMLInputElement>('input[name="bindings"]:checked'))
      .map((input) => input.value as EditableStoryDefinition['bindings'][number])
    touchDirty('剧情绑定已更新。')
    renderAll()
  })

  elements.triggerForm.addEventListener('change', (event) => {
    const story = getSelectedStory(state)
    const target = event.target as HTMLInputElement | HTMLSelectElement
    if (!story || !target.name) return

    const trigger = ensureTrigger(story)
    if (target.name === 'kind') trigger.kind = target.value as NonNullable<typeof story.trigger>['kind']
    if (target.name === 'scope') trigger.scope = (target.value || undefined) as NonNullable<typeof story.trigger>['scope']
    if (target.name === 'scriptId') trigger.scriptId = target.value.trim() || undefined
    if (target.name === 'once' && target instanceof HTMLInputElement) trigger.once = target.checked || undefined

    touchDirty('触发器已更新。')
    renderAll()
  })

  elements.resetTriggerButton.addEventListener('click', () => {
    const story = getSelectedStory(state)
    if (!story) return
    story.trigger = null
    touchDirty('触发器已清空。')
    renderAll()
  })

  elements.nodeForm.addEventListener('change', (event) => {
    const story = getSelectedStory(state)
    const node = getSelectedNode(state)
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!story || !node || !target.name) return

    if (target.name === 'id') {
      const nextId = target.value.trim()
      if (!nextId) {
        setStatus('节点 id 不能为空。', 'error')
        renderForms()
        return
      }
      if (story.nodes.some((entry) => entry.id === nextId && entry !== node)) {
        setStatus(`节点 id ${nextId} 已存在。`, 'error')
        renderForms()
        return
      }
      renameNode(story, node.id, nextId)
      state.selectedNodeId = nextId
    } else if (target.name === 'speakerMode') {
      node.speakerMode = (target.value || undefined) as typeof node.speakerMode
    } else if (target.name === 'speaker') {
      node.speaker = target.value || undefined
    } else if (target.name === 'next') {
      node.next = target.value || undefined
    } else if (target.name === 'text') {
      node.text = target.value
    }

    touchDirty('节点字段已更新。')
    renderAll()
  })

  elements.choiceForm.addEventListener('change', (event) => {
    const node = getSelectedNode(state)
    const choice = getSelectedChoice(state)
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!node || !choice || !target.name) return

    if (target.name === 'id') {
      const nextId = target.value.trim()
      if (!nextId) {
        setStatus('选项 id 不能为空。', 'error')
        renderForms()
        return
      }
      if (node.choices.some((entry) => entry.id === nextId && entry !== choice)) {
        setStatus(`选项 id ${nextId} 已存在。`, 'error')
        renderForms()
        return
      }
      choice.id = nextId
      state.selectedChoiceId = nextId
    } else if (target.name === 'next') {
      choice.next = target.value || undefined
    } else if (target.name === 'text') {
      choice.text = target.value
    }

    touchDirty('选项字段已更新。')
    renderAll()
  })

  elements.addTriggerConditionButton.addEventListener('click', () => addCondition(STORY_EDITOR_CONDITION_GROUPS.trigger))
  elements.addChoiceConditionButton.addEventListener('click', () => addCondition(STORY_EDITOR_CONDITION_GROUPS.choice))
  elements.addNodeEffectButton.addEventListener('click', () => addEffect(STORY_EDITOR_EFFECT_GROUPS.node))
  elements.addChoiceEffectButton.addEventListener('click', () => addEffect(STORY_EDITOR_EFFECT_GROUPS.choice))

  bindConditionContainer(elements.triggerConditions)
  bindConditionContainer(elements.choiceConditions)
  bindEffectContainer(elements.nodeEffects)
  bindEffectContainer(elements.choiceEffects)
}

function bindConditionContainer(container: HTMLDivElement) {
  container.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove-condition]')
    if (!button) return
    const group = button.dataset.specGroup as ConditionGroup
    const index = Number(button.dataset.specIndex)
    const list = getConditionList(group)
    if (!list) return
    list.splice(index, 1)
    touchDirty('条件已更新。')
    renderAll()
  })

  container.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    const group = target.dataset.specGroup as ConditionGroup | undefined
    const index = Number(target.dataset.specIndex)
    const field = target.dataset.specField
    if (!group || Number.isNaN(index) || !field) return
    const list = getConditionList(group)
    const current = list?.[index]
    if (!list || !current) return

    if (field === 'kind') {
      list[index] = createConditionOfKind(target.value as typeof current.kind)
    } else if (field === 'amount') {
      current.amount = Number(target.value)
    } else if (field === 'flag') {
      current.flag = target.value
    } else if (field === 'expected' && target instanceof HTMLInputElement) {
      current.expected = target.checked
    } else if (field === 'scriptId') {
      current.scriptId = target.value
    }

    touchDirty('条件已更新。')
    renderAll()
  })
}

function bindEffectContainer(container: HTMLDivElement) {
  container.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove-effect]')
    if (!button) return
    const group = button.dataset.specGroup as EffectGroup
    const index = Number(button.dataset.specIndex)
    const list = getEffectList(group)
    if (!list) return
    list.splice(index, 1)
    touchDirty('效果已更新。')
    renderAll()
  })

  container.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    const group = target.dataset.specGroup as EffectGroup | undefined
    const index = Number(target.dataset.specIndex)
    const field = target.dataset.specField
    if (!group || Number.isNaN(index) || !field) return
    const list = getEffectList(group)
    const current = list?.[index]
    if (!list || !current) return

    if (field === 'kind') {
      list[index] = createEffectOfKind(target.value as typeof current.kind)
    } else {
      setEffectField(current, field, target)
    }

    touchDirty('效果已更新。')
    renderAll()
  })
}

function renderAll() {
  syncSelection(state)
  renderToolbar()
  renderStoryList()
  renderNodeList()
  renderGraph()
  renderForms()
  renderIssues()
}

function renderToolbar() {
  const story = getSelectedStory(state)
  const node = getSelectedNode(state)
  elements.storyCount.textContent = `${state.stories.length} 条剧情`
  elements.nodeCount.textContent = story ? `${story.nodes.length} 个节点` : '未选择剧情'
  elements.saveButton.disabled = state.saving
  elements.saveButton.textContent = state.saving ? '保存中…' : state.dirty ? '保存剧情' : '剧情已同步'
  elements.deleteStoryButton.disabled = !story
  elements.addNodeButton.disabled = !story
  elements.deleteNodeButton.disabled = !node
  elements.addChoiceButton.disabled = !node
  elements.deleteChoiceButton.disabled = !getSelectedChoice(state)
  elements.resetTriggerButton.disabled = !story?.trigger
  elements.status.textContent = state.statusMessage
  elements.status.className = `tool-status${state.statusTone === 'neutral' ? '' : ` is-${state.statusTone}`}`
}

function renderStoryList() {
  elements.storyList.innerHTML = renderStoryListMarkup(state.stories, state.storySearch, state.selectedStoryId)
}

function renderNodeList() {
  elements.nodeList.innerHTML = renderNodeListMarkup(getSelectedStory(state), state.nodeSearch, state.selectedNodeId)
}

function renderGraph() {
  const story = getSelectedStory(state)
  const layout = buildStoryGraphLayout(story, state.selectedNodeId)
  const choiceCount = story?.nodes.reduce((total, node) => total + node.choices.length, 0) || 0
  elements.graphTitle.textContent = story ? `${story.title || story.id} · 流图` : '剧情流图'
  elements.graphMeta.textContent = story ? `${story.nodes.length} 节点 · ${choiceCount} 选项 · 起点 ${story.startNodeId || '未定'}` : '未选择剧情'
  elements.graphStage.innerHTML = renderGraphMarkup(layout)
  elements.preview.innerHTML = renderPreviewMarkup(story, getSelectedNode(state), state.selectedChoiceId)
}

function renderForms() {
  const story = getSelectedStory(state)
  const node = getSelectedNode(state)
  const choice = getSelectedChoice(state)

  fillStoryForm(story)
  fillTriggerForm(story)
  fillNodeForm(story, node)
  fillChoiceForm(story, node, choice)
}

function fillStoryForm(story: EditableStoryDefinition | null) {
  toggleFields(Object.values(storyFields), !story)
  if (!story) {
    storyFields.id.value = ''
    storyFields.title.value = ''
    storyFields.summary.value = ''
    storyFields.defaultPresentation.value = STORY_EDITOR_PRESENTATIONS.overlay
    storyFields.startNodeId.innerHTML = '<option value="">暂无节点</option>'
    elements.storyBindings.innerHTML = '<div class="tool-meta">未选择剧情。</div>'
    return
  }

  storyFields.id.value = story.id
  storyFields.title.value = story.title
  storyFields.summary.value = story.summary
  storyFields.defaultPresentation.value = story.defaultPresentation
  storyFields.startNodeId.innerHTML = buildNodeOptions(story.nodes, story.startNodeId)
  storyFields.startNodeId.value = story.startNodeId
  elements.storyBindings.innerHTML = renderBindingsMarkup(story.bindings)
}

function fillTriggerForm(story: EditableStoryDefinition | null) {
  toggleFields(Object.values(triggerFields), !story)
  if (!story) {
    triggerFields.kind.value = STORY_EDITOR_TRIGGER_KINDS.manual
    triggerFields.scope.value = ''
    triggerFields.scriptId.value = ''
    triggerFields.once.checked = false
    elements.triggerConditions.innerHTML = '<div class="tool-meta">未选择剧情。</div>'
    return
  }

  triggerFields.kind.value = story.trigger?.kind || 'manual'
  triggerFields.scope.value = story.trigger?.scope || ''
  triggerFields.scriptId.value = story.trigger?.scriptId || ''
  triggerFields.once.checked = Boolean(story.trigger?.once)
  elements.triggerConditions.innerHTML = renderConditionListMarkup(story.trigger?.conditions || [], STORY_EDITOR_CONDITION_GROUPS.trigger)
}

function fillNodeForm(story: EditableStoryDefinition | null, node: ReturnType<typeof getSelectedNode>) {
  toggleFields(Object.values(nodeFields), !node)
  elements.choiceList.innerHTML = renderChoiceListMarkup(node, state.selectedChoiceId)
  elements.nodeEffects.innerHTML = renderEffectListMarkup(node?.effects || [], STORY_EDITOR_EFFECT_GROUPS.node)

  if (!story || !node) {
    nodeFields.id.value = ''
    nodeFields.speakerMode.value = ''
    nodeFields.speaker.value = ''
    nodeFields.next.innerHTML = '<option value="">无</option>'
    nodeFields.text.value = ''
    return
  }

  nodeFields.id.value = node.id
  nodeFields.speakerMode.value = node.speakerMode || ''
  nodeFields.speaker.value = node.speaker || ''
  nodeFields.next.innerHTML = buildNodeOptions(story.nodes, node.next, node.id)
  nodeFields.next.value = node.next || ''
  nodeFields.text.value = node.text
}

function fillChoiceForm(story: EditableStoryDefinition | null, node: ReturnType<typeof getSelectedNode>, choice: ReturnType<typeof getSelectedChoice>) {
  toggleFields(Object.values(choiceFields), !choice)
  elements.choiceConditions.innerHTML = renderConditionListMarkup(choice?.conditions || [], STORY_EDITOR_CONDITION_GROUPS.choice)
  elements.choiceEffects.innerHTML = renderEffectListMarkup(choice?.effects || [], STORY_EDITOR_EFFECT_GROUPS.choice)

  if (!story || !node || !choice) {
    choiceFields.id.value = ''
    choiceFields.next.innerHTML = '<option value="">无</option>'
    choiceFields.text.value = ''
    return
  }

  choiceFields.id.value = choice.id
  choiceFields.next.innerHTML = buildNodeOptions(story.nodes, choice.next, null)
  choiceFields.next.value = choice.next || ''
  choiceFields.text.value = choice.text
}

function renderIssues() {
  elements.issues.innerHTML = renderIssuesMarkup(collectStoryIssues(state.stories))
}

function addCondition(group: ConditionGroup) {
  const list = getConditionList(group)
  if (!list) return
  list.push(createConditionOfKind(STORY_EDITOR_CONDITION_KINDS.flag))
  touchDirty('已新增条件。')
  renderAll()
}

function addEffect(group: EffectGroup) {
  const list = getEffectList(group)
  if (!list) return
  list.push(createEffectOfKind(STORY_EDITOR_EFFECT_KINDS.appendLog))
  touchDirty('已新增效果。')
  renderAll()
}

function getConditionList(group: ConditionGroup) {
  if (group === STORY_EDITOR_CONDITION_GROUPS.trigger) {
    const story = getSelectedStory(state)
    if (!story) return null
    const trigger = ensureTrigger(story)
    trigger.conditions = trigger.conditions || []
    return trigger.conditions
  }

  const choice = getSelectedChoice(state)
  return choice?.conditions || null
}

function getEffectList(group: EffectGroup) {
  if (group === STORY_EDITOR_EFFECT_GROUPS.node) {
    return getSelectedNode(state)?.effects || null
  }
  return getSelectedChoice(state)?.effects || null
}

function ensureTrigger(story: EditableStoryDefinition) {
  story.trigger = story.trigger || { kind: STORY_EDITOR_TRIGGER_KINDS.manual, conditions: [] }
  return story.trigger
}

function buildNodeOptions(nodes: EditableStoryDefinition['nodes'], selectedValue: string | undefined, excludeId?: string | null) {
  const options = ['<option value="">留空即收束</option>']
  nodes
    .filter((node) => !excludeId || node.id !== excludeId)
    .forEach((node) => {
      options.push(`<option value="${node.id}">${node.id}</option>`)
    })
  return options.join('')
}

function touchDirty(message: string) {
  state.dirty = true
  setStatus(message, STORY_EDITOR_STATUS_TONES.neutral)
}

function setStatus(message: string, tone: StatusTone) {
  state.statusMessage = message
  state.statusTone = tone
}

function toggleFields(fields: Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, disabled: boolean) {
  fields.forEach((field) => {
    field.disabled = disabled
  })
}

function setEffectField(current: NonNullable<ReturnType<typeof getEffectList>>[number], field: string, target: HTMLInputElement | HTMLSelectElement) {
  if (field === 'affinity') current.affinity = Number(target.value)
  else if (field === 'trust') current.trust = Number(target.value)
  else if (field === 'romance') current.romance = Number(target.value)
  else if (field === 'rivalry') current.rivalry = Number(target.value)
  else if (field === 'amount') current.amount = Number(target.value)
  else if (field === 'quantity') current.quantity = Number(target.value)
  else if (field === 'itemId') current.itemId = target.value
  else if (field === 'text') current.text = target.value
  else if (field === 'logType') current.logType = target.value
  else if (field === 'key') current.key = target.value
  else if (field === 'value' && target instanceof HTMLInputElement) current.value = target.checked
  else if (field === 'scriptId') current.scriptId = target.value
  else if (field === 'presentation') current.presentation = target.value as NonNullable<typeof current.presentation>
}