import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { getCultivationGateNeed, RANKS, getItem, getTechnique } from '@/config'
import { isOpeningTutorialActive } from '@/systems/tutorial'
import type { GameState } from '@/types/game'

/**
 * 修行路标：凡人阶段的一串小目标，一次只亮一个，达成即给一点微薄助力。
 * 不锁任何玩法，只为让人随时知道“下一步可以往哪走”。完成记录存于剧情旗标。
 */
interface MilestoneDef {
  id: string
  title: string
  detail: string
  progress(g: GameState): [number, number]
  reward: { money?: number; reputation?: number; itemId?: string }
}

const FLAG_PREFIX = 'milestone.'
const VISITED_PREFIX = 'visited.'

function rankAtLeast(rank: number) {
  return (g: GameState): [number, number] => [Math.min(g.player.rankIndex, rank), rank]
}

export const MILESTONES: MilestoneDef[] = [
  {
    id: 'foundation',
    title: '扎稳底子',
    detail: '静坐、练体都能攒修为，积到底子线再谈冲关。',
    progress: g => [Math.min(g.player.cultivation, getCultivationGateNeed(RANKS[1].need)), getCultivationGateNeed(RANKS[1].need)],
    reward: { itemId: 'herb-paste' },
  },
  {
    id: 'first-realm',
    title: '初破凡胎',
    detail: '火候到线后，寻一处有冲关门路的灵地破境。',
    progress: rankAtLeast(1),
    reward: { reputation: 3, money: 16 },
  },
  {
    id: 'wander',
    title: '行走四方',
    detail: '在山河图上择路远行，见识三处地方的风土。',
    progress: g => [Math.min(Object.keys(g.story.flags).filter(key => key.startsWith(VISITED_PREFIX)).length, 3), 3],
    reward: { money: 20 },
  },
  {
    id: 'first-blood',
    title: '初试锋芒',
    detail: '历练、探风闻时会撞上妖物，胜过一场。',
    progress: g => [Math.min(g.player.stats.enemiesDefeated, 1), 1],
    reward: { itemId: 'marrow-pellet' },
  },
  {
    id: 'first-route',
    title: '跑通一条货路',
    detail: '在市集压一趟货，送到别处交割。',
    progress: g => [Math.min(g.player.stats.tradeRoutesCompleted, 1), 1],
    reward: { reputation: 2, money: 24 },
  },
  {
    id: 'heart-method',
    title: '研习心法',
    detail: '得一册心法秘籍，学会并启用它。',
    progress: g => [Object.keys(g.player.learnedTechniques).some(id => getTechnique(id)?.kind === 'heart') ? 1 : 0, 1],
    reward: { itemId: 'focus-pellet' },
  },
  {
    id: 'rising-name',
    title: '门路渐宽',
    detail: '在所投势力中办差，把身份抬上一阶。',
    progress: g => [Math.min(g.player.affiliationRank, 1), 1],
    reward: { money: 30 },
  },
  {
    id: 'property',
    title: '置业立足',
    detail: '置下一处田产、工坊或铺面。',
    progress: g => [Math.min(g.player.assets.farms.length + g.player.assets.workshops.length + g.player.assets.shops.length, 1), 1],
    reward: { reputation: 3 },
  },
  {
    id: 'sense-qi',
    title: '感气入门',
    detail: '再破一境，踏入感气。',
    progress: rankAtLeast(2),
    reward: { itemId: 'jade-spring' },
  },
  {
    id: 'realm-boss',
    title: '秘境一探',
    detail: '异象显世时赶赴秘境，斩落守关首领。',
    progress: g => [Math.min(g.player.stats.bossKills, 1), 1],
    reward: { reputation: 5 },
  },
  {
    id: 'refine-qi',
    title: '炼气有成',
    detail: '踏入炼气，方算真正摸到修行门槛。',
    progress: rankAtLeast(3),
    reward: { money: 80 },
  },
]

function isDone(g: GameState, id: string) {
  return Boolean(g.story.flags[`${FLAG_PREFIX}${id}`])
}

function describeReward(reward: MilestoneDef['reward']) {
  const parts: string[] = []
  if (reward.money) parts.push(`灵石 ${reward.money}`)
  if (reward.reputation) parts.push(`声望 ${reward.reputation}`)
  if (reward.itemId) parts.push(getItem(reward.itemId)?.name || reward.itemId)
  return parts.join('、')
}

export function getCurrentMilestone() {
  const g = getContext().game
  if (isOpeningTutorialActive(g.story)) return null
  const next = MILESTONES.find(m => !isDone(g, m.id))
  if (!next) return null
  const [current, target] = next.progress(g)
  return {
    id: next.id,
    title: next.title,
    detail: `${next.detail} 达成可得：${describeReward(next.reward)}。`,
    progress: `${Math.floor(current)}/${target}`,
  }
}

/** 日常推进时核对当前路标，达成即发放小奖励；一次只结一个，避免连珠刷屏。 */
export function processMilestones() {
  const ctx = getContext()
  const g = ctx.game
  g.story.flags[`${VISITED_PREFIX}${g.player.locationId}`] = true
  if (isOpeningTutorialActive(g.story)) return
  const next = MILESTONES.find(m => !isDone(g, m.id))
  if (!next) return
  const [current, target] = next.progress(g)
  if (current < target) return
  g.story.flags[`${FLAG_PREFIX}${next.id}`] = true
  if (next.reward.money) g.player.money += next.reward.money
  if (next.reward.reputation) g.player.reputation += next.reward.reputation
  if (next.reward.itemId) ctx.addItemToInventory(next.reward.itemId, 1)
  ctx.appendLog(`路标「${next.title}」已成，得${describeReward(next.reward)}。`, 'loot')
  bus.emit('milestone:completed', { id: next.id, title: next.title })
}
