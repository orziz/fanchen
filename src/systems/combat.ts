import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { MONSTER_TEMPLATES, MONSTER_AFFIXES, REALM_TEMPLATES, ITEMS, LOCATION_MAP, ACTION_META, getItem } from '@/config'
import { clamp, randomFloat, randomInt, sample, uid, round } from '@/utils'
import { revivePlayer, checkRankGrowth } from './player'
import type { EnemyState } from '@/types/game'

function getAffix(affixId: string) { return MONSTER_AFFIXES.find(a => a.id === affixId) || null }

function addCombatHistory(text: string, type = 'info') {
  const ctx = getContext()
  const combat = ctx.game.combat
  combat.history.unshift({ text, type })
  if (combat.history.length > 24) combat.history.length = 24
}

function chooseRewardItemByTypes(types: string[]) {
  const pool = ITEMS.filter(item => types.includes(item.type))
  return sample(pool.length ? pool : ITEMS)
}

function buildEnemyFromTemplate(
  template: { id?: string; name: string; baseHp: number; basePower: number; baseQi?: number; rewards?: { money?: number; cultivation?: number }; lootTypes?: string[] },
  options: { boss?: boolean; realmId?: string; regionId?: string; danger?: number; affixIds?: string[]; rewardItemIds?: string[] } = {},
): EnemyState {
  const ctx = getContext()
  const playerRank = ctx.game.player.rankIndex
  const scale = 1 + playerRank * 0.16 + (options.danger || 0) * 0.08 + (options.boss ? 0.3 : 0)
  const affixIds = options.affixIds || []
  const affixes = affixIds.map(getAffix).filter(Boolean)
  const enemy: EnemyState = {
    id: uid(options.boss ? 'boss' : 'enemy'), templateId: template.id || template.name, name: template.name,
    boss: Boolean(options.boss), realmId: options.realmId || null, regionId: options.regionId || null, affixIds,
    maxHp: Math.round(template.baseHp * scale), hp: Math.round(template.baseHp * scale),
    maxQi: Math.round((template.baseQi || 20) * (1 + (options.boss ? 0.18 : 0))),
    qi: Math.round((template.baseQi || 20) * (1 + (options.boss ? 0.18 : 0))),
    power: round(template.basePower * scale, 1), dodge: 0.04, defense: 0.04, crit: 0.05,
    burnOnHit: 0, chillOnHit: 0, qiBurn: 0,
    rewards: {
      money: Math.round((template.rewards?.money || 12) * scale),
      cultivation: round((template.rewards?.cultivation || 4) * (1 + playerRank * 0.08), 1),
      reputation: options.boss ? 5 + playerRank : Math.max(0, Math.round((options.danger || 1) * 0.3)),
      breakthrough: options.boss ? 8 + (options.danger || 0) : 1 + (options.danger || 0) * 0.5,
    },
    rewardItemIds: options.rewardItemIds || [], lootTypes: template.lootTypes || [],
    effects: { burn: 0, exposed: 0 },
  }
  affixes.forEach(affix => {
    if (!affix) return
    enemy.maxHp = Math.round(enemy.maxHp * (1 + (affix.mod.hp || 0))); enemy.hp = enemy.maxHp
    enemy.power = round(enemy.power * (1 + (affix.mod.power || 0)), 1)
    enemy.dodge += affix.mod.dodge || 0; enemy.defense += affix.mod.defense || 0; enemy.crit += affix.mod.crit || 0
    enemy.burnOnHit += affix.mod.burn || 0; enemy.chillOnHit += affix.mod.chill || 0; enemy.qiBurn += affix.mod.qiBurn || 0
  })
  return enemy
}

function generateEncounter(location: { id: string; danger: number }, options: { boss?: boolean } = {}): EnemyState {
  const templatePool = MONSTER_TEMPLATES.filter(m => m.region === location.id)
  const template = sample(templatePool.length ? templatePool : MONSTER_TEMPLATES)
  const affixCount = options.boss ? 2 + Math.floor(location.danger / 3) : Math.min(2, Math.floor(location.danger / 3) + (Math.random() < 0.32 ? 1 : 0))
  const affixIds: string[] = []
  while (affixIds.length < affixCount) {
    const affix = sample(MONSTER_AFFIXES)
    if (!affixIds.includes(affix.id)) affixIds.push(affix.id)
  }
  return buildEnemyFromTemplate(template, { ...options, regionId: location.id, danger: location.danger, affixIds })
}

