import '@/styles/tools.css'

import { LOCATIONS } from '@/config/world'

import { normalizeLocations } from '@/tools/shared/worldFile'

import { ACTION_OPTIONS, FACTION_OPTIONS, TAG_OPTIONS } from '@/tools/map-editor/options'
import { bindMapEditorEvents } from '@/tools/map-editor/interactions'
import {
  renderCanvasMarkup,
  renderIssuesMarkup,
  renderListEditorMarkup,
  renderLocationListMarkup,
  renderNeighborMarkup,
} from '@/tools/map-editor/render'
import {
  FORM_FIELD_NAMES,
  MAX_SCALE,
  MIN_SCALE,
  clamp,
  clampView,
  cloneLocations,
  collectIssues,
  getDefaultView,
  getHighlightedNeighborIds,
  getListField,
  getLocationById,
  locationsSignature,
  query,
  screenToWorld,
  setListField,
  syncSelection,
  type ListFieldName,
  type StatusTone,
} from '@/tools/map-editor/support'
import { createMapEditorTemplate } from '@/tools/map-editor/template'
import type { EditorState, MapEditorElements } from '@/tools/map-editor/types'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) throw new Error('missing_app_root')

const initialLocations = cloneLocations(normalizeLocations(LOCATIONS.map((location) => ({ ...location }))))
const initialSelectedId = initialLocations[0]?.id ?? null

const state: EditorState = {
  locations: cloneLocations(initialLocations),
  baseline: cloneLocations(initialLocations),
  selectedId: initialSelectedId,
  selectedIds: new Set(initialSelectedId ? [initialSelectedId] : []),
  search: '',
  roadMode: false,
  boxMode: false,
  dirty: false,
  saving: false,
  statusMessage: '开发态工具页。保存会直接回写 src/config/world.ts。',
  statusTone: 'neutral',
  nodeDrag: null,
  panning: null,
  selectionBox: null,
  view: getDefaultView(),
  undoStack: [],
  redoStack: [],
}

root.innerHTML = createMapEditorTemplate()

const elements: MapEditorElements = {
  addButton: query<HTMLButtonElement>('#map-add'),
  undoButton: query<HTMLButtonElement>('#map-undo'),
  redoButton: query<HTMLButtonElement>('#map-redo'),
  selectButton: query<HTMLButtonElement>('#map-select'),
  roadButton: query<HTMLButtonElement>('#map-road'),
  zoomOutButton: query<HTMLButtonElement>('#map-zoom-out'),
  zoomResetButton: query<HTMLButtonElement>('#map-zoom-reset'),
  zoomInButton: query<HTMLButtonElement>('#map-zoom-in'),
  resetButton: query<HTMLButtonElement>('#map-reset'),
  saveButton: query<HTMLButtonElement>('#map-save'),
  deleteButton: query<HTMLButtonElement>('#map-delete'),
  searchInput: query<HTMLInputElement>('#map-search'),
  list: query<HTMLDivElement>('#map-list'),
  count: query<HTMLSpanElement>('#map-count'),
  modePill: query<HTMLSpanElement>('#map-mode-pill'),
  selectionPill: query<HTMLSpanElement>('#map-selection-pill'),
  zoomPill: query<HTMLSpanElement>('#map-zoom-pill'),
  canvas: query<SVGSVGElement>('#map-canvas'),
  detailTitle: query<HTMLSpanElement>('#map-detail-title'),
  form: query<HTMLFormElement>('#map-form'),
  actionsEditor: query<HTMLDivElement>('#map-actions-editor'),
  tagsEditor: query<HTMLDivElement>('#map-tags-editor'),
  factionsEditor: query<HTMLDivElement>('#map-factions-editor'),
  neighbors: query<HTMLDivElement>('#map-neighbors'),
  issues: query<HTMLUListElement>('#map-issues'),
  status: query<HTMLSpanElement>('#map-status'),
}

const formFields = Object.fromEntries(
  FORM_FIELD_NAMES.map((name) => [name, elements.form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement]),
) as Record<(typeof FORM_FIELD_NAMES)[number], HTMLInputElement | HTMLTextAreaElement>

bindMapEditorEvents({
  state,
  elements,
  renderAll,
  renderList,
  renderToolbar,
  renderCanvas,
  renderForm,
  renderIssues,
  selectOnly,
  toggleSelection,
  setSelection,
  getSelectedLocation,
  renameLocation,
  addListValue,
  removeListValue,
  applyLocationMutation,
  undo,
  redo,
  zoomTo,
  resetView,
  syncSelections,
  syncDirty,
  setStatus,
  pushUndoSnapshot,
})

