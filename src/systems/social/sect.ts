import { getContext } from '@/core/context'
import { LOCATION_MAP, SECT_BUILDINGS, SECT_EVENT_TEMPLATES, getItem, getTechnique } from '@/config'
import { clamp, round, sample } from '@/utils'
import { createSectName, createTask } from './shared'

function getSectMissions(): any[] {
  const sect = getContext().game.player.sect
  if (!sect) return []
  sect.missions = Array.isArray(sect.missions) ? sect.missions : []
  return sect.missions
}

function getTeachingNeed(skillId: string) {
  const technique = getTechnique(skillId)
  return Math.max(10, Math.round((technique?.masteryNeed || 40) * 0.45))
}

function applyTeachingGain(teaching: any, gain: number) {
  const technique = getTechnique(teaching.skillId)
  if (!technique) return 0
  const need = getTeachingNeed(teaching.skillId)
  if (teaching.mastery >= need) {
    teaching.mastery = need
    teaching.stage = technique.maxStage
    return 0
  }
  teaching.mastery = Math.min(need, teaching.mastery + gain)
  const mastered = teaching.mastery >= need
  teaching.stage = mastered ? technique.maxStage : 0
  return mastered ? 1 : 0
}

function buildSectGranaryMission(sect: any) {
  return createTask('sect', 'granary', {
    title: '补宗门粮库',
    desc: `给${sect.name}补一批口粮和药草，门内杂役与弟子才能安稳过日子。`,
    grainNeed: 3,
    herbNeed: 1,
    rewardFood: 22,
    rewardTreasury: 18,
    rewardPrestige: 2.4,
    rewardReputation: 0.8,
  })
}

function buildSectLectureMission(sect: any) {
  return createTask('sect', 'lecture', {
    title: '开一场讲经课',
    desc: `抽时间给${sect.name}门下开讲经课，稳住门风也带一带弟子。`,
    qiCost: 10,
    discipleNeed: 1,
    rewardPrestige: 3.4,
    rewardTreasury: 16,
    rewardTeaching: 1.6,
  })
}

function buildSectRecruitMission(sect: any) {
  return createTask('sect', 'recruit', {
    title: '招募外门弟子',
    desc: `拿一笔安置银去招一批外门新丁，让${sect.name}真正像个宗门。`,
    moneyCost: 88,
    reputationNeed: 40,
    rewardOuter: 1,
    rewardPrestige: 2.8,
    rewardFood: 6,
  })
}

export function refreshSectMissions(force = false) {
  const ctx = getContext()
  const sect = ctx.game.player.sect
  if (!sect) return []
  const missions = getSectMissions()
  if (!force && sect.missionDay === ctx.game.world.day && missions.length >= 3) return missions
  sect.missions = [buildSectGranaryMission(sect), buildSectLectureMission(sect), buildSectRecruitMission(sect)] as any[]
  sect.missionDay = ctx.game.world.day
  return sect.missions
}

export function getCreateSectIssues(): string[] {
  const ctx = getContext()
  const g = ctx.game
  const issues: string[] = []
  if (g.player.sect) issues.push('你已经建立了自己的宗门')
  if (g.player.rankIndex < 4) issues.push('至少筑基之后，才能撑起一宗门面')
  if (!ctx.findInventoryEntry('sect-banner')) issues.push('缺少立宗旗幡')
  if (g.player.reputation < 68) issues.push(`声望不足，还差${Math.ceil(68 - g.player.reputation)}`)
  if (g.player.money < 3800) issues.push(`灵石不足，还差${3800 - g.player.money}`)
  return issues
}

export function canCreateSect() {
  return getCreateSectIssues().length === 0
}

export function explainCreateSect() {
  const issues = getCreateSectIssues()
  return issues.length ? issues.join('；') : '开宗立门的条件已经齐了。'
}

