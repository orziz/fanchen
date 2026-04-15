import { ref, computed } from 'vue'

export const STAGE_TABS = [
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

type ContextType = 'inventory' | 'player-stats' | null

const CONTEXT_MAP: Partial<Record<StageTab, Exclude<ContextType, null>>> = {
  market: 'inventory',
  auction: 'inventory',
  combat: 'player-stats',
  sect: 'player-stats',
}

const activeTab = ref<StageTab>('inventory')

export function useStage() {
  const contextType = computed<ContextType>(() => CONTEXT_MAP[activeTab.value] ?? null)

  function setTab(tab: StageTab) {
    activeTab.value = tab
  }

  return { activeTab, contextType, setTab }
}
