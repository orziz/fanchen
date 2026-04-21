import type {
  AssetState,
  GameState,
  LearnedTechniqueState,
  LogEntry,
  NpcState,
  PlayerState,
  SectState,
  StoryHistoryEntry,
  StoryProgressEntry,
  StorySuspendedEntry,
  TerritoryEntry,
} from '@/types/game'
import {
  LEGACY_SAVE_KEYS,
  PLAYER_SECT_ENABLED,
  MAX_LOG,
  SAVE_KEY,
  getTechnique,
  getTechniqueByItemId,
} from '@/config'
import { normalizeGameNumericState } from '@/core/integerProgress'
import { ensureArray } from '@/utils'
import {
  createGameState,
  createInitialPlayerFaction,
  createInitialSect,
  createInitialTechniqueState,
  createNPC,
  createRelationState,
} from './factories'

type TeachingState = SectState['teachings'][number]
type LegacyEquipmentState = Partial<PlayerState['equipment']> & { manual?: string | null | undefined }

const OBSOLETE_SAVE_SLOT_KEYS = [
  `${SAVE_KEY}-spring`,
  `${SAVE_KEY}-summer`,
  `${SAVE_KEY}-autumn`,
  `${SAVE_KEY}-spring-backup`,
  `${SAVE_KEY}-summer-backup`,
  `${SAVE_KEY}-autumn-backup`,
] as const

export const OBSOLETE_SAVE_STORAGE_KEYS = [`${SAVE_KEY}-active-slot`, ...OBSOLETE_SAVE_SLOT_KEYS] as const

export interface StoredSaveRecord {
  raw: string
  source: 'primary' | 'slot-migrated' | 'legacy'
}

function readLegacyEquipment(rawPlayer: Partial<PlayerState> | undefined): LegacyEquipmentState {
  return (rawPlayer?.equipment || {}) as unknown as LegacyEquipmentState
}

function hydrateAssetCollection(value: unknown): AssetState[] {
  const assetDefaults: Pick<AssetState, 'level' | 'managerNpcId' | 'automationTargetId' | 'pendingIncome'> = {
    level: 1,
    managerNpcId: null,
    automationTargetId: null,
    pendingIncome: 0,
  }

  return ensureArray<Partial<AssetState>>(value).map(asset => ({
    ...assetDefaults,
    ...asset,
  }) as AssetState)
}

function hydrateNpcIntel(rawPlayer: Partial<PlayerState> | undefined): PlayerState['npcIntel'] {
  return Object.fromEntries(
    Object.entries(rawPlayer?.npcIntel || {}).flatMap(([npcId, source]) => (
      source === 'heard' || source === 'met' ? [[npcId, source]] : []
    )),
  )
}

function isStoryPresentation(value: unknown): value is StorySuspendedEntry['presentation'] {
  return value === 'overlay' || value === 'rail' || value === 'embedded' || value === null
}

function hydrateStorySuspended(rawStory: Partial<GameState['story']> | undefined) {
  const suspended = rawStory?.suspended as Partial<StorySuspendedEntry> | null | undefined
  if (!suspended || typeof suspended !== 'object') return null
  if (typeof suspended.storyId !== 'string' || typeof suspended.nodeId !== 'string' || typeof suspended.progressKey !== 'string') {
    return null
  }

  const rawBindings = (suspended.bindings || {}) as Record<string, unknown>

  return {
    storyId: suspended.storyId,
    nodeId: suspended.nodeId,
    progressKey: suspended.progressKey,
    presentation: isStoryPresentation(suspended.presentation) ? suspended.presentation : null,
    bindings: {
      npcId: typeof rawBindings.npcId === 'string' ? rawBindings.npcId : null,
      locationId: typeof rawBindings.locationId === 'string' ? rawBindings.locationId : null,
    },
  } satisfies StorySuspendedEntry
}

