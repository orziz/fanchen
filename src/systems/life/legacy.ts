import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { RANKS } from '@/config'
import { ageOf } from '@/systems/life/cultivation'
import type { LifeState } from '@/types/life'

/** 记一笔这一世的事迹（寿尽时结算）。 */
export function recordDeed(text: string) {
  const deeds = getContext().game.life.deeds
  if (!deeds.includes(text)) deeds.push(text)
}

/** 一世走到尽头：停下手头的事，写下结算。 */
export function endLife(cause: string) {
  const ctx = getContext()
  const g = ctx.game
  if (g.life.ended) return
  const p = g.player
  g.life.runner = null
  g.life.event = null
  g.combat.currentEnemy = null
  g.life.ended = {
    name: p.name,
    age: ageOf(p),
    rankIndex: p.rankIndex,
    reputation: p.reputation,
    deeds: [...g.life.deeds],
    cause,
    day: g.world.day,
  }
  ctx.appendLog(`${p.name}${cause}，享年${ageOf(p)}岁。`, 'warn')
  bus.emit('life:ended', { rankIndex: p.rankIndex })
}

/** 下一世的传承：按上一世最高境界给一点悟性与体魄，另带一件随身旧物。 */
export function legacyFor(summary: NonNullable<LifeState['ended']>): LifeState['legacy'] {
  const rank = Math.min(summary.rankIndex, RANKS.length - 1)
  return {
    insight: Math.min(4, rank),
    power: Math.min(3, Math.floor(rank / 2)),
    items: rank >= 2 ? [{ itemId: 'herb-paste', quantity: 2 }] : [],
  }
}
