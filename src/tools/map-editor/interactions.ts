import type { LocationData } from '../../config/world'

import { saveWorld } from '../shared/api'
import { normalizeLocations } from '../shared/worldFile'

import {
  clamp,
  clampView,
  cloneLocations,
  cloneView,
  createLocation,
  getLocationById,
  getSelectionFromBox,
  getSvgPoint,
  locationsSignature,
  safeInteger,
  screenToWorld,
  type ListFieldName,
  type StatusTone,
} from './support'
import type { EditorState, MapEditorElements } from './types'

interface InteractionContext {
  state: EditorState
  elements: MapEditorElements
  renderAll: () => void
  renderList: () => void
  renderToolbar: () => void
  renderCanvas: () => void
  renderForm: () => void
  renderIssues: () => void
  selectOnly: (locationId: string) => void
  toggleSelection: (locationId: string) => void
  setSelection: (locationIds: string[], preferredId: string | null) => void
  getSelectedLocation: () => LocationData | null
  renameLocation: (currentId: string, nextId: string) => void
  addListValue: (field: ListFieldName, value: string) => void
  removeListValue: (field: ListFieldName, value: string) => void
  applyLocationMutation: (message: string, mutator: (draft: LocationData[]) => void, afterMutate?: (draft: LocationData[]) => void) => void
  undo: () => void
  redo: () => void
  zoomTo: (nextScale: number, pointer?: { x: number; y: number }) => void
  resetView: () => void
  syncSelections: () => void
  syncDirty: () => void
  setStatus: (message: string, tone?: StatusTone) => void
  pushUndoSnapshot: (snapshot: LocationData[]) => void
}

