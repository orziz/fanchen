import { OPENING_TUTORIAL_FLAGS, OPENING_TUTORIAL_SCRIPT_IDS } from '@/config/tutorial'

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
    id: 'opening-guidance',
    title: '青禾醒世',
    summary: '先在青禾站住脚。',
    defaultPresentation: 'overlay',
    startNodeId: 'wake',
    bindings: ['location'],
    trigger: {
      kind: 'manual',
      scope: 'global',
      once: true,
      conditions: [{ kind: 'flag', flag: OPENING_TUTORIAL_FLAGS.active }],
    },
    nodes: {
      wake: {
        id: 'wake',
        speaker: '路人',
        text: '醒醒，后生。睡在街口要着凉的，起得来吗？',
        choices: [
          {
            id: 'answer',
            text: '我想去拜师学仙法，可身上的钱快花光了。',
            next: 'guidance',
          },
        ],
      },
      guidance: {
        id: 'guidance',
        speaker: '路人',
        text: '这儿是青禾镇。拜师的事先放一放，先找个地方落脚，把饭吃上。',
        choices: [
          {
            id: 'open-map',
            text: '看看青禾周围的路',
            effects: [
              { kind: 'run-script', scriptId: OPENING_TUTORIAL_SCRIPT_IDS.openMap },
            ],
            next: 'map',
          },
        ],
      },
      map: {
        id: 'map',
        speakerMode: 'narrator',
        text: '你摊开山河图。青禾镇在图的最下角，一条河从镇子中间穿过去，往北是云泽渡，往东是芦湾埠。',
        choices: [
          {
            id: 'take-pack',
            text: '收下木枪和口粮',
            effects: [{ kind: 'run-script', scriptId: OPENING_TUTORIAL_SCRIPT_IDS.grantStarterPack }],
            next: 'supplies',
          },
        ],
      },
      supplies: {
        id: 'supplies',
        speaker: '路人',
        text: '这杆枪拿去防身，草膏和米也收着。镇上的乡社缺人手，你去问问，先有个落脚的地方。',
        choices: [
          {
            id: 'open-affiliation',
            text: '去乡社问问',
            effects: [{ kind: 'run-script', scriptId: OPENING_TUTORIAL_SCRIPT_IDS.openAffiliation }],
            next: 'affiliation',
          },
        ],
      },
      affiliation: {
        id: 'affiliation',
        speakerMode: 'narrator',
        text: '青禾乡社的管事把名册摊在桌上，蘸了蘸墨：“叫什么？打哪儿来的？”',
      },
    },
  },
  {
    id: 'local-undercurrent',
    title: '对不上的事',
    summary: '有些事对不上。',
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
        text: '跟人聊得多了，你觉出{location}有些事对不上：药铺的货越收越多，价钱却不见涨；这阵子还总有生面孔在打听新来的人。',
        choices: [
          {
            id: 'follow-trade',
            text: '盯一盯那家药铺',
            effects: [
              { kind: 'set-flag', key: 'story.mainline.trade-route' },
              { kind: 'append-log', logType: 'action', text: '你在{location}的药铺对面蹲了两个晌午。' },
            ],
            next: 'trade-route',
          },
          {
            id: 'follow-field',
            text: '去外头转转，看是谁在打听',
            effects: [
              { kind: 'set-flag', key: 'story.mainline.field-route' },
              { kind: 'append-log', logType: 'action', text: '你去{location}外头的岔路口转了一圈。' },
            ],
            next: 'field-route',
          },
        ],
      },
      'trade-route': {
        id: 'trade-route',
        speakerMode: 'narrator',
        text: '你在药铺对面的茶摊上坐了两个晌午。第二天傍晚，一辆盖着油布的车从后门进去，天黑透了才出来，车辙压得很深。',
      },
      'field-route': {
        id: 'field-route',
        speakerMode: 'narrator',
        text: '岔路口的老槐树下蹲着两个外乡人，正凑在一起说话。见你走过来，两人站起身，拍拍土走了。',
      },
    },
  },
  {
    id: 'npc-first-impression',
    title: '街头搭话',
    summary: '头一回搭上话。',
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
        text: '{npc}上下打量了你一眼：“面生啊。打哪儿来的？”',
        choices: [
          {
            id: 'ask-rumor',
            text: '跟对方打听打听这一带的事',
            effects: [
              { kind: 'add-relation', affinity: 2, trust: 1 },
              { kind: 'set-flag', key: 'story.rumor.heard' },
              { kind: 'append-log', logType: 'npc', text: '{npc}跟你说了些{location}的事。' },
            ],
            next: 'rumor',
          },
          {
            id: 'tip-for-truth',
            text: '塞过去十块灵石，请对方多说几句',
            conditions: [{ kind: 'money-at-least', amount: 10 }],
            effects: [
              { kind: 'add-money', amount: -10 },
              { kind: 'add-relation', affinity: 4, trust: 2 },
              { kind: 'set-flag', key: 'story.rumor.heard' },
              { kind: 'run-script', scriptId: 'npc-visit-bonus' },
              { kind: 'append-log', logType: 'loot', text: '你塞给{npc}十块灵石，换了几句实在话。' },
            ],
            next: 'favor',
          },
          {
            id: 'just-greet',
            text: '点个头，报上名字',
            effects: [{ kind: 'add-relation', affinity: 1 }],
          },
        ],
      },
      rumor: {
        id: 'rumor',
        speakerMode: 'npc',
        text: '“最近不大太平，前两天还有人在{location}外头叫人劫了。”{npc}往街角瞥了一眼，“要出门就赶早，天黑前回来。”',
      },
      favor: {
        id: 'favor',
        speakerMode: 'npc',
        text: '{npc}把灵石揣进袖子，凑近了些：“想知道哪儿有活干，去茶馆坐坐，那儿消息最灵。进林子别一个人去，也别走夜路。”',
      },
    },
  },
]

export const STORY_MAP = new Map(STORY_DEFINITIONS.map(story => [story.id, story]))