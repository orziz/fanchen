import '../../styles/tools.css'

import {
  EQUIPMENT_ITEMS,
  MATERIAL_RESOURCE_ITEMS,
  TECHNIQUE_MANUAL_ITEMS,
  UTILITY_ITEMS,
} from '../../config/items'

import { saveItems } from '../shared/api'
import { normalizeEditableItems, type EditableItem, type ItemBucket } from '../shared/itemFile'

type StatusTone = 'neutral' | 'success' | 'error'

interface EditorState {
  items: EditableItem[]
  baseline: EditableItem[]
  selectedId: string | null
  search: string
  dirty: boolean
  saving: boolean
  statusMessage: string
  statusTone: StatusTone
}

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('missing_app_root')
}

const initialItems = buildInitialItems()

const state: EditorState = {
  items: cloneItems(initialItems),
  baseline: cloneItems(initialItems),
  selectedId: initialItems[0]?.id ?? null,
  search: '',
  dirty: false,
  saving: false,
  statusMessage: '当前页先做道具编辑骨架。学识札记仍由 knowledge.ts 派生，不在这里直接改。',
  statusTone: 'neutral',
}

root.innerHTML = `
  <div class="tool-shell">
    <div class="tool-frame">
      <header class="tool-header">
        <div>
          <h1 class="tool-title">道具编辑器</h1>
          <p class="tool-subtitle">这一轮只覆盖材料、装备、功能物与秘籍，学识札记仍由知识配置自动映射。</p>
        </div>
        <div class="tool-toolbar">
          <a class="tool-button" href="/tools/index.html">返回工具台</a>
          <button class="tool-button" id="item-add" type="button">新增道具</button>
          <button class="tool-button" id="item-reset" type="button">撤回未保存改动</button>
          <button class="tool-button is-primary" id="item-save" type="button">保存道具</button>
        </div>
      </header>
      <main class="tool-body tool-body--two">
        <aside class="tool-panel">
          <div class="tool-panel__title">
            <strong>道具列表</strong>
            <span class="tool-meta" id="item-count"></span>
          </div>
          <input class="tool-input" id="item-search" placeholder="按名称、id、类型搜索">
          <div class="tool-list" id="item-list"></div>
        </aside>
        <section class="tool-panel">
          <div class="tool-panel__title">
            <strong id="item-detail-title">道具详情</strong>
            <button class="tool-button is-danger" id="item-delete" type="button">删除道具</button>
          </div>
          <form class="tool-form" id="item-form">
            <div class="tool-form__grid">
              <label class="tool-field"><span>桶位</span><select class="tool-select" name="bucket"><option value="materials">材料</option><option value="equipment">装备</option><option value="utility">功能</option><option value="technique">秘籍</option></select></label>
              <label class="tool-field"><span>id</span><input class="tool-input" name="id"></label>
              <label class="tool-field tool-field--full"><span>名称</span><input class="tool-input" name="name"></label>
              <label class="tool-field"><span>类型</span><input class="tool-input" name="type"></label>
              <label class="tool-field"><span>稀有度</span><input class="tool-input" name="rarity"></label>
              <label class="tool-field"><span>品阶</span><input class="tool-input" name="tier" type="number"></label>
              <label class="tool-field"><span>最低 rank</span><input class="tool-input" name="minRankIndex" type="number"></label>
              <label class="tool-field"><span>基础价值</span><input class="tool-input" name="baseValue" type="number"></label>
              <label class="tool-field"><span>手册分类</span><select class="tool-select" name="manualCategory"><option value="">无</option><option value="heart">heart</option><option value="spell">spell</option></select></label>
              <label class="tool-field"><span>manualSkillId</span><input class="tool-input" name="manualSkillId"></label>
              <label class="tool-field tool-field--full"><span>描述</span><textarea class="tool-textarea" name="desc"></textarea></label>
              <label class="tool-field tool-field--full"><span>效果 JSON</span><textarea class="tool-textarea" name="effect"></textarea></label>
              <label class="tool-checkbox"><input type="checkbox" name="directUse">直接可用</label>
              <label class="tool-checkbox"><input type="checkbox" name="discoverOnly">仅可发现</label>
            </div>
          </form>
          <div class="tool-divider"></div>
          <div class="tool-panel__title"><strong>校验结果</strong></div>
          <ul class="tool-issues" id="item-issues"></ul>
        </section>
      </main>
      <footer class="tool-footer">
        <span class="tool-status" id="item-status"></span>
        <span class="tool-meta">保存会直接回写 src/config/items.ts，学识札记部分仍保留为派生写法。</span>
      </footer>
    </div>
  </div>
`

