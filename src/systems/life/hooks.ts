import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { addPlayerMetric } from '@/core/integerProgress'
import { LOCATIONS, RANKS, type LocationData } from '@/config'
import { consumeItem } from '@/systems/player'
import { getTravelPreview } from '@/systems/world'
import { currentGoal } from '@/systems/life/goals'
import { opportunitiesAt, spawnOpportunity } from '@/systems/life/opportunities'
import { becomeMasterBond } from '@/systems/social/relationship'
import { joinFaction } from '@/systems/social/faction'
import { ageOf, lifespanOf } from '@/systems/life/cultivation'
import { adjustInjury } from '@/systems/life/effects'
import { recordDeed } from '@/systems/life/legacy'
import { passDays } from '@/systems/life/time'

interface HookContext {
  npcId: string | null
  success: boolean | null
}

/** 破境成功：进一境、修为清零、寿元见长、气血回满。 */
function rankUp() {
  const ctx = getContext()
  const p = ctx.game.player
  const before = lifespanOf(p)
  p.rankIndex = Math.min(RANKS.length - 1, p.rankIndex + 1)
  p.cultivation = 0
  p.title = `${RANKS[p.rankIndex].name}境修士`
  addPlayerMetric('reputation', 2 + p.rankIndex * 2)
  ctx.updateDerivedStats()
  ctx.adjustResource('hp', p.maxHp, 'maxHp')
  ctx.adjustResource('qi', p.maxQi, 'maxQi')
  recordDeed(`${ageOf(p)}岁踏入${RANKS[p.rankIndex].name}境`)
  ctx.game.life.runner?.notes.push(`踏入${RANKS[p.rankIndex].name}境`)
  ctx.appendLog(`灵机贯体，你踏入了${RANKS[p.rankIndex].name}境。`, 'loot')
  bus.emit('player:breakthrough', { success: true, rankIndex: p.rankIndex })
  return [`踏入${RANKS[p.rankIndex].name}境`, `寿元 ${before} → ${lifespanOf(p)}`, `声望 +${2 + p.rankIndex * 2}`]
}

/** 冲关失败：带伤、修为折三成、再养十日。 */
function breakthroughFail() {
  const ctx = getContext()
  const p = ctx.game.player
  const lost = Math.round(p.cultivation * 0.3)
  p.cultivation -= lost
  const runner = ctx.game.life.runner
  if (runner) {
    runner.gains.cultivation = (runner.gains.cultivation || 0) - lost
    runner.notes.push('冲关受挫，带伤')
  }
  adjustInjury(1)
  passDays(10, 'idle')
  ctx.appendLog('冲关受挫，经脉震荡，需要重新稳固根基。', 'warn')
  bus.emit('player:breakthrough', { success: false, rankIndex: p.rankIndex })
  return [`修为 −${lost}`, '带伤一级', '养伤十日']
}

function becomeMaster(hook: HookContext) {
  if (!hook.npcId) return []
  becomeMasterBond(hook.npcId)
  const npc = getContext().getNpc(hook.npcId)
  if (npc) recordDeed(`拜${npc.name}为师`)
  return npc ? [`拜入${npc.name}门下`] : []
}

/** 通过行院入门试炼：成为玉阙行院的外院弟子。 */
function joinJadegate() {
  const ctx = getContext()
  const g = ctx.game
  g.story.flags['jadegate.trial.passed'] = true
  if (g.player.affiliationId !== 'jadegate-courtyard') joinFaction('jadegate-courtyard', { force: true })
  recordDeed(`${ageOf(g.player)}岁拜入玉阙行院`)
  return ['拜入玉阙行院']
}

/** 开局的木枪直接拿在手上。 */
function equipStarter() {
  const ctx = getContext()
  if (ctx.game.player.equipment.weapon || !ctx.findInventoryEntry('wood-spear')) return []
  consumeItem('wood-spear')
  return ['拿上了木柄短枪']
}

/** 离此地最近、又走得通的一处合意地方。 */
function nearest(match: (location: LocationData) => boolean) {
  let best: { location: LocationData; days: number } | null = null
  for (const location of LOCATIONS) {
    if (!match(location)) continue
    const preview = getTravelPreview(location.id)
    if (!preview.route) continue
    if (!best || preview.days < best.days) best = { location, days: preview.days }
  }
  return best
}

const TOWN_TAGS = ['town', 'city', 'market', 'port']

/** 说书先生按你眼下的志向指一条路；求心法时顺带在近处摆出旧书摊。 */
function goalTip() {
  const here = getContext().game.player.locationId
  const goal = currentGoal()?.id
  if (goal === 'foothold') return ['“镇上几家铺子都缺短工，镇外河滩的雾心草也能换钱。”']
  if (goal === 'strength') return ['“练力靠的是一天天打熬筋骨。药铺的养元散能托一把冲关。”']
  if (goal === 'heart') {
    const stall = nearest(loc => opportunitiesAt(loc.id).some(card => card.templateId === 'old-bookstall'))
      || nearest(loc => loc.id !== here && loc.tags.some(tag => TOWN_TAGS.includes(tag)))
    if (!stall) return []
    spawnOpportunity('old-bookstall', stall.location.id)
    return [`“${stall.location.name}的街角有个旧书摊，摊主手里有本《养气入门诀》。走过去约莫${stall.days}日。”`]
  }
  if (goal === 'sense') {
    const spot = nearest(loc => loc.aura >= 34 && (loc.actions.includes('meditate') || loc.aura >= 30) && loc.danger <= 3)
    return spot ? [`“要感气，得去灵气足的地方。${spot.location.name}灵气有${spot.location.aura}，离这儿约莫${spot.days}日。”`] : []
  }
  if (goal === 'referral') return ['“玉阙行院的执事常在行院与云梯岭、丹井坪一带找人跑腿。替行院办上几回事，自然有人肯替你作保。”']
  if (goal === 'trial') return ['“行院每旬都收试炼的人，到了玉阙就能报名。根骨、心性、身手，三关缺一不可。”']
  const shrine = nearest(loc => loc.actions.includes('breakthrough'))
  return shrine ? [`“往上的关隘要在有冲关门路的灵地冲，${shrine.location.name}就是一处。”`] : []
}

const HOOKS: Record<string, (hook: HookContext) => string[]> = {
  rankUp,
  breakthroughFail,
  becomeMaster,
  joinJadegate,
  equipStarter,
  goalTip,
}

export function runOutcomeHook(id: string, hook: HookContext) {
  return HOOKS[id]?.(hook) || []
}