function hydrateTerritories(
  rawTerritories: Partial<Record<string, Partial<TerritoryEntry>>> | undefined,
  defaults: Record<string, TerritoryEntry>,
) {
  return Object.fromEntries(
    Object.entries(defaults).map(([locationId, territory]) => [
      locationId,
      {
        ...territory,
        ...((rawTerritories || {})[locationId] || {}),
      },
    ]),
  )
}

function parseStoredSnapshot(raw: string) {
  try {
    return JSON.parse(raw) as Partial<GameState>
  } catch {
    return null
  }
}

function readMainSaveRecord(): StoredSaveRecord | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw && parseStoredSnapshot(raw)) {
    return { raw, source: 'primary' }
  }
  return null
}

function readObsoleteSlotRecord(): StoredSaveRecord | null {
  const candidates = OBSOLETE_SAVE_SLOT_KEYS.flatMap((key) => {
    const raw = localStorage.getItem(key)
    const snapshot = raw ? parseStoredSnapshot(raw) : null
    return raw && snapshot ? [{ raw, lastSavedAt: Number(snapshot.lastSavedAt) || 0 }] : []
  }).sort((left, right) => right.lastSavedAt - left.lastSavedAt)

  if (!candidates.length) return null
  return { raw: candidates[0].raw, source: 'slot-migrated' }
}

export function hydrateLearnedTechniques(rawPlayer: Partial<PlayerState> | undefined, learnedDay = 0) {
  const learned: Record<string, LearnedTechniqueState> = {}
  const rawLearned = (rawPlayer?.learnedTechniques || {}) as Record<string, Partial<LearnedTechniqueState>>

  Object.entries(rawLearned).forEach(([skillId, rawState]) => {
    const technique = getTechnique(skillId)
    if (!technique) return
    const rawMastery = Math.max(0, Number(rawState.mastery) || 0)
    const rawStage = Number(rawState.stage) || 1
    const legacyMastered = rawStage > 1 || rawMastery >= technique.masteryNeed
    learned[skillId] = {
      ...createInitialTechniqueState(skillId, Number(rawState.learnedDay) || learnedDay),
      stage: 1,
      mastery: legacyMastered ? technique.masteryNeed : Math.min(technique.masteryNeed, rawMastery),
    }
  })

  const rawEquipment = readLegacyEquipment(rawPlayer)
  const legacyManualId = typeof rawEquipment.manual === 'string' ? rawEquipment.manual : null
  const heartId = typeof rawEquipment.heart === 'string'
    ? rawEquipment.heart
    : legacyManualId ? getTechniqueByItemId(legacyManualId)?.id || null : null

  if (heartId && getTechnique(heartId) && !learned[heartId]) {
    learned[heartId] = createInitialTechniqueState(heartId, learnedDay)
  }

  return learned
}

export function hydrateHeartSlot(
  rawPlayer: Partial<PlayerState> | undefined,
  learnedTechniques: Record<string, LearnedTechniqueState>,
) {
  const rawEquipment = readLegacyEquipment(rawPlayer)
  const explicitHeart = typeof rawEquipment.heart === 'string' ? rawEquipment.heart : null
  const legacyManualId = typeof rawEquipment.manual === 'string' ? rawEquipment.manual : null
  const migratedHeart = explicitHeart || (legacyManualId ? getTechniqueByItemId(legacyManualId)?.id || null : null)
  if (migratedHeart && learnedTechniques[migratedHeart]) return migratedHeart
  return Object.keys(learnedTechniques).find((skillId) => getTechnique(skillId)?.kind === 'heart') || null
}

export function hydrateSectSkillLibrary(rawSect: Partial<SectState> | null | undefined) {
  const rawSkillLibrary = Array.isArray((rawSect as Record<string, unknown> | null | undefined)?.skillLibrary)
    ? (rawSect!.skillLibrary as string[])
    : ensureArray<string>((rawSect as Record<string, unknown> | null | undefined)?.manualLibrary as string[] | undefined)

  return [...new Set(rawSkillLibrary.map((entry) => {
    if (getTechnique(entry)) return entry
    return getTechniqueByItemId(entry)?.id || ''
  }).filter(Boolean))]
}

