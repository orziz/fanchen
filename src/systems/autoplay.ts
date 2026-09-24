import { getContext } from '@/core/context'
import { LOCATION_MAP, PLAYER_SECT_ENABLED } from '@/config'
import { revivePlayer } from '@/systems/player'
import { isTradeHub } from '@/systems/trade'
import { isOpeningTutorialActive } from '@/systems/tutorial'
import {
  consumePlayerTravelStep,
  currentLocationCanReach,
  getActionUnavailableReason,
  performAction,
  tickWorld,
  travelTo,
} from '@/systems/world'

/* ─── Auto Action Choice ─── */

export function chooseAutoAction(): string | null {
  const ctx = getContext()
  const g = ctx.game
  const location = ctx.getCurrentLocation()
  const mode = g.player.mode

  if (mode === 'manual') return null
  if (g.combat.currentEnemy) return g.combat.autoBattle ? 'combat' : null
  if (g.player.travelPlan) return null
  if (g.player.hp < g.player.maxHp * 0.42 || g.player.qi < g.player.maxQi * 0.32 || g.player.stamina < g.player.maxStamina * 0.18) return 'rest'
  // 入世指引未完成前只在青禾本地修养，不自动远行，也不去碰被指引锁住的门路。
  if (isOpeningTutorialActive(g.story) && !g.player.affiliationId) return location.actions.includes('meditate') ? 'meditate' : 'train'
  if (g.player.breakthrough >= ctx.getNextBreakthroughNeed() * 0.92 && location.actions.includes('breakthrough')) return 'breakthrough'

  if (mode === 'cultivation') {
    if (location.aura < 42 && Math.random() < 0.34) {
      const better = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.aura - a.aura)[0]
      if (better && better.aura > location.aura) {
        travelTo(better.id, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('meditate') ? 'meditate' : location.actions[0]
  }
  if (mode === 'merchant') {
    if (g.player.tradeRun) {
      if (location.id !== g.player.tradeRun.destinationId) {
        travelTo(g.player.tradeRun.destinationId, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
      return 'trade'
    }
    if (!isTradeHub(location) && Math.random() < 0.42) {
      const target = ['anping', 'lantern', 'blackforge', 'reedbank', 'yanpass', 'yunze'].find(id => currentLocationCanReach(id))
      if (target) {
        travelTo(target, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('trade') ? 'trade' : location.actions[0]
  }
  if (mode === 'adventure') {
    if (location.danger < 4 && Math.random() < 0.36) {
      const riskier = location.neighbors.map(id => LOCATION_MAP.get(id)!).sort((a, b) => b.danger - a.danger)[0]
      if (riskier && riskier.danger > location.danger) {
        travelTo(riskier.id, { advanceNow: false, consumeTime: false, silent: true })
        return null
      }
    }
    return location.actions.includes('quest') ? 'quest' : location.actions.includes('hunt') ? 'hunt' : location.actions[0]
  }
  if (PLAYER_SECT_ENABLED && mode === 'sect' && g.player.sect) {
    if (!location.tags.includes('sect') && currentLocationCanReach('jadegate') && Math.random() < 0.3) {
      travelTo('jadegate', { advanceNow: false, consumeTime: false, silent: true })
      return null
    }
    return location.actions.includes('sect') ? 'sect' : 'meditate'
  }
  return ['meditate', 'trade', 'hunt', 'quest', 'train'].find(a => location.actions.includes(a)) || location.actions[0]
}

/* ─── Game Step (main loop entry) ─── */

export function gameStep() {
  const ctx = getContext()
  const g = ctx.game
  if (g.player.travelPlan && !g.combat.currentEnemy && consumePlayerTravelStep()) {
    if (g.player.hp <= 0) revivePlayer()
    return
  }
  const action = chooseAutoAction()
  if (!action) {
    if (g.player.travelPlan && !g.combat.currentEnemy && consumePlayerTravelStep()) {
      if (g.player.hp <= 0) revivePlayer()
      return
    }
    if (g.player.mode === 'manual') {
      tickWorld()
      if (g.player.hp <= 0) revivePlayer()
    }
    return
  }
  const resolved = resolveAutoAction(action)
  if (resolved) performAction(resolved)
  else tickWorld()
  if (g.player.hp <= 0) revivePlayer()
}

const AUTO_FALLBACK_ACTIONS = ['meditate', 'train', 'rest']

/** 挂机选中的行动当下做不成时，静默换成可做的修养行动，保证时间照常推进。 */
function resolveAutoAction(action: string) {
  if (!getActionUnavailableReason(action)) return action
  return AUTO_FALLBACK_ACTIONS.find(key => !getActionUnavailableReason(key)) || null
}