export function getSectMissionIssues(missionId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const sect = g.player.sect
  const mission = getSectMissions().find((entry: any) => entry.id === missionId) as any
  if (!sect || !mission) return ['这份宗门差使已经失效。']
  const issues: string[] = []
  if (mission.kind === 'granary') {
    const grain = ctx.findInventoryEntry('spirit-grain')?.quantity || 0
    const herb = ctx.findInventoryEntry('mist-herb')?.quantity || 0
    if (grain < mission.grainNeed) issues.push(`粗灵米还差${mission.grainNeed - grain}`)
    if (herb < mission.herbNeed) issues.push(`雾心草还差${mission.herbNeed - herb}`)
  }
  if (mission.kind === 'lecture') {
    if (sect.disciples.length < mission.discipleNeed) issues.push('门下还没有能听课的亲传弟子')
    if (!sect.skillLibrary.length) issues.push('藏经阁暂无可开的经课')
    if (g.player.qi < mission.qiCost) issues.push(`真气不足，还差${mission.qiCost - g.player.qi}`)
    if (!LOCATION_MAP.get(g.player.locationId)?.tags.includes('sect')) issues.push('最好回到行院或宗门据点开课')
  }
  if (mission.kind === 'recruit') {
    if (g.player.money < mission.moneyCost) issues.push(`安置银不足，还差${mission.moneyCost - g.player.money}`)
    if (g.player.reputation < mission.reputationNeed) issues.push(`声望不足，还差${Math.ceil(mission.reputationNeed - g.player.reputation)}`)
  }
  return issues
}

export function canCompleteSectMission(missionId: string) {
  return getSectMissionIssues(missionId).length === 0
}

export function explainSectMission(missionId: string) {
  const issues = getSectMissionIssues(missionId)
  return issues.length ? issues.join('；') : '这份宗门差使可以着手处理。'
}

export function completeSectMission(missionId: string) {
  const ctx = getContext()
  const g = ctx.game
  const sect = g.player.sect!
  const missions = getSectMissions()
  const mission = missions.find((entry: any) => entry.id === missionId) as any
  if (!mission || !canCompleteSectMission(missionId)) {
    ctx.appendLog('这份宗门差使眼下还办不成。', 'warn')
    return
  }
  if (mission.kind === 'granary') {
    ctx.removeItemFromInventory('spirit-grain', mission.grainNeed)
    ctx.removeItemFromInventory('mist-herb', mission.herbNeed)
  }
  if (mission.kind === 'lecture') {
    ctx.adjustResource('qi', -mission.qiCost, 'maxQi')
    sect.teachings.forEach((teaching: any) => {
      const npc = ctx.getNpc(teaching.npcId)
      const gainedStages = applyTeachingGain(teaching, mission.rewardTeaching + sect.buildings.library * 0.3)
      if (!npc || gainedStages <= 0) return
      npc.cultivation = round(npc.cultivation + gainedStages * (10 + sect.buildings.dojo * 3), 4)
      sect.prestige = round(sect.prestige + gainedStages * 0.8, 4)
      g.player.stats.disciplesTaught += gainedStages
    })
  }
  if (mission.kind === 'recruit') {
    g.player.money -= mission.moneyCost
    sect.outerDisciples += mission.rewardOuter
  }
  sect.food = clamp(sect.food + (mission.rewardFood || 0), 0, 240)
  sect.treasury += mission.rewardTreasury || 0
  sect.prestige = round(sect.prestige + (mission.rewardPrestige || 0), 4)
  g.player.reputation = round(g.player.reputation + (mission.rewardReputation || 0), 4)
  g.player.stats.sectTasksCompleted += 1
  sect.missions = missions.filter((entry: any) => entry.id !== missionId) as any[]
  ctx.appendLog(`你替${sect.name}办妥"${mission.title}"，宗门根基更稳了。`, 'loot')
}

export function createSect() {
  const ctx = getContext()
  const g = ctx.game
  if (!canCreateSect()) {
    ctx.appendLog('开宗立门的条件还没有齐。', 'warn')
    return
  }
  const name = createSectName()
  g.player.money -= 3800
  ctx.removeItemFromInventory('sect-banner', 1)
  g.player.sect = ctx.createInitialSect(name)
  g.player.sect!.foundedDay = g.world.day
  g.player.sect!.treasury = 420
  g.player.sect!.skillLibrary = g.player.inventory
    .map(entry => getItem(entry.itemId)?.manualSkillId || '')
    .filter(Boolean)
    .slice(0, 1)
  refreshSectMissions(true)
  g.player.reputation = round(g.player.reputation + 6, 4)
  ctx.appendLog(`你正式开宗立门，宗门"${name}"就此开宗。`, 'loot')
}

