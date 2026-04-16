export type StoryPresentationMode = 'overlay' | 'rail' | 'embedded'
export type StoryBindingKey = 'npc' | 'location'
export type StorySpeakerMode = 'npc' | 'player' | 'narrator'
export type StoryTriggerKind = 'npc-visit' | 'manual'
export type StoryTriggerScope = 'global' | 'npc'

export interface StoryConditionSpec {
  kind: 'money-at-least' | 'affinity-at-least' | 'trust-at-least' | 'flag' | 'script'
  amount?: number
  flag?: string
  expected?: boolean
  scriptId?: string
}

export interface StoryEffectSpec {
  kind: 'add-relation' | 'add-money' | 'add-item' | 'append-log' | 'set-flag' | 'run-script' | 'set-presentation'
  affinity?: number
  trust?: number
  romance?: number
  rivalry?: number
  amount?: number
  itemId?: string
  quantity?: number
  text?: string
  logType?: string
  key?: string
  value?: boolean
  scriptId?: string
  presentation?: StoryPresentationMode
}

export interface StoryChoiceSpec {
  id: string
  text: string
  next?: string | null
  conditions?: StoryConditionSpec[]
  effects?: StoryEffectSpec[]
}

export interface StoryNodeSpec {
  id: string
  text: string
  speaker?: string
  speakerMode?: StorySpeakerMode
  next?: string | null
  choices?: StoryChoiceSpec[]
  effects?: StoryEffectSpec[]
}

export interface StoryTriggerSpec {
  kind: StoryTriggerKind
  scope?: StoryTriggerScope
  once?: boolean
  conditions?: StoryConditionSpec[]
  scriptId?: string
}

export interface StoryDefinition {
  id: string
  title: string
  summary: string
  defaultPresentation: StoryPresentationMode
  startNodeId: string
  bindings?: StoryBindingKey[]
  trigger?: StoryTriggerSpec
  nodes: Record<string, StoryNodeSpec>
}

export const STORY_DEFINITIONS: StoryDefinition[] = [
  {
    id: 'local-undercurrent',
    title: '市井暗流',
    summary: '零散风闻开始拼成一条真正的线。',
    defaultPresentation: 'overlay',
    startNodeId: 'intro',
    bindings: ['npc', 'location'],
    trigger: {
      kind: 'npc-visit',
      scope: 'global',
      once: true,
      conditions: [{ kind: 'flag', flag: 'story.rumor.heard' }],
    },
    nodes: {
      intro: {
        id: 'intro',
        speakerMode: 'narrator',
        text: '几次搭话之后，你把{location}的碎话拼成了一条线。有人在暗里收货，也有人在盯着新来的修行人。真正的门路，不在明面上。',
        choices: [
          {
            id: 'follow-trade',
            text: '先从货路和铺面查起',
            effects: [
              { kind: 'set-flag', key: 'story.mainline.trade-route' },
              { kind: 'append-log', logType: 'action', text: '你决定先沿着{location}的货路摸清门道。' },
            ],
            next: 'trade-route',
          },
          {
            id: 'follow-field',
            text: '先从镇外与山野风闻查起',
            effects: [
              { kind: 'set-flag', key: 'story.mainline.field-route' },
              { kind: 'append-log', logType: 'action', text: '你决定先去{location}外的荒道和山野里碰一碰真风声。' },
            ],
            next: 'field-route',
          },
        ],
      },
      'trade-route': {
        id: 'trade-route',
        speakerMode: 'narrator',
        text: '你把目光先落在货路上。接下来若想把这条线坐实，商路、铺面和压货动向都会变成关键线索。',
      },
      'field-route': {
        id: 'field-route',
        speakerMode: 'narrator',
        text: '你先把注意力放到镇外。接下来若想把线头拽出来，野外风闻、猎场异象和路上人心都会是切入口。',
      },
    },
  },
  {
    id: 'npc-first-impression',
    title: '街头搭话',
    summary: '第一次和江湖人把话题坐实。',
    defaultPresentation: 'overlay',
    startNodeId: 'intro',
    bindings: ['npc', 'location'],
    trigger: {
      kind: 'npc-visit',
      scope: 'npc',
      once: true,
    },
    nodes: {
      intro: {
        id: 'intro',
        speakerMode: 'npc',
        text: '{npc}在{location}抬眼看了你一阵，压低嗓音问道：“你是来讨生活，还是来找门路的？”',
        choices: [
          {
            id: 'ask-rumor',
            text: '先听听这里最近的风声',
            effects: [
              { kind: 'add-relation', affinity: 2, trust: 1 },
              { kind: 'set-flag', key: 'story.rumor.heard' },
              { kind: 'append-log', logType: 'npc', text: '你从{npc}口中听来一段关于{location}的门路风闻。' },
            ],
            next: 'rumor',
          },
          {
            id: 'tip-for-truth',
            text: '递上十枚灵石，请他把话讲实些',
            conditions: [{ kind: 'money-at-least', amount: 10 }],
            effects: [
              { kind: 'add-money', amount: -10 },
              { kind: 'add-relation', affinity: 4, trust: 2 },
              { kind: 'set-flag', key: 'story.rumor.heard' },
              { kind: 'run-script', scriptId: 'npc-visit-bonus' },
              { kind: 'append-log', logType: 'loot', text: '你花了十枚灵石，换来{npc}一句更值钱的提醒。' },
            ],
            next: 'favor',
          },
          {
            id: 'just-greet',
            text: '只点头致意，先把这个人记下',
            effects: [{ kind: 'add-relation', affinity: 1 }],
          },
        ],
      },
      rumor: {
        id: 'rumor',
        speakerMode: 'npc',
        text: '“这地方近来不算太平。”{npc}扫了扫街角，声音压得更低，“要摸门路，先记住谁在这里说话算数。”',
      },
      favor: {
        id: 'favor',
        speakerMode: 'npc',
        text: '“真想走门路，先别急着站队。”{npc}收下灵石，朝远处抬了抬下巴，“先看清谁在收货，谁又在等你犯错。”',
      },
    },
  },
]

export const STORY_MAP = new Map(STORY_DEFINITIONS.map(story => [story.id, story]))