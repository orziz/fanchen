import { round } from '@/utils'

const CULTIVATION_GATE_RATIO = 0.78
const BREAKTHROUGH_READY_RATIO = 0.85
const BREAKTHROUGH_FLOOR_START_RATIO = 0.24
const BREAKTHROUGH_FLOOR_END_RATIO = 0.6

export const REALM_POWER_PER_RANK = 4

export function getCultivationGateNeed(nextBreakthroughNeed: number) {
  return Math.max(1, Math.round(Math.max(1, nextBreakthroughNeed) * CULTIVATION_GATE_RATIO))
}

export function getBreakthroughReadyNeed(nextBreakthroughNeed: number) {
  return Math.max(1, Math.round(Math.max(1, nextBreakthroughNeed) * BREAKTHROUGH_READY_RATIO))
}

export function getRealmPowerBonus(rankIndex: number) {
  return rankIndex * REALM_POWER_PER_RANK
}

export function getCultivationBreakthroughFloor(cultivation: number, nextBreakthroughNeed: number) {
  const gateNeed = getCultivationGateNeed(nextBreakthroughNeed)
  if (cultivation < gateNeed) return 0
  const span = Math.max(1, nextBreakthroughNeed - gateNeed)
  const overflowRatio = Math.max(0, Math.min(1, (cultivation - gateNeed) / span))
  const floorRatio = BREAKTHROUGH_FLOOR_START_RATIO + overflowRatio * (BREAKTHROUGH_FLOOR_END_RATIO - BREAKTHROUGH_FLOOR_START_RATIO)
  return round(nextBreakthroughNeed * floorRatio, 4)
}