export function startEncounter(source = 'hunt') {
  const ctx = getContext()
  const g = ctx.game
  if (g.combat.currentEnemy) return g.combat.currentEnemy
  const location = ctx.getCurrentLocation()
  const enemy = generateEncounter(location, { boss: false })
  g.combat.history = []; g.combat.currentEnemy = enemy; g.combat.autoBattle = true
  g.combat.playerEffects = g.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  g.player.action = source
  addCombatHistory(`你遭遇了${enemy.affixIds.length ? `${enemy.affixIds.map(id => getAffix(id)?.label || '').join('、')}·` : ''}${enemy.name}。`, 'warn')
  ctx.appendLog(`你在${location.name}遭遇${enemy.name}，战斗一触即发。`, 'warn')
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
  const enemy = buildEnemyFromTemplate(
    { id: realm.id, name: realm.boss.name, baseHp: realm.boss.baseHp, basePower: realm.boss.basePower, baseQi: realm.boss.baseQi, rewards: { money: realm.rewards.money, cultivation: 16 }, lootTypes: realm.rewards.items.map(itemId => getItem(itemId)?.type).filter(Boolean) as string[] },
    { boss: true, realmId, regionId: realm.locationId, danger: (LOCATION_MAP.get(realm.locationId)?.danger || 0) + 1, affixIds: realm.boss.affixes, rewardItemIds: realm.rewards.items },
  )
  g.combat.history = []; g.combat.currentEnemy = enemy; g.combat.pendingRealmId = realmId
  g.combat.autoBattle = true; g.combat.playerEffects = g.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  addCombatHistory(`你踏入${realm.name}，${enemy.name}自深处现身。`, 'warn')
  ctx.appendLog(`你闯入${realm.name}，与${enemy.name}正面相逢。`, 'warn')
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
}

function computePlayerDamage(kind: string) {
  const ctx = getContext()
  const base = ctx.getPlayerPower() + ctx.game.player.rankIndex * 4 + ctx.getPlayerInsight() * 0.28
  const variance = randomFloat(0.88, 1.14)
  const skillMultiplier = kind === 'skill' ? 1.55 : kind === 'counter' ? 1.25 : 1
  return Math.max(6, round(base * variance * skillMultiplier, 1))
}

function enemyReceivesDamage(enemy: EnemyState, rawDamage: number) {
  if (Math.random() < enemy.dodge) { addCombatHistory(`${enemy.name}身形一晃，避开了你的攻势。`, 'warn'); return 0 }
  const finalDamage = Math.max(5, round(rawDamage * (1 - enemy.defense), 1))
  enemy.hp = Math.max(0, enemy.hp - finalDamage)
  addCombatHistory(`你打中了${enemy.name}，造成${finalDamage}点伤害。`, 'loot')
  return finalDamage
}

function playerUseCombatItem() {
  const ctx = getContext()
  const itemId = getHealingItem()
  if (!itemId) { ctx.adjustResource('hp', 6, 'maxHp'); ctx.adjustResource('qi', 4, 'maxQi'); addCombatHistory('你强行调息，勉强稳住了伤势。', 'info'); return }
  const item = getItem(itemId)
  ctx.removeItemFromInventory(itemId, 1)
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
    return true
  }
  addCombatHistory(`你试图脱身，却被${enemy.name}缠住。`, 'warn')
  return false
}

function enemyTurn(enemy: EnemyState) {
  const ctx = getContext()
  const effects = ctx.game.combat.playerEffects || { burn: 0, guard: 0, chill: 0 }
  const guardMultiplier = effects.guard > 0 ? 0.58 : 1
  const damage = Math.max(4, round(enemy.power * randomFloat(0.84, 1.12) * guardMultiplier, 1))
  ctx.adjustResource('hp', -damage, 'maxHp')
  addCombatHistory(`${enemy.name}反击，令你损失${damage}点气血。`, 'warn')
  if (enemy.qiBurn) ctx.adjustResource('qi', -enemy.qiBurn, 'maxQi')
  if (enemy.burnOnHit) effects.burn = Math.max(effects.burn, enemy.burnOnHit)
  if (enemy.chillOnHit) { effects.chill = Math.max(effects.chill, enemy.chillOnHit); ctx.adjustResource('stamina', -enemy.chillOnHit, 'maxStamina') }
  effects.guard = 0
  ctx.game.combat.playerEffects = effects
}

function resolveVictory(enemy: EnemyState) {
  const ctx = getContext()
  const p = ctx.game.player
  p.money += enemy.rewards.money; p.cultivation += enemy.rewards.cultivation
  p.breakthrough += enemy.rewards.breakthrough; p.reputation += enemy.rewards.reputation
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
  checkRankGrowth()
}

function resolveDefeat(enemy: EnemyState) {
  const ctx = getContext()
  addCombatHistory(`${enemy.name}将你逼入绝境，这一战败了。`, 'warn')
  ctx.appendLog(`你败给了${enemy.name}，所幸留得性命。`, 'warn')
  ctx.game.combat.lastResult = { outcome: 'defeat', enemy: enemy.name, boss: enemy.boss }
  ctx.game.combat.currentEnemy = null; ctx.game.combat.pendingRealmId = null; ctx.game.combat.autoBattle = false
  revivePlayer()
}

export function processBattleRound(action = 'attack') {
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
    const useSkill = action === 'skill' && ctx.game.player.qi >= 10
    if (useSkill) ctx.adjustResource('qi', -10, 'maxQi')
    const damage = computePlayerDamage(useSkill ? 'skill' : 'attack')
    enemyReceivesDamage(enemy, damage)
    if (useSkill && Math.random() < 0.22) enemy.effects.burn = Math.max(enemy.effects.burn, 2)
  }
  if (enemy.hp <= 0) { resolveVictory(enemy); return }
  enemyTurn(enemy)
  if (ctx.game.player.hp <= 0) resolveDefeat(enemy)
}

export function autoCombatTick(): boolean {
  const ctx = getContext()
  if (!ctx.game.combat.currentEnemy) return false
  processBattleRound(ctx.game.player.qi >= 12 ? 'skill' : 'attack')
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
