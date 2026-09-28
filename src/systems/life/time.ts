import { getContext } from '@/core/context'
import { addPlayerMetric } from '@/core/integerProgress'
import { bus } from '@/core/events'
import { monthIndexOf, xunIndexOf } from '@/config/calendar'
import { monthlyUpkeep } from '@/config/life'
import { advanceWorldDay } from '@/systems/world'
import { gainTechniqueMastery } from '@/systems/techniques'
import { maybeActivateRealm, restockMarkets } from '@/systems/auction'
import { ageOf, lifespanOf, meditateGain, trainGain, trainPowerGain } from '@/systems/life/cultivation'
import { adjustInjury } from '@/systems/life/effects'
import { refreshOpportunities } from '@/systems/life/opportunities'
import { endLife } from '@/systems/life/legacy'

/** 这一日在做什么：决定当日的修为、气血与伤势变化。 */
export type DayActivity = 'meditate' | 'train' | 'rest' | 'work' | 'explore' | 'travel' | 'study' | 'idle'

const HP_REGEN: Record<DayActivity, number> = {
  meditate: 0.1, train: 0.06, rest: 0.3, work: 0.08, explore: 0.03, travel: 0.04, study: 0.1, idle: 0.08,
}

/** 歇满这么多日，伤势好一级。 */
const REST_DAYS_PER_HEAL = 5

function tally(key: string, amount: number) {
  const runner = getContext().game.life.runner
  if (runner && amount) runner.gains[key] = (runner.gains[key] || 0) + amount
}

/** 月初结生计：口粮与落脚钱；付不起就挨饿，带一级伤。 */
function payUpkeep() {
  const ctx = getContext()
  const p = ctx.game.player
  const cost = monthlyUpkeep(ctx.getCurrentLocation().tags)
  if (p.money >= cost) {
    p.money -= cost
    tally('upkeep', cost)
    return
  }
  tally('upkeep', p.money)
  p.money = 0
  adjustInjury(1)
  tally('hungry', 1)
  ctx.appendLog('这个月的口粮钱没凑齐，饿着肚子熬了几日，身子亏了。', 'warn')
}

/** 换旬：各地机缘与货架刷新，秘境或许有了动静。 */
function onNewXun() {
  const g = getContext().game
  g.life.opportunityXun = xunIndexOf(g.world.day)
  refreshOpportunities()
  restockMarkets()
  maybeActivateRealm()
}

function passOneDay(activity: DayActivity) {
  const ctx = getContext()
  const g = ctx.game
  const p = g.player
  const location = ctx.getCurrentLocation()
  advanceWorldDay()

  if ((activity === 'meditate' || activity === 'train') && p.equipment.heart) {
    gainTechniqueMastery(p.equipment.heart, activity === 'meditate' ? 1 : 0.6)
  }
  if (activity === 'meditate') {
    const gain = meditateGain(p, location)
    addPlayerMetric('cultivation', gain)
    tally('cultivation', gain)
  } else if (activity === 'train') {
    const gain = trainGain(p, location)
    addPlayerMetric('cultivation', gain)
    addPlayerMetric('power', trainPowerGain(p))
    tally('cultivation', gain)
  }
  if (activity === 'rest') {
    tally('restDays', 1)
    const restDays = g.life.runner?.gains.restDays || 0
    if (restDays % REST_DAYS_PER_HEAL === 0 && adjustInjury(-1) < 0) tally('healed', 1)
  }
  ctx.adjustResource('hp', p.maxHp * HP_REGEN[activity], 'maxHp')
  ctx.adjustResource('qi', p.maxQi * 0.3, 'maxQi')
  p.stamina = p.maxStamina

  const month = monthIndexOf(g.world.day)
  if (month !== g.life.lastMonth) {
    g.life.lastMonth = month
    payUpkeep()
  }
  if (xunIndexOf(g.world.day) !== g.life.opportunityXun) onNewXun()
  if (ageOf(p) >= lifespanOf(p)) endLife('寿元耗尽，坐化于' + location.name)
}

/** 让时间走过若干日；寿尽则就此停下。返回实际走过的日数。 */
export function passDays(days: number, activity: DayActivity) {
  const g = getContext().game
  let passed = 0
  for (let i = 0; i < days && !g.life.ended; i += 1) {
    passOneDay(activity)
    passed += 1
  }
  if (g.life.runner) g.life.runner.daysSpent += passed
  if (passed) bus.emit('life:days-passed', { days: passed, activity })
  getContext().updateDerivedStats()
  return passed
}

/** 开局或读档后，确保本旬机缘已经铺好。 */
export function ensureOpportunities() {
  const g = getContext().game
  if (xunIndexOf(g.world.day) !== g.life.opportunityXun) onNewXun()
}
