/**
 * 日历：一年十二月、一月三十日、每月分上中下三旬。
 * world.day 是从 1 起算的绝对日数；第 1 日对应第一年三月初一。
 */
export const DAYS_PER_MONTH = 30
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR
export const DAYS_PER_XUN = 10
const EPOCH_OFFSET = 2 * DAYS_PER_MONTH

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface CalendarDate {
  year: number
  /** 1–12 */
  month: number
  /** 1–30 */
  dayOfMonth: number
  /** 0 上旬 · 1 中旬 · 2 下旬 */
  xun: number
  season: Season
}

const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const XUN_NAMES = ['上旬', '中旬', '下旬']
export const SEASON_NAMES: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
const DIGITS = '〇一二三四五六七八九'

function dayIndex(day: number) {
  return Math.max(0, Math.floor(day) - 1 + EPOCH_OFFSET)
}

export function calendarOf(day: number): CalendarDate {
  const index = dayIndex(day)
  const inYear = index % DAYS_PER_YEAR
  const month = Math.floor(inYear / DAYS_PER_MONTH) + 1
  const dayOfMonth = (inYear % DAYS_PER_MONTH) + 1
  const season: Season = month <= 3 ? 'spring' : month <= 6 ? 'summer' : month <= 9 ? 'autumn' : 'winter'
  return { year: Math.floor(index / DAYS_PER_YEAR) + 1, month, dayOfMonth, xun: Math.floor((dayOfMonth - 1) / DAYS_PER_XUN), season }
}

/** 自开天以来第几旬；换旬时各地机缘刷新。 */
export function xunIndexOf(day: number) {
  return Math.floor(dayIndex(day) / DAYS_PER_XUN)
}

/** 自开天以来第几月；换月时结一次生计。 */
export function monthIndexOf(day: number) {
  return Math.floor(dayIndex(day) / DAYS_PER_MONTH)
}

/** 下一个旬首是第几日。 */
export function nextXunStart(day: number) {
  return (xunIndexOf(day) + 1) * DAYS_PER_XUN - EPOCH_OFFSET + 1
}

/** 中文数字，够用到九千九百九十九。 */
export function chineseNumber(value: number): string {
  const n = Math.max(0, Math.floor(value))
  if (n < 10) return DIGITS[n]
  const units = ['', '十', '百', '千']
  const parts: string[] = []
  const text = String(n)
  let pendingZero = false
  for (let i = 0; i < text.length; i += 1) {
    const digit = Number(text[i])
    const unit = units[text.length - 1 - i]
    if (digit === 0) { pendingZero = parts.length > 0; continue }
    if (pendingZero) { parts.push('〇'); pendingZero = false }
    parts.push(digit === 1 && unit === '十' && i === 0 ? '十' : `${DIGITS[digit]}${unit}`)
  }
  return parts.join('')
}

export function formatDate(day: number) {
  const date = calendarOf(day)
  return `第${chineseNumber(date.year)}年 · ${SEASON_NAMES[date.season]} · ${MONTH_NAMES[date.month - 1]}${XUN_NAMES[date.xun]}`
}

export function formatShortDate(day: number) {
  const date = calendarOf(day)
  return `${chineseNumber(date.year)}年${MONTH_NAMES[date.month - 1]}${chineseNumber(date.dayOfMonth)}日`
}

export function formatDays(days: number) {
  const n = Math.max(0, Math.round(days))
  if (n >= DAYS_PER_YEAR && n % DAYS_PER_YEAR === 0) return `${chineseNumber(n / DAYS_PER_YEAR)}年`
  if (n >= DAYS_PER_MONTH && n % DAYS_PER_MONTH === 0) return `${chineseNumber(n / DAYS_PER_MONTH)}个月`
  return `${n}日`
}
