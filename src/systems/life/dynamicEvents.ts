import { getContext } from '@/core/context'
import { LOCATION_MAP, RANKS, REALM_TEMPLATES, getItem } from '@/config'
import { chineseNumber } from '@/config/calendar'
import { OPPORTUNITY_TEMPLATES } from '@/config/opportunities'
import { opportunitiesNearby } from '@/systems/life/opportunities'
import { BREAKTHROUGH_PILLS, breakthroughOdds } from '@/systems/life/cultivation'
import { canBecomeMaster, explainMasterBond } from '@/systems/social/relationship'
import type { EventChoiceDef, LifeEventDef, OpportunityCard } from '@/types/life'

/** 卷轴每次重绘都会重建事件，随机挑的句子得按人和日子定下来，不能一刷一个样。 */
function steady<T>(list: T[], key: string) {
  let hash = getContext().game.world.day
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return list[hash % list.length]
}

/* ─── 冲关 ─── */

const ATTEMPT_TEXT: Record<number, string> = {
  1: '你在{location}扎稳马步，把这些日子攒下的力气一点点往筋骨里压。成了就是练力境；不成，少不了伤筋动骨。',
  2: '你在{location}盘腿坐下，照着心法，把那一线若有若无的气往丹田里引。气在身上打转，稍一走神就散了。',
}

const SUCCESS_TEXT: Record<number, string> = {
  1: '骨节里“咯”的一声闷响，浑身的力气像开了闸。你踏进了练力境。',
  2: '丹田里那点气终于聚住了，没再散开。你睁开眼，头一回清清楚楚觉出四周的灵气在动。你踏进了感气境。',
}

const FAIL_TEXT = '气走到半路乱了，你喉头一甜，吐出一口血来。这一关没冲过去，得养上些日子。'

function breakthroughEvent(): LifeEventDef | null {
  const ctx = getContext()
  const p = ctx.game.player
  const location = ctx.getCurrentLocation()
  const target = p.rankIndex + 1
  if (target >= RANKS.length) return null
  const realm = RANKS[target].name
  const success = { text: SUCCESS_TEXT[target] || `这一关冲过去了。你踏进了${realm}境。`, hook: 'rankUp' }
  const failure = { text: FAIL_TEXT, hook: 'breakthroughFail' }
  const choices: EventChoiceDef[] = [
    { label: '冲关', hint: '凭底子和此地的灵气', fixedOdds: breakthroughOdds(p, location), success, failure },
  ]
  for (const pill of BREAKTHROUGH_PILLS[p.rankIndex] || []) {
    if (!ctx.findInventoryEntry(pill.itemId)) continue
    const name = getItem(pill.itemId)?.name || '丹药'
    choices.push({
      label: `服下${name}再冲`, hint: '有药力托着，把握大些',
      cost: { items: [{ itemId: pill.itemId, quantity: 1 }] },
      fixedOdds: breakthroughOdds(p, location, pill.bonus), success, failure,
    })
  }
  choices.push({ label: '再等等', success: { text: '你收了架势，打算改天再来。' } })
  return {
    id: 'breakthrough',
    title: `冲关 · ${realm}`,
    text: ATTEMPT_TEXT[target] || `你在{location}坐定，要冲${realm}这一关。`,
    choices,
  }
}

/* ─── 拜访 ─── */

function attitudeOf(affinity: number) {
  if (affinity >= 30) return '一见你就笑着迎了上来'
  if (affinity >= 10) return '招呼你坐下'
  if (affinity >= 0) return '点了点头'
  return '脸色不大好看'
}

const CHAT_LINES = [
  '{npc}说起{location}这阵子的米价，又抱怨了几句天气，临走把你送到了门口。',
  '你们从晌午一直聊到太阳偏西，{npc}留你喝了碗茶。',
  '{npc}跟你说了半天家里那点事，说完自己先笑了。',
  '{npc}手上的活没停，嘴上跟你聊着，送你出门时说下回再来。',
]

const GIFT_LINES = [
  '{npc}推了两回才收下，话一下子多了起来：“往后有事，只管来找我。”',
  '{npc}接过东西，嘴上说着“来就来，还带什么”，脸上倒是笑开了。',
]