const elements = {
  addButton: query<HTMLButtonElement>('#item-add'),
  resetButton: query<HTMLButtonElement>('#item-reset'),
  saveButton: query<HTMLButtonElement>('#item-save'),
  deleteButton: query<HTMLButtonElement>('#item-delete'),
  searchInput: query<HTMLInputElement>('#item-search'),
  count: query<HTMLSpanElement>('#item-count'),
  list: query<HTMLDivElement>('#item-list'),
  detailTitle: query<HTMLSpanElement>('#item-detail-title'),
  form: query<HTMLFormElement>('#item-form'),
  issues: query<HTMLUListElement>('#item-issues'),
  status: query<HTMLSpanElement>('#item-status'),
}

const fieldNames = ['bucket', 'id', 'name', 'type', 'rarity', 'tier', 'minRankIndex', 'baseValue', 'manualCategory', 'manualSkillId', 'desc', 'effect', 'directUse', 'discoverOnly'] as const

const formFields = Object.fromEntries(
  fieldNames.map((name) => [name, elements.form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement]),
) as Record<(typeof fieldNames)[number], HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>

bindEvents()
renderAll()

function bindEvents() {
  elements.searchInput.addEventListener('input', () => {
    state.search = elements.searchInput.value.trim().toLowerCase()
    renderList()
  })

  elements.list.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-item-id]')
    const itemId = trigger?.dataset.itemId
    if (!itemId) return
    state.selectedId = itemId
    renderAll()
  })

  elements.addButton.addEventListener('click', () => {
    const item = createItem()
    state.items.push(item)
    state.selectedId = item.id
    touchDirty('已新增道具，记得保存。')
    renderAll()
  })

  elements.deleteButton.addEventListener('click', () => {
    const selected = getSelectedItem()
    if (!selected) return
    if (!window.confirm(`确认删除道具 ${selected.name || selected.id} 吗？`)) return
    state.items = state.items.filter((item) => item.id !== selected.id)
    state.selectedId = state.items[0]?.id ?? null
    touchDirty('道具已删除。')
    renderAll()
  })

  elements.resetButton.addEventListener('click', () => {
    state.items = cloneItems(state.baseline)
    state.selectedId = state.items.find((item) => item.id === state.selectedId)?.id ?? state.items[0]?.id ?? null
    state.dirty = false
    setStatus('已撤回未保存改动。', 'success')
    renderAll()
  })

  elements.saveButton.addEventListener('click', async () => {
    state.saving = true
    renderToolbar()
    try {
      const normalized = cloneItems(normalizeEditableItems(state.items))
      await saveItems(normalized)
      state.items = cloneItems(normalized)
      state.baseline = cloneItems(normalized)
      state.dirty = false
      setStatus(`道具已保存，共 ${normalized.length} 条。`, 'success')
      renderAll()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '道具保存失败。', 'error')
      renderToolbar()
    } finally {
      state.saving = false
      renderToolbar()
    }
  })

  elements.form.addEventListener('change', (event) => {
    const selected = getSelectedItem()
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    if (!selected || !target.name) return

    switch (target.name) {
      case 'id':
        renameItem(selected.id, target.value.trim())
        return
      case 'bucket':
        selected.bucket = target.value as ItemBucket
        break
      case 'tier':
        selected.tier = safeInteger(target.value, selected.tier)
        break
      case 'minRankIndex':
        selected.minRankIndex = safeInteger(target.value, selected.minRankIndex)
        break
      case 'baseValue':
        selected.baseValue = safeInteger(target.value, selected.baseValue)
        break
      case 'manualCategory':
        selected.manualCategory = (target.value || undefined) as EditableItem['manualCategory']
        break
      case 'manualSkillId':
        selected.manualSkillId = target.value.trim() || undefined
        break
      case 'effect':
        try {
          const effect = JSON.parse(target.value || '{}')
          if (!effect || typeof effect !== 'object' || Array.isArray(effect)) throw new Error('效果字段必须是 JSON 对象。')
          selected.effect = Object.fromEntries(
            Object.entries(effect).filter(([, value]) => typeof value === 'number' && Number.isFinite(value)),
          ) as Record<string, number>
        } catch (error) {
          setStatus(error instanceof Error ? error.message : '效果 JSON 解析失败。', 'error')
          renderForm()
          return
        }
        break
      case 'directUse':
        selected.directUse = (target as HTMLInputElement).checked
        break
      case 'discoverOnly':
        selected.discoverOnly = (target as HTMLInputElement).checked
        break
      case 'name':
        selected.name = target.value
        break
      case 'type':
        selected.type = target.value
        break
      case 'rarity':
        selected.rarity = target.value
        break
      case 'desc':
        selected.desc = target.value
        break
      default:
        break
    }

    touchDirty('道具字段已更新。')
    renderAll()
  })
}

