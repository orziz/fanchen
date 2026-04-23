import { getContext } from '@/core/context'
import { addPlayerFactionMetric } from '@/core/integerProgress'
import { LOCATION_MAP } from '@/config'
import { clamp, randomInt, round } from '@/utils'
import { getGovernmentOfficeName, isTradeHubLocation } from '@/systems/social/faction'
import { getPlayerFactionTerritories, getTerritoryState } from '@/systems/social/territory'
import { PLAYER_FACTION_BRANCHES, createFactionName, createTask } from '@/systems/social/shared'

export function getCreatePlayerFactionIssues(): string[] {
  const g = getContext().game
  const issues: string[] = []
  if (g.player.playerFaction) issues.push('你已经有自家势力了')
  if (g.player.rankIndex < 1) issues.push('至少要有练力修为，才能扛住初期摊子')
  if (g.player.reputation < 22) issues.push(`声望不足，还差${Math.ceil(22 - g.player.reputation)}`)
  if (g.player.money < 900) issues.push(`灵石不足，还差${900 - g.player.money}`)
  return issues
}

export function canCreatePlayerFaction() {
  return getCreatePlayerFactionIssues().length === 0
}

export function explainCreatePlayerFaction() {
  const issues = getCreatePlayerFactionIssues()
  return issues.length ? issues.join('；') : '已经够资格拉起自己的势力了。'
}

function buildPlayerFactionRouteMission(playerFaction: any) {
  return createTask('playerFaction', 'route', {
    title: '押下一条货线',
    desc: `给${playerFaction.name}的商队拨一笔压货银，先把新货线滚起来。`,
    moneyCost: 92,
    suppliesCost: 6,
    runnerNeed: 2,
    rewardTreasury: 118,
    rewardSupplies: 10,
    rewardInfluence: 3,
    rewardPrestige: 1,
  })
}

function buildPlayerFactionRecruitMission(playerFaction: any) {
  const roles = ['runners', 'guards', 'brokers']
  const role = roles[randomInt(0, roles.length - 1)]
  const labels: Record<string, string> = {
    runners: '脚夫和跑线手',
    guards: '押队护手',
    brokers: '掮客和账房',
  }
  return createTask('playerFaction', 'recruit', {
    title: `添募${labels[role]}`,
    desc: `给${playerFaction.name}再添一批${labels[role]}，让摊子不只靠你一人撑。`,
    role,
    moneyCost: 68,
    rewardCrew: 1,
    rewardInfluence: 2,
    rewardPrestige: 1,
  })
}

function buildPlayerFactionOfficeMission(playerFaction: any) {
  return createTask('playerFaction', 'office', {
    title: '打点本地门路',
    desc: `借官面或地头去给${playerFaction.name}打点一圈，把下一段路走顺。`,
    moneyCost: 54,
    standingNeed: 6,
    rewardInfluence: 4,
    rewardPrestige: 2,
    rewardRegion: 1,
    rewardSupplies: 4,
  })
}

export function refreshPlayerFactionMissions(force = false) {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  if (!playerFaction) return []
  const missions = Array.isArray(playerFaction.missions) ? playerFaction.missions : [] as any[]
  if (!force && playerFaction.missionDay === g.world.day && missions.length >= 3) return missions
  playerFaction.missions = [
    buildPlayerFactionRouteMission(playerFaction),
    buildPlayerFactionRecruitMission(playerFaction),
    buildPlayerFactionOfficeMission(playerFaction),
  ] as any[]
  playerFaction.missionDay = g.world.day
  return playerFaction.missions
}

export function createPlayerFaction() {
  const ctx = getContext()
  const g = ctx.game
  if (!canCreatePlayerFaction()) {
    ctx.appendLog('现在还扛不起自建势力的盘子。', 'warn')
    return
  }
  const name = createFactionName()
  g.player.money -= 900
  g.player.playerFaction = ctx.createInitialPlayerFaction(name)
  g.player.playerFaction!.foundedDay = g.world.day
  g.player.playerFaction!.headquartersLocationId = g.player.locationId
  g.player.playerFaction!.treasury = 180
  g.player.playerFaction!.supplies = 42
  g.player.playerFaction!.influence = 8
  const territory = getTerritoryState(g.player.locationId)
  territory.playerInfluence = Math.max(territory.playerInfluence, 28)
  if (!territory.controllerId) territory.controllerId = g.player.playerFaction!.id
  refreshPlayerFactionMissions(true)
  ctx.appendLog(`你在${ctx.getCurrentLocation().name}拉起了自己的势力"${name}"。`, 'loot')
}

