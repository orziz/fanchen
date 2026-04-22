import type { LocationData } from '../../config/world'

import type { EditorOption } from './options'
import type { ListFieldName, MapView, SelectionBox } from './support'
import { escapeHtml, getBoxBounds } from './support'

interface LocationListArgs {
  locations: LocationData[]
  search: string
  selectedIds: Set<string>
  selectedId: string | null
}

interface CanvasArgs {
  locations: LocationData[]
  primarySelectedId: string | null
  selectedIds: Set<string>
  highlightedNeighborIds: Set<string>
  roadMode: boolean
  view: MapView
  selectionBox: SelectionBox | null
}

interface ListEditorArgs {
  field: ListFieldName
  values: string[]
  options: EditorOption[]
  allowCustomInput?: boolean
}

export function renderLocationListMarkup({ locations, search, selectedIds, selectedId }: LocationListArgs) {
  const filtered = locations.filter((location) => {
    if (!search) return true
    const haystack = `${location.name} ${location.id} ${location.region}`.toLowerCase()
    return haystack.includes(search)
  })

  if (!filtered.length) {
    return '<div class="tool-meta">当前筛选没有匹配地点。</div>'
  }

  return filtered.map((location) => {
    const classNames = ['tool-list__item']
    if (selectedIds.has(location.id)) classNames.push('is-selected')
    const pickedText = location.id === selectedId ? '主选' : selectedIds.has(location.id) ? '多选' : '未选'
    return `<button type="button" class="${classNames.join(' ')}" data-location-id="${escapeHtml(location.id)}"><strong>${escapeHtml(location.name || location.id)}</strong><span class="tool-list__meta">${escapeHtml(location.id)} · ${escapeHtml(location.region)} · 邻接 ${location.neighbors.length} · ${pickedText}</span></button>`
  }).join('')
}

export function renderCanvasMarkup({ locations, primarySelectedId, selectedIds, highlightedNeighborIds, roadMode, view, selectionBox }: CanvasArgs) {
  const routeKeys = new Set<string>()
  const routes: string[] = []

  locations.forEach((location) => {
    location.neighbors.forEach((neighborId) => {
      const neighbor = locations.find((entry) => entry.id === neighborId)
      if (!neighbor) return
      const routeKey = [location.id, neighborId].sort().join('::')
      if (routeKeys.has(routeKey)) return
      routeKeys.add(routeKey)
      const active = selectedIds.has(location.id) || selectedIds.has(neighborId)
      routes.push(`<line class="tool-route${active ? ' is-active' : ''}" x1="${location.x}" y1="${location.y}" x2="${neighbor.x}" y2="${neighbor.y}"></line>`)
    })
  })

  const nodes = locations.map((location) => {
    const classNames = ['tool-node']
    if (selectedIds.has(location.id)) classNames.push('is-selected')
    if (location.id === primarySelectedId && roadMode) classNames.push('is-anchor')
    if (highlightedNeighborIds.has(location.id)) classNames.push('is-neighbor')
    const label = escapeHtml(location.name || location.id)
    return `<g class="${classNames.join(' ')}" data-node-id="${escapeHtml(location.id)}" transform="translate(${location.x} ${location.y})"><circle r="16"></circle><circle r="8"></circle><text y="-22">${label}</text></g>`
  })

  const selectionRect = selectionBox
    ? (() => {
        const bounds = getBoxBounds(selectionBox)
        return `<rect class="tool-selection-box" x="${bounds.left}" y="${bounds.top}" width="${bounds.width}" height="${bounds.height}"></rect>`
      })()
    : ''

  return `<g transform="translate(${view.offsetX} ${view.offsetY}) scale(${view.scale})">${routes.join('')}${nodes.join('')}</g>${selectionRect}`
}

export function renderNeighborMarkup(selected: LocationData | null, locations: LocationData[]) {
  if (!selected) return '<span class="tool-meta">未选择地点。</span>'
  if (!selected.neighbors.length) return '<span class="tool-meta">当前没有邻接地点。</span>'

  return selected.neighbors.map((neighborId) => {
    const neighbor = locations.find((location) => location.id === neighborId)
    const label = neighbor ? `${neighbor.name} · ${neighbor.id}` : neighborId
    return `<span class="tool-pill">${escapeHtml(label)}</span>`
  }).join('')
}

export function renderIssuesMarkup(issues: string[]) {
  return issues.length
    ? issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>当前未发现结构问题。</li>'
}

export function renderListEditorMarkup({ field, values, options, allowCustomInput = false }: ListEditorArgs) {
  const currentOptions = values.map((value) => ({
    value,
    label: options.find((option) => option.value === value)?.label || value,
    hint: options.find((option) => option.value === value)?.hint,
  }))
  const availableOptions = options.filter((option) => !values.includes(option.value))

  const itemsMarkup = currentOptions.length
    ? currentOptions.map((option) => `<div class="tool-list-editor__item"><div><strong>${escapeHtml(option.label)}</strong>${option.hint ? `<div class="tool-meta">${escapeHtml(option.hint)}</div>` : ''}</div><button class="tool-button is-danger" type="button" data-list-remove="${field}" data-list-value="${escapeHtml(option.value)}">移除</button></div>`).join('')
    : '<div class="tool-meta">当前为空。</div>'

  const selectOptions = availableOptions.length
    ? availableOptions.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}${option.hint ? ` · ${escapeHtml(option.hint)}` : ''}</option>`).join('')
    : '<option value="">没有可添加项</option>'

  const customMarkup = allowCustomInput
    ? `<div class="tool-list-editor__controls"><input class="tool-input" data-list-custom="${field}" placeholder="输入新标签"><button class="tool-button" type="button" data-list-add-custom="${field}">新增</button></div>`
    : ''

  return `<div class="tool-list-editor"><div class="tool-list-editor__items">${itemsMarkup}</div><div class="tool-list-editor__controls"><select class="tool-select" data-list-select="${field}">${selectOptions}</select><button class="tool-button" type="button" data-list-add="${field}">添加</button></div>${customMarkup}</div>`
}