renderAll()

function renderAll() {
  renderToolbar()
  renderList()
  renderCanvas()
  renderForm()
  renderIssues()
}

function renderToolbar() {
  elements.count.textContent = `${state.locations.length} 个地点`
  elements.modePill.textContent = state.roadMode ? '路网模式' : state.boxMode ? '框选模式' : '拖拽 / 平移'
  elements.selectionPill.textContent = state.selectedIds.size ? `当前选中 ${state.selectedIds.size} 个` : '未选择地点'
  elements.zoomPill.textContent = `缩放 ${Math.round(state.view.scale * 100)}%`
  elements.roadButton.classList.toggle('is-active', state.roadMode)
  elements.selectButton.classList.toggle('is-active', state.boxMode)
  elements.undoButton.disabled = state.undoStack.length === 0
  elements.redoButton.disabled = state.redoStack.length === 0
  elements.saveButton.disabled = state.saving
  elements.saveButton.textContent = state.saving ? '保存中…' : state.dirty ? '保存地图' : '地图已同步'
  elements.deleteButton.disabled = state.selectedIds.size === 0
  elements.status.textContent = state.statusMessage
  elements.status.className = `tool-status${state.statusTone === 'neutral' ? '' : ` is-${state.statusTone}`}`
}

function renderList() {
  elements.list.innerHTML = renderLocationListMarkup({
    locations: state.locations,
    search: state.search,
    selectedIds: state.selectedIds,
    selectedId: state.selectedId,
  })
}

function renderCanvas() {
  elements.canvas.innerHTML = renderCanvasMarkup({
    locations: state.locations,
    primarySelectedId: state.selectedId,
    selectedIds: state.selectedIds,
    highlightedNeighborIds: getHighlightedNeighborIds(state.locations, state.selectedIds),
    roadMode: state.roadMode,
    view: state.view,
    selectionBox: state.selectionBox,
  })
}

function renderForm() {
  const selected = getSelectedLocation()
  elements.detailTitle.textContent = selected ? `地点详情 · ${selected.name || selected.id}${state.selectedIds.size > 1 ? ` · 已多选 ${state.selectedIds.size}` : ''}` : '地点详情'
  FORM_FIELD_NAMES.forEach((name) => {
    formFields[name].disabled = !selected
  })

  if (!selected) {
    FORM_FIELD_NAMES.forEach((name) => {
      formFields[name].value = ''
    })
    elements.actionsEditor.innerHTML = '<div class="tool-meta">未选择地点。</div>'
    elements.tagsEditor.innerHTML = '<div class="tool-meta">未选择地点。</div>'
    elements.factionsEditor.innerHTML = '<div class="tool-meta">未选择地点。</div>'
    elements.neighbors.innerHTML = '<span class="tool-meta">未选择地点。</span>'
    return
  }

  formFields.id.value = selected.id
  formFields.name.value = selected.name
  formFields.x.value = String(selected.x)
  formFields.y.value = String(selected.y)
  formFields.region.value = selected.region
  formFields.danger.value = String(selected.danger)
  formFields.marketBias.value = selected.marketBias
  formFields.marketTier.value = String(selected.marketTier)
  formFields.aura.value = String(selected.aura)
  formFields.terrain.value = selected.terrain
  formFields.resource.value = selected.resource
  formFields.realmId.value = selected.realmId || ''
  formFields.desc.value = selected.desc
  elements.actionsEditor.innerHTML = renderListEditorMarkup({ field: 'actions', values: selected.actions, options: ACTION_OPTIONS })
  elements.tagsEditor.innerHTML = renderListEditorMarkup({ field: 'tags', values: selected.tags, options: TAG_OPTIONS })
  elements.factionsEditor.innerHTML = renderListEditorMarkup({ field: 'factionIds', values: selected.factionIds, options: FACTION_OPTIONS })
  elements.neighbors.innerHTML = renderNeighborMarkup(selected, state.locations)
}

function renderIssues() {
  elements.issues.innerHTML = renderIssuesMarkup(collectIssues(state.locations))
}

function addListValue(field: ListFieldName, value: string) {
  applyLocationMutation('地点列表字段已更新。', (draft) => {
    const draftSelected = getLocationById(draft, state.selectedId)
    if (!draftSelected) return
    setListField(draftSelected, field, [...getListField(draftSelected, field), value])
  })
}