function visitEvent(npcId: string | null): LifeEventDef | null {
  if (!npcId) return null
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)
  if (!npc) return null
  const p = ctx.game.player
  const relation = ctx.ensurePlayerRelation(npcId)
  const here = ctx.getCurrentLocation().name
  const teachable = npc.rankIndex > p.rankIndex
  const teachBlock = !teachable ? `${npc.name}的修为不比你高` : relation.affinity < 10 ? `交情还浅（好感需十）` : undefined
  const choices: EventChoiceDef[] = [
    { label: '坐下聊几句', hint: '拉近些交情', success: { text: steady(CHAT_LINES, npc.id), effects: { affinity: 3 } } },
    { label: '送上点心意', hint: '交情涨得快些', cost: { money: 10 }, success: { text: steady(GIFT_LINES, npc.id), effects: { affinity: 7 } } },
    {
      label: '请教修行上的事', hint: '请对方指点一二',
      blocked: teachBlock,
      check: { stat: 'insight', difficulty: 3 + p.rankIndex },
      success: { text: '{npc}随口点拨了几句。你回去琢磨了一夜，好几处想不通的地方想通了。', effects: { cultivation: 6 + p.rankIndex * 5, insight: 0.5, affinity: 2 } },
      failure: { text: '{npc}说得太玄，你听得云里雾里，只记下几句口诀。', effects: { affinity: 1 } },
    },
  ]
  if (!p.masterId && teachable) {
    choices.push({
      label: '求{npc}收你为徒', hint: '拜了师，修行快些',
      blocked: canBecomeMaster(npcId) ? undefined : explainMasterBond(npcId),
      success: { text: '{npc}沉吟了好一会儿，点了头：“往后你就跟着我吧。”', hook: 'becomeMaster' },
    })
  }
  choices.push({ label: '告辞', success: { text: '你起身告辞。' } })
  // 传闻里说的若就是此地的事，当面再提就别扭了。
  const news = npc.lastEvent && !npc.lastEvent.includes(here) ? `听说近来${npc.lastEvent}。` : ''
  return {
    id: 'visit',
    title: `拜访 · ${npc.name}`,
    text: `${npc.name}是${npc.profession || '本地人'}，今年${chineseNumber(npc.age)}岁。${news}见你进门，${attitudeOf(relation.affinity)}。`,
    choices,
  }
}

/* ─── 茶馆 ─── */

const TEAHOUSE_VOICES = ['隔壁桌的货郎说', '跑堂的续水时顺嘴提了一句', '一个挑夫插嘴', '角落里的老汉慢悠悠地说', '有人压着嗓子说']

function rumorOf(card: OpportunityCard) {
  const g = getContext().game
  const place = LOCATION_MAP.get(card.locationId)?.name || '邻近'
  if (card.templateId === 'realm') return `${place}那边开了个秘境，说是${card.title.replace('秘境 · ', '')}。`
  const template = OPPORTUNITY_TEMPLATES.find(entry => entry.id === card.templateId)
  const npc = card.npcId ? g.npcs.find(entry => entry.id === card.npcId)?.name : null
  const text = template?.rumor || `${place}那边有人在张罗${card.title}。`
  return text.replace(/\{location\}/g, place).replace(/\{npc\}/g, npc || '有个熟人')
}

function teahouseEvent(): LifeEventDef {
  const ctx = getContext()
  const g = ctx.game
  // 同一类事只传一回，免得三个人说的都是讲经的道人。
  const cards = opportunitiesNearby().filter((card, index, all) => all.findIndex(other => other.templateId === card.templateId) === index)
  const lines = cards.slice(0, 3).map((card, index) => `${TEAHOUSE_VOICES[(g.world.day + index) % TEAHOUSE_VOICES.length]}：“${rumorOf(card)}”`)
  const talk = g.npcs.find(npc => npc.alive && g.player.npcIntel[npc.id] && npc.lastEvent && npc.locationId !== g.player.locationId)
  if (talk) lines.push(`还有人提起${talk.name}，说是${talk.lastEvent}。`)
  const text = lines.length
    ? `你要了壶粗茶，在角落里坐下。\n\n${lines.join('\n')}`
    : '你要了壶粗茶，在角落里坐下。茶客们聊的都是家长里短：东家的猪跑了，西家的媳妇回了娘家。'
  return {
    id: 'teahouse', title: '茶馆打听', text,
    choices: [
      { label: '喝完茶就走', success: { text: '你把茶喝干，起身走了。' } },
      { label: '给说书先生添壶茶，问问前路', hint: '问问眼下该往哪儿使劲', cost: { money: 3 }, success: { text: '说书先生把茶碗往边上一推，压低了嗓子：', hook: 'goalTip' } },
    ],
  }
}

/* ─── 秘境 ─── */

function realmEvent(): LifeEventDef | null {
  const ctx = getContext()
  const realm = REALM_TEMPLATES.find(entry => entry.id === ctx.game.world.realm.activeRealmId)
  if (!realm) return null
  const location = LOCATION_MAP.get(realm.locationId)
  return {
    id: 'realm', title: `秘境 · ${realm.name}`,
    text: `${realm.desc}\n\n守在里头的是${realm.boss.name}。进去了就只能打到底。`,
    choices: [
      {
        label: '闯进去',
        blocked: ctx.game.player.reputation < realm.unlockRep ? `声望需${realm.unlockRep}才进得去` : undefined,
        fight: { name: realm.boss.name, boss: true, danger: (location?.danger || 1) + 1, hpMul: realm.boss.hpMul, powerMul: realm.boss.powerMul, realmId: realm.id },
        success: { text: `${realm.boss.name}倒了下去。你在它守着的地方翻出了些东西。`, effects: { reputation: 4 } },
        failure: { text: '你被打出了秘境，浑身是伤。' },
      },
      { label: '再等等', success: { text: '你在外头站了很久，还是没进去。' } },
    ],
  }
}

const BUILDERS: Record<string, (npcId: string | null) => LifeEventDef | null> = {
  breakthrough: () => breakthroughEvent(),
  visit: visitEvent,
  teahouse: () => teahouseEvent(),
  realm: () => realmEvent(),
}

/** 需要按眼下情形现编的事件（冲关、拜访）。 */
export function buildDynamicEvent(eventId: string, npcId: string | null) {
  return BUILDERS[eventId]?.(npcId) || null
}
