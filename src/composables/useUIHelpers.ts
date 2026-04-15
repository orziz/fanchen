import { RARITY_META, MODE_OPTIONS, FACTIONS, FACTION_MAP, SECT_BUILDINGS } from '@/config'
import { round } from '@/utils'
import type { ItemData } from '@/config/items'
import type { NpcState } from '@/types/game'

const MARKET_BIAS_LABELS: Record<string, string> = {
  herb: '药材', grain: '粮货', wood: '木料', ore: '矿料',
  ice: '寒材', relic: '异宝', fire: '火材', scroll: '残卷', pill: '丹药',
}

const ROLE_LABELS: Record<string, string> = {
  none: '路人', apprentice: '弟子', master: '师尊', partner: '道侣', rival: '仇敌',
}

const FACTION_TYPE_LABELS: Record<string, string> = {
  village: '乡社', society: '行社', guild: '商帮', escort: '镖局',
  court: '官府', bureau: '转运司', garrison: '军府', order: '行院',
}

const UNLOCK_LABELS: Record<string, string> = {
  farm: '田产', workshop: '工坊', shop: '铺面', warehouse: '仓房', sect: '门内事务',
}

export function getModeLabel(modeId: string) {
  return MODE_OPTIONS.find(m => m.id === modeId)?.label || modeId
}

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role || 'none'] || role
}

export function getFactionTypeLabel(type: string) {
  return FACTION_TYPE_LABELS[type] || '势力'
}

export function getMarketBiasLabel(type: string) {
  return MARKET_BIAS_LABELS[type] || type || '杂市'
}

export function getUnlockLabel(type: string) {
  return UNLOCK_LABELS[type] || type
}

export function formatUnlockLabels(unlocks: string[] = []) {
  return unlocks.map(e => getUnlockLabel(e)).join('、')
}

export function describeItemEffect(item: ItemData | null | undefined) {
  if (!item?.effect) return ''
  const labels: Record<string, string> = {
    hp: '气血', qi: '真气', stamina: '体力', power: '战力', insight: '悟性',
    charisma: '魅力', breakthrough: '突破火候', breakthroughRate: '突破率',
    cultivation: '修炼加成', realmSense: '秘境感应', sectTeaching: '传功效率',
    sectPrestige: '宗门威望', romance: '情缘', reputation: '声望',
  }
  return Object.entries(item.effect as Record<string, number | undefined>)
    .filter(([, v]) => v)
    .map(([k, v]) => `${labels[k] || k} ${typeof v === 'number' && v < 1 ? `${Math.round(v * 100)}%` : (v as number) > 0 ? `+${round(v as number, 2)}` : round(v as number, 2)}`)
    .join('，')
}

export function getPercent(value: number, max: number) {
  if (!max) return 0
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)))
}

export { MARKET_BIAS_LABELS, ROLE_LABELS, FACTION_TYPE_LABELS, UNLOCK_LABELS }
