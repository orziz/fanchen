import type { StoryBindingKey, StoryConditionSpec, StoryEffectSpec } from '../../config/story'

import type { EditableStoryDefinition, EditableStoryNode, StoryIssue } from '../shared/storyFile'

import {
  type ConditionGroup,
  type EffectGroup,
  STORY_EDITOR_BINDING_OPTIONS,
  STORY_EDITOR_CONDITION_KIND_OPTIONS,
  STORY_EDITOR_CONDITION_KINDS,
  STORY_EDITOR_EFFECT_KIND_OPTIONS,
  STORY_EDITOR_EFFECT_KINDS,
  STORY_EDITOR_PRESENTATION_OPTIONS,
  type StoryEditorOption,
  getSpeakerModeLabel,
} from './enums'
import type { StoryGraphLayout } from './types'

export function renderStoryListMarkup(stories: EditableStoryDefinition[], search: string, selectedStoryId: string | null) {
  const normalizedSearch = search.trim().toLowerCase()
  const visibleStories = stories.filter((story) => {
    if (!normalizedSearch) return true
    return `${story.id} ${story.title} ${story.summary}`.toLowerCase().includes(normalizedSearch)
  })

  if (!visibleStories.length) {
    return '<div class="tool-meta">没有命中的剧情。</div>'
  }

  return visibleStories.map((story) => {
    const choiceCount = story.nodes.reduce((total, node) => total + node.choices.length, 0)
    return `
      <button class="tool-list__item${story.id === selectedStoryId ? ' is-selected' : ''}" type="button" data-story-id="${escapeHtml(story.id)}">
        <strong>${escapeHtml(story.title || story.id)}</strong>
        <span class="tool-list__meta">${escapeHtml(story.id)}</span>
        <div class="story-editor-list__badges">
          <span class="tool-pill">${story.nodes.length} 节点</span>
          <span class="tool-pill">${choiceCount} 选项</span>
          <span class="tool-pill">起点 ${escapeHtml(story.startNodeId || '未定')}</span>
        </div>
      </button>
    `
  }).join('')
}

export function renderNodeListMarkup(story: EditableStoryDefinition | null, search: string, selectedNodeId: string | null) {
  if (!story) return '<div class="tool-meta">先选择一条剧情。</div>'

  const normalizedSearch = search.trim().toLowerCase()
  const visibleNodes = story.nodes.filter((node) => {
    if (!normalizedSearch) return true
    return `${node.id} ${node.text} ${node.speaker || ''}`.toLowerCase().includes(normalizedSearch)
  })

  if (!visibleNodes.length) {
    return '<div class="tool-meta">没有命中的节点。</div>'
  }

  return visibleNodes.map((node) => `
    <button class="tool-list__item${node.id === selectedNodeId ? ' is-selected' : ''}" type="button" data-node-id="${escapeHtml(node.id)}">
      <strong>${escapeHtml(node.id)}</strong>
      <span class="tool-list__meta">${escapeHtml(node.speaker || getSpeakerModeLabel(node.speakerMode))}</span>
      <div class="story-editor-list__badges">
        ${node.id === story.startNodeId ? '<span class="tool-pill">起点</span>' : ''}
        ${node.next ? `<span class="tool-pill">next ${escapeHtml(node.next)}</span>` : '<span class="tool-pill">终点 / 分支</span>'}
        <span class="tool-pill">${node.choices.length} 选项</span>
      </div>
    </button>
  `).join('')
}

export function renderBindingsMarkup(bindings: StoryBindingKey[]) {
  return STORY_EDITOR_BINDING_OPTIONS
    .map((option) => renderBinding(option.value as StoryBindingKey, option.label, bindings.includes(option.value as StoryBindingKey)))
    .join('')
}

export function renderChoiceListMarkup(node: EditableStoryNode | null, selectedChoiceId: string | null) {
  if (!node) return '<div class="tool-meta">先选中一个节点。</div>'
  if (!node.choices.length) return '<div class="tool-meta">当前节点还没有选项。</div>'

  return node.choices.map((choice) => `
    <button class="story-editor-choice-list__item${choice.id === selectedChoiceId ? ' is-selected' : ''}" type="button" data-choice-id="${escapeHtml(choice.id)}">
      <strong>${escapeHtml(choice.id)}</strong>
      <span class="tool-meta">${escapeHtml(choice.text || '待补选项文案')}</span>
      <span class="tool-meta">${choice.next ? `跳到 ${escapeHtml(choice.next)}` : '留空即收束剧情'}</span>
    </button>
  `).join('')
}

export function renderConditionListMarkup(conditions: StoryConditionSpec[], group: ConditionGroup) {
  if (!conditions.length) return '<div class="tool-meta">暂无条件。</div>'

  return `<div class="story-editor-spec-list">${conditions.map((condition, index) => `
    <article class="story-editor-spec-card">
      <div class="story-editor-spec-card__header">
        <strong>条件 ${index + 1}</strong>
        <button class="tool-button is-danger" type="button" data-remove-condition="true" data-spec-group="${group}" data-spec-index="${index}">删除</button>
      </div>
      <div class="story-editor-spec-grid">
        ${renderSelectField('类型', group, index, 'kind', STORY_EDITOR_CONDITION_KIND_OPTIONS, condition.kind)}
        ${renderConditionFields(condition, group, index)}
      </div>
    </article>
  `).join('')}</div>`
}

