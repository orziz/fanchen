export type GuidanceTarget =
  | 'story'
  | 'combat'
  | 'map'
  | 'sect'
  | 'market'
  | 'world'
  | 'command'
  | 'rest'
  | 'breakthrough'

export interface GuidanceInput {
  tutorialObjective: string | null
  activeStoryTitle: string | null
  enemyName: string | null
  travelDestination: string | null
  hpPercent: number
  qiPercent: number
  staminaPercent: number
  breakthroughReady: boolean
  canBreakthrough: boolean
  affiliationName: string | null
  tradeDestination: string | null
  activeRealmName: string | null
  currentModeLabel: string
  locationName: string
}

export interface GuidanceResult {
  kicker: string
  title: string
  detail: string
  actionLabel: string
  target: GuidanceTarget
  tone: 'story' | 'danger' | 'travel' | 'growth' | 'steady'
}

export function resolveGuidance(input: GuidanceInput): GuidanceResult {
  if (input.tutorialObjective) {
    return {
      kicker: '入世指引',
      title: input.tutorialObjective,
      detail: input.activeStoryTitle
        ? `“${input.activeStoryTitle}”正在推进，完成眼前选择后再落下一步。`
        : '按当前指引完成第一条门路，其他系统会随进度逐步开放。',
      actionLabel: input.activeStoryTitle ? '继续剧情' : '查看当前线索',
      target: 'story',
      tone: 'story',
    }
  }

  if (input.activeStoryTitle) {
    return {
      kicker: '剧情待决',
      title: `“${input.activeStoryTitle}”还有选择未定`,
      detail: '世界已为当前剧情暂停，处理后再继续推进时间。',
      actionLabel: '继续剧情',
      target: 'story',
      tone: 'story',
    }
  }

  if (input.enemyName) {
    return {
      kicker: '交战中',
      title: `${input.enemyName}仍在眼前`,
      detail: '其他事务已被战斗阻断，先决定出招、撤退或开启自动战斗。',
      actionLabel: '处理战斗',
      target: 'combat',
      tone: 'danger',
    }
  }

  if (input.travelDestination) {
    return {
      kicker: '行程进行中',
      title: `正在赶往${input.travelDestination}`,
      detail: `当前从${input.locationName}继续赶路，可在山河图查看下一站与阻断原因。`,
      actionLabel: '查看路线',
      target: 'map',
      tone: 'travel',
    }
  }

  if (Math.min(input.hpPercent, input.qiPercent, input.staminaPercent) < 30) {
    return {
      kicker: '根基告急',
      title: '状态过低，先调息再冒险',
      detail: `气血 ${input.hpPercent}% · 真气 ${input.qiPercent}% · 体力 ${input.staminaPercent}%`,
      actionLabel: '调息一轮',
      target: 'rest',
      tone: 'danger',
    }
  }

  if (input.breakthroughReady && !input.canBreakthrough) {
    return {
      kicker: '寻找灵地',
      title: '冲关积累已圆满，当前地点却接不住天机',
      detail: '前往标有冲关门路的灵地，再尝试突破当前境界。',
      actionLabel: '查看山河图',
      target: 'map',
      tone: 'growth',
    }
  }

  if (input.canBreakthrough) {
    return {
      kicker: '破境在即',
      title: '修为底子与火候均已到线',
      detail: '当前已具备手动冲关条件，地点灵气与悟性会影响成败。',
      actionLabel: '尝试冲关',
      target: 'breakthrough',
      tone: 'growth',
    }
  }

  if (!input.affiliationName) {
    return {
      kicker: '立足江湖',
      title: '仍是白身，先找一方门路落脚',
      detail: '挂靠本地势力后，差使、商路和更多行动会逐步开放。',
      actionLabel: '查看势力',
      target: 'sect',
      tone: 'steady',
    }
  }

  if (input.tradeDestination) {
    return {
      kicker: '商路未结',
      title: `这趟货要送到${input.tradeDestination}`,
      detail: '先核对货路和交割地点，避免让已经压下的本钱停在路上。',
      actionLabel: '查看商路',
      target: 'market',
      tone: 'travel',
    }
  }

  if (input.activeRealmName) {
    return {
      kicker: '异象显世',
      title: `${input.activeRealmName}正在显现`,
      detail: '先核对地点、危险与当前根基，再决定是否赶赴挑战。',
      actionLabel: '查看异象',
      target: 'world',
      tone: 'growth',
    }
  }

  return {
    kicker: '今日主路',
    title: `按“${input.currentModeLabel}”稳步推进`,
    detail: `现居${input.locationName}，可随时从策略盘调整长期节奏和临时行动。`,
    actionLabel: '打开策略盘',
    target: 'command',
    tone: 'steady',
  }
}
