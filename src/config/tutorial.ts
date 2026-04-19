export interface TutorialStarterItem {
  itemId: string
  quantity: number
}

export const OPENING_TUTORIAL_STORY_ID = 'opening-guidance'

export const OPENING_TUTORIAL_FLAGS = {
  active: 'tutorial.opening.active',
  started: 'tutorial.opening.started',
  mapUnlocked: 'tutorial.opening.map-unlocked',
  affiliationUnlocked: 'tutorial.opening.affiliation-unlocked',
  starterGranted: 'tutorial.opening.starter-granted',
  completed: 'tutorial.opening.completed',
} as const

export const OPENING_TUTORIAL_SCRIPT_IDS = {
  openMap: 'tutorial-open-map',
  grantStarterPack: 'tutorial-grant-starter-pack',
  openAffiliation: 'tutorial-open-affiliation',
} as const

export const OPENING_TUTORIAL_STARTING_MONEY = 6
export const OPENING_TUTORIAL_STARTING_TITLE = '落魄旅人'

export const OPENING_TUTORIAL_STARTER_ITEMS: TutorialStarterItem[] = [
  { itemId: 'wood-spear', quantity: 1 },
  { itemId: 'herb-paste', quantity: 1 },
  { itemId: 'spirit-grain', quantity: 2 },
  { itemId: 'mist-herb', quantity: 1 },
]