export function hydrateTeachings(rawSect: Partial<SectState> | null | undefined) {
  const rawTeachings = ensureArray<Record<string, unknown>>((rawSect as Record<string, unknown> | null | undefined)?.teachings as Record<string, unknown>[] | undefined)
  return rawTeachings.map((entry) => {
    const directSkillId = typeof entry.skillId === 'string' ? entry.skillId : ''
    const legacyManualId = typeof entry.manualId === 'string' ? entry.manualId : ''
    const skillId = directSkillId || (legacyManualId ? getTechniqueByItemId(legacyManualId)?.id || '' : '')
    if (!skillId || !getTechnique(skillId) || typeof entry.npcId !== 'string') return null
    return {
      npcId: entry.npcId,
      skillId,
      stage: Math.max(0, Number(entry.stage) || 0),
      mastery: Math.max(0, Number(entry.mastery ?? entry.progress ?? 0) || 0),
    } satisfies TeachingState
  }).filter((entry): entry is TeachingState => Boolean(entry))
}

export function hydrateGameState(raw: Partial<GameState> = {}): GameState {
  const fresh = createGameState()
  const rawNpcs = ensureArray<NpcState>(raw.npcs)
  const rawSect = raw.player?.sect
  const rawPF = raw.player?.playerFaction
  const learnedTechniques = hydrateLearnedTechniques(raw.player, Number(raw.world?.day) || 0)
  const heartSlot = hydrateHeartSlot(raw.player, learnedTechniques)
  const npcIntel = hydrateNpcIntel(raw.player)
  const skillLibrary = hydrateSectSkillLibrary(rawSect)
  const teachings = hydrateTeachings(rawSect)
  const rawEquipment = readLegacyEquipment(raw.player)
  const defaultSect = rawSect ? createInitialSect(rawSect.name || '') : null
  const defaultPF = rawPF ? createInitialPlayerFaction(rawPF.name || '') : null
  const rawStoryProgress = raw.story?.progress || {}
  const storyProgressDefaults: StoryProgressEntry = {
    status: 'idle',
    seenNodeIds: [],
    triggerCount: 0,
    lastNodeId: null,
  }

  const game: GameState = {
    ...fresh, ...raw,
    player: {
      ...fresh.player, ...raw.player,
      equipment: {
        weapon: typeof rawEquipment?.weapon === 'string'
          ? rawEquipment.weapon
          : fresh.player.equipment.weapon,
        armor: typeof rawEquipment?.armor === 'string'
          ? rawEquipment.armor
          : fresh.player.equipment.armor,
        heart: heartSlot,
      },
      learnedTechniques,
      learnedKnowledges: Object.fromEntries(
        Object.entries(raw.player?.learnedKnowledges || {}).map(([knowledgeId, learnedDay]) => [knowledgeId, Number(learnedDay) || 0]),
      ),
      assets: { ...fresh.player.assets, ...(raw.player?.assets || {}) },
      skills: { ...fresh.player.skills, ...(raw.player?.skills || {}) },
      factionStanding: { ...fresh.player.factionStanding, ...(raw.player?.factionStanding || {}) },
      regionStanding: { ...fresh.player.regionStanding, ...(raw.player?.regionStanding || {}) },
      npcIntel: { ...fresh.player.npcIntel, ...npcIntel },
      relations: { ...fresh.player.relations, ...(raw.player?.relations || {}) },
      stats: { ...fresh.player.stats, ...(raw.player?.stats || {}) },
      affiliationTasks: Array.isArray(raw.player?.affiliationTasks) ? raw.player!.affiliationTasks : [],
      affiliationTaskDay: raw.player?.affiliationTaskDay || 0,
      tradeRun: raw.player?.tradeRun || null,
      travelPlan: raw.player?.travelPlan || null,
      sect: rawSect ? {
        ...defaultSect!, ...rawSect,
        buildings: { ...defaultSect!.buildings, ...(rawSect.buildings || {}) },
        skillLibrary,
        teachings,
      } : null,
      playerFaction: rawPF ? {
        ...defaultPF!, ...rawPF,
        crew: { ...defaultPF!.crew, ...(rawPF.crew || {}) },
        branches: { ...defaultPF!.branches, ...(rawPF.branches || {}) },
      } : null,
    },
    world: {
      ...fresh.world, ...raw.world,
      factionFavor: { ...fresh.world.factionFavor, ...(raw.world?.factionFavor || {}) },
      factions: { ...fresh.world.factions, ...(raw.world?.factions || {}) },
      territories: hydrateTerritories(raw.world?.territories as Partial<Record<string, Partial<TerritoryEntry>>> | undefined, fresh.world.territories),
      realm: { ...fresh.world.realm, ...(raw.world?.realm || {}) },
    },
    combat: { ...fresh.combat, ...(raw.combat || {}) },
    story: {
      ...fresh.story, ...(raw.story || {}),
      bindings: { ...fresh.story.bindings, ...(raw.story?.bindings || {}) },
      suspended: hydrateStorySuspended(raw.story),
      progress: Object.fromEntries(
        Object.entries(rawStoryProgress).map(([key, value]) => {
          const entry = value as Partial<StoryProgressEntry> | undefined
          return [key, {
            ...storyProgressDefaults,
            ...(entry || {}),
            seenNodeIds: ensureArray<string>(entry?.seenNodeIds),
          }]
        }),
      ),
      flags: { ...fresh.story.flags, ...(raw.story?.flags || {}) },
      history: ensureArray<StoryHistoryEntry>(raw.story?.history).slice(0, 24).map(entry => ({
        storyId: entry.storyId || '',
        progressKey: entry.progressKey || entry.storyId || '',
        nodeId: entry.nodeId || '',
        title: entry.title || '未命名剧情',
        speaker: entry.speaker || '',
        text: entry.text || '',
        day: Number(entry.day) || 0,
        hour: Number(entry.hour) || 0,
      })),
    },
    market: raw.market || fresh.market,
    auction: raw.auction || fresh.auction,
    migrationFlags: { ...fresh.migrationFlags, ...(raw.migrationFlags || {}) },
    npcs: rawNpcs.length
      ? rawNpcs.map((npc, i) => ({
          ...createNPC(i + 80), ...npc,
          lifeEvents: ensureArray<string>(npc.lifeEvents).length ? npc.lifeEvents : [npc.lastEvent || '初入江湖'],
          relation: { ...createRelationState(), ...(npc.relation || {}) },
          travelPlan: npc.travelPlan || null,
        }))
      : fresh.npcs,
    log: ensureArray<LogEntry>(raw.log).slice(0, MAX_LOG),
  }

  game.player.assets.farms = hydrateAssetCollection(game.player.assets.farms)
  game.player.assets.workshops = hydrateAssetCollection(game.player.assets.workshops)
  game.player.assets.shops = hydrateAssetCollection(game.player.assets.shops)

  if (!PLAYER_SECT_ENABLED && game.player.mode === 'sect') {
    game.player.mode = 'balanced'
  }
  normalizeGameNumericState(game)

  return game
}

export function readStoredSave(): StoredSaveRecord | null {
  const mainRecord = readMainSaveRecord()
  if (mainRecord) return mainRecord

  const obsoleteSlotRecord = readObsoleteSlotRecord()
  if (obsoleteSlotRecord) return obsoleteSlotRecord

  const keys = [...LEGACY_SAVE_KEYS]
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw && parseStoredSnapshot(raw)) return { raw, source: 'legacy' }
  }
  return null
}