function removeListValue(field: ListFieldName, value: string) {
  applyLocationMutation('地点列表字段已更新。', (draft) => {
    const draftSelected = getLocationById(draft, state.selectedId)
    if (!draftSelected) return
    setListField(draftSelected, field, getListField(draftSelected, field).filter((entry) => entry !== value))
  })
}

function renameLocation(currentId: string, nextId: string) {
  if (!nextId) {
    setStatus('地点 id 不能为空。', 'error')
    renderForm()
    return
  }
  if (currentId === nextId) {
    renderForm()
    return
  }
  if (state.locations.some((location) => location.id === nextId)) {
    setStatus(`地点 id ${nextId} 已存在。`, 'error')
    renderForm()
    return
  }

  applyLocationMutation('地点 id 已更新。', (draft) => {
    draft.forEach((location) => {
      if (location.id === currentId) location.id = nextId
      location.neighbors = location.neighbors.map((neighborId) => (neighborId === currentId ? nextId : neighborId))
    })
  }, () => {
    state.selectedId = nextId
    state.selectedIds = new Set([...state.selectedIds].map((locationId) => (locationId === currentId ? nextId : locationId)))
  })
}

function applyLocationMutation(message: string, mutator: (draft: typeof state.locations) => void, afterMutate?: (draft: typeof state.locations) => void) {
  const snapshot = cloneLocations(state.locations)
  const draft = cloneLocations(state.locations)
  mutator(draft)
  if (locationsSignature(snapshot) === locationsSignature(draft)) return
  pushUndoSnapshot(snapshot)
  state.redoStack = []
  state.locations = draft
  afterMutate?.(draft)
  syncSelections()
  syncDirty()
  if (message) setStatus(message)
  renderAll()
}

function pushUndoSnapshot(snapshot: typeof state.locations) {
  state.undoStack.push(cloneLocations(snapshot))
  if (state.undoStack.length > 80) state.undoStack.shift()
}

function undo() {
  const snapshot = state.undoStack.pop()
  if (!snapshot) return
  state.redoStack.push(cloneLocations(state.locations))
  state.locations = cloneLocations(snapshot)
  syncSelections()
  syncDirty()
  setStatus('已撤销上一步。', 'success')
  renderAll()
}

function redo() {
  const snapshot = state.redoStack.pop()
  if (!snapshot) return
  state.undoStack.push(cloneLocations(state.locations))
  state.locations = cloneLocations(snapshot)
  syncSelections()
  syncDirty()
  setStatus('已重做上一步。', 'success')
  renderAll()
}

function zoomTo(nextScale: number, pointer = { x: 850, y: 460 }) {
  const boundedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  const worldPoint = screenToWorld(pointer, state.view)
  state.view = clampView({
    scale: boundedScale,
    offsetX: pointer.x - worldPoint.x * boundedScale,
    offsetY: pointer.y - worldPoint.y * boundedScale,
  })
  renderToolbar()
  renderCanvas()
}

function resetView() {
  state.view = getDefaultView()
  setStatus('视图已复位。', 'success')
  renderToolbar()
  renderCanvas()
}

function syncSelections() {
  const next = syncSelection(state.locations.map((location) => location.id), state.selectedIds, state.selectedId)
  state.selectedIds = next.selectedIds
  state.selectedId = next.selectedId
}

function syncDirty() {
  state.dirty = locationsSignature(state.locations) !== locationsSignature(state.baseline)
}

function selectOnly(locationId: string) {
  state.selectedId = locationId
  state.selectedIds = new Set([locationId])
}

function toggleSelection(locationId: string) {
  if (state.selectedIds.has(locationId)) {
    state.selectedIds.delete(locationId)
    if (state.selectedId === locationId) state.selectedId = [...state.selectedIds][0] || null
    if (!state.selectedIds.size) {
      state.selectedIds.add(locationId)
      state.selectedId = locationId
    }
    return
  }
  state.selectedIds.add(locationId)
  state.selectedId = locationId
}

function setSelection(locationIds: string[], preferredId: string | null) {
  const nextIds = locationIds.filter((locationId) => state.locations.some((location) => location.id === locationId))
  state.selectedIds = new Set(nextIds)
  state.selectedId = preferredId && state.selectedIds.has(preferredId) ? preferredId : nextIds[0] || null
}

function getSelectedLocation() {
  return getLocationById(state.locations, state.selectedId)
}

function setStatus(message: string, tone: StatusTone = 'neutral') {
  state.statusMessage = message
  state.statusTone = tone
}