export function bindMapEditorEvents(context: InteractionContext) {
  const {
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
  } = context

  elements.searchInput.addEventListener('input', () => {
    state.search = elements.searchInput.value.trim().toLowerCase()
    renderList()
  })

  elements.list.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-location-id]')
    const locationId = trigger?.dataset.locationId
    if (!locationId) return
    selectOnly(locationId)
    renderAll()
  })

  elements.addButton.addEventListener('click', () => {
    applyLocationMutation('已新增地点，记得保存地图。', (draft) => {
      draft.push(createLocation(getSelectedLocation(), draft))
    }, (draft) => {
      const nextSelectedId = draft[draft.length - 1]?.id ?? null
      state.selectedId = nextSelectedId
      state.selectedIds = new Set(nextSelectedId ? [nextSelectedId] : [])
    })
  })

  elements.deleteButton.addEventListener('click', () => {
    const selectedIds = [...state.selectedIds]
    if (!selectedIds.length) return
    const promptText = selectedIds.length > 1 ? `确认删除这 ${selectedIds.length} 个地点吗？` : `确认删除地点 ${getSelectedLocation()?.name || getSelectedLocation()?.id} 吗？`
    if (!window.confirm(promptText)) return
    applyLocationMutation('地点已删除。', (draft) => {
      const selectedSet = new Set(selectedIds)
      const remaining = draft.filter((location) => !selectedSet.has(location.id))
      remaining.forEach((location) => {
        location.neighbors = location.neighbors.filter((neighborId) => !selectedSet.has(neighborId))
      })
      draft.splice(0, draft.length, ...remaining)
    })
  })

  elements.undoButton.addEventListener('click', undo)
  elements.redoButton.addEventListener('click', redo)

  elements.selectButton.addEventListener('click', () => {
    state.boxMode = !state.boxMode
    setStatus(state.boxMode ? '已进入框选模式。拖动画布空白区域可多选地点。' : '已退出框选模式。')
    renderToolbar()
  })

  elements.roadButton.addEventListener('click', () => {
    state.roadMode = !state.roadMode
    setStatus(state.roadMode ? '已进入路网模式。多选后点目标节点即可批量连路。' : '已退出路网模式。')
    renderAll()
  })

  elements.zoomOutButton.addEventListener('click', () => zoomTo(state.view.scale / 1.18))
  elements.zoomResetButton.addEventListener('click', resetView)
  elements.zoomInButton.addEventListener('click', () => zoomTo(state.view.scale * 1.18))

  elements.resetButton.addEventListener('click', () => {
    state.locations = cloneLocations(state.baseline)
    state.undoStack = []
    state.redoStack = []
    state.roadMode = false
    state.boxMode = false
    syncSelections()
    syncDirty()
    setStatus('已撤回未保存改动。', 'success')
    renderAll()
  })

  elements.saveButton.addEventListener('click', async () => {
    state.saving = true
    renderToolbar()
    try {
      const normalized = cloneLocations(normalizeLocations(state.locations))
      await saveWorld(normalized)
      state.locations = cloneLocations(normalized)
      state.baseline = cloneLocations(normalized)
      state.undoStack = []
      state.redoStack = []
      syncSelections()
      syncDirty()
      setStatus(`地图已保存，共 ${normalized.length} 个地点。`, 'success')
      renderAll()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '地图保存失败。', 'error')
      renderToolbar()
    } finally {
      state.saving = false
      renderToolbar()
    }
  })

  elements.form.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    const selected = getSelectedLocation()
    if (!selected || !target.name) return

    if (target.name === 'id') {
      renameLocation(selected.id, target.value.trim())
      return
    }

    if (target.name === 'realmId') {
      applyLocationMutation('地点字段已更新。', (draft) => {
        const draftSelected = getLocationById(draft, state.selectedId)
        if (draftSelected) draftSelected.realmId = target.value.trim() || null
      })
      return
    }

    if (target.name === 'x' || target.name === 'y' || target.name === 'danger' || target.name === 'marketTier' || target.name === 'aura') {
      applyLocationMutation('地点字段已更新。', (draft) => {
        const draftSelected = getLocationById(draft, state.selectedId)
        if (!draftSelected) return
        if (target.name === 'x') draftSelected.x = clamp(safeInteger(target.value, draftSelected.x), 24, 1676)
        if (target.name === 'y') draftSelected.y = clamp(safeInteger(target.value, draftSelected.y), 24, 896)
        if (target.name === 'danger') draftSelected.danger = safeInteger(target.value, draftSelected.danger)
        if (target.name === 'marketTier') draftSelected.marketTier = safeInteger(target.value, draftSelected.marketTier)
        if (target.name === 'aura') draftSelected.aura = safeInteger(target.value, draftSelected.aura)
      })
      return
    }

    applyLocationMutation('地点字段已更新。', (draft) => {
      const draftSelected = getLocationById(draft, state.selectedId)
      if (!draftSelected) return
      if (target.name === 'name') draftSelected.name = target.value
      if (target.name === 'region') draftSelected.region = target.value
      if (target.name === 'marketBias') draftSelected.marketBias = target.value
      if (target.name === 'terrain') draftSelected.terrain = target.value
      if (target.name === 'resource') draftSelected.resource = target.value
      if (target.name === 'desc') draftSelected.desc = target.value
    })
  })

  elements.form.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const removeTrigger = target.closest<HTMLElement>('[data-list-remove]')
    if (removeTrigger) {
      const field = removeTrigger.dataset.listRemove as ListFieldName
      const value = removeTrigger.dataset.listValue
      if (field && value) removeListValue(field, value)
      return
    }

    const addTrigger = target.closest<HTMLElement>('[data-list-add]')
    if (addTrigger) {
      const field = addTrigger.dataset.listAdd as ListFieldName
      const select = elements.form.querySelector<HTMLSelectElement>(`[data-list-select="${field}"]`)
      const value = select?.value.trim()
      if (field && value) addListValue(field, value)
      return
    }

    const addCustomTrigger = target.closest<HTMLElement>('[data-list-add-custom]')
    if (addCustomTrigger) {
      const field = addCustomTrigger.dataset.listAddCustom as ListFieldName
      const input = elements.form.querySelector<HTMLInputElement>(`[data-list-custom="${field}"]`)
      const value = input?.value.trim()
      if (field && value) {
        addListValue(field, value)
        if (input) input.value = ''
      }
    }
  })

  elements.canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const pointer = getSvgPoint(event, elements.canvas)
    zoomTo(event.deltaY < 0 ? state.view.scale * 1.1 : state.view.scale / 1.1, pointer)
  }, { passive: false })

  elements.canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const trigger = (event.target as SVGElement).closest<SVGGElement>('[data-node-id]')
    const locationId = trigger?.dataset.nodeId || null
    const pointer = getSvgPoint(event, elements.canvas)

    if (state.roadMode && locationId) {
      const sourceIds = [...state.selectedIds].filter((selectedId) => selectedId !== locationId)
      if (event.metaKey || event.shiftKey) {
        toggleSelection(locationId)
        renderAll()
        return
      }
      if (!sourceIds.length) {
        selectOnly(locationId)
        renderAll()
        return
      }

      let mode: 'connected' | 'disconnected' | null = null
      applyLocationMutation('', (draft) => {
        const target = getLocationById(draft, locationId)
        if (!target) return
        const disconnect = sourceIds.every((sourceId) => getLocationById(draft, sourceId)?.neighbors.includes(locationId))
        sourceIds.forEach((sourceId) => {
          const source = getLocationById(draft, sourceId)
          if (!source) return
          source.neighbors = disconnect
            ? source.neighbors.filter((neighborId) => neighborId !== locationId)
            : Array.from(new Set([...source.neighbors, locationId])).sort()
        })
        target.neighbors = disconnect
          ? target.neighbors.filter((neighborId) => !sourceIds.includes(neighborId))
          : Array.from(new Set([...target.neighbors, ...sourceIds])).sort()
        mode = disconnect ? 'disconnected' : 'connected'
      }, () => {
        state.selectedId = locationId
        state.selectedIds = new Set([...sourceIds, locationId])
      })
      if (mode) {
        setStatus(mode === 'connected' ? `已给 ${sourceIds.length} 个地点补上通往 ${locationId} 的路网。` : `已批量断开通往 ${locationId} 的路网。`, 'success')
        renderToolbar()
      }
      return
    }

    if (locationId) {
      if (event.metaKey || event.shiftKey) {
        toggleSelection(locationId)
        renderAll()
        return
      }
      if (!state.selectedIds.has(locationId) || state.selectedIds.size > 1) selectOnly(locationId)
      state.nodeDrag = { id: locationId, pointerId: event.pointerId, snapshot: cloneLocations(state.locations), moved: false }
      elements.canvas.setPointerCapture(event.pointerId)
      renderAll()
      return
    }

    if (state.boxMode) {
      state.selectionBox = { pointerId: event.pointerId, start: pointer, current: pointer }
      elements.canvas.setPointerCapture(event.pointerId)
      renderCanvas()
      return
    }

    state.panning = { pointerId: event.pointerId, start: pointer, origin: cloneView(state.view) }
    elements.canvas.setPointerCapture(event.pointerId)
  })

  elements.canvas.addEventListener('pointermove', (event) => {
    const pointer = getSvgPoint(event, elements.canvas)

    if (state.nodeDrag && state.nodeDrag.pointerId === event.pointerId) {
      const worldPoint = screenToWorld(pointer, state.view)
      const target = getLocationById(state.locations, state.nodeDrag.id)
      if (!target) return
      target.x = clamp(Math.round(worldPoint.x), 24, 1676)
      target.y = clamp(Math.round(worldPoint.y), 24, 896)
      state.nodeDrag.moved = true
      state.dirty = true
      setStatus('地点坐标已更新。')
      renderToolbar()
      renderCanvas()
      renderForm()
      return
    }

    if (state.panning && state.panning.pointerId === event.pointerId) {
      const deltaX = pointer.x - state.panning.start.x
      const deltaY = pointer.y - state.panning.start.y
      state.view = clampView({
        scale: state.panning.origin.scale,
        offsetX: state.panning.origin.offsetX + deltaX,
        offsetY: state.panning.origin.offsetY + deltaY,
      })
      renderToolbar()
      renderCanvas()
      return
    }

    if (state.selectionBox && state.selectionBox.pointerId === event.pointerId) {
      state.selectionBox.current = pointer
      renderCanvas()
    }
  })

  elements.canvas.addEventListener('pointerup', (event) => {
    if (state.nodeDrag && state.nodeDrag.pointerId === event.pointerId) {
      elements.canvas.releasePointerCapture(event.pointerId)
      const snapshot = state.nodeDrag.snapshot
      const moved = state.nodeDrag.moved
      state.nodeDrag = null
      if (moved && locationsSignature(snapshot) !== locationsSignature(state.locations)) {
        pushUndoSnapshot(snapshot)
        state.redoStack = []
        syncDirty()
        renderIssues()
      }
      renderAll()
      return
    }

    if (state.panning && state.panning.pointerId === event.pointerId) {
      elements.canvas.releasePointerCapture(event.pointerId)
      state.panning = null
      renderToolbar()
      return
    }

    if (state.selectionBox && state.selectionBox.pointerId === event.pointerId) {
      elements.canvas.releasePointerCapture(event.pointerId)
      const selectedIds = getSelectionFromBox(state.locations, state.selectionBox, state.view)
      state.selectionBox = null
      if (selectedIds.length) {
        setSelection(selectedIds, state.selectedId && selectedIds.includes(state.selectedId) ? state.selectedId : selectedIds[0])
        setStatus(`框选命中 ${selectedIds.length} 个地点。`, 'success')
      } else {
        setSelection([], null)
        setStatus('框选没有命中地点。')
      }
      renderAll()
    }
  })

}