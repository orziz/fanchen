import { DAYS_PER_YEAR } from '@/config/calendar'

/** 凡尘一世的存档代际：低于它的旧档不再读取。 */
export const LIFE_SAVE_VERSION = 3

/** 开局年岁。 */
export const START_AGE = 16

/** 第 1 日开局时的出生日。 */
export const START_BORN_DAY = 1 - START_AGE * DAYS_PER_YEAR

/** 伤势上限；每级降气血上限、修行效率与检定。 */
export const MAX_INJURY = 3
export const INJURY_HP_PENALTY = 0.15
export const INJURY_GAIN_PENALTY = 0.2

/** 每月生计：按落脚处的人烟。 */
export function monthlyUpkeep(tags: string[]) {
  if (tags.includes('city')) return 8
  if (tags.includes('town') || tags.includes('port') || tags.includes('market') || tags.includes('sect')) return 4
  if (tags.includes('village') || tags.includes('pass')) return 2
  return 1
}

/**
 * 检定把握：0.5 + (属性 − 难度) × 0.1，夹在一成到九成半。
 * 伤势每级减一点属性。
 */
export function checkOdds(stat: number, difficulty: number, injury = 0) {
  return Math.min(0.95, Math.max(0.1, 0.5 + (stat - injury - difficulty) * 0.1))
}

/** 把握写成“几成”。 */
export function describeOdds(odds: number) {
  const tenths = Math.round(odds * 10)
  if (tenths >= 10) return '十拿九稳'
  if (tenths <= 1) return '一成'
  return `${'〇一二三四五六七八九'[tenths]}成`
}
