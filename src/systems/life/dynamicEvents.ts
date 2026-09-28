import { getContext } from '@/core/context'
import { LOCATION_MAP, RANKS, REALM_TEMPLATES, getItem } from '@/config'
import { opportunitiesNearby } from '@/systems/life/opportunities'
import { BREAKTHROUGH_PILLS, breakthroughOdds } from '@/systems/life/cultivation'
import { canBecomeMaster, explainMasterBond } from '@/systems/social/relationship'
import type { EventChoiceDef, LifeEventDef } from '@/types/life'

/* ─── 冲关 ─── */

const ATTEMPT_TEXT: Record<number, string> = {
  1: '你在{location}扎稳马步，把这些日子打熬出的气力一寸寸往筋骨里压。成了，便是练力境的底子；不成，少不得伤筋动骨。',
  2: '你在{location}盘膝坐定，按心法引着那一线若有若无的气感往丹田里收。灵气在周身打转，稍一分神就散了。',
}

const SUCCESS_TEXT: Record<number, string> = {
  1: '骨节里一声闷响，浑身气力像开了闸——你踏入了练力境。',
  2: '丹田里那点气终于聚住不散。你睁开眼，天地灵气第一次清清楚楚落在心上——你踏入了感气境。',
}

const FAIL_TEXT = '气机在半途一乱，你喉头一甜，吐出一口血来。这一关没冲过去，还得养上些日子。'

function breakthroughEvent(): LifeEventDef | null {
  const ctx = getContext()
  const p = ctx.game.player
  const location = ctx.getCurrentLocation()
  const target = p.rankIndex + 1
  if (target >= RANKS.length) return null
  const realm = RANKS[target].name
  const success = { text: SUCCESS_TEXT[target] || `灵机贯体，你踏入了${realm}境。`, hook: 'rankUp' }
  const failure = { text: FAIL_TEXT, hook: 'breakthroughFail' }
  const choices: EventChoiceDef[] = [
    { label: '凝神冲关', hint: '全凭底子与此地灵气', fixedOdds: breakthroughOdds(p, location), success, failure },
  ]
  for (const pill of BREAKTHROUGH_PILLS[p.rankIndex] || []) {
    if (!ctx.findInventoryEntry(pill.itemId)) continue
    const name = getItem(pill.itemId)?.name || '丹药'
    choices.push({
      label: `服下${name}再冲`, hint: '药力托着气机，胜算高些',
      cost: { items: [{ itemId: pill.itemId, quantity: 1 }] },
      fixedOdds: breakthroughOdds(p, location, pill.bonus), success, failure,
    })
  }
  choices.push({ label: '火候未足，改日再来', success: { text: '你收了架势，把这口气留到更有把握的时候。' } })
  return {
    id: 'breakthrough',
    title: `冲关 · ${realm}`,
    text: ATTEMPT_TEXT[target] || `你在{location}闭目凝神，要把一身修为冲入${realm}境。`,
    choices,
  }
}

/* ─── 拜访 ─── */

function attitudeOf(affinity: number) {
  if (affinity >= 30) return '一见你便笑着招呼'
  if (affinity >= 10) return '对你还算客气'
  if (affinity >= 0) return '只淡淡点了点头'
  return '看你的眼神带着几分防备'
}

function visitEvent(npcId: string | null): LifeEventDef | null {
  if (!npcId) return null
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)
  if (!npc) return null
  const p = ctx.game.player
  const relation = ctx.ensurePlayerRelation(npcId)
  const teachable = npc.rankIndex > p.rankIndex
  const teachBlock = !teachable ? `${npc.name}的修为不比你高` : relation.affinity < 10 ? `交情还浅（好感需十）` : undefined
  const choices: EventChoiceDef[] = [
    {
      label: '叙叙家常', hint: '说说近况，拉近些交情',
      success: { text: '你们聊了些{location}的近况，临走时{npc}送你到门口。', effects: { affinity: 3 } },
    },
    {
      label: '带点薄礼上门', hint: '礼轻情意重',
      cost: { money: 10 },
      success: { text: '{npc}收下礼，话也多了起来，说往后有事尽管来找。', effects: { affinity: 7 } },
    },
    {
      label: '求教修行', hint: '请对方指点一二',
      blocked: teachBlock,
      check: { stat: 'insight', difficulty: 3 + p.rankIndex },
      success: { text: '{npc}随手点拨了几句，你琢磨了一夜，许多想不通的地方豁然开朗。', effects: { cultivation: 6 + p.rankIndex * 5, insight: 0.5, affinity: 2 } },
      failure: { text: '{npc}讲得玄妙，你听得云里雾里，只记下了几句口诀。', effects: { affinity: 1 } },
    },
  ]
  if (!p.masterId && teachable) {
    choices.push({
      label: '恳请收为门下', hint: '拜师之后修行更快',
      blocked: canBecomeMaster(npcId) ? undefined : explainMasterBond(npcId),
      success: { text: '{npc}沉吟良久，终于点头：「往后你便跟着我学吧。」', hook: 'becomeMaster' },
    })
  }
  choices.push({ label: '告辞', success: { text: '你拱手告辞。' } })
  return {
    id: 'visit',
    title: `拜访 · ${npc.name}`,
    text: `${npc.name}是${npc.title}，${npc.age}岁，如今在{location}${npc.lastEvent ? `，近来${npc.lastEvent}` : ''}。见你来访，${attitudeOf(relation.affinity)}。`,
    choices,
  }
}

/* ─── 茶馆 ─── */

function teahouseEvent(): LifeEventDef {
  const ctx = getContext()
  const g = ctx.game
  const lines = opportunitiesNearby().slice(0, 3).map(card => `听说${LOCATION_MAP.get(card.locationId)?.name || '邻近'}那边${card.title}——${card.reward}。`)
  const talk = g.npcs.find(npc => npc.alive && g.player.npcIntel[npc.id] && npc.lastEvent && npc.locationId !== g.player.locationId)
  if (talk) lines.push(`还有人说，${talk.name}${talk.lastEvent}。`)
  const text = lines.length ? `茶客们你一言我一语：\n\n${lines.join('\n')}` : '茶客们聊的都是些家长里短，没什么新鲜事。'
  return {
    id: 'teahouse', title: '茶馆打听', text,
    choices: [
      { label: '听听就走', success: { text: '你喝完茶，把听来的事记在心里。' } },
      { label: '请说书先生讲讲门路', hint: '问问自己眼下该往哪里使劲', cost: { money: 3 }, success: { text: '说书先生捋着胡子，压低了声音——', hook: 'goalTip' } },
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
    text: `${realm.desc}\n\n守关的是${realm.boss.name}。一旦进去，便退不出来，只有分出胜负。`,
    choices: [
      {
        label: '闯进去',
        blocked: ctx.game.player.reputation < realm.unlockRep ? `声望需${realm.unlockRep}才进得去` : undefined,
        fight: { name: realm.boss.name, boss: true, danger: (location?.danger || 1) + 1, hpMul: realm.boss.hpMul, powerMul: realm.boss.powerMul, realmId: realm.id },
        success: { text: `${realm.boss.name}轰然倒下，秘境里的灵光尽数涌向你。`, effects: { reputation: 4 } },
        failure: { text: '你被首领打出了秘境，浑身是伤。' },
      },
      { label: '眼下还不是时候', success: { text: '你在秘境外看了很久，终究没有进去。' } },
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
