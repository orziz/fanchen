export {
	SAVE_KEY,
	LEGACY_SAVE_KEYS,
	WINDOW_LAYOUT_KEY,
	LEGACY_WINDOW_LAYOUT_KEYS,
	LOOP_INTERVALS,
	AUTO_SAVE_INTERVAL,
	MAX_LOG,
	PLAYER_SECT_ENABLED,
	PLAYER_SECT_CREATE_BLOCK_TEXT,
	PLAYER_SECT_FROZEN_TEXT,
	SPEED_OPTIONS,
	TIME_LABELS,
	RARITY_META,
	RANKS,
	MODE_OPTIONS,
	ACTION_META,
} from './constants'
export type { RankData, ModeOption, ActionMeta } from './constants'

export {
	REALM_POWER_PER_RANK,
	getCultivationGateNeed,
	getBreakthroughReadyNeed,
	getRealmPowerBonus,
	getCultivationBreakthroughFloor,
} from './progression'

export {
	getCultivationStatusCopy,
	getBreakthroughStatusCopy,
	getGrowthProgressNote,
	getBreakthroughHintCopy,
	getBreakthroughDisabledReason,
	getBreakthroughActionDescription,
	describeIndustryAssetEffect,
	describeIndustryNextUpgrade,
	describeIndustryUpgradeResult,
} from './text'

export { ITEMS, ITEM_MAP, DISTRIBUTABLE_ITEMS, canUseItemDirectly, getItem, getItemUsageSummary, getManualItemBySkillId, hasAssetClaimEffect } from './items'
export { getKnowledgeItemById } from './items'
export type { ItemData, ManualCategory } from './items'

export { KNOWLEDGE_ENTRIES, KNOWLEDGE_MAP, getKnowledge } from './knowledge'
export type { KnowledgeData } from './knowledge'

export {
	TECHNIQUES,
	TECHNIQUE_MAP,
	TECHNIQUE_DISCOVERY_RECIPES,
	getTechniqueResolvedEffectValue,
	getTechnique,
	getTechniqueByItemId,
	getTechniqueBookItem,
} from './techniques'
export type { TechniqueData, TechniqueDiscoveryRecipe, TechniqueScribeCost } from './techniques'

export { LOCATIONS, LOCATION_MAP, getLocation } from './world'
export type { LocationData } from './world'

export { PERSONALITIES, NPC_ARCHETYPES, RELATION_ROLES, SECT_NAME_PARTS, SECT_BUILDINGS } from './npcs'
export type { PersonalityData, NpcArchetype, SectBuildingDef } from './npcs'

export { MONSTER_TEMPLATES, MONSTER_AFFIXES, REALM_TEMPLATES } from './combat'
export type { MonsterTemplate, MonsterAffix, RealmTemplate, RealmBoss } from './combat'

export { FACTIONS, FACTION_MAP, getFactionData, PROPERTY_DEFS, PROPERTY_MAP, getPropertyDefData, CROPS, CROP_MAP, getCropData, CRAFT_RECIPES, RECIPE_MAP, getRecipeData } from './economy'
export type { FactionData, PropertyDef, CropData, CraftRecipe, CraftInput } from './economy'

export { WORLD_EVENT_TEMPLATES, TRAVEL_EVENT_TEMPLATES, SOCIAL_EVENT_TEMPLATES, SECT_EVENT_TEMPLATES } from './events'
export type { WorldEventTemplate, TravelEventTemplate, SocialEventTemplate, SectEventTemplate } from './events'

export { STORY_DEFINITIONS, STORY_MAP } from './story'
export {
	OPENING_TUTORIAL_FLAGS,
	OPENING_TUTORIAL_SCRIPT_IDS,
	OPENING_TUTORIAL_STARTER_ITEMS,
	OPENING_TUTORIAL_STARTING_MONEY,
	OPENING_TUTORIAL_STARTING_TITLE,
	OPENING_TUTORIAL_STORY_ID,
} from './tutorial'
export type {
	StoryPresentationMode,
	StoryBindingKey,
	StorySpeakerMode,
	StoryTriggerKind,
	StoryTriggerScope,
	StoryConditionSpec,
	StoryEffectSpec,
	StoryChoiceSpec,
	StoryNodeSpec,
	StoryTriggerSpec,
	StoryDefinition,
} from './story'
