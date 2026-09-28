import { computed, ref } from 'vue'

/**
 * 书册：浮在场景上的功能界面，一次只开一本。
 * 营生（田产、工坊、铺面）属于中期经营，前期先不开放入口。
 */
export const BOOKS = [
  { id: 'character' as const, label: '人物', icon: 'character', hotkey: 'C', hidden: false },
  { id: 'bag' as const, label: '行囊', icon: 'bag', hotkey: 'B', hidden: false },
  { id: 'map' as const, label: '山河', icon: 'map', hotkey: 'M', hidden: false },
  { id: 'market' as const, label: '市集', icon: 'market', hotkey: 'T', hidden: false },
  { id: 'industry' as const, label: '营生', icon: 'industry', hotkey: 'I', hidden: true },
  { id: 'faction' as const, label: '门路', icon: 'faction', hotkey: 'F', hidden: false },
  { id: 'people' as const, label: '人情', icon: 'people', hotkey: 'P', hidden: false },
  { id: 'chronicle' as const, label: '纪事', icon: 'chronicle', hotkey: 'J', hidden: false },
]

/** 眼下开放的书册。 */
export const OPEN_BOOKS = BOOKS.filter(book => !book.hidden)

export type BookId = typeof BOOKS[number]['id']

/** 旧版页签编号：剧情与教程系统仍以此调度界面。 */
export type StageTab = 'story' | 'inventory' | 'industry' | 'market' | 'auction' | 'map' | 'combat' | 'npcs' | 'sect' | 'world'

const TAB_TO_BOOK: Record<StageTab, { book: BookId; tab?: string }> = {
  story: { book: 'chronicle', tab: 'story' },
  inventory: { book: 'bag', tab: 'items' },
  industry: { book: 'industry' },
  market: { book: 'market', tab: 'shop' },
  auction: { book: 'market', tab: 'auction' },
  map: { book: 'map', tab: 'map' },
  combat: { book: 'map', tab: 'realms' },
  npcs: { book: 'people' },
  sect: { book: 'faction' },
  world: { book: 'map', tab: 'world' },
}

/** 书册对应的教程锁检查页签。 */
export const BOOK_LOCK_TAB: Record<BookId, StageTab | null> = {
  character: null,
  bag: 'inventory',
  map: 'map',
  market: 'market',
  industry: 'industry',
  faction: 'sect',
  people: 'npcs',
  chronicle: 'story',
}

const activeBook = ref<BookId | null>(null)
const bookTabs = ref<Partial<Record<BookId, string>>>({})

export function useBooks() {
  function openBook(id: BookId, tab?: string) {
    activeBook.value = id
    if (tab) bookTabs.value = { ...bookTabs.value, [id]: tab }
  }

  function closeBook() {
    activeBook.value = null
  }

  function toggleBook(id: BookId) {
    if (activeBook.value === id) closeBook()
    else openBook(id)
  }

  function setBookTab(id: BookId, tab: string) {
    bookTabs.value = { ...bookTabs.value, [id]: tab }
  }

  function tabOf(id: BookId, fallback: string) {
    return computed(() => bookTabs.value[id] || fallback)
  }

  return { activeBook, bookTabs, openBook, closeBook, toggleBook, setBookTab, tabOf }
}

/** 兼容层：系统层仍以 setTab 指引界面，这里转成打开对应书册。 */
export function useStage() {
  const { openBook, activeBook } = useBooks()
  function setTab(tab: StageTab) {
    const target = TAB_TO_BOOK[tab]
    if (target) openBook(target.book, target.tab)
  }
  const activeTab = computed<StageTab | null>(() => {
    const book = activeBook.value
    if (!book) return null
    const entry = (Object.entries(TAB_TO_BOOK) as [StageTab, { book: BookId }][]).find(([, v]) => v.book === book)
    return entry ? entry[0] : null
  })
  return { activeTab, setTab }
}