function renderAll() {
  renderToolbar()
  renderList()
  renderForm()
  renderIssues()
}

function renderToolbar() {
  elements.count.textContent = `${state.items.length} 条`
  elements.saveButton.disabled = state.saving
  elements.saveButton.textContent = state.saving ? '保存中…' : state.dirty ? '保存道具' : '道具已同步'
  elements.deleteButton.disabled = !getSelectedItem()
  elements.status.textContent = state.statusMessage
  elements.status.className = `tool-status${state.statusTone === 'neutral' ? '' : ` is-${state.statusTone}`}`
}

function renderList() {
  const filtered = state.items.filter((item) => {
    if (!state.search) return true
    const haystack = `${item.name} ${item.id} ${item.type} ${item.bucket}`.toLowerCase()
    return haystack.includes(state.search)
  })

  if (!filtered.length) {
    elements.list.innerHTML = '<div class="tool-meta">当前筛选没有匹配道具。</div>'
    return
  }

  elements.list.innerHTML = filtered.map((item) => {
    const selected = item.id === state.selectedId ? ' is-selected' : ''
    return `<button type="button" class="tool-list__item${selected}" data-item-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name || item.id)}</strong><span class="tool-list__meta">${escapeHtml(item.id)} · ${escapeHtml(item.bucket)} · ${escapeHtml(item.rarity)}</span></button>`
  }).join('')
}

function renderForm() {
  const selected = getSelectedItem()
  elements.detailTitle.textContent = selected ? `道具详情 · ${selected.name || selected.id}` : '道具详情'
  fieldNames.forEach((name) => {
    formFields[name].disabled = !selected
  })

  if (!selected) {
    fieldNames.forEach((name) => {
      const field = formFields[name]
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        field.checked = false
      } else {
        field.value = ''
      }
    })
    return
  }

  formFields.bucket.value = selected.bucket
  formFields.id.value = selected.id
  formFields.name.value = selected.name
  formFields.type.value = selected.type
  formFields.rarity.value = selected.rarity
  formFields.tier.value = String(selected.tier)
  formFields.minRankIndex.value = String(selected.minRankIndex)
  formFields.baseValue.value = String(selected.baseValue)
  formFields.manualCategory.value = selected.manualCategory || ''
  formFields.manualSkillId.value = selected.manualSkillId || ''
  formFields.desc.value = selected.desc
  formFields.effect.value = JSON.stringify(selected.effect, null, 2)
  ;(formFields.directUse as HTMLInputElement).checked = Boolean(selected.directUse)
  ;(formFields.discoverOnly as HTMLInputElement).checked = Boolean(selected.discoverOnly)
}

