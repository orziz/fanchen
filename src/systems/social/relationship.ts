import { getContext } from '@/core/context'
import { LOCATION_MAP, SOCIAL_EVENT_TEMPLATES } from '@/config'
import { clamp, sample, round } from '@/utils'
import { rememberNpcIntel } from '../npc'
import { tryStartNpcVisitStory } from '../story'

export function processRelationshipTick() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs.forEach(npc => {
    const relation = ctx.ensurePlayerRelation(npc.id)
    if (relation.role === 'partner' && Math.random() < 0.1) {
      g.player.breakthrough = round(g.player.breakthrough + 1.2, 4)
      relation.affinity = clamp(relation.affinity + 1, -100, 100)
      if (Math.random() < 0.24) {
        const template = sample(SOCIAL_EVENT_TEMPLATES.filter(event => event.id === 'partner'))
        ctx.appendLog(template.text.split('{npc}').join(npc.name), template.type)
      }
    }
    if (relation.role === 'master' && Math.random() < 0.14) {
      g.player.cultivation = round(g.player.cultivation + 0.6, 4)
      relation.trust = clamp(relation.trust + 1, -100, 100)
    }
    if (relation.role === 'rival' && Math.random() < 0.12) {
      relation.rivalry = clamp(relation.rivalry + 2, 0, 100)
      g.player.reputation = round(g.player.reputation + 0.1, 4)
      if (Math.random() < 0.4) {
        const template = sample(SOCIAL_EVENT_TEMPLATES.filter(event => event.id === 'rival'))
        ctx.appendLog(template.text.split('{npc}').join(npc.name), template.type)
      }
    }
  })
}

export function visitNpc(npcId: string) {
  const ctx = getContext()
  const g = ctx.game
  const npc = ctx.getNpc(npcId)
  if (!npc) return
  const relation = ctx.ensurePlayerRelation(npcId)
  if (npc.locationId !== g.player.locationId) {
    ctx.appendLog(`${npc.name}目前在${LOCATION_MAP.get(npc.locationId)!.name}，暂时见不到。`, 'warn')
    return
  }
  rememberNpcIntel(npcId, 'met')
  if (tryStartNpcVisitStory(npcId)) return
  const attitude = relation.affinity > 20 ? '坦诚' : relation.affinity > 0 ? '平和' : '疏离'
  const cost = 10 + Math.max(0, relation.rivalry > 10 ? 8 : 0)
  if (g.player.money < cost) {
    ctx.appendLog('灵石不够备礼，对方并不想多聊。', 'warn')
    return
  }
  g.player.money -= cost
  ctx.adjustRelation(npcId, {
    affinity: npc.mood.kindness > 58 ? 5 : 2,
    trust: 3,
    romance: npc.mood.kindness > 70 ? 1 : 0,
    rivalry: relation.role === 'rival' ? -2 : 0,
  })
  ctx.appendLog(`你与${npc.name}在${LOCATION_MAP.get(npc.locationId)!.name}交谈，对方态度${attitude}。`, 'npc')
  if (Math.random() < 0.26) {
    const template = sample(SOCIAL_EVENT_TEMPLATES.filter(event => event.id === 'teaching' || event.id === 'gift'))
    ctx.appendLog(template.text.split('{npc}').join(npc.name), template.type)
    if (template.id === 'gift') ctx.addItemToInventory(sample(['mist-herb', 'spirit-grain', 'jade-spring']), 1)
    if (template.id === 'teaching') g.player.insight = round(g.player.insight + 0.4, 4)
  }
}

export function getRecruitDiscipleIssues(npcId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const npc = ctx.getNpc(npcId)
  const relation = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前不在江湖册录中。']
  const issues: string[] = []
  if (!g.player.sect) issues.push('你尚未建立宗门')
  if (g.player.sect?.disciples.includes(npcId)) issues.push('对方已经是门下弟子')
  if (relation.affinity < 24) issues.push(`好感不足，还差${24 - relation.affinity}`)
  if (relation.trust < 18) issues.push(`信任不足，还差${18 - relation.trust}`)
  if (npc.rankIndex > g.player.rankIndex + 1) issues.push('对方修为过高，暂时不愿屈就')
  return issues
}

export function canRecruitDisciple(npcId: string) {
  return getRecruitDiscipleIssues(npcId).length === 0
}

export function explainRecruitDisciple(npcId: string) {
  const issues = getRecruitDiscipleIssues(npcId)
  return issues.length ? issues.join('；') : '缘分已到，可以收入门墙。'
}

