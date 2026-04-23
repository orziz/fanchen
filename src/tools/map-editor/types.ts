import type { LocationData } from '@/config/world'

import type { MapView, NodeDrag, SelectionBox, StatusTone, ViewPan } from '@/tools/map-editor/support'

export interface EditorState {
  locations: LocationData[]
  baseline: LocationData[]
  selectedId: string | null
  selectedIds: Set<string>
  search: string
  roadMode: boolean
  boxMode: boolean
  dirty: boolean
  saving: boolean
  statusMessage: string
  statusTone: StatusTone
  nodeDrag: NodeDrag | null
  panning: ViewPan | null
  selectionBox: SelectionBox | null
  view: MapView
  undoStack: LocationData[][]
  redoStack: LocationData[][]
}

export interface MapEditorElements {
  addButton: HTMLButtonElement
  undoButton: HTMLButtonElement
  redoButton: HTMLButtonElement
  selectButton: HTMLButtonElement
  roadButton: HTMLButtonElement
  zoomOutButton: HTMLButtonElement
  zoomResetButton: HTMLButtonElement
  zoomInButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  deleteButton: HTMLButtonElement
  searchInput: HTMLInputElement
  list: HTMLDivElement
  count: HTMLSpanElement
  modePill: HTMLSpanElement
  selectionPill: HTMLSpanElement
  zoomPill: HTMLSpanElement
  canvas: SVGSVGElement
  detailTitle: HTMLSpanElement
  form: HTMLFormElement
  actionsEditor: HTMLDivElement
  tagsEditor: HTMLDivElement
  factionsEditor: HTMLDivElement
  neighbors: HTMLDivElement
  issues: HTMLUListElement
  status: HTMLSpanElement
}