function renderIssues() {
  const issues = collectIssues()
  elements.issues.innerHTML = issues.length
    ? issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>当前未发现结构问题。</li>'
}

function collectIssues() {
  const issues: string[] = []
  const seen = new Set<string>()

  state.items.forEach((item) => {
    if (!item.id.trim()) issues.push('存在空白道具 id。')
    if (!item.name.trim()) issues.push(`${item.id || '未命名道具'} 缺少名称。`)
    if (!item.type.trim()) issues.push(`${item.id || item.name} 缺少类型。`)
    if (seen.has(item.id)) issues.push(`道具 id ${item.id} 重复。`)
    seen.add(item.id)
    if (item.type === 'manual' && !item.manualCategory) issues.push(`${item.id} 是 manual，但没有 manualCategory。`)
    if (item.manualCategory && item.type !== 'manual') issues.push(`${item.id} 设置了 manualCategory，但类型不是 manual。`)
  })

  return Array.from(new Set(issues)).slice(0, 16)
}

function renameItem(currentId: string, nextId: string) {
  if (!nextId) {
    setStatus('道具 id 不能为空。', 'error')
    renderForm()
    return
  }
  if (currentId === nextId) {
    touchDirty('道具字段已更新。')
    renderAll()
    return
  }
  if (state.items.some((item) => item.id === nextId)) {
    setStatus(`道具 id ${nextId} 已存在。`, 'error')
    renderForm()
    return
  }
  const selected = getSelectedItem()
  if (!selected) return
  selected.id = nextId
  state.selectedId = nextId
  touchDirty('道具 id 已更新。')
  renderAll()
}

function getSelectedItem() {
  return state.items.find((item) => item.id === state.selectedId) || null
}

function createItem(): EditableItem {
  const id = createUniqueId('new-item')
  return {
    id,
    bucket: 'utility',
    name: '新道具',
    type: 'tool',
    rarity: 'common',
    tier: 0,
    minRankIndex: 0,
    baseValue: 0,
    desc: '待补道具描述。',
    effect: {},
  }
}

function createUniqueId(prefix: string) {
  let index = 1
  let candidate = `${prefix}-${index}`
  while (state.items.some((item) => item.id === candidate)) {
    index += 1
    candidate = `${prefix}-${index}`
  }
  return candidate
}

function buildInitialItems() {
  return [
    ...MATERIAL_RESOURCE_ITEMS.map((item) => ({ ...cloneItem(item), bucket: 'materials' as const })),
    ...EQUIPMENT_ITEMS.map((item) => ({ ...cloneItem(item), bucket: 'equipment' as const })),
    ...UTILITY_ITEMS.map((item) => ({ ...cloneItem(item), bucket: 'utility' as const })),
    ...TECHNIQUE_MANUAL_ITEMS.map((item) => ({ ...cloneItem(item), bucket: 'technique' as const })),
  ]
}

function cloneItems(items: EditableItem[]) {
  return items.map((item) => ({
    ...item,
    effect: { ...item.effect },
  }))
}

function cloneItem(item: Omit<EditableItem, 'bucket'>) {
  return {
    ...item,
    effect: { ...item.effect },
  }
}

function safeInteger(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

function touchDirty(message: string) {
  state.dirty = true
  setStatus(message)
}

function setStatus(message: string, tone: StatusTone = 'neutral') {
  state.statusMessage = message
  state.statusTone = tone
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}

function query<T extends Element>(selector: string) {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error(`missing_element:${selector}`)
  return node
}