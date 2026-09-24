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
    return '已到当前境界尽头，只能继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.cultivationGap > 0) {
    return `修为再积 ${formatNumber(state.cultivationGap)}，才能化出底火。`
  }
  return `修为已化出 ${formatNumber(state.breakthroughFloor)} 点底火。`
}

export function getBreakthroughStatusCopy(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '已到当前境界尽头，前头暂无关隘。'
  }
  const state = resolveGrowthState(input)
  if (state.breakthroughGap <= 0) {
    return '火候已足，可以择地冲关；再磨一磨，胜算更稳。'
  }
  return `火候还差 ${formatNumber(state.breakthroughGap)} 才够冲关。`
}

export function getGrowthProgressNote(input: GrowthCopyInput) {
  const state = resolveGrowthState(input)
  if (!input.hasNextRank) {
    return '已到当前境界尽头，只能继续温养根基。'
  }
  if (state.cultivationGap > 0) {
    return `修为再积 ${formatNumber(state.cultivationGap)}，方能化出底火；打坐、历练、奔走都能养底子。`
  }
  if (state.breakthroughGap > 0) {
    return `底火已有 ${formatNumber(state.breakthroughFloor)}，火候还差 ${formatNumber(state.breakthroughGap)} 才够冲关；静坐、历练与机缘都能磨火候。`
  }
  return '底子与火候俱足，寻一处灵地便可冲关；灵气越足，胜算越高。'
}

export function getBreakthroughHintCopy(input: GrowthCopyInput) {
  const state = resolveGrowthState(input)
  if (!input.hasNextRank) {
    return '已到当前境界尽头，只能继续温养根基。'
  }
  if (state.breakthroughGap <= 0) {
    return `火候已到 ${state.breakthroughPercent}%，可以冲关；此地灵气 ${input.aura || 0}，灵气越足胜算越高。`
  }
  if (state.cultivationGap > 0) {
    return `修为还差 ${formatNumber(state.cultivationGap)} 才能化出底火，先静坐、历练或奔走养底。`
  }
  return `底火已有 ${formatNumber(state.breakthroughFloor)}，再磨 ${formatNumber(state.breakthroughGap)} 火候便可冲关。`
}

export function getBreakthroughDisabledReason(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '已到当前境界尽头，只能继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.cultivationGap > 0) {
    return `修为还差 ${formatNumber(state.cultivationGap)}，底火未成，冲不得关。`
  }
  if (state.breakthroughGap > 0) {
    return `火候还差 ${formatNumber(state.breakthroughGap)}，尚不足以冲关。`
  }
  return ''
}

export function getBreakthroughActionDescription(input: GrowthCopyInput) {
  if (!input.hasNextRank) {
    return '已到当前境界尽头，只能继续温养根基。'
  }
  const state = resolveGrowthState(input)
  if (state.breakthroughGap <= 0) {
    return `火候 ${state.breakthroughPercent}%，现在就能冲关。`
  }
  if (state.cultivationGap > 0) {
    return '先补修为底子，化出底火再谈冲关。'
  }
  return `底火已成，再磨 ${formatNumber(state.breakthroughGap)} 火候便可冲关。`
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