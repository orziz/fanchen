import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, LearnedTechniqueState, RelationState } from '@/types/game'
import { useBooks } from '@/composables/useBooks'
import {
  FACTIONS,
  FACTION_MAP,
  LEGACY_SAVE_KEYS,
  LEGACY_WINDOW_LAYOUT_KEYS,
  LOCATION_MAP,
  PLAYER_SECT_ENABLED,
  RANKS,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  WINDOW_LAYOUT_KEY,
  getRealmPowerBonus,
} from '@/config'
import { clamp, round, findRoute } from '@/utils'
import { bus } from '@/core/events'
import { normalizeGameNumericState, resolveCarriedDelta } from '@/core/integerProgress'
import { setContext, type GameContext } from '@/core/context'
import { meetNpcsAtLocation } from '@/systems/npc'
import { ensureOpportunities } from '@/systems/life/time'
import { startLifeEvent } from '@/systems/life/events'
import { legacyFor } from '@/systems/life/legacy'
import { applyDerivedStats } from '@/stores/game/derived'
import { formatShortDate } from '@/config/calendar'
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
} from '@/stores/game/factories'
import { OBSOLETE_SAVE_STORAGE_KEYS, hydrateGameState, readLifeSave } from '@/stores/game/hydration'
import { applyOrigin, isPlayableSave, looksLikeSave, type NewLifeOptions } from '@/stores/game/origin'

export type { NewLifeOptions } from '@/stores/game/origin'

// 浮窗布局已随旧界面退役，残留的布局记录与旧存档键一并清掉。
const STALE_SAVE_KEYS = [...LEGACY_SAVE_KEYS, ...OBSOLETE_SAVE_STORAGE_KEYS, WINDOW_LAYOUT_KEY, ...LEGACY_WINDOW_LAYOUT_KEYS]

