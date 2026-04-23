import { ACTION_META } from '@/config/constants'
import { FACTIONS } from '@/config/economy'

export interface EditorOption {
  value: string
  label: string
  hint?: string
}

export const ACTION_OPTIONS: EditorOption[] = Object.entries(ACTION_META).map(([value, meta]) => ({
  value,
  label: meta.label,
  hint: value,
}))

export const FACTION_OPTIONS: EditorOption[] = FACTIONS.map((faction) => ({
  value: faction.id,
  label: faction.name,
  hint: `${faction.type} · ${faction.locationId}`,
}))

export const TAG_OPTIONS: EditorOption[] = [
  { value: 'starter', label: '开局落脚', hint: 'starter' },
  { value: 'town', label: '聚落小镇', hint: 'town' },
  { value: 'market', label: '集市货路', hint: 'market' },
  { value: 'port', label: '港埠水路', hint: 'port' },
  { value: 'pass', label: '关道驿路', hint: 'pass' },
  { value: 'court', label: '官府治所', hint: 'court' },
  { value: 'sect', label: '宗门据点', hint: 'sect' },
  { value: 'cultivation', label: '修炼地脉', hint: 'cultivation' },
  { value: 'forge', label: '铸炼地', hint: 'forge' },
  { value: 'city', label: '州府大城', hint: 'city' },
  { value: 'wild', label: '荒野险地', hint: 'wild' },
  { value: 'boss', label: '首领险地', hint: 'boss' },
  { value: 'endgame', label: '后段终局', hint: 'endgame' },
]