export function upgradeSectBuilding(buildingKey: string) {
  const ctx = getContext()
  const g = ctx.game
  if (!g.player.sect) {
    ctx.appendLog('你尚未建立宗门。', 'warn')
    return
  }
  const building = SECT_BUILDINGS[buildingKey as keyof typeof SECT_BUILDINGS]
  if (!building) return
  const level = g.player.sect.buildings[buildingKey as keyof typeof g.player.sect.buildings] || 0
  const cost = building.baseCost * (level + 1)
  if (g.player.money < cost) {
    ctx.appendLog(`升级${building.label}需要${cost}灵石。`, 'warn')
    return
  }
  g.player.money -= cost
  ;(g.player.sect.buildings as any)[buildingKey] = level + 1
  g.player.sect.prestige = round(g.player.sect.prestige + 2 + level, 4)
  ctx.appendLog(`${building.label}升至 ${level + 1} 级。`, 'info')
}

export function assignTeaching(npcId: string, skillId: string) {
  const ctx = getContext()
  const g = ctx.game
  if (!g.player.sect) {
    ctx.appendLog('你尚未建立宗门，无法传功。', 'warn')
    return
  }
  if (!g.player.sect.disciples.includes(npcId)) {
    ctx.appendLog('只有宗门弟子才能接受正式传功。', 'warn')
    return
  }
  if (!g.player.sect.skillLibrary.includes(skillId)) {
    ctx.appendLog('该功法尚未收入藏经阁。', 'warn')
    return
  }
  const existing = g.player.sect.teachings.find(teaching => teaching.npcId === npcId)
  if (existing) {
    if (existing.skillId !== skillId) {
      existing.skillId = skillId
      existing.stage = 0
      existing.mastery = 0
    }
  } else {
    g.player.sect.teachings.push({ npcId, skillId, stage: 0, mastery: 0 })
  }
  ctx.appendLog(`你安排${ctx.getNpc(npcId)?.name || '弟子'}研习${getTechnique(skillId)?.name || '功法'}。`, 'info')
}

export function processSectTick() {
  const ctx = getContext()
  const g = ctx.game
  if (!g.player.sect) return
  const sect = g.player.sect
  if (sect.eventCooldown > 0) sect.eventCooldown -= 1
  refreshSectMissions(g.world.hour === 0)
  sect.teachings.forEach(teaching => {
    const npc = ctx.getNpc(teaching.npcId)
    if (!npc) return
    const gainedStages = applyTeachingGain(teaching, 1 + sect.buildings.library * 0.5)
    if (gainedStages > 0) {
      npc.cultivation = round(npc.cultivation + gainedStages * (10 + sect.buildings.dojo * 3), 4)
      sect.prestige = round(sect.prestige + gainedStages, 4)
      g.player.stats.disciplesTaught += gainedStages
      if (Math.random() < 0.32) {
        const template = sample(SECT_EVENT_TEMPLATES.filter(event => event.id === 'teaching-progress'))
        ctx.appendLog(template.text.split('{npc}').join(npc.name), template.type)
      }
    }
  })
  if (g.world.hour === 0) {
    const discipleWeight = sect.disciples.length + (sect.outerDisciples || 0) * 0.5
    const tribute = 4 + sect.buildings.market * 3 + Math.round(discipleWeight * 3)
    const foodDelta = 4 + sect.buildings.hall * 2 - Math.max(2, Math.round(discipleWeight))
    sect.treasury += tribute
    sect.food = clamp(sect.food + foodDelta, 0, 240)
    if (tribute > 0) {
      const template = sample(SECT_EVENT_TEMPLATES.filter(event => event.id === 'tribute'))
      ctx.appendLog(template.text.split('{value}').join(String(tribute)), template.type)
    }
    if (sect.food <= 8) {
      sect.prestige = round(Math.max(0, sect.prestige - 1.2), 4)
      ctx.appendLog(`${sect.name}粮草紧张，门内人心略有浮动。`, 'warn')
    }
    if (sect.prestige >= sect.level * 18) {
      sect.level += 1
      ctx.appendLog(`${sect.name}名望提升，宗门升至 ${sect.level} 级。`, 'loot')
    }
  }
}