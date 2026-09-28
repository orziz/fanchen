import { getContext } from '@/core/context'
import { LOCATION_MAP, getItem } from '@/config'
import { randomFloat } from '@/utils'
import { getTechniqueLearnIssues, hasLearnedTechnique } from '@/systems/techniques'
import { getKnowledgeLearnIssues, hasLearnedKnowledge } from '@/systems/knowledge'
import { getTravelPreview } from '@/systems/world'
import { hasNpcVisitStory, tryStartNpcVisitStory } from '@/systems/story'
import { breakthroughIssue, meditateGain, nextRealmNeed, trainGain } from '@/systems/life/cultivation'
import { beginActivity, isBusy, type ActivityPlan } from '@/systems/life/runner'
import { segmentDays } from '@/systems/world'
import type { LocationData } from '@/config'
import type { RunnerStep } from '@/types/life'

export interface ActivityOption {
  days: number
  preview: string
}

export interface ActivityView {
  id: string
  label: string
  icon: string
  options: ActivityOption[]
  issue: string | null
  hint: string
}

const TOWN_TAGS = ['town', 'city', 'port', 'market', 'village', 'pass', 'sect']

function isSettled(location: LocationData) {
  return location.tags.some(tag => TOWN_TAGS.includes(tag)) || location.actions.includes('trade')
}

function canMeditate(location: LocationData) {
  return location.actions.includes('meditate') || location.aura >= 30
}

function exploreDays(location: LocationData) {
  return location.danger >= 2 ? 3 : 2
}

function workPay(location: LocationData) {
  const charisma = getContext().getPlayerCharisma()
  return 5 + (location.marketTier || 0) * 2 + Math.floor(charisma / 3)
}

const approx = (n: number) => Math.max(1, Math.round(n))

/** 此地眼下能做的事，各带时长选项与大致所得。 */
export function listActivities(): ActivityView[] {
  const ctx = getContext()
  const p = ctx.game.player
  const location = ctx.getCurrentLocation()
  const list: ActivityView[] = []
  const need = nextRealmNeed(p.rankIndex)

  if (need && p.cultivation >= need) {
    list.push({
      id: 'breakthrough', label: '冲关', icon: 'breakthrough',
      options: [{ days: 2, preview: '修为满了，就在此地冲关' }],
      issue: breakthroughIssue(p, location), hint: '冲关前会写明几成把握',
    })
  }
  list.push({
    id: 'train', label: '练体', icon: 'train',
    options: [3, 10, 30].map(days => ({ days, preview: `修为约 +${approx(trainGain(p, location) * days)}，体魄渐长` })),
    issue: null, hint: p.rankIndex === 0 ? '凡胎入练力，全凭打熬筋骨' : '入境后练体只算打底',
  })
  if (canMeditate(location)) {
    list.push({
      id: 'meditate', label: p.rankIndex === 0 ? '静坐' : '打坐', icon: 'meditate',
      options: [3, 10, 30].map(days => ({ days, preview: `修为约 +${approx(meditateGain(p, location) * days)}` })),
      issue: null, hint: `此地灵气 ${location.aura}`,
    })
  }
  if (isSettled(location)) {
    const pay = workPay(location)
    list.push({
      id: 'work', label: '打零工', icon: 'trade',
      options: [{ days: 2, preview: `灵石约 +${pay}` }],
      issue: null, hint: '稳而少，偶尔碰上些事',
    })
  }
  list.push({
    id: 'explore', label: isSettled(location) ? '镇外转转' : '四处探探', icon: 'hunt',
    options: [{ days: exploreDays(location), preview: `采药、遇兽、奇遇，险${location.danger}` }],
    issue: null, hint: '会遇上什么，走一趟才知道',
  })
  if (location.tags.some(tag => ['town', 'city', 'port', 'market'].includes(tag))) {
    list.push({
      id: 'rumor', label: '茶馆打听', icon: 'bell',
      options: [{ days: 1, preview: '听听附近各处的消息' }],
      issue: null, hint: '花一日，知道别处在发生什么',
    })
  }
  for (const entry of p.inventory) {
    const item = getItem(entry.itemId)
    if (item?.type !== 'manual') continue
    const technique = item.manualSkillId && !hasLearnedTechnique(item.manualSkillId)
    const knowledge = !item.manualSkillId && item.knowledgeId && !hasLearnedKnowledge(item.knowledgeId)
    if (!technique && !knowledge) continue
    const issue = technique ? getTechniqueLearnIssues(item.manualSkillId!)[0] : getKnowledgeLearnIssues(item.knowledgeId!)[0]
    list.push({
      id: `study:${item.id}`, label: '研读', icon: 'scroll',
      options: [{ days: 10, preview: `读通《${item.name}》便能学会` }],
      issue: issue || null, hint: item.desc,
    })
  }
  list.push({
    id: 'rest', label: '歇息', icon: 'rest',
    options: [5, 10].map(days => ({ days, preview: p.injury ? `伤势好 ${Math.min(p.injury, Math.floor(days / 5))} 级` : '气血回满' })),
    issue: null, hint: '歇满五日，伤好一级',
  })
  return list
}

