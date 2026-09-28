import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { LOCATION_MAP, RANKS, getItem } from '@/config'
import { calendarOf } from '@/config/calendar'
import { checkOdds, describeOdds } from '@/config/life'
import { LIFE_EVENTS, LIFE_EVENT_MAP } from '@/config/lifeEvents'
import { estimateFight, startEventCombat } from '@/systems/combat'
import { applyLifeEffects } from '@/systems/life/effects'
import { buildDynamicEvent } from '@/systems/life/dynamicEvents'
import { runOutcomeHook } from '@/systems/life/hooks'
import { passDays, type DayActivity } from '@/systems/life/time'
import { continueRunner } from '@/systems/life/runner'
import type { CheckStat, EventChoiceDef, LifeEventDef, LifeEventKind } from '@/types/life'
import type { LocationData } from '@/config'

const STAT_LABELS: Record<CheckStat, string> = { power: '体魄', insight: '悟性', charisma: '魅力' }

export function getLifeEventDef(eventId: string, npcId: string | null = null): LifeEventDef | null {
  return buildDynamicEvent(eventId, npcId) || LIFE_EVENT_MAP.get(eventId) || null
}

/* ─── 抽事件 ─── */

function fits(def: LifeEventDef, kind: LifeEventKind, location: LocationData) {
  const when = def.when
  if (!when || !when.kinds.includes(kind)) return false
  const g = getContext().game
  if (when.once && g.life.seenEvents.includes(def.id)) return false
  if (when.minDanger !== undefined && location.danger < when.minDanger) return false
  if (when.maxDanger !== undefined && location.danger > when.maxDanger) return false
  if (when.tags && !when.tags.some(tag => location.tags.includes(tag))) return false
  if (when.notTags && when.notTags.some(tag => location.tags.includes(tag))) return false
  if (when.seasons && !when.seasons.includes(calendarOf(g.world.day).season)) return false
  if (when.minRank !== undefined && g.player.rankIndex < when.minRank) return false
  if (when.maxRank !== undefined && g.player.rankIndex > when.maxRank) return false
  return true
}

/** 按此地的险度、人烟与季节，挑一件会遇上的事。 */
export function pickLifeEvent(kind: LifeEventKind, location = getContext().getCurrentLocation()) {
  const pool = LIFE_EVENTS.filter(def => fits(def, kind, location))
  const total = pool.reduce((sum, def) => sum + (def.when?.weight ?? 1), 0)
  let roll = Math.random() * total
  for (const def of pool) {
    roll -= def.when?.weight ?? 1
    if (roll <= 0) return def.id
  }
  return pool[pool.length - 1]?.id || null
}

/* ─── 文字与把握 ─── */

function vars() {
  const ctx = getContext()
  const event = ctx.game.life.event
  const npc = event?.npcId ? ctx.getNpc(event.npcId) : null
  return { location: LOCATION_MAP.get(event?.locationId || ctx.game.player.locationId)?.name || '此地', npc: npc?.name || '那人' }
}

function fill(text: string) {
  const values = vars()
  return text.replace(/\{(location|npc)\}/g, (_, key: 'location' | 'npc') => values[key])
}

function statValue(stat: CheckStat) {
  const ctx = getContext()
  if (stat === 'power') return ctx.getPlayerPower()
  if (stat === 'insight') return ctx.getPlayerInsight()
  return ctx.getPlayerCharisma()
}

function choiceOdds(choice: EventChoiceDef) {
  if (choice.fixedOdds !== undefined) return choice.fixedOdds
  if (!choice.check) return -1
  return checkOdds(statValue(choice.check.stat), choice.check.difficulty, getContext().game.player.injury)
}

function choiceIssue(choice: EventChoiceDef) {
  const ctx = getContext()
  const p = ctx.game.player
  const req = choice.requires
  if (choice.blocked) return choice.blocked
  if (req?.rankIndex !== undefined && p.rankIndex < req.rankIndex) return `需${RANKS[req.rankIndex].name}境`
  if (req?.itemId && !ctx.findInventoryEntry(req.itemId)) return `需${getItem(req.itemId)?.name || '某物'}`
  if (req?.flag && !ctx.game.story.flags[req.flag]) return '时机未到'
  if (req?.notFlag && ctx.game.story.flags[req.notFlag]) return '已经做过'
  const money = Math.max(choice.cost?.money || 0, req?.money || 0)
  if (money && p.money < money) return `灵石不够（需${money}）`
  for (const item of choice.cost?.items || []) {
    if ((ctx.findInventoryEntry(item.itemId)?.quantity || 0) < item.quantity) return `缺${getItem(item.itemId)?.name || '某物'}`
  }
  return null
}

export interface EventChoiceView {
  index: number
  label: string
  hint: string
  tags: string[]
  issue: string | null
  kind: 'check' | 'fight' | 'plain'
}

export interface EventView {
  id: string
  title: string
  text: string
  stage: 'choose' | 'fighting' | 'result'
  choices: EventChoiceView[]
  result: { success: boolean | null; text: string; gains: string[] } | null
}

