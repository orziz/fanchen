import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { addPlayerMetric } from '@/core/integerProgress'
import { MONSTER_TEMPLATES, MONSTER_AFFIXES, REALM_TEMPLATES, DISTRIBUTABLE_ITEMS, LOCATION_MAP, ACTION_META, FACTION_MAP, getDangerBaseline, getItem, getTechnique } from '@/config'
import { clamp, randomFloat, randomInt, sample, uid, round } from '@/utils'
import { revivePlayer, checkRankGrowth } from '@/systems/player'
import { gainTechniqueMastery, getPreferredSpellId, getTechniqueEffectValue } from '@/systems/techniques'
import type { EnemyState } from '@/types/game'

function getAffix(affixId: string) { return MONSTER_AFFIXES.find(a => a.id === affixId) || null }

function addCombatHistory(text: string, type = 'info') {
  const ctx = getContext()
  const combat = ctx.game.combat
  combat.history.unshift({ text, type })
  if (combat.history.length > 24) combat.history.length = 24
}

function chooseRewardItemByTypes(types: string[]) {
  const pool = DISTRIBUTABLE_ITEMS.filter(item => types.includes(item.type))
  return sample(pool.length ? pool : DISTRIBUTABLE_ITEMS)
}

interface EnemyBlueprint {
  id: string
  name: string
  hpMul: number
  powerMul: number
  qiMul?: number
  lootTypes: string[]
}

interface EnemyOptions {
  boss?: boolean
  realmId?: string
  regionId?: string
  affixIds?: string[]
  rewardItemIds?: string[]
}

/** 按险度基准与模板特色造一只敌手；首领所得翻三倍。 */
function buildEnemy(bp: EnemyBlueprint, danger: number, options: EnemyOptions = {}): EnemyState {
  const base = getDangerBaseline(danger)
  const boss = Boolean(options.boss)
  const affixIds = options.affixIds || []
  const qi = Math.round(base.qi * (bp.qiMul || 1) * (boss ? 1.2 : 1))
  const enemy: EnemyState = {
    id: uid(boss ? 'boss' : 'enemy'), templateId: bp.id, name: bp.name,
    boss, realmId: options.realmId || null, regionId: options.regionId || null, affixIds,
    maxHp: Math.round(base.hp * bp.hpMul), hp: Math.round(base.hp * bp.hpMul),
    maxQi: qi, qi,
    power: round(base.power * bp.powerMul), dodge: 0.04, defense: 0.04, crit: 0.05,
    burnOnHit: 0, chillOnHit: 0, qiBurn: 0,
    rewards: {
      money: Math.round(base.money * (boss ? 3 : 1) * randomFloat(0.9, 1.15)),
      cultivation: Math.round(base.cultivation * (boss ? 3 : 1)),
      reputation: boss ? 4 + danger : Math.max(0, Math.round(danger * 0.3)),
      breakthrough: boss ? 6 + danger : Math.max(1, Math.round(base.breakthrough)),
    },
    rewardItemIds: options.rewardItemIds || [], lootTypes: bp.lootTypes,
    effects: { burn: 0, exposed: 0, chill: 0 },
  }
  affixIds.map(getAffix).forEach(affix => {
    if (!affix) return
    enemy.maxHp = Math.round(enemy.maxHp * (1 + (affix.mod.hp || 0))); enemy.hp = enemy.maxHp
    enemy.power = round(enemy.power * (1 + (affix.mod.power || 0)))
    enemy.dodge += affix.mod.dodge || 0; enemy.defense += affix.mod.defense || 0; enemy.crit += affix.mod.crit || 0
    enemy.burnOnHit += affix.mod.burn || 0; enemy.chillOnHit += affix.mod.chill || 0; enemy.qiBurn += affix.mod.qiBurn || 0
  })
  return enemy
}

function rollAffixes(count: number) {
  const affixIds: string[] = []
  while (affixIds.length < count) {
    const affix = sample(MONSTER_AFFIXES)
    if (!affixIds.includes(affix.id)) affixIds.push(affix.id)
  }
  return affixIds
}

