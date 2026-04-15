import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { LOCATION_MAP, FACTION_MAP } from '@/config'
import { sample, randomFloat, randomInt } from '@/utils'

/* ─── Profession Pools ─── */

function getNpcProfessionPool(npc: { lifeStage: string; homeId: string; locationId: string }) {
  const home = LOCATION_MAP.get(npc.homeId) || LOCATION_MAP.get(npc.locationId)
  const tags = home?.tags || []
  if (tags.includes('sect')) return npc.lifeStage === '少年' ? ['杂役弟子', '抄经童子', '听差弟子'] : npc.lifeStage === '壮年' ? ['外门弟子', '内门行走', '丹房执役', '护山弟子'] : npc.lifeStage === '中年' ? ['执事', '丹房教习', '护法', '司库'] : ['守阁老人', '山门宿老', '外门教习']
  if (tags.includes('court')) return npc.lifeStage === '少年' ? ['衙门杂役', '跑堂信差', '文牍学徒'] : npc.lifeStage === '壮年' ? ['皂隶', '书吏', '巡街快手', '税契小吏'] : npc.lifeStage === '中年' ? ['捕头', '典吏', '粮台主事'] : ['老书办', '退居老吏', '旧案守库人']
  if (tags.includes('pass')) return npc.lifeStage === '少年' ? ['趟子学徒', '关城杂役', '驿卒'] : npc.lifeStage === '壮年' ? ['镖师', '关城军健', '赶车把式', '护货刀手'] : npc.lifeStage === '中年' ? ['押队头', '老镖头', '关市主事'] : ['守关老人', '退役镖师', '驿路旧人']
  if (tags.includes('forge')) return npc.lifeStage === '少年' ? ['打杂学徒', '矿场童工', '送炭小厮'] : npc.lifeStage === '壮年' ? ['学徒铁匠', '匠工', '押镖好手', '矿场工头'] : npc.lifeStage === '中年' ? ['监造', '工坊主事', '老镖头'] : ['老匠', '炉前师傅', '退役镖师']
  if (tags.includes('port') || tags.includes('market')) return npc.lifeStage === '少年' ? ['脚夫', '船行杂役', '跑街小厮'] : npc.lifeStage === '壮年' ? ['脚商', '船工', '分号伙计', '掮客'] : npc.lifeStage === '中年' ? ['掌柜', '行会执事', '船队老大'] : ['老账房', '退居掌柜', '市井说书人']
  if (tags.includes('town') || tags.includes('starter')) return npc.lifeStage === '少年' ? ['佃户子弟', '跑堂杂工', '药圃学徒'] : npc.lifeStage === '壮年' ? ['农户', '货郎', '药农', '店伙'] : npc.lifeStage === '中年' ? ['里正助手', '小店东家', '药铺主事'] : ['乡里老人', '田契看守', '退居掌柜']
  return npc.lifeStage === '少年' ? ['野路学徒', '走山少年'] : npc.lifeStage === '壮年' ? ['游侠', '散户', '猎手', '采药人'] : npc.lifeStage === '中年' ? ['老猎手', '山路向导', '散修执事'] : ['隐居老人', '看山人', '退隐游侠']
}

function getNpcGoalPool(npc: { lifeStage: string }) {
  if (npc.lifeStage === '少年') return ['找门路入宗', '攒学徒钱', '学一门手艺', '替家里挣口粮']
  if (npc.lifeStage === '壮年') return ['攒钱买田', '跑货翻身', '争取晋升', '替自己置办铺面']
  if (npc.lifeStage === '中年') return ['坐稳门内位置', '攒下家底', '收徒传手艺', '替晚辈铺路']
  return ['回乡养老', '守着家业', '留下门路给后人', '安稳度日']
}

function appendNpcLifeEvent(npc: any, text: string) {
  npc.lifeEvents = npc.lifeEvents || []
  npc.lifeEvents.push(text)
  if (npc.lifeEvents.length > 6) npc.lifeEvents = npc.lifeEvents.slice(-6)
}

function refreshNpcLifeProfile(npc: any, force = false) {
  const profPool = getNpcProfessionPool(npc)
  if (force || !profPool.includes(npc.profession) || Math.random() < 0.28) npc.profession = sample(profPool)
  const goalPool = getNpcGoalPool(npc)
  if (force || Math.random() < 0.32) npc.goal = sample(goalPool)
  if (npc.lifeStage === '老年') npc.action = sample(['meditate', 'trade', 'sect'])
  else if (npc.lifeStage === '少年') npc.action = sample(['train', 'trade', 'quest'])
}

/* ─── Daily Life Tick ─── */