function planFor(id: string, days: number, location: LocationData): ActivityPlan | null {
  if (id === 'train') return { id, label: `练体${days}日`, steps: [{ kind: 'pass', days, activity: 'train' }] }
  if (id === 'meditate') {
    const steps: RunnerStep[] = days >= 10 && Math.random() < 0.35
      ? [{ kind: 'pass', days: Math.floor(days / 2), activity: 'meditate' }, { kind: 'wildEvent', eventKind: 'meditate' }, { kind: 'pass', days: days - Math.floor(days / 2), activity: 'meditate' }]
      : [{ kind: 'pass', days, activity: 'meditate' }]
    return { id, label: `静坐${days}日`, steps }
  }
  if (id === 'work') {
    const pay = Math.round(workPay(location) * randomFloat(0.85, 1.15))
    const steps: RunnerStep[] = [{ kind: 'pass', days: 2, activity: 'work' }, { kind: 'reward', effects: { money: pay } }]
    if (Math.random() < 0.2) steps.push({ kind: 'wildEvent', eventKind: 'work' })
    return { id, label: '打零工', steps }
  }
  if (id === 'explore') {
    const total = exploreDays(location)
    const steps: RunnerStep[] = [{ kind: 'pass', days: 1, activity: 'explore' }, { kind: 'wildEvent', eventKind: 'wild' }]
    if (location.danger >= 2 && Math.random() < 0.4) steps.push({ kind: 'wildEvent', eventKind: 'wild' })
    steps.push({ kind: 'pass', days: total - 1, activity: 'explore' })
    return { id, label: isSettled(location) ? '镇外转了一趟' : '四处探了一趟', steps }
  }
  if (id === 'rumor') {
    const steps: RunnerStep[] = [{ kind: 'pass', days: 1, activity: 'idle' }, { kind: 'event', eventId: 'teahouse' }]
    return { id, label: '茶馆打听', steps }
  }
  if (id === 'rest') return { id, label: `歇息${days}日`, steps: [{ kind: 'pass', days, activity: 'rest' }] }
  if (id === 'breakthrough') return { id, label: '冲关', steps: [{ kind: 'pass', days: 2, activity: 'meditate' }, { kind: 'breakthrough' }] }
  if (id.startsWith('study:')) {
    const itemId = id.slice('study:'.length)
    return { id: 'study', label: `研读${getItem(itemId)?.name || ''}`, steps: [{ kind: 'pass', days, activity: 'study' }, { kind: 'study', itemId }] }
  }
  return null
}

/** 在此地做一件事；days 取所选时长。 */
export function startLocalActivity(id: string, days?: number) {
  if (isBusy()) return false
  const view = listActivities().find(entry => entry.id === id)
  if (!view || view.issue) return false
  const option = view.options.find(entry => entry.days === days) || view.options[0]
  const plan = planFor(id, option.days, getContext().getCurrentLocation())
  return plan ? beginActivity(plan) : false
}

/** 赶路去某地：一段段走，每到一站都可能遇事。 */
export function startTravel(targetId: string) {
  if (isBusy()) return false
  const ctx = getContext()
  const preview = getTravelPreview(targetId)
  if (!preview.route || preview.route.length < 2) {
    if (preview.blockedReason) ctx.appendLog(preview.blockedReason, 'warn')
    return false
  }
  const steps: RunnerStep[] = []
  for (let i = 0; i < preview.route.length - 1; i += 1) {
    steps.push({ kind: 'move', toId: preview.route[i + 1], days: segmentDays(preview.route[i], preview.route[i + 1]) })
  }
  return beginActivity({ id: 'travel', label: `赶往${LOCATION_MAP.get(targetId)?.name || '远方'}`, steps })
}

/** 拜访此地的熟人；若对方正有心事，先说那件事。 */
export function visitPerson(npcId: string) {
  if (isBusy()) return false
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)
  if (!npc || npc.locationId !== ctx.game.player.locationId) return false
  if (hasNpcVisitStory(npcId) && tryStartNpcVisitStory(npcId)) return true
  return beginActivity({ id: 'visit', label: `拜访${npc.name}`, steps: [{ kind: 'pass', days: 1, activity: 'idle' }, { kind: 'event', eventId: 'visit', npcId }] })
}

/** 接下此地的一桩机缘。 */
export function takeOpportunity(cardId: string) {
  if (isBusy()) return false
  const g = getContext().game
  const list = g.life.opportunities[g.player.locationId] || []
  const card = list.find(entry => entry.id === cardId)
  if (!card || card.expiresDay < g.world.day) return false
  g.life.opportunities[g.player.locationId] = list.filter(entry => entry.id !== cardId)
  const steps: RunnerStep[] = []
  if (card.days > 0) steps.push({ kind: 'pass', days: card.days, activity: 'explore' })
  steps.push({ kind: 'event', eventId: card.eventId, npcId: card.npcId })
  return beginActivity({ id: 'opportunity', label: card.title, steps })
}
