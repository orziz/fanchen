import { PLAYER_SECT_ENABLED, RANKS, getItem, getTechnique, getTechniqueResolvedEffectValue } from '@/config'
import { INJURY_HP_PENALTY } from '@/config/life'
import { clamp, round } from '@/utils'
import type { PlayerState } from '@/types/game'

/**
 * 由境界、装备、心法、师承与伤势推出人物的上限与加成。
 * 纯函数式地改写传入的 player，不碰 store 以外的状态。
 */
export function applyDerivedStats(p: PlayerState) {
  const rank = RANKS[Math.min(p.rankIndex, RANKS.length - 1)]
  let maxQi = rank.qiMax
  let maxHp = rank.hpMax
  let maxStamina = rank.staminaMax
  let cultivationBonus = 0
  let breakthroughRate = 0.5
  let powerBonus = 0
  let insightBonus = 0
  let charismaBonus = 0
  ;(['weapon', 'armor'] as const).forEach((slot) => {
    const itemId = p.equipment[slot]
    const item = itemId ? getItem(itemId) : null
    if (!item) return
    maxHp += item.effect.hp || 0
    maxQi += item.effect.qi || 0
    maxStamina += item.effect.stamina || 0
    cultivationBonus += item.effect.cultivation || 0
    breakthroughRate += item.effect.breakthroughRate || 0
    powerBonus += item.effect.power || 0
    insightBonus += item.effect.insight || 0
    charismaBonus += item.effect.charisma || 0
  })
  const heartId = p.equipment.heart
  const heart = heartId ? getTechnique(heartId) : null
  const heartState = heartId ? p.learnedTechniques[heartId] : null
  if (heart && heartState) {
    const effect = (key: string) => getTechniqueResolvedEffectValue(heart, heartState, key)
    maxHp += effect('hp')
    maxQi += effect('qi')
    maxStamina += effect('stamina')
    cultivationBonus += effect('cultivation')
    breakthroughRate += effect('breakthroughRate')
    powerBonus += effect('power')
    insightBonus += effect('insight')
    charismaBonus += effect('charisma')
  }
  if (p.masterId) { cultivationBonus += 0.02; breakthroughRate += 0.015 }
  if (p.partnerId) { charismaBonus += 1; cultivationBonus += 0.01 }
  if (PLAYER_SECT_ENABLED && p.sect) {
    cultivationBonus += p.sect.buildings.library * 0.01
    powerBonus += p.sect.buildings.dojo * 0.28
    charismaBonus += Math.max(0, p.sect.level - 1)
  }
  // 带伤时气血上限打折。
  maxHp *= 1 - (p.injury || 0) * INJURY_HP_PENALTY
  p.maxQi = round(maxQi)
  p.maxHp = round(maxHp)
  p.maxStamina = round(maxStamina)
  p.bonusPower = round(powerBonus)
  p.bonusInsight = round(insightBonus)
  p.bonusCharisma = round(charismaBonus)
  p.cultivationBonus = cultivationBonus
  p.breakthroughRate = breakthroughRate
  p.qi = clamp(p.qi, 0, p.maxQi)
  p.hp = clamp(p.hp, 0, p.maxHp)
  p.stamina = clamp(p.stamina, 0, p.maxStamina)
}
