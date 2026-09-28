/**
 * 测试与数值模拟用的“照着志向走”的玩家：只在测试里引用，不进发布包。
 * 它按当前志向挑事做，遇事选最有把握的一项，交战交给自动出招。
 */
import { getContext } from '@/core/context'
import { LOCATIONS, LOCATION_MAP } from '@/config'
import { autoCombatTick } from '@/systems/combat'
import { listActivities, startLocalActivity, startTravel, takeOpportunity } from '@/systems/life/activities'
import { chooseLifeEventOption, closeLifeEvent, getEventView } from '@/systems/life/events'
import { currentGoal } from '@/systems/life/goals'
import { hasHeartMethod, nextRealmNeed } from '@/systems/life/cultivation'
import { opportunitiesAt } from '@/systems/life/opportunities'
import { getTravelPreview } from '@/systems/world'

function g() { return getContext().game }

/** 选最稳的一项：先挑把握最高的检定，其次无检定的，再次力战；都不可选就选最后一项。 */
function pickChoice() {
  const view = getEventView()
  if (!view) return -1
  const usable = view.choices.filter(choice => !choice.issue)
  const scored = usable.map(choice => {
    const oddsTag = choice.tags.find(tag => tag.includes('成') || tag.includes('十拿九稳'))
    const tenths = oddsTag ? (oddsTag.includes('十拿九稳') ? 10 : '〇一二三四五六七八九'.indexOf(oddsTag.slice(-2, -1))) : -1
    const fight = choice.kind === 'fight'
    const score = choice.kind === 'check' ? tenths : fight ? (choice.tags.some(t => t.includes('稳操') || t.includes('颇大')) ? 7 : 3) : 5
    return { index: choice.index, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.index ?? view.choices.length - 1
}

function nearest(match: (id: string) => boolean) {
  let best: { id: string; days: number } | null = null
  for (const location of LOCATIONS) {
    if (!match(location.id)) continue
    const preview = getTravelPreview(location.id)
    if (!preview.route) continue
    if (!best || preview.days < best.days) best = { id: location.id, days: preview.days }
  }
  return best
}

/** 按给定先后接此地的机缘卡。 */
function tryCard(templateIds: string[]) {
  const cards = opportunitiesAt()
  for (const id of templateIds) {
    const card = cards.find(entry => entry.templateId === id)
    if (card) return takeOpportunity(card.id)
  }
  return false
}

function has(id: string) {
  return listActivities().some(entry => entry.id === id && !entry.issue)
}

function earn() {
  if (tryCard(['herb-order', 'escort-grain', 'temple-fair', 'autumn-harvest', 'npc-errand'])) return true
  if (has('work')) return startLocalActivity('work')
  return startLocalActivity('explore')
}

/** 按志向挑一件事做。 */
function chooseActivity() {
  const p = g().player
  const here = LOCATION_MAP.get(p.locationId)!
  if (p.injury >= 2) return startLocalActivity('rest', 5)
  if (has('breakthrough')) return p.injury ? startLocalActivity('rest', 5) : startLocalActivity('breakthrough')
  const study = listActivities().find(entry => entry.id.startsWith('study:') && !entry.issue)
  if (study) return startLocalActivity(study.id)
  if (p.money < 12) return earn()
  const goal = currentGoal()?.id
  if (goal === 'foothold') return earn()
  if (goal === 'strength') return startLocalActivity('train', 10)
  if (goal === 'heart') {
    if (hasHeartMethod(p)) return startLocalActivity('train', 10)
    if (p.money < 125) return earn()
    if (tryCard(['old-bookstall'])) return true
    const stall = nearest(id => opportunitiesAt(id).some(card => card.templateId === 'old-bookstall'))
    if (stall && stall.id !== here.id) return startTravel(stall.id)
    if (has('rumor')) return startLocalActivity('rumor')
    const town = nearest(id => id !== here.id && LOCATION_MAP.get(id)!.tags.includes('town'))
    return town ? startTravel(town.id) : earn()
  }
  if (goal === 'sense') {
    if (here.aura >= 34 && has('meditate')) return startLocalActivity('meditate', 30)
    const spot = nearest(id => { const loc = LOCATION_MAP.get(id)!; return loc.aura >= 34 && loc.danger <= 3 && (loc.actions.includes('meditate') || loc.aura >= 30) })
    return spot ? startTravel(spot.id) : startLocalActivity('meditate', 10)
  }
  if (goal === 'trial') {
    if (tryCard(['jadegate-trial'])) return true
    if (here.id !== 'jadegate') return startTravel('jadegate')
    if (tryCard(['jadegate-herb-garden', 'jadegate-errand'])) return true
    return startLocalActivity('meditate', 10)
  }
  if (goal === 'referral') {
    if (tryCard(['jadegate-trial', 'jadegate-errand', 'jadegate-herb-garden', 'jadegate-escort-furnace'])) return true
    const errands = nearest(id => opportunitiesAt(id).some(card => card.templateId.startsWith('jadegate-')))
    if (errands && errands.id !== here.id) return startTravel(errands.id)
    if (here.id !== 'jadegate' && getTravelPreview('jadegate').route) return startTravel('jadegate')
    if (has('meditate')) return startLocalActivity('meditate', 10)
    return startLocalActivity('train', 10)
  }
  const need = nextRealmNeed(p.rankIndex)
  if (need && p.cultivation < need && has('meditate')) return startLocalActivity('meditate', 30)
  return startLocalActivity('train', 30)
}

/** 走一步：先处理眼前的事件与交战，再挑下一件事。返回 false 表示一世已尽或卡住了。 */
export function botStep() {
  const game = g()
  if (game.life.ended) return false
  if (game.combat.currentEnemy) {
    autoCombatTick()
    return true
  }
  const event = game.life.event
  if (event?.stage === 'choose') return chooseLifeEventOption(pickChoice())
  if (event?.stage === 'result') return closeLifeEvent()
  if (game.life.runner) return false
  return chooseActivity()
}

/** 连走若干步，直到满足条件、一世已尽或卡住。 */
export function botRun(limitSteps: number, until: () => boolean = () => false) {
  let stuck = 0
  for (let i = 0; i < limitSteps; i += 1) {
    if (until()) return true
    if (!botStep()) {
      stuck += 1
      if (stuck > 3 || g().life.ended) return until()
    } else {
      stuck = 0
    }
  }
  return until()
}
