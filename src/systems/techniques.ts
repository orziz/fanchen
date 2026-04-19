import { getContext } from '@/core/context'
import {
  TECHNIQUE_DISCOVERY_RECIPES,
  getItem,
  getTechnique,
  getTechniqueBookItem,
  getTechniqueResolvedEffectValue,
} from '@/config'
import type { LearnedTechniqueState, TechniqueKind } from '@/types/game'
import { round } from '@/utils'

const HEART_MASTERY_ACTIONS = new Set(['meditate', 'train', 'breakthrough', 'sect'])

function sortTechniqueIds(ids: string[]) {
  return [...ids].sort((leftId, rightId) => {
    const left = getTechnique(leftId)
    const right = getTechnique(rightId)
    if (!left || !right) return leftId.localeCompare(rightId)
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind)
    if (left.tier !== right.tier) return right.tier - left.tier
    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

export function getTechniqueState(skillId: string): LearnedTechniqueState | null {
  const learned = getContext().game.player.learnedTechniques || {}
  return learned[skillId] || null
}

export function hasLearnedTechnique(skillId: string) {
  return Boolean(getTechniqueState(skillId))
}

export function getLearnedTechniqueIds(kind?: TechniqueKind) {
  const player = getContext().game.player
  const ids = Object.keys(player.learnedTechniques || {}).filter((skillId) => {
    const technique = getTechnique(skillId)
    return technique && (!kind || technique.kind === kind)
  })
  return sortTechniqueIds(ids)
}

export function getLearnedTechniques(kind?: TechniqueKind) {
  return getLearnedTechniqueIds(kind)
    .map((skillId) => {
      const technique = getTechnique(skillId)
      const state = getTechniqueState(skillId)
      if (!technique || !state) return null
      return { technique, state }
    })
    .filter(Boolean) as Array<{ technique: NonNullable<ReturnType<typeof getTechnique>>; state: LearnedTechniqueState }>
}

export function getTechniqueStageMultiplier(skillId: string) {
  const technique = getTechnique(skillId)
  const state = getTechniqueState(skillId)
  if (!technique || !state) return 1
  const base = technique.effect.damageMultiplier || 1
  const resolved = getTechniqueResolvedEffectValue(technique, state, 'damageMultiplier') || base
  return round(resolved / base, 4)
}

export function getTechniqueEffectValue(skillId: string, key: string) {
  const technique = getTechnique(skillId)
  const state = getTechniqueState(skillId)
  if (!technique || !state) return 0
  return getTechniqueResolvedEffectValue(technique, state, key)
}

export function getTechniqueMasteryPercent(skillId: string) {
  const technique = getTechnique(skillId)
  const state = getTechniqueState(skillId)
  if (!technique || !state || !technique.masteryNeed) return 0
  return Math.max(0, Math.min(100, Math.round((state.mastery / technique.masteryNeed) * 100)))
}

export function isTechniqueMastered(skillId: string) {
  const technique = getTechnique(skillId)
  const state = getTechniqueState(skillId)
  if (!technique || !state) return false
  return state.mastery >= technique.masteryNeed
}

export function getTechniqueLearnIssues(skillId: string) {
  const ctx = getContext()
  const player = ctx.game.player
  const technique = getTechnique(skillId)
  const issues: string[] = []
  if (!technique) {
    issues.push('这门功法当前不存在。')
    return issues
  }
  if (hasLearnedTechnique(skillId)) issues.push('这门功法你已经学会了。')
  if (player.rankIndex < technique.minRankIndex) {
    issues.push(`境界不足，需要至少${ctx.getRankData(technique.minRankIndex).name}。`)
  }
  if (player.insight < technique.minInsight) {
    issues.push(`悟性不足，还差${Math.ceil(technique.minInsight - player.insight)}。`)
  }
  return issues
}

export function ensureLearnedTechnique(skillId: string, learnedDay = getContext().game.world.day) {
  const ctx = getContext()
  ctx.game.player.learnedTechniques = ctx.game.player.learnedTechniques || {}
  const existing = ctx.game.player.learnedTechniques[skillId]
  if (existing) return existing
  const created: LearnedTechniqueState = {
    skillId,
    stage: 1,
    mastery: 0,
    learnedDay,
  }
  ctx.game.player.learnedTechniques[skillId] = created
  return created
}

export function learnTechnique(skillId: string, options: { skipRequirement?: boolean; sourceText?: string } = {}) {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  if (!technique) return false
  const issues = options.skipRequirement ? [] : getTechniqueLearnIssues(skillId)
  if (issues.length) {
    ctx.appendLog(issues[0], 'warn')
    return false
  }
  if (hasLearnedTechnique(skillId)) return false
  ensureLearnedTechnique(skillId)
  if (technique.kind === 'heart' && !ctx.game.player.equipment.heart) {
    ctx.game.player.equipment.heart = skillId
    ctx.appendLog(`你参透了${technique.name}，并将其定为当前心法。`, 'loot')
  } else {
    ctx.appendLog(`你学会了${technique.name}${options.sourceText ? `，来源：${options.sourceText}` : ''}。`, 'loot')
  }
  ctx.updateDerivedStats()
  return true
}

export function equipHeartTechnique(skillId: string) {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  if (!technique || technique.kind !== 'heart' || !hasLearnedTechnique(skillId)) return false
  ctx.game.player.equipment.heart = skillId
  ctx.updateDerivedStats()
  ctx.appendLog(`你将当前心法切换为${technique.name}。`, 'info')
  return true
}

function maybeUnlockTechniqueDiscoveries() {
  const ctx = getContext()
  TECHNIQUE_DISCOVERY_RECIPES.forEach((recipe) => {
    if (hasLearnedTechnique(recipe.resultSkillId)) return
    const ready = recipe.sourceSkillIds.every((skillId) => {
      if (!recipe.requiredMastered) return hasLearnedTechnique(skillId)
      return isTechniqueMastered(skillId)
    })
    if (!ready) return
    if (learnTechnique(recipe.resultSkillId, { skipRequirement: true, sourceText: '悟道领悟' })) {
      const result = getTechnique(recipe.resultSkillId)
      if (result) ctx.appendLog(`你由${recipe.desc}，悟出了${result.name}。`, 'loot')
    }
  })
}

export function gainTechniqueMastery(skillId: string, amount: number, sourceText = '修炼') {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  if (!technique || amount <= 0 || !hasLearnedTechnique(skillId)) return false
  const state = ensureLearnedTechnique(skillId)
  if (state.mastery >= technique.masteryNeed) return false
  state.mastery = Math.min(technique.masteryNeed, state.mastery + amount)
  if (state.mastery < technique.masteryNeed) return true
  state.mastery = technique.masteryNeed
  ctx.appendLog(`${technique.name}在${sourceText}中修至圆满，解锁圆满加成，并可无限誊写。`, 'loot')
  maybeUnlockTechniqueDiscoveries()
  ctx.updateDerivedStats()
  return true
}

export function gainHeartMasteryFromAction(actionKey: string) {
  const ctx = getContext()
  const heartId = ctx.game.player.equipment.heart
  if (!heartId || !HEART_MASTERY_ACTIONS.has(actionKey)) return false
  const amount = actionKey === 'meditate' ? 3.2 : actionKey === 'train' ? 2.2 : actionKey === 'breakthrough' ? 2.8 : 1.8
  return gainTechniqueMastery(heartId, amount, actionKey === 'sect' ? '门内值役' : '修炼')
}

export function getCastableSpells(maxQi = getContext().game.player.qi) {
  return getLearnedTechniques('spell').filter(({ technique }) => (technique.effect.qiCost || 0) <= maxQi)
}

export function getPreferredSpellId(maxQi = getContext().game.player.qi) {
  const castable = getCastableSpells(maxQi)
  const best = castable.sort((left, right) => {
    const leftScore = getTechniqueEffectValue(left.technique.id, 'damageMultiplier')
      + getTechniqueEffectValue(left.technique.id, 'burn') * 0.09
      + getTechniqueEffectValue(left.technique.id, 'chill') * 0.06
      + getTechniqueEffectValue(left.technique.id, 'expose') * 0.08
    const rightScore = getTechniqueEffectValue(right.technique.id, 'damageMultiplier')
      + getTechniqueEffectValue(right.technique.id, 'burn') * 0.09
      + getTechniqueEffectValue(right.technique.id, 'chill') * 0.06
      + getTechniqueEffectValue(right.technique.id, 'expose') * 0.08
    return rightScore - leftScore
  })[0]
  return best?.technique.id || null
}

export function hasUnlockedScribeTechnique(skillId: string) {
  return isTechniqueMastered(skillId)
}

export function getScribeTechniqueIssues(skillId: string) {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  const item = getTechniqueBookItem(skillId)
  if (!technique || !item) return ['这门功法当前无法誊写。']
  if (!hasUnlockedScribeTechnique(skillId)) return ['需先将功法练至圆满后，才能无限誊写。']
  const issues: string[] = []
  technique.scribeCost.forEach((cost) => {
    const current = ctx.findInventoryEntry(cost.itemId)?.quantity || 0
    if (current < cost.quantity) {
      issues.push(`缺少${getItem(cost.itemId)?.name || cost.itemId} ${cost.quantity - current}份`)
    }
  })
  if (ctx.game.player.qi < technique.scribeQiCost) {
    issues.push(`真气不足，还差${technique.scribeQiCost - ctx.game.player.qi}`)
  }
  return issues
}

export function getScribeTechniqueCostText(skillId: string) {
  const technique = getTechnique(skillId)
  if (!technique) return ''
  const itemCosts = technique.scribeCost.map((cost) => `${getItem(cost.itemId)?.name || cost.itemId} x${cost.quantity}`)
  itemCosts.push(`真气 ${technique.scribeQiCost}`)
  return itemCosts.join('，')
}

export function canScribeTechnique(skillId: string) {
  return hasUnlockedScribeTechnique(skillId) && getScribeTechniqueIssues(skillId).length === 0
}

export function scribeTechnique(skillId: string) {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  const item = getTechniqueBookItem(skillId)
  const issues = getScribeTechniqueIssues(skillId)
  if (!technique || !item || issues.length) {
    ctx.appendLog(issues[0] || '眼下还写不出这门功法的秘籍。', 'warn')
    return false
  }
  technique.scribeCost.forEach((cost) => {
    ctx.removeItemFromInventory(cost.itemId, cost.quantity)
  })
  ctx.adjustResource('qi', -technique.scribeQiCost, 'maxQi')
  ctx.addItemToInventory(item.id, 1)
  ctx.appendLog(`你将${technique.name}誊写成了一册${item.name}。`, 'info')
  return true
}

export function getTechniqueCurrentEffect(skillId: string) {
  const technique = getTechnique(skillId)
  const state = getTechniqueState(skillId)
  if (!technique || !state) return {}
  const keys = new Set([...Object.keys(technique.effect), ...Object.keys(technique.stageBonus)])
  return Object.fromEntries([...keys]
    .map((key) => [key, getTechniqueResolvedEffectValue(technique, state, key)])
    .filter(([, value]) => Boolean(value)))
}

export function getTechniqueStageBonusEffect(skillId: string) {
  return getTechnique(skillId)?.stageBonus || {}
}