export function upgradePlayerFactionBranch(branchKey: string) {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  const branch = PLAYER_FACTION_BRANCHES[branchKey]
  if (!playerFaction || !branch) {
    ctx.appendLog('眼下还没有可升级的势力支线。', 'warn')
    return
  }
  const level = playerFaction.branches[branchKey as keyof typeof playerFaction.branches] || 0
  const cost = branch.baseCost * (level + 1)
  if (g.player.money < cost) {
    ctx.appendLog(`扩充${branch.label}需要${cost}灵石。`, 'warn')
    return
  }
  g.player.money -= cost
  ;(playerFaction.branches as any)[branchKey] = level + 1
  addPlayerFactionMetric('prestige', 2 + level)
  addPlayerFactionMetric('influence', 1.2 + level * 0.4)
  ctx.appendLog(`你的势力把${branch.label}扩到了 ${level + 1} 级。`, 'loot')
}

export function getRecruitFactionMemberIssues(npcId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  const npc = ctx.getNpc(npcId)
  const relation = ctx.ensurePlayerRelation(npcId)
  if (!npc) return ['此人当前不在江湖册录中。']
  const issues: string[] = []
  if (!playerFaction) issues.push('你尚未拉起自己的势力')
  if (playerFaction?.members.includes(npcId)) issues.push('对方已经是你势力中的骨干了')
  if (npc.locationId !== g.player.locationId) issues.push('人不在眼前，暂时谈不成')
  if (relation.affinity < 16) issues.push(`好感不足，还差${16 - relation.affinity}`)
  if (relation.trust < 14) issues.push(`信任不足，还差${14 - relation.trust}`)
  if (g.player.money < 36) issues.push(`安家与盘缠还差${36 - g.player.money}灵石`)
  return issues
}

export function canRecruitFactionMember(npcId: string) {
  return getRecruitFactionMemberIssues(npcId).length === 0
}

export function explainRecruitFactionMember(npcId: string) {
  const issues = getRecruitFactionMemberIssues(npcId)
  return issues.length ? issues.join('；') : '对方已经愿意来你帐下做事。'
}

export function recruitFactionMember(npcId: string) {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction!
  const npc = ctx.getNpc(npcId)!
  if (!canRecruitFactionMember(npcId)) {
    ctx.appendLog('这位江湖人暂时还不愿替你做事。', 'warn')
    return
  }
  g.player.money -= 36
  playerFaction.members.push(npcId)
  addPlayerFactionMetric('influence', 1.8)
  addPlayerFactionMetric('prestige', 1)
  npc.factionId = playerFaction.id
  npc.lastEvent = `投到${playerFaction.name}门下做事`
  ctx.adjustRelation(npcId, { affinity: 4, trust: 6 })
  g.player.stats.factionMembersRecruited += 1
  ctx.appendLog(`${npc.name}改投${playerFaction.name}，成了你麾下的骨干。`, 'loot')
}

export function getPlayerFactionMissionIssues(missionId: string): string[] {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  const missions = Array.isArray(playerFaction?.missions) ? playerFaction!.missions : [] as any[]
  const mission = missions.find((entry: any) => entry.id === missionId) as any
  if (!playerFaction || !mission) return ['这份势力任务已经失效。']
  const issues: string[] = []
  if (mission.kind === 'route') {
    if (!isTradeHubLocation(g.player.locationId)) issues.push('要在市镇、港口或驿路上才能压这条货线')
    if (g.player.money < mission.moneyCost) issues.push(`灵石不足，还差${mission.moneyCost - g.player.money}`)
    if ((playerFaction.supplies || 0) < mission.suppliesCost) issues.push(`补给不足，还差${mission.suppliesCost - playerFaction.supplies}`)
    if ((playerFaction.crew?.runners || 0) < mission.runnerNeed) issues.push(`脚夫不够，还差${mission.runnerNeed - (playerFaction.crew?.runners || 0)}`)
  }
  if (mission.kind === 'recruit' && g.player.money < mission.moneyCost) issues.push(`招募本钱不足，还差${mission.moneyCost - g.player.money}`)
  if (mission.kind === 'office') {
    if (!getGovernmentOfficeName(g.player.locationId)) issues.push('要在有官衙驻点的地方才能打点')
    if (g.player.money < mission.moneyCost) issues.push(`打点银不足，还差${mission.moneyCost - g.player.money}`)
    if (ctx.getRegionStanding(g.player.locationId) < mission.standingNeed) issues.push(`本地声望不足，还差${Math.ceil(mission.standingNeed - ctx.getRegionStanding(g.player.locationId))}`)
  }
  return issues
}

export function canCompletePlayerFactionMission(missionId: string) {
  return getPlayerFactionMissionIssues(missionId).length === 0
}

export function explainPlayerFactionMission(missionId: string) {
  const issues = getPlayerFactionMissionIssues(missionId)
  return issues.length ? issues.join('；') : '这份势力差事已经铺好了。'
}

