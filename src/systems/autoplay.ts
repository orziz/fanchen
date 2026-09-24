import { getContext } from '@/core/context'
import { LOCATION_MAP, PLAYER_SECT_ENABLED, RANKS, getBreakthroughReadyNeed, getCultivationGateNeed } from '@/config'
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

type LocationData = NonNullable<ReturnType<typeof LOCATION_MAP.get>>

/**
 * 由近及远找一处合意的地点：按路程逐层向外，同一层里取评分最高且眼下走得通的那个。
 */
function nearestLocationWhere(match: (loc: LocationData) => boolean, score: (loc: LocationData) => number, maxDepth = 5): string | null {
  const start = getContext().getCurrentLocation()
  const seen = new Set([start.id])
  let frontier = [start]
  for (let depth = 1; depth <= maxDepth && frontier.length; depth += 1) {
    const next: LocationData[] = []
    for (const loc of frontier) {
      for (const id of loc.neighbors) {
        if (seen.has(id)) continue
        seen.add(id)
        const neighbor = LOCATION_MAP.get(id)
        if (neighbor) next.push(neighbor)
      }
    }
    const candidates = next.filter(match).sort((a, b) => score(b) - score(a))
    const reachable = candidates.find(loc => currentLocationCanReach(loc.id))
    if (reachable) return reachable.id
    frontier = next
  }
  return null
}

function headTo(locationId: string, announce = false) {
  travelTo(locationId, { advanceNow: false, consumeTime: false, silent: !announce })
}

/** 此地坐不下来时，就近换一处能打坐、险度也镇得住的地方。 */
function seekMeditationSpot(maxDanger: number) {
  const spot = nearestLocationWhere(loc => loc.actions.includes('meditate') && loc.danger <= maxDanger, loc => loc.aura, 3)
  if (spot) headTo(spot)
  return Boolean(spot)
}

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

  const need = ctx.getNextBreakthroughNeed()
  const hasNextRank = g.player.rankIndex < RANKS.length - 1
  // 底子与火候都到了线：身在灵地就冲关，否则无论哪种打算，都先去最近又镇得住的灵地。
  const readyToBreak = hasNextRank && g.player.cultivation >= getCultivationGateNeed(need) && g.player.breakthrough >= getBreakthroughReadyNeed(need)
  if (readyToBreak && location.actions.includes('breakthrough')) return 'breakthrough'
  if (readyToBreak && !g.player.tradeRun) {
    const shrine = nearestLocationWhere(loc => loc.actions.includes('breakthrough') && loc.danger <= g.player.rankIndex + 3, loc => loc.aura - loc.danger * 4)
    if (shrine) {
      headTo(shrine, true)
      return null
    }
  }

  const maxDanger = g.player.rankIndex + 2
  if (mode === 'cultivation') {
    if (!location.actions.includes('meditate') && seekMeditationSpot(maxDanger)) return null
    if (location.aura < 42 && Math.random() < 0.34) {
      const better = nearestLocationWhere(loc => loc.actions.includes('meditate') && loc.aura > location.aura && loc.danger <= maxDanger + 1, loc => loc.aura, 2)
      if (better) {
        headTo(better)
        return null
      }
    }
    return location.actions.includes('meditate') ? 'meditate' : location.actions.includes('train') ? 'train' : 'rest'
  }
  if (mode === 'merchant') {
    if (g.player.tradeRun) {
      if (location.id !== g.player.tradeRun.destinationId) {
        headTo(g.player.tradeRun.destinationId)
        return null
      }
      return 'trade'
    }
    if (!isTradeHub(location) && Math.random() < 0.42) {
      const hub = nearestLocationWhere(loc => isTradeHub(loc), loc => loc.marketTier || 0, 4)
      if (hub) {
        headTo(hub)
        return null
      }
    }
    return location.actions.includes('trade') ? 'trade' : location.actions[0]
  }
  if (mode === 'adventure') {
    // 闯荡只往自己镇得住的险地去：险度不超过境界加一；伤了先歇，养回七成半气血再出门。
    const ventureCap = g.player.rankIndex + 1
    if (g.player.hp < g.player.maxHp * 0.75) return 'rest'
    const canVenture = (location.actions.includes('quest') || location.actions.includes('hunt')) && location.danger <= ventureCap
    if (!canVenture || (location.danger < ventureCap && Math.random() < 0.36)) {
      const wild = nearestLocationWhere(
        loc => (loc.actions.includes('hunt') || loc.actions.includes('quest')) && loc.danger <= ventureCap && (!canVenture || loc.danger > location.danger),
        loc => loc.danger,
        canVenture ? 1 : 4,
      )
      if (wild) {
        headTo(wild)
        return null
      }
    }
    if (!canVenture) return location.actions.includes('train') ? 'train' : location.actions.includes('meditate') ? 'meditate' : 'rest'
    return location.actions.includes('hunt') ? 'hunt' : 'quest'
  }
  if (mode === 'balanced') {
    // 维生求进：囊中羞涩先顾生计，手头宽裕就以修行为主，间或跑腿历练攒些名声。
    const safeGround = location.danger <= g.player.rankIndex + 1
    const healthy = g.player.hp >= g.player.maxHp * 0.75
    const errand = !safeGround ? null : location.actions.includes('quest') ? 'quest' : location.actions.includes('hunt') ? 'hunt' : null
    const needsLivelihood = g.player.money < 60 + g.player.rankIndex * 90
    if (needsLivelihood) {
      if (errand) return healthy ? errand : 'rest'
      if (location.actions.includes('trade')) return 'trade'
      const work = nearestLocationWhere(loc => loc.actions.includes('quest') && loc.danger <= g.player.rankIndex + 1, loc => loc.aura - loc.danger * 6, 3)
      if (work && Math.random() < 0.5) {
        headTo(work)
        return null
      }
    } else if (errand && healthy && Math.random() < 0.2) return errand
    if (!needsLivelihood && !location.actions.includes('meditate') && seekMeditationSpot(maxDanger)) return null
    return location.actions.includes('meditate') ? 'meditate' : location.actions.includes('train') ? 'train' : 'rest'
  }
  if (PLAYER_SECT_ENABLED && mode === 'sect' && g.player.sect) {
    if (!location.tags.includes('sect') && currentLocationCanReach('jadegate') && Math.random() < 0.3) {
      headTo('jadegate')
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
