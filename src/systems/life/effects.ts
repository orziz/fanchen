import { getContext } from '@/core/context'
import { addPlayerMetric } from '@/core/integerProgress'
import { FACTION_MAP, getItem } from '@/config'
import { MAX_INJURY } from '@/config/life'
import type { LifeEffects } from '@/types/life'

const INJURY_WORDS = ['安好', '轻伤', '伤得不轻', '重伤']

export function injuryLabel(level: number) {
  return INJURY_WORDS[Math.max(0, Math.min(MAX_INJURY, level))]
}

/** 调伤势，返回实际变化的级数。 */
export function adjustInjury(delta: number) {
  const p = getContext().game.player
  const before = p.injury
  p.injury = Math.max(0, Math.min(MAX_INJURY, before + delta))
  if (p.injury !== before) getContext().updateDerivedStats()
  return p.injury - before
}

/** 记进正在做的这件事的小结。 */
function tally(key: string, amount: number) {
  const runner = getContext().game.life.runner
  if (!runner || !amount) return
  runner.gains[key] = (runner.gains[key] || 0) + amount
}

function tallyItem(itemId: string, quantity: number) {
  const runner = getContext().game.life.runner
  if (!runner) return
  const entry = runner.items.find(e => e.itemId === itemId)
  if (entry) entry.quantity += quantity
  else runner.items.push({ itemId, quantity })
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)

/**
 * 落实一次得失，返回给玩家看的得失短句。
 * 金钱、修为等会同时记入当前这件事的小结。
 */
export function applyLifeEffects(effects: LifeEffects | undefined, context: { npcId?: string | null; factionId?: string | null } = {}) {
  if (!effects) return []
  const ctx = getContext()
  const p = ctx.game.player
  const lines: string[] = []
  if (effects.money) {
    const delta = effects.money < 0 ? -Math.min(p.money, -effects.money) : effects.money
    p.money += delta
    tally('money', delta)
    if (delta) lines.push(`灵石 ${sign(delta)}`)
  }
  if (effects.cultivation) {
    addPlayerMetric('cultivation', effects.cultivation)
    tally('cultivation', effects.cultivation)
    lines.push(`修为 ${sign(Math.round(effects.cultivation))}`)
  }
  for (const [key, label] of [['power', '体魄'], ['insight', '悟性'], ['charisma', '魅力']] as const) {
    const value = effects[key]
    if (!value) continue
    addPlayerMetric(key, value)
    lines.push(`${label} ${sign(value)}`)
  }
  if (effects.reputation) {
    addPlayerMetric('reputation', effects.reputation)
    tally('reputation', effects.reputation)
    lines.push(`声望 ${sign(effects.reputation)}`)
  }
  if (effects.hp) {
    ctx.adjustResource('hp', effects.hp, 'maxHp')
    lines.push(effects.hp > 0 ? '气血回复' : `气血 ${sign(effects.hp)}`)
  }
  if (effects.injury) {
    const changed = adjustInjury(effects.injury)
    if (changed > 0) lines.push(`带伤（${injuryLabel(p.injury)}）`)
    if (changed < 0) lines.push(p.injury ? `伤势见好（${injuryLabel(p.injury)}）` : '伤势痊愈')
  }
  for (const entry of effects.items || []) {
    ctx.addItemToInventory(entry.itemId, entry.quantity)
    tallyItem(entry.itemId, entry.quantity)
    lines.push(`得 ${getItem(entry.itemId)?.name || entry.itemId}×${entry.quantity}`)
  }
  for (const entry of effects.removeItems || []) {
    if (ctx.removeItemFromInventory(entry.itemId, entry.quantity)) lines.push(`失 ${getItem(entry.itemId)?.name || entry.itemId}×${entry.quantity}`)
  }
  if (effects.standing && context.factionId) {
    ctx.adjustFactionStanding(context.factionId, effects.standing)
    lines.push(`${FACTION_MAP.get(context.factionId)?.name || '当地'}好感 ${sign(effects.standing)}`)
  }
  if (effects.affinity && context.npcId) {
    const npc = ctx.getNpc(context.npcId)
    ctx.adjustRelation(context.npcId, { affinity: effects.affinity })
    if (npc) lines.push(`${npc.name}好感 ${sign(effects.affinity)}`)
  }
  if (effects.flag) ctx.game.story.flags[effects.flag] = true
  ctx.updateDerivedStats()
  return lines
}