/** 遇敌：多半撞上本地专属的妖物，其余时候从险度相近的四方妖物里挑一只。 */
function generateEncounter(location: { id: string; danger: number }): EnemyState {
  const regional = MONSTER_TEMPLATES.filter(m => m.region === location.id)
  const wandering = MONSTER_TEMPLATES.filter(m => m.region !== location.id && Math.abs(m.tier - location.danger) <= 1)
  const pool = regional.length && (Math.random() < 0.65 || !wandering.length) ? regional : wandering
  const template = sample(pool.length ? pool : MONSTER_TEMPLATES)
  const affixCount = Math.min(2, Math.floor(location.danger / 3) + (Math.random() < 0.32 ? 1 : 0))
  return buildEnemy(template, location.danger, { regionId: location.id, affixIds: rollAffixes(affixCount) })
}

export function startEncounter(source = 'hunt') {
  const ctx = getContext()
  const g = ctx.game
  if (g.combat.currentEnemy) return g.combat.currentEnemy
  const location = ctx.getCurrentLocation()
  const enemy = generateEncounter(location)
  g.combat.history = []; g.combat.currentEnemy = enemy; g.combat.autoBattle = true
  g.combat.playerEffects = g.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  g.player.action = source
  addCombatHistory(`你遭遇了${enemy.affixIds.length ? `${enemy.affixIds.map(id => getAffix(id)?.label || '').join('、')}·` : ''}${enemy.name}。`, 'warn')
  ctx.appendLog(`你在${location.name}遭遇${enemy.name}，战斗一触即发。`, 'warn')
  bus.emit('combat:start', { enemy })
  return enemy
}

export function challengeRealm(realmId: string) {
  const ctx = getContext()
  const g = ctx.game
  const realm = REALM_TEMPLATES.find(r => r.id === realmId)
  if (!realm) return
  if (g.player.reputation < realm.unlockRep) { ctx.appendLog(`你的声望不足，尚无法进入${realm.name}。`, 'warn'); return }
  if (g.player.locationId !== realm.locationId) { ctx.appendLog(`要挑战${realm.name}，你得先赶到${LOCATION_MAP.get(realm.locationId)!.name}。`, 'warn'); return }
  if (g.combat.currentEnemy) { ctx.appendLog('你仍在战斗中，无法直接转入首领秘境。', 'warn'); return }
  const danger = (LOCATION_MAP.get(realm.locationId)?.danger || 1) + 1
  const lootTypes = realm.rewards.items.map(itemId => getItem(itemId)?.type).filter(Boolean) as string[]
  const enemy = buildEnemy(
    { id: realm.id, name: realm.boss.name, hpMul: realm.boss.hpMul, powerMul: realm.boss.powerMul, lootTypes },
    danger,
    { boss: true, realmId, regionId: realm.locationId, affixIds: realm.boss.affixes, rewardItemIds: realm.rewards.items },
  )
  enemy.rewards.money = Math.max(enemy.rewards.money, realm.rewards.money)
  g.combat.history = []; g.combat.currentEnemy = enemy; g.combat.pendingRealmId = realmId
  g.combat.autoBattle = true; g.combat.playerEffects = g.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  addCombatHistory(`你踏入${realm.name}，${enemy.name}自深处现身。`, 'warn')
  ctx.appendLog(`你闯入${realm.name}，与${enemy.name}正面相逢。`, 'warn')
  bus.emit('combat:start', { enemy })
}

export function startPursuitEncounter(factionId: string, source = 'travel') {
  const ctx = getContext()
  const g = ctx.game
  const faction = FACTION_MAP.get(factionId)
  const location = ctx.getCurrentLocation()
  if (!faction || g.combat.currentEnemy) return g.combat.currentEnemy

  const pursuitNames: Record<string, string> = { court: '缉拿差吏', bureau: '转运司巡缉', garrison: '军府缉骑' }
  // 追兵按你的境界派人：总比你高出一两级险地的身手。
  const danger = Math.max(location.danger, g.player.rankIndex + 2)
  const enemy = buildEnemy(
    { id: `pursuit-${faction.id}`, name: pursuitNames[faction.type] || '门路追兵', hpMul: 1.05, powerMul: 1.05, lootTypes: [] },
    danger,
    { regionId: location.id },
  )
  enemy.rewards.reputation = 0
  enemy.rewardItemIds = []
  enemy.lootTypes = []
  if (faction.type === 'court') enemy.crit += 0.03
  if (faction.type === 'bureau') enemy.qiBurn += 2
  if (faction.type === 'garrison') enemy.defense += 0.06

  g.combat.history = []
  g.combat.currentEnemy = enemy
  g.combat.autoBattle = true
  g.combat.playerEffects = g.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  g.player.action = 'combat'
  addCombatHistory(`你被${faction.name}的人马当场拦下，${enemy.name}已逼到近前。`, 'warn')
  ctx.appendLog(`你在${location.name}${source === 'travel' ? '行路' : '活动'}时撞上了${faction.name}的追缉。`, 'warn')
  bus.emit('combat:start', { enemy })
  return enemy
}