export function completePlayerFactionMission(missionId: string) {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction!
  const missions = Array.isArray(playerFaction?.missions) ? playerFaction.missions : [] as any[]
  const mission = missions.find((entry: any) => entry.id === missionId) as any
  if (!mission || !canCompletePlayerFactionMission(missionId)) {
    ctx.appendLog('这份自家势力任务眼下还接不稳。', 'warn')
    return
  }
  g.player.money -= mission.moneyCost || 0
  if (mission.suppliesCost) playerFaction.supplies = Math.max(0, playerFaction.supplies - mission.suppliesCost)
  if (mission.kind === 'recruit') {
    ;(playerFaction.crew as any)[mission.role] = ((playerFaction.crew as any)[mission.role] || 0) + mission.rewardCrew
    g.player.stats.factionMembersRecruited += mission.rewardCrew
  }
  playerFaction.treasury += mission.rewardTreasury || 0
  playerFaction.supplies = clamp(playerFaction.supplies + (mission.rewardSupplies || 0), 0, 180)
  addPlayerFactionMetric('influence', mission.rewardInfluence || 0)
  addPlayerFactionMetric('prestige', mission.rewardPrestige || 0)
  if (mission.rewardRegion) ctx.adjustRegionStanding(g.player.locationId, mission.rewardRegion)
  g.player.stats.factionTasksCompleted += 1
  playerFaction.missions = missions.filter((entry: any) => entry.id !== missionId) as any[]
  ctx.appendLog(`你替${playerFaction.name}办妥"${mission.title}"，摊子又往外伸了一截。`, 'loot')
}

export function processPlayerFactionTick() {
  const ctx = getContext()
  const g = ctx.game
  const playerFaction = g.player.playerFaction
  if (!playerFaction) return
  if (playerFaction.eventCooldown > 0) playerFaction.eventCooldown -= 1
  refreshPlayerFactionMissions(g.world.hour === 0)
  if (g.world.hour !== 0) return
  const crew = playerFaction.crew || { runners: 0, guards: 0, brokers: 0 }
  const branchTotal = Object.values(playerFaction.branches || {}).reduce((sum, value) => sum + value, 0)
  const upkeep = (crew.runners || 0) * 2 + (crew.guards || 0) * 2 + (crew.brokers || 0) + branchTotal * 2
  const revenue = 6 + (crew.brokers || 0) * 5 + (playerFaction.branches.caravan || 0) * 7 + (playerFaction.members?.length || 0) * 3
  const supplyDelta = 3 + (playerFaction.branches.safehouse || 0) * 3 - Math.max(1, Math.round(upkeep * 0.35))
  let territoryRevenue = 0
  let controlledCount = 0
  Object.values(g.world.territories || {}).forEach(territory => {
    const location = LOCATION_MAP.get(territory.locationId)
    if (!location) return
    const watchCover = (playerFaction.branches.watch || 0) + Math.floor((crew.guards || 0) / 2)
    if (territory.controllerId === playerFaction.id) {
      controlledCount += 1
      territoryRevenue += 4 + (location.marketTier || 0) * 3 + (isTradeHubLocation(location.id) ? 3 : 1) + (location.tags.includes('pass') ? 2 : 0)
      territory.playerInfluence = clamp(territory.playerInfluence - Math.max(1, Math.round(4 - watchCover * 0.35)), 0, 100)
      territory.stability = clamp(territory.stability + 1 + (playerFaction.branches.watch || 0), 10, 120)
      if (territory.playerInfluence < 38) {
        territory.controllerId = territory.incumbentId || null
        ctx.appendLog(`${playerFaction.name}在${location.name}的脚跟松了，这条线又被地头势力夺了回去。`, 'warn')
      }
      return
    }
    if (territory.playerInfluence > 0) {
      const fade = Math.max(1, Math.round(territory.stability / 40) - Math.floor((playerFaction.branches.watch || 0) / 2))
      territory.playerInfluence = clamp(territory.playerInfluence - fade, 0, 100)
    }
  })
  playerFaction.treasury += Math.max(0, revenue - upkeep) + territoryRevenue
  playerFaction.supplies = clamp(playerFaction.supplies + supplyDelta, 0, 180)
  addPlayerFactionMetric('influence', 0.6 + (playerFaction.branches.watch || 0) * 0.5 + controlledCount * 0.4)
  addPlayerFactionMetric('prestige', controlledCount * 0.25)
  if (playerFaction.supplies <= 10) {
    addPlayerFactionMetric('prestige', -1)
    ctx.appendLog(`${playerFaction.name}补给吃紧，手下人做事开始慢了。`, 'warn')
  }
  if (playerFaction.prestige >= playerFaction.level * 16) {
    playerFaction.level += 1
    ctx.appendLog(`${playerFaction.name}的势力盘子越滚越稳，升到了 ${playerFaction.level} 级。`, 'loot')
  }
}