export function processNpcLifeTick() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs = g.npcs.map((npc, index) => {
    if (!npc.alive) return npc
    npc.ageProgress = (npc.ageProgress || 0) + 1
    if (npc.ageProgress >= 12) {
      npc.ageProgress = 0
      const prevStage = npc.lifeStage
      npc.age += 1
      npc.lifeStage = ctx.deriveLifeStage(npc.age)
      if (npc.lifeStage !== prevStage) {
        refreshNpcLifeProfile(npc, true)
        appendNpcLifeEvent(npc, `${npc.age}岁步入${npc.lifeStage}`)
        npc.lastEvent = `人生进入${npc.lifeStage}阶段`
      }
      if (!npc.factionId && LOCATION_MAP.get(npc.homeId)?.factionIds?.length && Math.random() < 0.22) {
        npc.factionId = sample(LOCATION_MAP.get(npc.homeId)!.factionIds)
        npc.factionRank = 0
        refreshNpcLifeProfile(npc, true)
        const factionName = FACTION_MAP.get(npc.factionId)?.name || '一方势力'
        appendNpcLifeEvent(npc, `投身${factionName}`)
        npc.lastEvent = `投身${factionName}`
      }
      if (npc.factionId && npc.factionRank < 3 && (npc.cultivation > 140 + npc.factionRank * 180 || npc.wealth > 180 + npc.factionRank * 120) && Math.random() < 0.18) {
        npc.factionRank += 1
        const faction = FACTION_MAP.get(npc.factionId)
        const title = faction?.titles[Math.min(npc.factionRank, (faction?.titles.length || 1) - 1)] || '更进一步'
        appendNpcLifeEvent(npc, `在${faction?.name || '门内'}升为${title}`)
        npc.lastEvent = `在${faction?.name || '门内'}升为${title}`
      }
      if (npc.lifeStage === '老年' && Math.random() < 0.24) {
        npc.locationId = npc.homeId
        refreshNpcLifeProfile(npc, true)
        appendNpcLifeEvent(npc, `回到${LOCATION_MAP.get(npc.homeId)?.name || '故地'}安顿余生`)
        npc.lastEvent = `回到${LOCATION_MAP.get(npc.homeId)?.name || '故地'}安顿余生`
      }
    }
    if (npc.age >= npc.lifespan && Math.random() < 0.34) {
      const rel = ctx.ensurePlayerRelation(npc.id)
      if (rel.role !== 'none') ctx.appendLog(`${npc.name}走完了一生，旧事也随风而去。`, 'npc')
      const successor = ctx.createNPC(index + 1)
      successor.id = npc.id
      successor.lastEvent = '新近来到此地谋生'
      successor.lifeEvents = ['新近来到此地谋生']
      return successor
    }
    if (Math.random() < 0.1) refreshNpcLifeProfile(npc, false)
    return npc
  })
}

/* ─── NPC Action ─── */

function processNpcAction(npc: any, action: string) {
  const ctx = getContext()
  const g = ctx.game
  const location = LOCATION_MAP.get(npc.locationId)!
  switch (action) {
    case 'meditate':
      npc.cultivation += (2 + location.aura * 0.08) * (npc.skillBias.meditate || 1)
      npc.lastEvent = `在${location.name}闭关修炼`
      break
    case 'trade': {
      const profit = Math.round((4 + location.marketTier * 6) * (npc.skillBias.trade || 1))
      npc.wealth += profit
      npc.lastEvent = `在${location.name}行商获利${profit}`
      if (Math.random() < 0.18) ctx.adjustRelation(npc.id, { affinity: npc.mood.kindness > 60 ? 1 : -1, trust: npc.mood.kindness > 60 ? 1 : 0 })
      break
    }
    case 'hunt':
    case 'quest': {
      const challenge = location.danger * 18
      const score = npc.cultivation * 0.18 + npc.ambition + randomFloat(-16, 18)
      if (score > challenge) {
        const reward = Math.round((8 + location.danger * 6) * (npc.skillBias.combat || 1))
        npc.wealth += reward
        npc.cultivation += reward * 0.05
        npc.lastEvent = `在${location.name}${action === 'quest' ? '夺得机缘' : '历练得手'}`
        if (Math.random() < 0.16) npc.inventory.push({ itemId: sample(['mist-herb', 'timber', 'scrap-iron', 'iron-sand', 'beast-hide']), quantity: 1 })
      } else {
        npc.lastEvent = `在${location.name}受挫而回`
        ctx.adjustRelation(npc.id, { affinity: -1, rivalry: 1 })
      }
      break
    }
    case 'sect':
      npc.lastEvent = npc.sectId === 'player-sect' ? '在宗门内值守听令' : `在${location.name}处理门内事务`
      if (npc.sectId === 'player-sect' && g.player.sect) g.player.sect.treasury += 4
      break
    default:
      npc.lastEvent = `在${location.name}观望局势`
  }
  if (Math.random() < 0.12) ctx.appendLog(`${npc.name}又有动作：${npc.lastEvent}。`, 'npc')
}

/* ─── NPC AI ─── */

export function runNpcAI() {
  const ctx = getContext()
  const g = ctx.game
  g.npcs.forEach(npc => {
    npc.cooldown -= 1
    if (npc.cooldown > 0) return
    const current = LOCATION_MAP.get(npc.locationId)!
    let chosen = npc.action

    if (npc.masterId === 'player' && g.player.sect && Math.random() < 0.3) {
      npc.locationId = g.player.locationId
      npc.lastEvent = '赶来山门听候安排'
    } else if (Math.random() < (npc.lifeStage === '老年' ? 0.12 : npc.lifeStage === '少年' ? 0.32 : 0.26)) {
      npc.locationId = sample(current.neighbors)
      npc.lastEvent = `动身前往${LOCATION_MAP.get(npc.locationId)!.name}`
    }

    const loc = LOCATION_MAP.get(npc.locationId)!
    if (npc.mood.greed > 70 && loc.actions.includes('trade')) chosen = 'trade'
    if (npc.mood.curiosity > 68 && loc.actions.includes('quest')) chosen = 'quest'
    if (npc.mood.patience > 72 && loc.actions.includes('meditate')) chosen = 'meditate'
    if (npc.lifeStage === '老年' && loc.actions.includes('meditate')) chosen = sample(['meditate', 'trade'])
    if (npc.sectId === 'player-sect' && Math.random() < 0.3) chosen = 'sect'

    npc.action = chosen
    processNpcAction(npc, chosen)
    npc.cooldown = randomInt(1, 3)
  })
}