function getHealingItem() {
  const ctx = getContext()
  return ['jade-spring', 'mist-herb', 'spirit-grain'].find(id => ctx.findInventoryEntry(id))
}

function applyOngoingEffects() {
  const ctx = getContext()
  const combat = ctx.game.combat
  const enemy = combat.currentEnemy
  if (!enemy) return
  combat.playerEffects = combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  if (combat.playerEffects.burn > 0) { combat.playerEffects.burn -= 1; ctx.adjustResource('hp', -6, 'maxHp'); addCombatHistory('你身上的灼烧持续灼痛气血。', 'warn') }
  if (enemy.effects.burn > 0) { enemy.effects.burn -= 1; enemy.hp = Math.max(0, enemy.hp - 8); addCombatHistory(`${enemy.name}被火劲反噬，气息一乱。`, 'info') }
  if (enemy.effects.exposed > 0) enemy.effects.exposed -= 1
}

function computePlayerDamage(kind: string) {
  const ctx = getContext()
  const base = ctx.getPlayerPower() + ctx.getPlayerInsight() * 0.28
  const variance = randomFloat(0.88, 1.14)
  const skillMultiplier = kind === 'skill' ? 1.55 : kind === 'counter' ? 1.25 : 1
  return Math.max(6, Math.round(base * variance * skillMultiplier))
}

function enemyReceivesDamage(enemy: EnemyState, rawDamage: number) {
  if (Math.random() < enemy.dodge) {
    addCombatHistory(`${enemy.name}身形一晃，避开了你的攻势。`, 'warn')
    bus.emit('combat:enemy-dodge')
    return 0
  }
  const effectiveDefense = Math.max(0, enemy.defense - enemy.effects.exposed * 0.06)
  const finalDamage = Math.max(5, Math.round(rawDamage * (1 - effectiveDefense)))
  enemy.hp = Math.max(0, enemy.hp - finalDamage)
  addCombatHistory(`你打中了${enemy.name}，造成${finalDamage}点伤害。`, 'loot')
  bus.emit('combat:enemy-hit', { damage: finalDamage })
  return finalDamage
}

function playerCastSpell(enemy: EnemyState, skillId: string) {
  const ctx = getContext()
  const technique = getTechnique(skillId)
  if (!technique || technique.kind !== 'spell') return false
  const qiCost = Math.max(1, getTechniqueEffectValue(skillId, 'qiCost') || technique.effect.qiCost || 0)
  if (ctx.game.player.qi < qiCost) {
    addCombatHistory(`你想施展${technique.name}，却发现真气不足。`, 'warn')
    return false
  }
  ctx.adjustResource('qi', -qiCost, 'maxQi')
  addCombatHistory(`你运起${technique.name}。`, 'info')
  bus.emit('combat:spell', { skillId, name: technique.name })
  const damage = computePlayerDamage('attack') * Math.max(1, getTechniqueEffectValue(skillId, 'damageMultiplier') || 1)
  enemyReceivesDamage(enemy, damage)
  const burn = Math.round(getTechniqueEffectValue(skillId, 'burn'))
  const expose = Math.round(getTechniqueEffectValue(skillId, 'expose'))
  const chill = Math.round(getTechniqueEffectValue(skillId, 'chill'))
  if (burn) enemy.effects.burn = Math.max(enemy.effects.burn, burn)
  if (expose) enemy.effects.exposed = Math.max(enemy.effects.exposed, expose)
  if (chill) enemy.effects.chill = Math.max(enemy.effects.chill, chill)
  gainTechniqueMastery(skillId, 4 + qiCost * 0.25, '施术')
  return true
}

