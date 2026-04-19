import { getContext } from '@/core/context'
import { getKnowledge } from '@/config'
import { round } from '@/utils'

function sortKnowledgeIds(ids: string[]) {
  return [...ids].sort((leftId, rightId) => {
    const left = getKnowledge(leftId)
    const right = getKnowledge(rightId)
    if (!left || !right) return leftId.localeCompare(rightId)
    if (left.tier !== right.tier) return right.tier - left.tier
    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

export function hasLearnedKnowledge(knowledgeId: string) {
  return Boolean(getContext().game.player.learnedKnowledges?.[knowledgeId])
}

export function getKnowledgeLearnIssues(knowledgeId: string) {
  const ctx = getContext()
  const player = ctx.game.player
  const knowledge = getKnowledge(knowledgeId)
  const issues: string[] = []
  if (!knowledge) {
    issues.push('这册学识当前不存在。')
    return issues
  }
  if (hasLearnedKnowledge(knowledgeId)) issues.push('这册学识你已经研读过了。')
  if (player.rankIndex < knowledge.minRankIndex) {
    issues.push(`境界不足，需要至少${ctx.getRankData(knowledge.minRankIndex).name}。`)
  }
  if (player.insight < knowledge.minInsight) {
    issues.push(`悟性不足，还差${Math.ceil(knowledge.minInsight - player.insight)}。`)
  }
  return issues
}

function applyKnowledgeEffect(effect: Record<string, number>) {
  const player = getContext().game.player
  if (effect.insight) player.insight = round(player.insight + effect.insight, 4)
  if (effect.power) player.power = round(player.power + effect.power, 4)
  if (effect.charisma) player.charisma = round(player.charisma + effect.charisma, 4)
  if (effect.reputation) player.reputation = round(player.reputation + effect.reputation, 4)
  if (effect.farming) player.skills.farming = round(player.skills.farming + effect.farming, 4)
  if (effect.crafting) player.skills.crafting = round(player.skills.crafting + effect.crafting, 4)
  if (effect.trading) player.skills.trading = round(player.skills.trading + effect.trading, 4)
}

export function learnKnowledge(knowledgeId: string, options: { skipRequirement?: boolean; sourceText?: string } = {}) {
  const ctx = getContext()
  const knowledge = getKnowledge(knowledgeId)
  if (!knowledge) return false
  const issues = options.skipRequirement ? [] : getKnowledgeLearnIssues(knowledgeId)
  if (issues.length) {
    ctx.appendLog(issues[0], 'warn')
    return false
  }
  if (hasLearnedKnowledge(knowledgeId)) return false
  applyKnowledgeEffect(knowledge.effect)
  ctx.game.player.learnedKnowledges[knowledgeId] = ctx.game.world.day
  ctx.updateDerivedStats()
  ctx.appendLog(`你研读了${knowledge.name}${options.sourceText ? `，来源：${options.sourceText}` : ''}。`, 'loot')
  return true
}

export function getLearnedKnowledgeIds() {
  return sortKnowledgeIds(Object.keys(getContext().game.player.learnedKnowledges || {}).filter((knowledgeId) => Boolean(getKnowledge(knowledgeId))))
}

export function getLearnedKnowledges() {
  const player = getContext().game.player
  return getLearnedKnowledgeIds().map((knowledgeId) => ({
    knowledge: getKnowledge(knowledgeId)!,
    learnedDay: player.learnedKnowledges[knowledgeId] || 0,
  }))
}