export function renderEffectListMarkup(effects: StoryEffectSpec[], group: EffectGroup) {
  if (!effects.length) return '<div class="tool-meta">暂无效果。</div>'

  return `<div class="story-editor-spec-list">${effects.map((effect, index) => `
    <article class="story-editor-spec-card">
      <div class="story-editor-spec-card__header">
        <strong>效果 ${index + 1}</strong>
        <button class="tool-button is-danger" type="button" data-remove-effect="true" data-spec-group="${group}" data-spec-index="${index}">删除</button>
      </div>
      <div class="story-editor-spec-grid">
        ${renderSelectField('类型', group, index, 'kind', STORY_EDITOR_EFFECT_KIND_OPTIONS, effect.kind)}
        ${renderEffectFields(effect, group, index)}
      </div>
    </article>
  `).join('')}</div>`
}

export function renderGraphMarkup(layout: StoryGraphLayout | null) {
  if (!layout) {
    return '<div class="story-editor-empty">先选剧情，再从左侧或右侧新增节点。</div>'
  }

  return `
    <svg class="story-editor-graph" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMinYMin meet">
      <defs>
        <marker id="story-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" class="story-editor-graph__arrow"></path>
        </marker>
      </defs>
      ${layout.edges.map(renderGraphEdge).join('')}
      ${layout.nodes.map(renderGraphNode).join('')}
    </svg>
  `
}

