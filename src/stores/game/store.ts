import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, LearnedTechniqueState, RelationState } from '@/types/game'
import { useStage } from '@/composables/useStage'
import {
  FACTIONS,
  FACTION_MAP,
  LEGACY_SAVE_KEYS,
  LOCATION_MAP,
  PLAYER_SECT_ENABLED,
  RANKS,
  SAVE_KEY,
  TIME_LABELS,
  OPENING_TUTORIAL_STORY_ID,
  getBreakthroughReadyNeed,
  getCultivationBreakthroughFloor,
  getCultivationGateNeed,
  getItem,
  getRealmPowerBonus,
  getTechnique,
  getTechniqueResolvedEffectValue,
} from '@/config'
import { clamp, round, buildMapTexture, findRoute } from '@/utils'
import type { MapTexture } from '@/utils'
import { bus } from '@/core/events'
import { normalizeGameNumericState, resolveCarriedDelta } from '@/core/integerProgress'
import { setContext, type GameContext } from '@/core/context'
import { meetNpcsAtLocation } from '@/systems/npc'
import { startStory } from '@/systems/story'
import {
  markOpeningTutorialStarted,
  primeOpeningTutorialState,
  shouldAutoStartOpeningTutorial,
  syncOpeningTutorialState,
} from '@/systems/tutorial'
import {
  createAuctionListings,
  createGameState,
  createInitialPlayerFaction,
  createInitialSect,
  createInitialTerritories,
  createLootBundle,
  createMarketListings,
  createNPC,
  createRelationState,
  deriveLifeStage,
} from './factories'
import { OBSOLETE_SAVE_STORAGE_KEYS, hydrateGameState, readStoredSave } from './hydration'

const STALE_SAVE_KEYS = [...LEGACY_SAVE_KEYS, ...OBSOLETE_SAVE_STORAGE_KEYS]

function resolveTechniqueEffect(
  technique: NonNullable<ReturnType<typeof getTechnique>> | null,
  state: Pick<LearnedTechniqueState, 'mastery'> | null | undefined,
  key: string,
) {
  return getTechniqueResolvedEffectValue(technique || undefined, state, key)
}

