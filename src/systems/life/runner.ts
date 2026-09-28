import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { LOCATION_MAP, getItem } from '@/config'
import { formatDays } from '@/config/calendar'
import { learnTechnique } from '@/systems/techniques'
import { learnKnowledge } from '@/systems/knowledge'
import { arriveAt } from '@/systems/world'
import { applyLifeEffects, injuryLabel } from '@/systems/life/effects'
import { pickLifeEvent, startLifeEvent } from '@/systems/life/events'
import { checkGoals } from '@/systems/life/goals'
import { passDays, type DayActivity } from '@/systems/life/time'
import type { RunnerState, RunnerStep } from '@/types/life'

export interface ActivityPlan {
  id: string
  label: string
  steps: RunnerStep[]
}

/** 是否正忙：正在做事、看事件、交战或一世已尽时，不能再起新事。 */
export function isBusy() {
  const g = getContext().game
  return Boolean(g.life.runner || g.life.event || g.combat.currentEnemy || g.life.ended)
}

/** 做事时人物的姿态。 */
const POSE_BY_ACTIVITY: Record<string, string> = {
  meditate: 'meditate', breakthrough: 'meditate', study: 'meditate', train: 'train', rest: 'rest', travel: 'travel', explore: 'travel', opportunity: 'travel',
}

/** 做完之后停在一天里的什么时辰（十二时辰序号）。 */
const END_HOUR: Record<string, number> = { meditate: 3, study: 3, rest: 4, train: 6, work: 9, explore: 9, travel: 8, opportunity: 8, visit: 7, rumor: 7 }

/** 开始做一件事。 */
export function beginActivity(plan: ActivityPlan) {
  const g = getContext().game
  if (isBusy()) return false
  g.player.action = POSE_BY_ACTIVITY[plan.id] || 'stand'
  g.life.runner = { activityId: plan.id, label: plan.label, steps: [...plan.steps], daysSpent: 0, gains: {}, items: [], notes: [], aborted: false }
  g.life.lastSummary = null
  bus.emit('life:activity-start', { id: plan.id, label: plan.label })
  continueRunner()
  return true
}

function travelEventChance(locationId: string) {
  return 0.18 + (LOCATION_MAP.get(locationId)?.danger || 1) * 0.05
}

function study(itemId: string, runner: RunnerState) {
  const item = getItem(itemId)
  if (!item) return
  if (item.manualSkillId && learnTechnique(item.manualSkillId, { sourceText: item.name })) runner.notes.push(`学会${item.name}`)
  else if (item.knowledgeId && learnKnowledge(item.knowledgeId, { sourceText: item.name })) runner.notes.push(`读通${item.name}`)
  else runner.notes.push(`${item.name}读了几遍，仍不得要领`)
}

function executeStep(step: RunnerStep, runner: RunnerState) {
  switch (step.kind) {
    case 'pass':
      passDays(step.days, step.activity as DayActivity)
      return
    case 'event':
      startLifeEvent(step.eventId, step.npcId ?? null)
      return
    case 'wildEvent': {
      const id = pickLifeEvent(step.eventKind)
      if (id) startLifeEvent(id)
      return
    }
    case 'move':
      passDays(step.days, 'travel')
      if (getContext().game.life.ended) return
      arriveAt(step.toId)
      if (runner.steps.length && Math.random() < travelEventChance(step.toId)) runner.steps.unshift({ kind: 'wildEvent', eventKind: 'travel' })
      if (!runner.steps.some(s => s.kind === 'move')) bus.emit('travel:arrived', { locationId: step.toId })
      return
    case 'breakthrough':
      startLifeEvent('breakthrough')
      return
    case 'reward':
      applyLifeEffects(step.effects)
      if (step.text) runner.notes.push(step.text)
      return
    case 'study':
      study(step.itemId, runner)
  }
}

/** 往下做：一步步执行，遇到事件或交战就停下，等玩家拿主意。 */
export function continueRunner() {
  const g = getContext().game
  while (g.life.runner && !g.life.event && !g.combat.currentEnemy && !g.life.ended) {
    const runner: RunnerState = g.life.runner
    const step = runner.steps.shift()
    if (!step) {
      finishRunner(runner)
      return
    }
    executeStep(step, runner)
  }
}

function summarize(runner: RunnerState) {
  const p = getContext().game.player
  const lines: string[] = []
  const gains = runner.gains
  if (gains.cultivation) lines.push(`修为 ${gains.cultivation > 0 ? '+' : '−'}${Math.abs(Math.round(gains.cultivation))}`)
  if (gains.money) lines.push(`灵石 ${gains.money > 0 ? '+' : ''}${Math.round(gains.money)}`)
  if (gains.reputation) lines.push(`声望 +${Math.round(gains.reputation)}`)
  for (const entry of runner.items) lines.push(`得 ${getItem(entry.itemId)?.name || entry.itemId}×${entry.quantity}`)
  if (gains.healed) lines.push(p.injury ? `伤势见好（${injuryLabel(p.injury)}）` : '伤势痊愈')
  if (gains.upkeep) lines.push(`口粮落脚 −${Math.round(gains.upkeep)}`)
  if (gains.hungry) lines.push('挨了饿，身子亏了')
  lines.push(...runner.notes)
  if (runner.aborted) lines.push('吃了亏，只得就地养伤')
  return lines
}

function finishRunner(runner: RunnerState) {
  const g = getContext().game
  g.life.runner = null
  if (runner.daysSpent) g.world.hour = END_HOUR[runner.activityId] ?? 6
  if (g.player.action === 'travel') g.player.action = 'stand'
  const lines = summarize(runner)
  g.life.lastSummary = { label: runner.label, days: runner.daysSpent, lines, day: g.world.day }
  if (runner.daysSpent) {
    const tail = lines.slice(0, 3).join('，')
    getContext().appendLog(`${runner.label}（${formatDays(runner.daysSpent)}）${tail ? `：${tail}` : ''}。`, 'info')
  }
  checkGoals()
  bus.emit('life:activity-done', { id: runner.activityId, days: runner.daysSpent })
}
