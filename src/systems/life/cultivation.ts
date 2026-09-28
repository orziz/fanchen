import { getContext } from '@/core/context'
import { RANKS } from '@/config'
import { DAYS_PER_YEAR } from '@/config/calendar'
import { INJURY_GAIN_PENALTY } from '@/config/life'
import type { PlayerState } from '@/types/game'
import type { LocationData } from '@/config'

/* ─── 年岁与寿元 ─── */

export function ageOf(player: Pick<PlayerState, 'bornDay'>, day = getContext().game.world.day) {
  return Math.floor((day - player.bornDay) / DAYS_PER_YEAR)
}

export function lifespanOf(player: Pick<PlayerState, 'rankIndex' | 'lifespanBonus'>) {
  return RANKS[Math.min(player.rankIndex, RANKS.length - 1)].lifespan + (player.lifespanBonus || 0)
}

export function yearsLeft(player: PlayerState, day = getContext().game.world.day) {
  return lifespanOf(player) - ageOf(player, day)
}

/* ─── 修为 ─── */

/** 冲入下一境需要的修为；已到顶时为 0。 */
export function nextRealmNeed(rankIndex: number) {
  return rankIndex < RANKS.length - 1 ? RANKS[rankIndex + 1].need : 0
}

export function hasHeartMethod(player: PlayerState) {
  return Boolean(player.equipment.heart && player.learnedTechniques[player.equipment.heart])
}

/** 心法越好，打坐越快；没有心法时，过了凡胎就几乎感不到气。 */
function heartFactor(player: PlayerState) {
  if (hasHeartMethod(player)) return 1.4 * (1 + (player.cultivationBonus || 0) * 5)
  return player.rankIndex === 0 ? 0.6 : 0.25
}

function commonFactor(player: PlayerState) {
  const insight = player.insight + (player.bonusInsight || 0)
  return Math.max(0.1, 1 - player.injury * INJURY_GAIN_PENALTY) * (1 + insight * 0.02)
}

/** 静坐一日的修为：灵气越足越快。 */
export function meditateGain(player: PlayerState, location: Pick<LocationData, 'aura'>) {
  return heartFactor(player) * (0.6 + location.aura / 50) * commonFactor(player)
}

/** 练体一日的修为：凡胎时是正路，入境后只算打底。 */
export function trainGain(player: PlayerState, location: Pick<LocationData, 'actions'>) {
  const base = player.rankIndex === 0 ? 1.2 : 0.35
  return base * (location.actions.includes('train') ? 1.25 : 1) * commonFactor(player)
}

/** 练体一日长的体魄；境界越高，底子越难再往上压。 */
export function trainPowerGain(player: PlayerState) {
  return 0.05 / (1 + player.rankIndex * 0.5) * Math.max(0.2, 1 - player.injury * INJURY_GAIN_PENALTY)
}

/* ─── 冲关 ─── */

const BASE_ODDS = [0, 0.7, 0.55, 0.45, 0.4, 0.35, 0.3]

/** 冲关要的地利：入练力不挑地方，入感气要灵气够足，再往上须在能冲关的灵地。 */
export function breakthroughPlaceIssue(rankIndex: number, location: Pick<LocationData, 'aura' | 'actions' | 'name'>) {
  const target = rankIndex + 1
  if (target <= 1) return null
  if (target === 2) return location.aura >= 34 ? null : `${location.name}灵气太薄，感气要在灵气三十四以上的地方冲。`
  return location.actions.includes('breakthrough') ? null : `${location.name}冲不了这一关，要去山河图上标着“可冲关”的地方。`
}

export function breakthroughIssue(player: PlayerState, location: Pick<LocationData, 'aura' | 'actions' | 'name'>) {
  if (player.rankIndex >= RANKS.length - 1) return '已到当前境界尽头。'
  const need = nextRealmNeed(player.rankIndex)
  if (player.cultivation < need) return `修为还差 ${Math.ceil(need - player.cultivation)}。`
  if (player.rankIndex === 1 && !hasHeartMethod(player)) return '没有心法引气，感气这一关冲不开。'
  return breakthroughPlaceIssue(player.rankIndex, location)
}

/** 冲关把握：底数 + 灵气 + 悟性 − 伤势，再加丹药。 */
export function breakthroughOdds(player: PlayerState, location: Pick<LocationData, 'aura'>, pillBonus = 0) {
  const insight = player.insight + (player.bonusInsight || 0)
  const base = BASE_ODDS[Math.min(player.rankIndex + 1, BASE_ODDS.length - 1)]
  const odds = base + (location.aura - 30) / 200 + insight * 0.015 + (player.breakthroughRate - 0.5) - player.injury * 0.15 + pillBonus
  return Math.min(0.95, Math.max(0.05, odds))
}

/** 冲关可服的丹药与加成。 */
export const BREAKTHROUGH_PILLS: Record<number, { itemId: string; bonus: number }[]> = {
  0: [{ itemId: 'marrow-pellet', bonus: 0.15 }, { itemId: 'herb-paste', bonus: 0.05 }],
  1: [{ itemId: 'focus-pellet', bonus: 0.2 }, { itemId: 'marrow-pellet', bonus: 0.08 }],
  2: [{ itemId: 'jade-spring', bonus: 0.18 }, { itemId: 'focus-pellet', bonus: 0.1 }],
}
