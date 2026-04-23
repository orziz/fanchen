import { formatNumber } from '@/utils'
import {
  getBreakthroughReadyNeed,
  getCultivationBreakthroughFloor,
  getCultivationGateNeed,
  getRealmPowerBonus,
} from '@/config/progression'

interface GrowthCopyInput {
  hasNextRank: boolean
  nextBreakthroughNeed: number
  cultivation: number
  breakthrough: number
  rankIndex: number
  aura?: number
}

function resolveGrowthState(input: GrowthCopyInput) {
  const gateNeed = getCultivationGateNeed(input.nextBreakthroughNeed)
  const readyNeed = getBreakthroughReadyNeed(input.nextBreakthroughNeed)
  const breakthroughFloor = input.hasNextRank
    ? getCultivationBreakthroughFloor(input.cultivation, input.nextBreakthroughNeed)
    : 0
  const cultivationGap = Math.max(0, gateNeed - input.cultivation)
  const breakthroughGap = Math.max(0, readyNeed - input.breakthrough)
  const breakthroughPercent = input.nextBreakthroughNeed > 0
    ? Math.max(0, Math.min(100, Math.round((input.breakthrough / input.nextBreakthroughNeed) * 100)))
    : 0
  const realmPowerBonus = getRealmPowerBonus(input.rankIndex)
  return {
    gateNeed,
    readyNeed,
    breakthroughFloor,
    cultivationGap,
    breakthroughGap,
    breakthroughPercent,
    realmPowerBonus,
  }
}

export function getCultivationStatusCopy(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '当前已在境界尽头，后续修行只会继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.cultivationGap > 0) {
    return `离化火候线还差 ${formatNumber(state.cultivationGap)}。`
  }
  return `已过化火候线，当前可稳住至少 ${formatNumber(state.breakthroughFloor)} 点底火。`
}

export function getBreakthroughStatusCopy(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '当前境界已到头，暂无更高关隘可冲。'
  }
  const state = resolveGrowthState(input)
  if (state.breakthroughGap <= 0) {
    return '已过手动冲关线，继续打磨只会把胜算抬得更稳。'
  }
  return `距手动冲关线还差 ${formatNumber(state.breakthroughGap)}。`
}

export function getGrowthProgressNote(input: GrowthCopyInput) {
  const state = resolveGrowthState(input)
  if (!input.hasNextRank) {
    return `你已站到当前境界尽头。现有境界仍会直接给你 +${state.realmPowerBonus} 战力，并撑起气血、真气、体力三项上限。`
  }
  if (state.cultivationGap > 0) {
    return `境界会直接给你 +${state.realmPowerBonus} 战力，也决定高阶门路和器物是否肯认你；修为还差 ${formatNumber(state.cultivationGap)} 才会开始化成底火。`
  }
  if (state.breakthroughGap > 0) {
    return `修为底子已化出 ${formatNumber(state.breakthroughFloor)} 点底火，后续静坐、历练和机缘会继续把火候往上磨；当前还差 ${formatNumber(state.breakthroughGap)} 到手动冲关线。`
  }
  return '底子与火候都已到位。境界撑上限，修为垫底火，火候定冲关，现在已经可以择机手动破境。'
}

export function getBreakthroughHintCopy(input: GrowthCopyInput) {
  const state = resolveGrowthState(input)
  if (!input.hasNextRank) {
    return `你已站在当前境界尽头。现有境界仍会给你 +${state.realmPowerBonus} 战力，并继续撑住三项上限。`
  }
  if (state.breakthroughGap <= 0) {
    return `当前火候 ${state.breakthroughPercent}%，已过手动冲关线；所在地点灵气 ${input.aura || 0} 会计入成败。`
  }
  if (state.cultivationGap > 0) {
    return `修为底子还差 ${formatNumber(state.cultivationGap)} 才能化成底火；先静坐、历练或跑事养底。`
  }
  return `修为底子已把底火垫到 ${formatNumber(state.breakthroughFloor)}，再磨 ${formatNumber(state.breakthroughGap)} 火候就能手动冲关。`
}

export function getBreakthroughDisabledReason(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '当前境界已到头，只能继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.cultivationGap > 0) {
    return `修为底子还差 ${formatNumber(state.cultivationGap)}，先把底火养出来。`
  }
  if (state.breakthroughGap > 0) {
    return `当前底火已稳到 ${formatNumber(state.breakthroughFloor)}，还差 ${formatNumber(state.breakthroughGap)} 火候到手动冲关线。`
  }
  return ''
}

export function getBreakthroughActionDescription(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '当前境界已到头，只能继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.breakthroughGap <= 0) {
    return `火候 ${state.breakthroughPercent}%，现在就能试破当前境界。`
  }
  if (state.cultivationGap > 0) {
    return '先补修为底子，化出底火后再谈冲关。'
  }
  return `底火已成，再磨 ${formatNumber(state.breakthroughGap)} 火候就能手动冲关。`
}

export function describeIndustryAssetEffect(kind: string, level: number) {
  if (kind === 'farm') {
    const yieldBonus = Math.max(0, level - 1)
    return `基础收成 +${yieldBonus}，${level >= 3 ? '熟田后偶尔可额外省 1 天' : '到 3 级后熟田时偶尔可额外省 1 天'}。`
  }
  if (kind === 'workshop') {
    const autoLine = level >= 2 ? '托管工坊有机会多出 1 件' : '到 2 级后托管工坊有机会多出 1 件'
    const manualLine = level >= 3 ? '亲手打造也有机会多出 1 件' : '到 3 级后亲手打造也有机会多出 1 件'
    return `${autoLine}；${manualLine}。`
  }
  return `每次补货基础 ${2 + level} 批，日结基础进账额外 +${level * 3}。`
}

export function describeIndustryNextUpgrade(kind: string, level: number) {
  const nextLevel = level + 1
  if (kind === 'farm') {
    return nextLevel >= 3 ? '基础收成再 +1，并解锁熟田偶尔额外省 1 天' : '基础收成再 +1'
  }
  if (kind === 'workshop') {
    if (nextLevel === 2) return '解锁托管工坊偶尔多出 1 件'
    if (nextLevel === 3) return '亲手打造也有机会多出 1 件'
    return '继续抬高层级，为后续托管和高阶活计腾出余量'
  }
  return '补货基础再 +1 批，日结基础进账额外再 +3'
}

export function describeIndustryUpgradeResult(kind: string, level: number) {
  if (kind === 'farm') {
    return `现在${describeIndustryAssetEffect(kind, level)}`
  }
  if (kind === 'workshop') {
    if (level === 2) return '托管工坊现在有机会多出 1 件，扩坊已经开始见效。'
    if (level === 3) return '托管和亲手打造现在都可能多出 1 件，扩坊已经明显见效。'
    return `现在${describeIndustryAssetEffect(kind, level)}`
  }
  return `补货基数提到 ${2 + level} 批，日结基础进账额外抬到 +${level * 3}。`
}