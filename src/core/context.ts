/*
 * GameContext — the only interface systems use to interact with game state.
 * Vue/Pinia adapter and future CLI adapter each implement this.
 * Systems MUST NOT import useGameStore() or anything from Vue.
 */

import type {
  GameState, NpcState, RelationState, InventoryEntry,
  MarketListing, AuctionListing, SectState, PlayerFactionState,
  TerritoryEntry,
} from '@/types/game'
import type { LocationData, RankData } from '@/config'
import type { EventBus } from '@/core/events'

export interface GameContext {
  /* ─── State ─── */
  /** Mutable game state — systems read and write through helpers below */
  readonly game: GameState

  /* ─── Event bus ─── */
  readonly bus: EventBus

  /* ─── UI / meta state ─── */
  selectedLocationId: string
  speed: number
  saveState: string

  /* ─── Computed-like getters (kept as methods for framework-agnostic compat) ─── */
  getCurrentLocation(): LocationData
  getSelectedLocation(): LocationData
  getRankData(index?: number): RankData
  getNextBreakthroughNeed(): number
  getPlayerPower(): number
  getPlayerInsight(): number
  getPlayerCharisma(): number
  getCurrentAffiliation(): any | null
  getPlayerFaction(): PlayerFactionState | null
  getSect(): SectState | null

  /* ─── Helpers (mutate + emit) ─── */
  getNpc(npcId: string): NpcState | null
  findInventoryEntry(itemId: string): InventoryEntry | null
  ensurePlayerRelation(npcId: string): RelationState
  addItemToInventory(itemId: string, quantity?: number): void
  removeItemFromInventory(itemId: string, quantity?: number): boolean
  adjustResource(key: string, amount: number, maxKey?: string): void
  appendLog(text: string, type?: string): void
  getRegionStanding(locationId?: string): number
  adjustRegionStanding(locationId?: string, amount?: number): void
  adjustFactionStanding(factionId: string | null, amount: number): number
  adjustRelation(npcId: string, delta: Partial<RelationState>): RelationState
  updateDerivedStats(): void

  /* ─── Factories ─── */
  createRelationState(): RelationState
  deriveLifeStage(age: number): string
  createInitialSect(name?: string): SectState
  createInitialPlayerFaction(name?: string): PlayerFactionState
  createLootBundle(amount: number, options?: { minRarity?: number; maxRarity?: number; minTier?: number; maxTier?: number }): InventoryEntry[]
  createNPC(index: number): NpcState
  createMarketListings(location: { id: string; marketTier: number; marketBias: string; tags: string[] }): MarketListing[]
  createAuctionListings(amount: number, playerRankIndex?: number, playerReputation?: number): AuctionListing[]
  createInitialTerritories(): Record<string, TerritoryEntry>
  findRoute(fromId: string, toId: string): string[] | null

  /* ─── Persistence ─── */
  saveGame(manual?: boolean): void
  loadGame(): void
  resetGame(): void
  initializeGame(): void
}

/* ─── Singleton context holder ─── */
let _ctx: GameContext | null = null

export function setContext(ctx: GameContext) { _ctx = ctx }

export function getContext(): GameContext {
  if (!_ctx) throw new Error('[GameContext] context not initialized — call setContext() first')
  return _ctx
}
