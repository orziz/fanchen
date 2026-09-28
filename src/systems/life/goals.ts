import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { hasHeartMethod } from '@/systems/life/cultivation'
import type { GameState } from '@/types/game'

export interface GoalDef {
  id: string
  title: string
  /** 该怎么做、去哪里做 */
  detail: string
  done: (g: GameState) => boolean
}

/** 前期志向：拜入玉阙行院；之后转为长线修行。 */
export const GOALS: GoalDef[] = [
  {
    id: 'foothold', title: '攒下第一笔盘缠',
    detail: '在镇上打零工，或到镇外转转采些草药卖钱，手头先攒到四十灵石。',
    done: g => g.player.money >= 40 || g.player.rankIndex >= 1,
  },
  {
    id: 'strength', title: '练出一身力气',
    detail: '练体攒修为，修为满了就冲关；入练力不挑地方，有丹药托着更稳。',
    done: g => g.player.rankIndex >= 1,
  },
  {
    id: 'heart', title: '求一门心法',
    detail: '没有心法引气，感气这一关冲不开。书肆、旧书摊与茶馆里的消息，都可留心《养气入门诀》。',
    done: g => hasHeartMethod(g.player),
  },
  {
    id: 'sense', title: '感气入门',
    detail: '去灵气三十四以上的地方静坐（霜桥镇、迷雾林、寒溪坞一带），修为满了就地冲关。',
    done: g => g.player.rankIndex >= 2,
  },
  {
    id: 'referral', title: '求一份引荐',
    detail: '玉阙行院收外院弟子要有人作保：替行院办事攒下好感，或是声望到二十。',
    done: g => (g.player.factionStanding['jadegate-courtyard'] || 0) >= 12 || g.player.reputation >= 20 || Boolean(g.story.flags['jadegate.referral']),
  },
  {
    id: 'trial', title: '通过入门试炼',
    detail: '赶到玉阙行院，报名参加外院弟子的入门试炼。',
    done: g => Boolean(g.story.flags['jadegate.trial.passed']),
  },
  {
    id: 'refine', title: '修到炼气',
    detail: '外院弟子的本分：修到炼气境，才算真正摸到修行的门槛。冲关须在有冲关门路的灵地。',
    done: g => g.player.rankIndex >= 3,
  },
  {
    id: 'foundation', title: '筑基',
    detail: '筑基之后寿元两百，才有余裕去争更大的局面。',
    done: g => g.player.rankIndex >= 4,
  },
]

/** 当前该做的那一条志向。 */
export function currentGoal() {
  const g = getContext().game
  return GOALS.find(goal => !g.life.goalsDone.includes(goal.id)) || null
}

/** 做完一件事后对一遍志向：达成的依次记下，并报一声。 */
export function checkGoals() {
  const g = getContext().game
  for (const goal of GOALS) {
    if (g.life.goalsDone.includes(goal.id)) continue
    if (!goal.done(g)) break
    g.life.goalsDone.push(goal.id)
    getContext().appendLog(`志向「${goal.title}」已成。`, 'loot')
    bus.emit('goal:completed', { id: goal.id, title: goal.title })
  }
}