export function renderPreviewMarkup(story: EditableStoryDefinition | null, node: EditableStoryNode | null, selectedChoiceId: string | null) {
  if (!story) return '<div class="story-editor-empty">未选择剧情。</div>'
  if (!node) return '<div class="story-editor-empty">当前剧情还没有可预览节点。</div>'

  const selectedChoice = node.choices.find((choice) => choice.id === selectedChoiceId) || null
  return `
    <article class="story-editor-preview">
      <strong class="story-editor-preview__title">${escapeHtml(story.title || story.id)} · ${escapeHtml(node.id)}</strong>
      <p class="story-editor-preview__meta">${escapeHtml(node.speaker || getSpeakerModeLabel(node.speakerMode))}</p>
      <p>${escapeHtml(node.text || '当前节点还没有正文。')}</p>
      <div class="story-editor-preview__choices">
        ${(node.choices.length ? node.choices : [{ id: '', text: '当前节点没有选项。', next: undefined }]).map((choice) => `
          <div class="story-editor-preview__choice${choice.id && choice.id === selectedChoice?.id ? ' is-selected' : ''}">
            <strong>${escapeHtml(choice.id || '节点状态')}</strong>
            <span>${escapeHtml(choice.text || '待补选项文案')}</span>
            <span class="tool-meta">${choice.next ? `跳到 ${escapeHtml(choice.next)}` : '留空即收束剧情'}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `
}

export function renderIssuesMarkup(issues: StoryIssue[]) {
  if (!issues.length) {
    return '<li class="story-editor-issue">当前没有发现结构问题。</li>'
  }

  return issues.map((issue) => `
    <li class="story-editor-issue${issue.severity === 'error' ? ' is-error' : ' is-warn'}">${escapeHtml(issue.message)}</li>
  `).join('')
}

function renderBinding(value: StoryBindingKey, label: string, checked: boolean) {
  return `
    <label class="story-editor-binding${checked ? ' is-checked' : ''}">
      <input type="checkbox" name="bindings" value="${value}" ${checked ? 'checked' : ''}>
      <span>${label}</span>
    </label>
  `
}

function renderConditionFields(condition: StoryConditionSpec, group: ConditionGroup, index: number) {
  if (
    condition.kind === STORY_EDITOR_CONDITION_KINDS.moneyAtLeast
    || condition.kind === STORY_EDITOR_CONDITION_KINDS.affinityAtLeast
    || condition.kind === STORY_EDITOR_CONDITION_KINDS.trustAtLeast
  ) {
    return renderNumberField('数值', group, index, 'amount', condition.amount ?? 0)
  }
  if (condition.kind === STORY_EDITOR_CONDITION_KINDS.flag) {
    return [
      renderTextField('flag', group, index, 'flag', condition.flag || ''),
      renderCheckboxField('期望为真', group, index, 'expected', condition.expected ?? true),
    ].join('')
  }
  return renderTextField('scriptId', group, index, 'scriptId', condition.scriptId || '')
}

function renderEffectFields(effect: StoryEffectSpec, group: EffectGroup, index: number) {
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.addRelation) {
    return [
      renderNumberField('好感', group, index, 'affinity', effect.affinity ?? 0),
      renderNumberField('信任', group, index, 'trust', effect.trust ?? 0),
      renderNumberField('情愫', group, index, 'romance', effect.romance ?? 0),
      renderNumberField('敌意', group, index, 'rivalry', effect.rivalry ?? 0),
    ].join('')
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.addMoney) {
    return renderNumberField('灵石', group, index, 'amount', effect.amount ?? 0)
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.addItem) {
    return [
      renderTextField('itemId', group, index, 'itemId', effect.itemId || ''),
      renderNumberField('数量', group, index, 'quantity', effect.quantity ?? 1),
    ].join('')
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.appendLog) {
    return [
      renderTextField('日志文案', group, index, 'text', effect.text || ''),
      renderTextField('日志类型', group, index, 'logType', effect.logType || 'info'),
    ].join('')
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.setFlag) {
    return [
      renderTextField('flag key', group, index, 'key', effect.key || ''),
      renderCheckboxField('写入 true', group, index, 'value', effect.value ?? true),
    ].join('')
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.runScript) {
    return renderTextField('scriptId', group, index, 'scriptId', effect.scriptId || '')
  }
  if (effect.kind === STORY_EDITOR_EFFECT_KINDS.setPresentation) {
    return renderSelectField('呈现', group, index, 'presentation', STORY_EDITOR_PRESENTATION_OPTIONS, effect.presentation || STORY_EDITOR_PRESENTATION_OPTIONS[0].value)
  }
  return ''
}

function renderTextField(label: string, group: string, index: number, field: string, value: string) {
  return `
    <label class="tool-field">
      <span>${label}</span>
      <input class="tool-input" data-spec-group="${group}" data-spec-index="${index}" data-spec-field="${field}" value="${escapeHtml(value)}">
    </label>
  `
}

function renderNumberField(label: string, group: string, index: number, field: string, value: number) {
  return `
    <label class="tool-field">
      <span>${label}</span>
      <input class="tool-input" type="number" data-spec-group="${group}" data-spec-index="${index}" data-spec-field="${field}" value="${value}">
    </label>
  `
}

function renderCheckboxField(label: string, group: string, index: number, field: string, checked: boolean) {
  return `
    <label class="tool-checkbox story-editor-checkbox-inline">
      <input type="checkbox" data-spec-group="${group}" data-spec-index="${index}" data-spec-field="${field}" ${checked ? 'checked' : ''}>
      <span>${label}</span>
    </label>
  `
}

function renderSelectField(
  label: string,
  group: string,
  index: number,
  field: string,
  options: readonly StoryEditorOption[],
  selectedValue: string,
) {
  return `
    <label class="tool-field">
      <span>${label}</span>
      <select class="tool-select" data-spec-group="${group}" data-spec-index="${index}" data-spec-field="${field}">
        ${options.map((option) => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`).join('')}
      </select>
    </label>
  `
}

function renderGraphEdge(edge: StoryGraphLayout['edges'][number]) {
  const controlOffset = Math.max(40, Math.abs(edge.toX - edge.fromX) / 2)
  const path = `M ${edge.fromX} ${edge.fromY} C ${edge.fromX + controlOffset} ${edge.fromY}, ${edge.toX - controlOffset} ${edge.toY}, ${edge.toX} ${edge.toY}`
  const labelWidth = edge.label ? Math.min(92, Math.max(54, Array.from(edge.label).length * 10 + 18)) : 0
  const labelHeight = 22
  const labelX = ((edge.fromX + edge.toX) / 2) - (labelWidth / 2)
  const labelY = ((edge.fromY + edge.toY) / 2) - 28
  return `
    <g class="story-editor-graph__edge-group">
      <path class="story-editor-graph__edge is-${edge.tone}" d="${path}" marker-end="url(#story-arrow)"></path>
      ${edge.label ? `
        <g class="story-editor-graph__edge-label-chip">
          <rect class="story-editor-graph__edge-pill" x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="11" ry="11"></rect>
          <text class="story-editor-graph__edge-label" x="${labelX + (labelWidth / 2)}" y="${labelY + (labelHeight / 2)}">${escapeHtml(edge.label)}</text>
        </g>
      ` : ''}
    </g>
  `
}

function renderGraphNode(node: StoryGraphLayout['nodes'][number]) {
  const lines = [
    escapeHtml(node.id),
    escapeHtml(node.title),
    escapeHtml(truncateText(node.text || '待补节点正文', 14)),
  ]

  return `
    <g class="story-editor-graph__node${node.isSelected ? ' is-selected' : ''}${node.isStart ? ' is-start' : ''}${node.isTerminal ? ' is-terminal' : ''}${node.isReachable ? '' : ' is-unreachable'}" transform="translate(${node.x}, ${node.y})" data-node-id="${escapeHtml(node.id)}">
      <rect width="${node.width}" height="${node.height}" rx="22" ry="22"></rect>
      <text x="18" y="28">
        <tspan x="18" dy="0">${lines[0]}</tspan>
        <tspan x="18" dy="19">${lines[1]}</tspan>
        <tspan x="18" dy="19">${lines[2]}</tspan>
      </text>
      <text class="story-editor-graph__badge" x="18" y="92">${node.isStart ? '起点' : node.isTerminal ? '收束' : `${node.choiceCount} 选项`}</text>
    </g>
  `
}

function truncateText(value: string, limit = 16) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}