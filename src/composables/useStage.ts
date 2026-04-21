import { ref, computed } from 'vue'

export const STAGE_TABS = [
  { id: 'story' as const, label: '剧情与委托', shortLabel: '剧情' },
  { id: 'inventory' as const, label: '行囊与功法', shortLabel: '行囊' },
  { id: 'industry' as const, label: '产业经营', shortLabel: '产业' },
  { id: 'market' as const, label: '商店与行商', shortLabel: '商路' },
  { id: 'auction' as const, label: '拍卖行', shortLabel: '拍市' },
  { id: 'map' as const, label: '山河图', shortLabel: '山河' },
  { id: 'combat' as const, label: '战斗与秘境', shortLabel: '战斗' },
  { id: 'npcs' as const, label: '江湖群像', shortLabel: '群像' },
  { id: 'sect' as const, label: '势力与宗门', shortLabel: '势力' },
  { id: 'world' as const, label: '天机簿', shortLabel: '天机' },
]

export type StageTab = typeof STAGE_TABS[number]['id']

export type ContextPanel = 'inventory' | 'player-stats'

const CONTEXT_LAYOUTS: Partial<Record<StageTab, ContextPanel[]>> = {
  market: ['inventory'],
  auction: ['inventory'],
  combat: ['player-stats'],
  sect: ['player-stats'],
}

const activeTab = ref<StageTab>('inventory')

export function useStage() {
  const contextPanels = computed<ContextPanel[]>(() => CONTEXT_LAYOUTS[activeTab.value] ?? [])
  const contextType = computed<ContextPanel | null>(() => contextPanels.value[0] ?? null)

  function setTab(tab: StageTab) {
    activeTab.value = tab
  }

  return { activeTab, contextPanels, contextType, setTab }
}