export const useGameStore = defineStore('game', () => {
  const { closeBook } = useBooks()
  const game = ref<GameState>(createGameState())
  const selectedLocationId = ref('qinghe')
  const speed = ref(1)
  const saveState = ref('未存档')
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
    bus.emit('state:resource-changed', { key, amount, value: p[key] })
  }

  function appendLog(text: string, type = 'info') {
    const w = game.value.world
    const stamp = formatShortDate(w.day)
    // 同一日里一字不差的话只记一次。
    if (game.value.log[0]?.text === text && game.value.log[0]?.stamp === stamp) return
    game.value.log.unshift({ stamp, text, type })
    if (game.value.log.length > 80) game.value.log.length = 80
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
    applyDerivedStats(game.value.player)
    bus.emit('state:derived-stats-updated')
  }

  /** 把当前进度规整后落盘，并清掉旧版本遗留的存档键。 */
  function commitSnapshot() {
    normalizeNumericState()
    persistSnapshot(JSON.stringify(game.value))
    STALE_SAVE_KEYS.forEach(key => localStorage.removeItem(key))
  }

  function persistSnapshot(snapshot: string) {
    const previousSnapshot = localStorage.getItem(SAVE_KEY)
    if (previousSnapshot && previousSnapshot !== snapshot) {
      try {
        JSON.parse(previousSnapshot)
        localStorage.setItem(SAVE_BACKUP_KEY, previousSnapshot)
      } catch {
        /* Keep the last known-good backup when the primary record is corrupt. */
      }
    }
    localStorage.setItem(SAVE_KEY, snapshot)
  }

  function saveGame(manual = true) {
    try {
      game.value.lastSavedAt = Date.now()
      commitSnapshot()
      saveState.value = `${manual ? '已手动存档' : '自动存档'} ${new Date(game.value.lastSavedAt).toLocaleTimeString('zh-CN', { hour12: false })}`
      if (manual) feedback.value = { text: '当前进度已写入本地存档。', type: 'action' }
      bus.emit('game:saved', { manual })
    } catch {
      saveState.value = '存档失败'
      appendLog('浏览器拒绝写入本地存档。', 'warn')
    }
  }

  function loadGame() {
    try {
      const stored = readLifeSave()
      if (!stored?.raw) { appendLog('当前浏览器里没有可读取的存档。', 'warn'); return }
      game.value = hydrateGameState(JSON.parse(stored.raw))
      commitSnapshot()
      updateDerivedStats()
      selectedLocationId.value = game.value.player.locationId
      meetNpcsAtLocation(game.value.player.locationId)
      ensureOpportunities()
      saveState.value = `已读取 ${new Date(game.value.lastSavedAt || Date.now()).toLocaleTimeString('zh-CN', { hour12: false })}`
      appendLog(
        stored.source === 'slot-migrated'
          ? '旧日行程已并回单一存档。'
          : stored.source === 'backup'
            ? '主存档不可用，已从上一份有效备份恢复。'
            : '旧日行程已经续上。',
        stored.source === 'backup' ? 'warn' : 'info',
      )
      bus.emit('game:loaded')
    } catch {
      appendLog('存档损坏或格式不兼容，读取失败。', 'warn')
    }
  }

  /** 开一世新的：可带上一世的传承与世代数。 */
  function resetGame(options: NewLifeOptions | null = null, inherit: { legacy: GameState['life']['legacy']; generation: number } | null = null) {
    game.value = createGameState()
    const p = game.value.player
    if (options) applyOrigin(game.value, options, addItemToInventory)
    if (inherit) {
      game.value.life.generation = inherit.generation
      game.value.life.legacy = inherit.legacy
      p.insight += inherit.legacy.insight
      p.power += inherit.legacy.power
      inherit.legacy.items.forEach(entry => addItemToInventory(entry.itemId, entry.quantity))
    }
    selectedLocationId.value = p.locationId
    closeBook()
    saveState.value = '新轮回已开启'
    updateDerivedStats()
    meetNpcsAtLocation(p.locationId)
    ensureOpportunities()
    startLifeEvent('opening')
    saveGame(false)
    saveState.value = '新轮回已保存'
    initialized.value = true
    bus.emit('game:reset')
  }

  function hasStoredSave() {
    return Boolean(readLifeSave()?.raw)
  }

  /** 寿尽之后再入轮回：换个名字，带着上一世的传承从青禾街口重新醒来。 */
  function startNextLife(options: NewLifeOptions) {
    const ended = game.value.life.ended
    resetGame(options, ended ? { legacy: legacyFor(ended), generation: game.value.life.generation + 1 } : null)
  }

  /** 导出当前进度为 JSON 文本，供玩家另存为文件。 */
  function exportSave() {
    game.value.lastSavedAt = Date.now()
    normalizeNumericState()
    return JSON.stringify(game.value)
  }

  /**
   * 导入存档文本：先在候选副本上修复、校验形状并试算一遍派生属性，全部通过才落盘读入；
   * 任何一步失败都原样保留当前进度、主档与备份。
   */
  function importSave(raw: string) {
    const parsed = JSON.parse(raw)
    if (!looksLikeSave(parsed)) throw new Error('invalid_save')
    const candidate = hydrateGameState(parsed)
    if (!isPlayableSave(candidate)) throw new Error('invalid_save')
    const current = game.value
    let snapshot = ''
    try {
      game.value = candidate
      normalizeNumericState()
      updateDerivedStats()
      snapshot = JSON.stringify(game.value)
    } finally {
      game.value = current
    }
    persistSnapshot(snapshot)
    loadGame()
    initialized.value = true
  }

  function initializeGame() {
    if (initialized.value) return
    const stored = readLifeSave()
    let resumed = false
    if (stored?.raw) {
      try {
        game.value = hydrateGameState(JSON.parse(stored.raw))
        commitSnapshot()
        saveState.value = stored.source === 'backup' ? '已从备份恢复' : '已载入本地存档'
        resumed = true
      } catch {
        game.value = createGameState()
        saveState.value = '旧存档损坏，已重置'
      }
    } else {
      game.value = createGameState()
      saveState.value = '未存档'
    }
    updateDerivedStats()
    selectedLocationId.value = game.value.player.locationId
    closeBook()
    meetNpcsAtLocation(game.value.player.locationId)
    ensureOpportunities()
    if (resumed) appendLog('旧日行程已经续上。', 'info')
    else startLifeEvent('opening')
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
    game, selectedLocationId, speed, saveState, feedback, initialized,
    bus,
    player, npcs, combat, world, market, auction, log, story,
    currentLocation, selectedLocation, rankData, hasNextRank, nextBreakthroughNeed,
    realmPowerBonus,
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
    saveGame, loadGame, resetGame, initializeGame, startNewLife: resetGame, startNextLife, hasStoredSave, exportSave, importSave,
    createRelationState, deriveLifeStage, createInitialSect, createInitialPlayerFaction,
    createLootBundle, createNPC, createMarketListings, createAuctionListings,
    createInitialTerritories, findRoute,
  }
})