export const useGameStore = defineStore('game', () => {
  const { setTab } = useStage()
  const game = ref<GameState>(createGameState())
  const selectedLocationId = ref('qinghe')
  const speed = ref(1)
  const saveState = ref('未存档')
  const mapTexture = ref<MapTexture>(buildMapTexture())
  const feedback = ref<{ text: string; type: string } | null>(null)
  const initialized = ref(false)

  const player = computed(() => game.value.player)
  const npcs = computed(() => game.value.npcs)
  const combat = computed(() => game.value.combat)
  const world = computed(() => game.value.world)
  const market = computed(() => game.value.market)
  const auction = computed(() => game.value.auction)
  const log = computed(() => game.value.log)
  const story = computed(() => game.value.story)

  const currentLocation = computed(() => LOCATION_MAP.get(player.value.locationId)!)
  const selectedLocation = computed(() => LOCATION_MAP.get(selectedLocationId.value) || currentLocation.value)
  const rankData = computed(() => RANKS[Math.min(player.value.rankIndex, RANKS.length - 1)])
  const hasNextRank = computed(() => player.value.rankIndex < RANKS.length - 1)
  const nextBreakthroughNeed = computed(() => {
    const next = RANKS[Math.min(player.value.rankIndex + 1, RANKS.length - 1)]
    return next ? next.need : 999999
  })
  const cultivationGateNeed = computed(() => hasNextRank.value ? getCultivationGateNeed(nextBreakthroughNeed.value) : 0)
  const breakthroughReadyNeed = computed(() => hasNextRank.value ? getBreakthroughReadyNeed(nextBreakthroughNeed.value) : 0)
  const cultivationBreakthroughFloor = computed(() => (
    hasNextRank.value ? getCultivationBreakthroughFloor(player.value.cultivation, nextBreakthroughNeed.value) : 0
  ))
  const realmPowerBonus = computed(() => getRealmPowerBonus(player.value.rankIndex))
  const playerPower = computed(() => player.value.power + (player.value.bonusPower || 0) + realmPowerBonus.value)
  const playerInsight = computed(() => player.value.insight + (player.value.bonusInsight || 0))
  const playerCharisma = computed(() => player.value.charisma + (player.value.bonusCharisma || 0))
  const currentAffiliation = computed(() => player.value.affiliationId ? FACTION_MAP.get(player.value.affiliationId) || null : null)
  const playerFaction = computed(() => player.value.playerFaction)
  const sect = computed(() => player.value.sect)

  function normalizeNumericState() {
    normalizeGameNumericState(game.value)
  }

  function getCurrentLocation() { return currentLocation.value }
  function getSelectedLocation() { return selectedLocation.value }
  function getRankData(index?: number) {
    const i = index ?? player.value.rankIndex
    return RANKS[Math.min(i, RANKS.length - 1)]
  }
  function getNextBreakthroughNeed() { return nextBreakthroughNeed.value }
  function getPlayerPower() { return playerPower.value }
  function getPlayerInsight() { return playerInsight.value }
  function getPlayerCharisma() { return playerCharisma.value }
  function getCurrentAffiliation() { return currentAffiliation.value }
  function getPlayerFaction() { return playerFaction.value }
  function getSect() { return sect.value }

  function getNpc(npcId: string) {
    return game.value.npcs.find(n => n.id === npcId) || null
  }

  function findInventoryEntry(itemId: string) {
    return game.value.player.inventory.find(e => e.itemId === itemId) || null
  }

  function ensurePlayerRelation(npcId: string): RelationState {
    game.value.player.relations[npcId] = game.value.player.relations[npcId] || createRelationState()
    return game.value.player.relations[npcId]
  }

  function addItemToInventory(itemId: string, quantity = 1) {
    const entry = findInventoryEntry(itemId)
    if (entry) entry.quantity += quantity
    else game.value.player.inventory.push({ itemId, quantity })
    bus.emit('state:inventory-changed', { itemId, quantity })
  }

  function removeItemFromInventory(itemId: string, quantity = 1): boolean {
    const entry = findInventoryEntry(itemId)
    if (!entry || entry.quantity < quantity) return false
    entry.quantity -= quantity
    if (entry.quantity <= 0) {
      game.value.player.inventory = game.value.player.inventory.filter(e => e !== entry)
    }
    bus.emit('state:inventory-changed', { itemId, quantity: -quantity })
    return true
  }

  function adjustResource(key: string, amount: number, maxKey?: string) {
    const p = game.value.player as Record<string, unknown>
    const current = p[key]
    if (typeof current !== 'number') return
    const max = maxKey && typeof p[maxKey] === 'number' ? p[maxKey] as number : Infinity
    ;(p[key] as number) = clamp(round(current + amount), 0, max)
    normalizeNumericState()
    bus.emit('state:resource-changed', { key, amount, value: p[key] })
  }

  function appendLog(text: string, type = 'info') {
    const w = game.value.world
    const stamp = `第${w.day}日 ${TIME_LABELS[w.hour]}`
    game.value.log.unshift({ stamp, text, type })
    if (game.value.log.length > 80) game.value.log.length = 80
    normalizeNumericState()
    if (['warn', 'loot', 'action'].includes(type)) {
      feedback.value = { text, type }
      setTimeout(() => { feedback.value = null }, 3000)
    }
    bus.emit('state:log-added', { text, type })
  }

  function getRegionStanding(locationId = player.value.locationId) {
    return game.value.player.regionStanding[locationId] || 0
  }

  function adjustRegionStanding(locationId = player.value.locationId, amount = 0) {
    if (!locationId || !amount) return
    const wholeDelta = resolveCarriedDelta(game.value, `player.regionStanding.${locationId}`, amount)
    if (!wholeDelta) return
    game.value.player.regionStanding[locationId] = (game.value.player.regionStanding[locationId] || 0) + wholeDelta
    normalizeNumericState()
    bus.emit('state:region-standing-changed', { locationId, amount })
  }

  function adjustFactionStanding(factionId: string | null, amount: number) {
    if (!factionId) return 0
    const p = game.value.player
    const w = game.value.world
    const wholeDelta = resolveCarriedDelta(game.value, `player.factionStanding.${factionId}`, amount)
    if (!wholeDelta) return p.factionStanding[factionId] || 0
    p.factionStanding[factionId] = (p.factionStanding[factionId] || 0) + wholeDelta
    if (w.factions[factionId]) {
      w.factions[factionId].standing = p.factionStanding[factionId]
      w.factions[factionId].favor += resolveCarriedDelta(game.value, `world.factions.${factionId}.favor`, amount * 0.25)
    }
    const faction = FACTION_MAP.get(factionId)
    if (faction) {
      const officialTypes = new Set(['court', 'bureau', 'garrison'])
      if (officialTypes.has(faction.type)) w.factionFavor.court += resolveCarriedDelta(game.value, 'world.factionFavor.court', amount * 0.2)
      else if (['guild', 'escort', 'village', 'society'].includes(faction.type)) w.factionFavor.merchants += resolveCarriedDelta(game.value, 'world.factionFavor.merchants', amount * 0.18)
      else if (faction.type === 'order') w.factionFavor.sect += resolveCarriedDelta(game.value, 'world.factionFavor.sect', amount * 0.12)
    }
    const affFaction = currentAffiliation.value
    if (affFaction) {
      const standing = p.factionStanding[affFaction.id] || 0
      const nextRank = standing >= 80 ? 3 : standing >= 45 ? 2 : standing >= 18 ? 1 : 0
      if (nextRank > p.affiliationRank) {
        p.affiliationRank = nextRank
        p.title = `${affFaction.name}${affFaction.titles[nextRank]}`
        appendLog(`你在${affFaction.name}中的身份升为"${affFaction.titles[nextRank]}"。`, 'loot')
      }
    }
    normalizeNumericState()
    bus.emit('state:faction-standing-changed', { factionId, amount })
    return p.factionStanding[factionId]
  }

  function adjustRelation(npcId: string, delta: Partial<RelationState> = {}) {
    const relation = ensurePlayerRelation(npcId)
    relation.affinity = clamp(relation.affinity + (delta.affinity || 0), -100, 100)
    relation.trust = clamp(relation.trust + (delta.trust || 0), -100, 100)
    relation.romance = clamp(relation.romance + (delta.romance || 0), -100, 100)
    relation.rivalry = clamp(relation.rivalry + (delta.rivalry || 0), 0, 100)
    if (delta.role) relation.role = delta.role
    const npc = getNpc(npcId)
    if (npc) npc.relation = { ...relation }
    bus.emit('state:relation-changed', { npcId, relation })
    return relation
  }

  function clearLog() {
    game.value.log = []
    bus.emit('state:log-cleared')
  }

  function toggleAutoBattle() {
    game.value.combat.autoBattle = !game.value.combat.autoBattle
    bus.emit('state:combat-auto-toggled', game.value.combat.autoBattle)
  }

  function updateDerivedStats() {
    const p = game.value.player
    const rank = RANKS[Math.min(p.rankIndex, RANKS.length - 1)]
    const nextRank = p.rankIndex < RANKS.length - 1 ? RANKS[p.rankIndex + 1] : null
    let maxQi = rank.qiMax
    let maxHp = rank.hpMax
    let maxStamina = rank.staminaMax
    let cultivationBonus = 0
    let breakthroughRate = 0.5
    let powerBonus = 0
    let insightBonus = 0
    let charismaBonus = 0
    ;(['weapon', 'armor'] as const).forEach((slot) => {
      const itemId = p.equipment[slot]
      if (!itemId) return
      const item = getItem(itemId)
      if (!item) return
      if (item.effect.hp) maxHp += item.effect.hp
      if (item.effect.qi) maxQi += item.effect.qi
      if (item.effect.stamina) maxStamina += item.effect.stamina
      if (item.effect.cultivation) cultivationBonus += item.effect.cultivation
      if (item.effect.breakthroughRate) breakthroughRate += item.effect.breakthroughRate
      if (item.effect.power) powerBonus += item.effect.power
      if (item.effect.insight) insightBonus += item.effect.insight
      if (item.effect.charisma) charismaBonus += item.effect.charisma
    })
    const heartId = p.equipment.heart
    const heartTechnique = heartId ? getTechnique(heartId) : null
    const heartState = heartId ? p.learnedTechniques[heartId] : null
    if (heartTechnique && heartState) {
      maxHp += resolveTechniqueEffect(heartTechnique, heartState, 'hp')
      maxQi += resolveTechniqueEffect(heartTechnique, heartState, 'qi')
      maxStamina += resolveTechniqueEffect(heartTechnique, heartState, 'stamina')
      cultivationBonus += resolveTechniqueEffect(heartTechnique, heartState, 'cultivation')
      breakthroughRate += resolveTechniqueEffect(heartTechnique, heartState, 'breakthroughRate')
      powerBonus += resolveTechniqueEffect(heartTechnique, heartState, 'power')
      insightBonus += resolveTechniqueEffect(heartTechnique, heartState, 'insight')
      charismaBonus += resolveTechniqueEffect(heartTechnique, heartState, 'charisma')
    }
    if (p.masterId) { cultivationBonus += 0.02; breakthroughRate += 0.015 }
    if (p.partnerId) { charismaBonus += 1; cultivationBonus += 0.01 }
    if (PLAYER_SECT_ENABLED && p.sect) {
      cultivationBonus += p.sect.buildings.library * 0.01
      powerBonus += p.sect.buildings.dojo * 0.28
      charismaBonus += Math.max(0, p.sect.level - 1)
    }
    p.maxQi = round(maxQi)
    p.maxHp = round(maxHp)
    p.maxStamina = round(maxStamina)
    p.bonusPower = round(powerBonus)
    p.bonusInsight = round(insightBonus)
    p.bonusCharisma = round(charismaBonus)
    p.cultivationBonus = cultivationBonus
    p.breakthroughRate = breakthroughRate
    if (nextRank) {
      p.breakthrough = round(Math.max(p.breakthrough, getCultivationBreakthroughFloor(p.cultivation, nextRank.need)))
    }
    p.qi = clamp(p.qi, 0, p.maxQi)
    p.hp = clamp(p.hp, 0, p.maxHp)
    p.stamina = clamp(p.stamina, 0, p.maxStamina)
    normalizeNumericState()
    bus.emit('state:derived-stats-updated')
  }

  function clearStaleSaveKeys() {
    STALE_SAVE_KEYS.forEach(key => localStorage.removeItem(key))
  }

  function maybeStartOpeningTutorial() {
    if (!shouldAutoStartOpeningTutorial(game.value.story)) return
    setTab('inventory')
    if (startStory(OPENING_TUTORIAL_STORY_ID, { locationId: game.value.player.locationId }, 'overlay')) {
      markOpeningTutorialStarted()
    }
  }

  function saveGame(manual = true) {
    try {
      game.value.lastSavedAt = Date.now()
      normalizeNumericState()
      const snapshot = JSON.stringify(game.value)
      localStorage.setItem(SAVE_KEY, snapshot)
      clearStaleSaveKeys()
      saveState.value = `${manual ? '已手动存档' : '自动存档'} ${new Date(game.value.lastSavedAt).toLocaleTimeString('zh-CN', { hour12: false })}`
      bus.emit('game:saved', { manual })
    } catch {
      saveState.value = '存档失败'
      appendLog('浏览器拒绝写入本地存档。', 'warn')
    }
  }

  function loadGame() {
    try {
      const stored = readStoredSave()
      if (!stored?.raw) { appendLog('当前浏览器里没有可读取的存档。', 'warn'); return }
      game.value = hydrateGameState(JSON.parse(stored.raw))
      normalizeNumericState()
      const snapshot = JSON.stringify(game.value)
      localStorage.setItem(SAVE_KEY, snapshot)
      clearStaleSaveKeys()
      updateDerivedStats()
      selectedLocationId.value = game.value.player.locationId
      meetNpcsAtLocation(game.value.player.locationId)
      syncOpeningTutorialState()
      maybeStartOpeningTutorial()
      saveState.value = `已读取 ${new Date(game.value.lastSavedAt || Date.now()).toLocaleTimeString('zh-CN', { hour12: false })}`
      appendLog(stored.source === 'slot-migrated' ? '旧日行程已并回单一存档。' : '旧日行程已经续上。', 'info')
      bus.emit('game:loaded')
    } catch {
      appendLog('存档损坏或格式不兼容，读取失败。', 'warn')
    }
  }

  function resetGame() {
    game.value = createGameState()
    primeOpeningTutorialState()
    selectedLocationId.value = game.value.player.locationId
    setTab('inventory')
    saveState.value = '新轮回已开启'
    updateDerivedStats()
    meetNpcsAtLocation(game.value.player.locationId)
    appendLog('你在青禾镇街口惊醒，怀里只剩一点零碎盘缠。', 'info')
    maybeStartOpeningTutorial()
    bus.emit('game:reset')
  }

  function initializeGame() {
    if (initialized.value) return
    const stored = readStoredSave()
    let resumedStoredSave = false
    if (stored?.raw) {
      try {
        game.value = hydrateGameState(JSON.parse(stored.raw))
        normalizeNumericState()
        const snapshot = JSON.stringify(game.value)
        localStorage.setItem(SAVE_KEY, snapshot)
        clearStaleSaveKeys()
        saveState.value = '已载入本地存档'
        resumedStoredSave = true
      } catch {
        game.value = createGameState()
        primeOpeningTutorialState()
        saveState.value = '旧存档损坏，已重置'
      }
    } else {
      game.value = createGameState()
      primeOpeningTutorialState()
      saveState.value = '未存档'
    }
    updateDerivedStats()
    selectedLocationId.value = game.value.player.locationId
    if (!resumedStoredSave || shouldAutoStartOpeningTutorial(game.value.story)) {
      setTab('inventory')
    }
    meetNpcsAtLocation(game.value.player.locationId)
    mapTexture.value = buildMapTexture()
    syncOpeningTutorialState()
    appendLog(resumedStoredSave ? '旧日行程已经续上。' : '你在青禾镇街口惊醒，怀里只剩一点零碎盘缠。', 'info')
    maybeStartOpeningTutorial()
    initialized.value = true
    bus.emit('game:initialized')
  }

  const contextAdapter: GameContext = {
    get game() { return game.value },
    bus,
    get selectedLocationId() { return selectedLocationId.value },
    set selectedLocationId(v: string) { selectedLocationId.value = v },
    get speed() { return speed.value },
    set speed(v: number) { speed.value = v },
    get saveState() { return saveState.value },
    set saveState(v: string) { saveState.value = v },
    getCurrentLocation, getSelectedLocation, getRankData, getNextBreakthroughNeed,
    getPlayerPower, getPlayerInsight, getPlayerCharisma,
    getCurrentAffiliation, getPlayerFaction, getSect,
    getNpc, findInventoryEntry, ensurePlayerRelation,
    addItemToInventory, removeItemFromInventory, adjustResource,
    appendLog, getRegionStanding, adjustRegionStanding,
    adjustFactionStanding, adjustRelation, updateDerivedStats,
    createRelationState, deriveLifeStage, createInitialSect, createInitialPlayerFaction,
    createLootBundle, createNPC, createMarketListings, createAuctionListings,
    createInitialTerritories, findRoute,
    saveGame, loadGame, resetGame, initializeGame,
  }
  setContext(contextAdapter)

  return {
    game, selectedLocationId, speed, saveState, mapTexture, feedback, initialized,
    bus,
    player, npcs, combat, world, market, auction, log, story,
    currentLocation, selectedLocation, rankData, hasNextRank, nextBreakthroughNeed,
    cultivationGateNeed, breakthroughReadyNeed, cultivationBreakthroughFloor, realmPowerBonus,
    playerPower, playerInsight, playerCharisma,
    currentAffiliation, playerFaction, sect,
    getCurrentLocation, getSelectedLocation, getRankData, getNextBreakthroughNeed,
    getPlayerPower, getPlayerInsight, getPlayerCharisma,
    getCurrentAffiliation, getPlayerFaction, getSect,
    getNpc, findInventoryEntry, ensurePlayerRelation,
    addItemToInventory, removeItemFromInventory, adjustResource,
    appendLog, getRegionStanding, adjustRegionStanding,
    adjustFactionStanding, adjustRelation,
    updateDerivedStats, clearLog, toggleAutoBattle,
    saveGame, loadGame, resetGame, initializeGame,
    createRelationState, deriveLifeStage, createInitialSect, createInitialPlayerFaction,
    createLootBundle, createNPC, createMarketListings, createAuctionListings,
    createInitialTerritories, findRoute,
  }
})