/** 给卷轴看的样子：文字填好、每个选择的花费与把握都写明。 */
export function getEventView(): EventView | null {
  const event = getContext().game.life.event
  if (!event) return null
  const def = getLifeEventDef(event.eventId, event.npcId)
  if (!def) return null
  return {
    id: def.id,
    title: fill(def.title),
    text: fill(def.text),
    stage: event.stage,
    result: event.result,
    choices: def.choices.map((choice, index) => {
      const tags: string[] = []
      if (choice.cost?.money) tags.push(`花 ${choice.cost.money} 灵石`)
      for (const item of choice.cost?.items || []) tags.push(`用 ${getItem(item.itemId)?.name || item.itemId}×${item.quantity}`)
      const odds = choiceOdds(choice)
      if (choice.check) tags.push(`${STAT_LABELS[choice.check.stat]} · ${describeOdds(odds)}`)
      else if (odds >= 0) tags.push(describeOdds(odds))
      if (choice.fight) tags.push(`力战 · ${estimateFight(choice.fight).label}`)
      return {
        index, label: fill(choice.label), hint: fill(choice.hint || ''), tags,
        issue: choiceIssue(choice),
        kind: choice.fight ? 'fight' : odds >= 0 ? 'check' : 'plain',
      }
    }),
  }
}

/* ─── 进行 ─── */

export function startLifeEvent(eventId: string, npcId: string | null = null) {
  const g = getContext().game
  const def = getLifeEventDef(eventId, npcId)
  if (!def) return false
  g.life.event = {
    eventId, locationId: g.player.locationId, npcId, stage: 'choose',
    choiceIndex: null, result: null, odds: def.choices.map(choiceOdds), nextId: null,
  }
  if (def.when?.once && !g.life.seenEvents.includes(def.id)) g.life.seenEvents.push(def.id)
  bus.emit('life:event', { id: def.id })
  return true
}

function currentActivity(): DayActivity {
  const id = getContext().game.life.runner?.activityId || ''
  return (['meditate', 'train', 'rest', 'work', 'explore', 'travel', 'study'].includes(id) ? id : 'idle') as DayActivity
}

function settle(choice: EventChoiceDef, success: boolean | null) {
  const ctx = getContext()
  const event = ctx.game.life.event
  if (!event) return
  const outcome = success === false ? (choice.failure || { text: '事情没能办成。' }) : choice.success
  const factionId = LOCATION_MAP.get(event.locationId)?.factionIds?.[0] || null
  const gains = applyLifeEffects(outcome.effects, { npcId: event.npcId, factionId })
  if (outcome.effects?.days) {
    const passed = passDays(outcome.effects.days, currentActivity())
    if (passed) gains.push(`多耗 ${passed} 日`)
  }
  // 钩子返回的话里，带引号的是人物说的话，接在叙述后面；其余是得失。
  const hookLines = outcome.hook ? runOutcomeHook(outcome.hook, { npcId: event.npcId, success }) : []
  const speech = hookLines.filter(line => line.startsWith('“'))
  gains.push(...hookLines.filter(line => !line.startsWith('“')))
  const live = ctx.game.life.event
  if (!live) return
  live.stage = 'result'
  live.result = { success, text: [fill(outcome.text), ...speech].join('\n'), gains }
  live.nextId = outcome.next || null
  bus.emit('life:event-result', { success })
}

/** 选定一个选择：先付花费，再检定或开打，最后落实结果。 */
export function chooseLifeEventOption(index: number) {
  const ctx = getContext()
  const event = ctx.game.life.event
  if (!event || event.stage !== 'choose') return false
  const def = getLifeEventDef(event.eventId, event.npcId)
  const choice = def?.choices[index]
  if (!choice || choiceIssue(choice)) return false
  if (choice.cost?.money) ctx.game.player.money -= choice.cost.money
  for (const item of choice.cost?.items || []) ctx.removeItemFromInventory(item.itemId, item.quantity)
  event.choiceIndex = index
  if (choice.fight) {
    event.stage = 'fighting'
    startEventCombat(choice.fight)
    return true
  }
  const odds = choiceOdds(choice)
  settle(choice, odds < 0 ? null : Math.random() < odds)
  return true
}

function onCombatEnd(won: boolean) {
  const ctx = getContext()
  const event = ctx.game.life.event
  if (!event || event.stage !== 'fighting' || event.choiceIndex === null) return
  const choice = getLifeEventDef(event.eventId, event.npcId)?.choices[event.choiceIndex]
  if (!choice) return
  // 打输了，这趟后面的路就不走了：就地养伤。
  if (!won && ctx.game.life.runner) {
    ctx.game.life.runner.steps = []
    ctx.game.life.runner.aborted = true
  }
  settle(choice, won)
}

bus.on('combat:victory', (payload?: { money?: number; cultivation?: number }) => {
  const runner = getContext().game.life.runner
  if (runner && payload) {
    runner.gains.money = (runner.gains.money || 0) + (payload.money || 0)
    runner.gains.cultivation = (runner.gains.cultivation || 0) + (payload.cultivation || 0)
  }
  onCombatEnd(true)
})
bus.on('combat:defeat', () => onCombatEnd(false))
bus.on('combat:flee', () => onCombatEnd(false))

/** 看完结果：有下文就接着开，没有就回到手头的事。 */
export function closeLifeEvent() {
  const g = getContext().game
  const event = g.life.event
  if (!event || event.stage !== 'result') return false
  const next = event.nextId
  g.life.event = null
  if (next && startLifeEvent(next, event.npcId)) return true
  continueRunner()
  return true
}
