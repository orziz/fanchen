import type { StageTab } from '@/composables/useStage'
import { useStage } from '@/composables/useStage'
import {
  OPENING_TUTORIAL_FLAGS,
  OPENING_TUTORIAL_STARTER_ITEMS,
  OPENING_TUTORIAL_STARTING_MONEY,
  OPENING_TUTORIAL_STARTING_TITLE,
  OPENING_TUTORIAL_STORY_ID,
} from '@/config/tutorial'
import { getContext } from '@/core/context'
import type { PlayerState, StoryState } from '@/types/game'

interface StorySceneLike {
  storyId: string
  isTerminal: boolean
}

const OPENING_SAFE_ACTIONS = new Set(['rest', 'meditate', 'train'])

function hasFlag(story: StoryState, flag: string) {
  return Boolean(story.flags[flag])
}

export function isOpeningTutorialStory(storyId: string | null | undefined) {
  return storyId === OPENING_TUTORIAL_STORY_ID
}

export function isOpeningTutorialActive(story: StoryState) {
  return hasFlag(story, OPENING_TUTORIAL_FLAGS.active) && !hasFlag(story, OPENING_TUTORIAL_FLAGS.completed)
}

export function primeOpeningTutorialState() {
  const ctx = getContext()
  const { player, story } = ctx.game
  const { setTab } = useStage()

  story.flags[OPENING_TUTORIAL_FLAGS.active] = true
  story.flags[OPENING_TUTORIAL_FLAGS.started] = false
  story.flags[OPENING_TUTORIAL_FLAGS.mapUnlocked] = false
  story.flags[OPENING_TUTORIAL_FLAGS.affiliationUnlocked] = false
  story.flags[OPENING_TUTORIAL_FLAGS.starterGranted] = false
  story.flags[OPENING_TUTORIAL_FLAGS.completed] = false

  player.title = OPENING_TUTORIAL_STARTING_TITLE
  player.money = OPENING_TUTORIAL_STARTING_MONEY
  player.action = 'rest'
  player.inventory = []
  player.equipment = { weapon: null, armor: null, heart: null }
  ctx.selectedLocationId = 'qinghe'
  setTab('inventory')
}

export function shouldAutoStartOpeningTutorial(story: StoryState) {
  return isOpeningTutorialActive(story)
    && !hasFlag(story, OPENING_TUTORIAL_FLAGS.started)
    && !story.activeStoryId
}

export function markOpeningTutorialStarted() {
  getContext().game.story.flags[OPENING_TUTORIAL_FLAGS.started] = true
}

export function openOpeningTutorialMapView() {
  const ctx = getContext()
  const story = ctx.game.story
  if (!hasFlag(story, OPENING_TUTORIAL_FLAGS.mapUnlocked)) {
    story.flags[OPENING_TUTORIAL_FLAGS.mapUnlocked] = true
    ctx.appendLog('路人替你摊开山河图，把青禾镇周遭的路脉指了出来。', 'info')
  }
  ctx.selectedLocationId = 'qinghe'
  const { setTab } = useStage()
  setTab('map')
}

export function grantOpeningTutorialStarterPack() {
  const ctx = getContext()
  const story = ctx.game.story
  if (hasFlag(story, OPENING_TUTORIAL_FLAGS.starterGranted)) return

  OPENING_TUTORIAL_STARTER_ITEMS.forEach(({ itemId, quantity }) => {
    ctx.addItemToInventory(itemId, quantity)
  })
  story.flags[OPENING_TUTORIAL_FLAGS.starterGranted] = true
  ctx.appendLog('路人把木柄短枪、草膏和口粮塞进你怀里，让你先保住身家。', 'loot')
}

export function openOpeningTutorialAffiliationView() {
  const ctx = getContext()
  const story = ctx.game.story
  if (!hasFlag(story, OPENING_TUTORIAL_FLAGS.affiliationUnlocked)) {
    story.flags[OPENING_TUTORIAL_FLAGS.affiliationUnlocked] = true
    ctx.appendLog('你把心神收住，准备先在青禾找一家势力挂靠。', 'action')
  }
  ctx.selectedLocationId = 'qinghe'
  const { setTab } = useStage()
  setTab('sect')
}

export function syncOpeningTutorialState(options: { announce?: boolean } = {}) {
  const ctx = getContext()
  const { player, story } = ctx.game
  if (!isOpeningTutorialActive(story) || !player.affiliationId) return false

  story.flags[OPENING_TUTORIAL_FLAGS.mapUnlocked] = true
  story.flags[OPENING_TUTORIAL_FLAGS.affiliationUnlocked] = true
  story.flags[OPENING_TUTORIAL_FLAGS.completed] = true
  story.flags[OPENING_TUTORIAL_FLAGS.active] = false

  if (options.announce) {
    ctx.appendLog('你在青禾总算挂上了门路，街面上的其余盘子也开始向你露面。', 'loot')
  }
  return true
}

export function getOpeningTutorialObjective(story: StoryState, player: Pick<PlayerState, 'affiliationId'>) {
  if (!isOpeningTutorialActive(story)) return null
  if (!hasFlag(story, OPENING_TUTORIAL_FLAGS.mapUnlocked)) return '先听路人把眼前这条活路说清'
  if (!hasFlag(story, OPENING_TUTORIAL_FLAGS.affiliationUnlocked)) return '顺着山河图认清青禾，再去找门路'
  if (!player.affiliationId) return '去势力页投一家门路，先在青禾站住脚'
  return '你已经在青禾挂了名号，街面上的门路正在慢慢铺开'
}

export function getStageTabLockReason(tabId: StageTab, story: StoryState, player: Pick<PlayerState, 'affiliationId'>) {
  if (!isOpeningTutorialActive(story)) return null
  if (tabId === 'story') return null
  if (tabId === 'inventory') return null
  if (tabId === 'map') {
    return hasFlag(story, OPENING_TUTORIAL_FLAGS.mapUnlocked) ? null : '先听路人把路说清，再看山河图。'
  }
  if (tabId === 'sect') {
    return hasFlag(story, OPENING_TUTORIAL_FLAGS.affiliationUnlocked) ? null : '先把护身和口粮收稳，再去青禾找门路。'
  }
  return player.affiliationId ? null : '先在青禾挂靠一方势力，别的门路才会慢慢露出来。'
}

export function getManualActionLockReason(actionKey: string, story: StoryState, player: Pick<PlayerState, 'affiliationId'>) {
  if (!isOpeningTutorialActive(story)) return null
  if (player.affiliationId || OPENING_SAFE_ACTIONS.has(actionKey)) return null
  return '先在青禾挂一家势力，再去碰更杂的门路。'
}

export function canDismissStoryScene(story: StoryState, scene: StorySceneLike | null) {
  if (!scene || !isOpeningTutorialStory(scene.storyId)) return true
  return scene.isTerminal || !isOpeningTutorialActive(story)
}