export function recruitDisciple(npcId: string) {
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)!
  rememberNpcIntel(npcId, 'met')
  if (!canRecruitDisciple(npcId)) {
    ctx.appendLog('对方还没有认可到愿意入你门墙的程度。', 'warn')
    return
  }
  ctx.game.player.sect!.disciples.push(npcId)
  npc.masterId = 'player'
  npc.sectId = ctx.game.player.sect!.id
  ctx.adjustRelation(npcId, { role: 'apprentice', affinity: 8, trust: 10 })
  ctx.game.player.sect!.prestige += 3
  ctx.appendLog(`${npc.name}正式拜入${ctx.game.player.sect!.name}，成为门下弟子。`, 'loot')
}

export function getMasterBondIssues(npcId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const npc = ctx.getNpc(npcId)
  const relation = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前无法结成师承。']
  const issues: string[] = []
  if (g.player.masterId || relation.role === 'master') issues.push('你已经有师承了')
  if (npc.rankIndex < g.player.rankIndex + 1) issues.push('对方修为还不足以收你为徒')
  if (relation.affinity < 18) issues.push(`好感不足，还差${18 - relation.affinity}`)
  if (relation.trust < 22) issues.push(`信任不足，还差${22 - relation.trust}`)
  return issues
}

export function canBecomeMaster(npcId: string) {
  return getMasterBondIssues(npcId).length === 0
}

export function explainMasterBond(npcId: string) {
  const issues = getMasterBondIssues(npcId)
  return issues.length ? issues.join('；') : '对方已经愿意收你入门。'
}

export function becomeMasterBond(npcId: string) {
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)!
  rememberNpcIntel(npcId, 'met')
  if (!canBecomeMaster(npcId)) {
    ctx.appendLog('对方还未到愿意收你入门的地步。', 'warn')
    return
  }
  ctx.game.player.masterId = npcId
  npc.apprenticeIds = npc.apprenticeIds || []
  if (!npc.apprenticeIds.includes('player')) npc.apprenticeIds.push('player')
  ctx.adjustRelation(npcId, { role: 'master', affinity: 6, trust: 8 })
  ctx.appendLog(`${npc.name}收你为门下弟子，今后可获更多指点。`, 'loot')
}

export function getPartnerBondIssues(npcId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const npc = ctx.getNpc(npcId)
  const relation = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前无法结成道侣。']
  const issues: string[] = []
  if (g.player.partnerId || relation.role === 'partner') issues.push('你已经有道侣了')
  if (relation.affinity < 36) issues.push(`好感不足，还差${36 - relation.affinity}`)
  if (relation.trust < 32) issues.push(`信任不足，还差${32 - relation.trust}`)
  if (relation.romance < 26) issues.push(`情缘不足，还差${26 - relation.romance}`)
  return issues
}

export function canBecomePartner(npcId: string) {
  return getPartnerBondIssues(npcId).length === 0
}

export function explainPartnerBond(npcId: string) {
  const issues = getPartnerBondIssues(npcId)
  return issues.length ? issues.join('；') : '水到渠成，可以结为道侣。'
}

export function becomePartner(npcId: string) {
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)!
  rememberNpcIntel(npcId, 'met')
  if (!canBecomePartner(npcId)) {
    ctx.appendLog('你们之间的情分还未到水到渠成的程度。', 'warn')
    return
  }
  ctx.game.player.partnerId = npcId
  npc.partnerId = 'player'
  ctx.adjustRelation(npcId, { role: 'partner', affinity: 8, trust: 8, romance: 10 })
  if (ctx.findInventoryEntry('bond-token')) ctx.removeItemFromInventory('bond-token', 1)
  ctx.appendLog(`你与${npc.name}互许道心，正式结为道侣。`, 'loot')
}

export function declareRival(npcId: string) {
  const ctx = getContext()
  const npc = ctx.getNpc(npcId)
  if (!npc) return
  rememberNpcIntel(npcId, 'met')
  const relation = ctx.ensurePlayerRelation(npcId)
  relation.role = 'rival'
  relation.rivalry = clamp(relation.rivalry + 28, 0, 100)
  relation.affinity = clamp(relation.affinity - 18, -100, 100)
  if (!ctx.game.player.rivalIds.includes(npcId)) ctx.game.player.rivalIds.push(npcId)
  ctx.appendLog(`你与${npc.name}彻底撕破脸，今后必有争斗。`, 'warn')
}