function playerUseCombatItem() {
  const ctx = getContext()
  const itemId = getHealingItem()
  if (!itemId) { ctx.adjustResource('hp', 6, 'maxHp'); ctx.adjustResource('qi', 4, 'maxQi'); addCombatHistory('你强行调息，勉强稳住了伤势。', 'info'); return }
  const item = getItem(itemId)
  ctx.removeItemFromInventory(itemId, 1)
  if (item?.effect.hp) ctx.adjustResource('hp', item.effect.hp, 'maxHp')
  if (item?.effect.qi) ctx.adjustResource('qi', item.effect.qi, 'maxQi')
  if (item?.effect.stamina) ctx.adjustResource('stamina', item.effect.stamina, 'maxStamina')
  addCombatHistory(`你在战斗中服用了${item!.name}。`, 'info')
}

function tryFlee(): boolean {
  const ctx = getContext()
  const enemy = ctx.game.combat.currentEnemy
  if (!enemy) return false
  if (enemy.boss) { addCombatHistory('首领秘境已封锁退路，无法轻易脱身。', 'warn'); return false }
  if (Math.random() < 0.56 + ctx.getPlayerCharisma() / 200) {
    addCombatHistory(`你成功摆脱了${enemy.name}。`, 'info')
    ctx.appendLog(`你从${enemy.name}手中脱身，暂避锋芒。`, 'info')
    ctx.game.combat.currentEnemy = null; ctx.game.combat.pendingRealmId = null
    bus.emit('combat:flee')
    return true
  }
  addCombatHistory(`你试图脱身，却被${enemy.name}缠住。`, 'warn')
  return false
}

function enemyTurn(enemy: EnemyState) {
  const ctx = getContext()
  const effects = ctx.game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  const guardMultiplier = effects.guard > 0 ? 0.58 : 1
  const chillMultiplier = enemy.effects.chill > 0 ? Math.max(0.72, 1 - enemy.effects.chill * 0.08) : 1
  const damage = Math.max(4, Math.round(enemy.power * randomFloat(0.84, 1.12) * guardMultiplier * chillMultiplier))
  ctx.adjustResource('hp', -damage, 'maxHp')
  addCombatHistory(`${enemy.name}反击，令你损失${damage}点气血。`, 'warn')
  bus.emit('combat:player-hit', { damage, guarded: guardMultiplier < 1 })
  if (enemy.qiBurn) ctx.adjustResource('qi', -enemy.qiBurn, 'maxQi')
  if (enemy.burnOnHit) effects.burn = Math.max(effects.burn, enemy.burnOnHit)
  if (enemy.chillOnHit) { effects.chill = Math.max(effects.chill, enemy.chillOnHit); ctx.adjustResource('stamina', -enemy.chillOnHit, 'maxStamina') }
  effects.guard = 0
  if (enemy.effects.chill > 0) enemy.effects.chill -= 1
  ctx.game.combat.playerEffects = effects
}

function resolveVictory(enemy: EnemyState) {
  const ctx = getContext()
  const p = ctx.game.player
  p.money += enemy.rewards.money
  addPlayerMetric('cultivation', enemy.rewards.cultivation)
  addPlayerMetric('breakthrough', enemy.rewards.breakthrough)
  addPlayerMetric('reputation', enemy.rewards.reputation)
  p.stats.enemiesDefeated += 1
  const dropIds = enemy.rewardItemIds.length ? enemy.rewardItemIds
    : enemy.lootTypes.length ? [chooseRewardItemByTypes(enemy.lootTypes).id] : []
  dropIds.forEach(id => ctx.addItemToInventory(id, 1))
  if (enemy.boss) {
    p.stats.bossKills += 1
    if (p.sect) p.sect.prestige += REALM_TEMPLATES.find(r => r.id === enemy.realmId)?.rewards.prestige || 0
    ctx.game.world.realm.bossVictories.push(enemy.realmId!)
    ctx.game.world.realm.cooldown = 8; ctx.game.world.realm.activeRealmId = null
    ctx.game.combat.pendingRealmId = null
    ctx.appendLog(`你斩落${enemy.name}，秘境灵机尽归己身。`, 'loot')
  } else {
    ctx.appendLog(`你击败${enemy.name}，战果已收入囊中。`, 'loot')
  }
  addCombatHistory('战斗结束，你赢下了这场厮杀。', 'loot')
  ctx.game.combat.lastResult = { outcome: 'victory', enemy: enemy.name, boss: enemy.boss }
  ctx.game.combat.currentEnemy = null; ctx.game.combat.autoBattle = false
  bus.emit('combat:victory', { name: enemy.name, boss: enemy.boss, money: enemy.rewards.money, cultivation: enemy.rewards.cultivation })
  checkRankGrowth()
}

