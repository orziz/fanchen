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
        ? `“${input.activeStoryTitle}”还有下文，听完再定。`
        : '先照路人说的办，在青禾找个落脚处，往后的路才走得开。',
      actionLabel: input.activeStoryTitle ? '继续剧情' : '去办',
      target: 'story',
      tone: 'story',
    }
  }

  if (input.activeStoryTitle) {
    return {
      kicker: '剧情待决',
      title: `“${input.activeStoryTitle}”还有选择未定`,
      detail: '眼前的事悬而未决，时辰也跟着停住。',
      actionLabel: '继续剧情',
      target: 'story',
      tone: 'story',
    }
  }

  if (input.enemyName) {
    return {
      kicker: '交战中',
      title: `${input.enemyName}仍在眼前`,
      detail: '别的事都得放一放，先分个胜负，或设法脱身。',
      actionLabel: '',
      target: 'combat',
      tone: 'danger',
    }
  }

  if (input.travelDestination) {
    return {
      kicker: '行程进行中',
      title: `正赶往${input.travelDestination}`,
      detail: `自${input.locationName}动身，一程一程往前走，每程约半个时辰。`,
      actionLabel: '看路线',
      target: 'map',
      tone: 'travel',
    }
  }

  if (Math.min(input.hpPercent, input.qiPercent, input.staminaPercent) < 30) {
    return {
      kicker: '根基告急',
      title: '伤疲过甚，先调息再说',
      detail: `气血 ${input.hpPercent}% · 真气 ${input.qiPercent}% · 体力 ${input.staminaPercent}%`,
      actionLabel: '调息',
      target: 'rest',
      tone: 'danger',
    }
  }

  if (input.breakthroughReady && !input.canBreakthrough) {
    return {
      kicker: '寻找灵地',
      title: '火候已足，此地却接不住天机',
      detail: '去有冲关门路的灵地，再冲下一重境界。',
      actionLabel: '看山河图',
      target: 'map',
      tone: 'growth',
    }
  }

  if (input.canBreakthrough) {
    return {
      kicker: '破境在即',
      title: '底子与火候都已到线',
      detail: '此地可冲关。地点灵气与悟性越高，把握越大。',
      actionLabel: '冲关',
      target: 'breakthrough',
      tone: 'growth',
    }
  }

  if (!input.affiliationName) {
    return {
      kicker: '立足江湖',
      title: '仍是白身，先找一方门路落脚',
      detail: '挂靠一方势力，差使、营生与更多门路才会向你敞开。',
      actionLabel: '看门路',
      target: 'sect',
      tone: 'steady',
    }
  }

  if (input.tradeDestination) {
    return {
      kicker: '商路未结',
      title: `这趟货要送到${input.tradeDestination}`,
      detail: '本钱压在路上，早些交割早些回本。',
      actionLabel: '看货路',
      target: 'market',
      tone: 'travel',
    }
  }

  if (input.activeRealmName) {
    return {
      kicker: '异象显世',
      title: `${input.activeRealmName}正在显现`,
      detail: '掂量根基与声望，再决定去不去闯。',
      actionLabel: '看秘境',
      target: 'world',
      tone: 'growth',
    }
  }

  return {
    kicker: '今日主路',
    title: `按“${input.currentModeLabel}”稳步推进`,
    detail: `落脚${input.locationName}，诸事照常。想换个活法，随时可改换打算。`,
    actionLabel: '改换打算',
    target: 'command',
    tone: 'steady',
  }
}