function resolveDefeat(enemy: EnemyState) {
  const ctx = getContext()
  addCombatHistory(`${enemy.name}将你逼入绝境，这一战败了。`, 'warn')
  ctx.appendLog(`你败给了${enemy.name}，所幸留得性命。`, 'warn')
  ctx.game.combat.lastResult = { outcome: 'defeat', enemy: enemy.name, boss: enemy.boss }
  ctx.game.combat.currentEnemy = null; ctx.game.combat.pendingRealmId = null; ctx.game.combat.autoBattle = false
  bus.emit('combat:defeat', { name: enemy.name })
  revivePlayer()
}

export function processBattleRound(action = 'attack', skillId: string | null = null) {
  const ctx = getContext()
  const enemy = ctx.game.combat.currentEnemy
  if (!enemy) return
  applyOngoingEffects()
  if (enemy.hp <= 0) { resolveVictory(enemy); return }
  if (action === 'flee' && tryFlee()) return
  if (action === 'defend') {
    ctx.game.combat.playerEffects = ctx.game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
    ctx.game.combat.playerEffects.guard = 1
    addCombatHistory('你稳住身形，准备硬接下一击。', 'info')
  } else if (action === 'item') { playerUseCombatItem() }
  else {
    const preferredSkillId = action === 'skill' ? (skillId || getPreferredSpellId()) : null
    const casted = preferredSkillId ? playerCastSpell(enemy, preferredSkillId) : false
    if (action === 'skill' && !casted) {
      addCombatHistory('你会的术法眼下都施展不开，只能改以普攻应对。', 'warn')
    }
    if (!casted) {
      const damage = computePlayerDamage('attack')
      enemyReceivesDamage(enemy, damage)
    }
  }
  if (enemy.hp <= 0) { resolveVictory(enemy); return }
  enemyTurn(enemy)
  if (ctx.game.player.hp <= 0) resolveDefeat(enemy)
}

/** 自动出招：伤重先服药，眼看要输且非首领时设法脱身，否则有术法用术法。 */
export function autoCombatTick(): boolean {
  const ctx = getContext()
  const enemy = ctx.game.combat.currentEnemy
  if (!enemy) return false
  const p = ctx.game.player
  // 估一估胜负：照眼下的来回，自己撑不到对手倒下还留两成余裕，就趁早脱身。
  const playerHit = Math.max(5, (ctx.getPlayerPower() + ctx.getPlayerInsight() * 0.28) * (1 - enemy.defense)) * (1 - Math.min(0.6, enemy.dodge))
  const losing = p.hp / Math.max(4, enemy.power) < (enemy.hp / playerHit) * 1.2
  if (!enemy.boss && ((losing && p.hp < p.maxHp * 0.7) || (p.hp < p.maxHp * 0.3 && enemy.hp > enemy.maxHp * 0.3))) {
    processBattleRound('flee')
    return true
  }
  if (p.hp < p.maxHp * 0.35 && getHealingItem()) {
    processBattleRound('item')
    return true
  }
  const preferredSkillId = getPreferredSpellId(p.qi)
  processBattleRound(preferredSkillId ? 'skill' : 'attack', preferredSkillId)
  return true
}

export function maybeStartEncounter(actionKey: string): boolean {
  const action = ACTION_META[actionKey]
  if (!action || !action.reward.encounter) return false
  const ctx = getContext()
  if (ctx.game.combat.currentEnemy) return true
  if (Math.random() < action.reward.encounter) { startEncounter(actionKey); return true }
  return false
}
