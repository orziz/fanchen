/**
 * 线描图标：24×24 画幅，统一以描边绘制（currentColor），笔画圆头，像细笔勾勒。
 * 带 `fill:` 前缀的路径以填充方式绘制。
 */
export const ICONS = {
  /* 资源与属性 */
  stone: 'M12 2.5 L18.5 8 L12 21.5 L5.5 8 Z M5.5 8 H18.5 M9 8 L12 21.5 L15 8 M9 8 L12 2.5 L15 8',
  fame: 'M6 21 V3 M6 4 H17.5 L15 7.5 L17.5 11 H6',
  power: 'M20 4 L10.5 13.5 M20 4 H16.5 M20 4 V7.5 M6.8 12.2 L11.8 17.2 M9.3 14.7 L4 20',
  insight: 'M2.5 12 C5.5 6.5 18.5 6.5 21.5 12 C18.5 17.5 5.5 17.5 2.5 12 Z M12 9.2 A2.8 2.8 0 1 0 12 14.8 A2.8 2.8 0 1 0 12 9.2 Z',
  charisma: 'M12 20 C12 20 4 14.5 4 9 A4 4 0 0 1 12 7 A4 4 0 0 1 20 9 C20 14.5 12 20 12 20 Z',
  hp: 'M12 3 C12 3 5.5 10.5 5.5 14.5 A6.5 6.5 0 0 0 18.5 14.5 C18.5 10.5 12 3 12 3 Z M9 14.5 A3 3 0 0 0 12 17.5',
  qi: 'M12 3 A9 9 0 1 1 12 21 A9 9 0 1 1 12 3 Z M12 3 A4.5 4.5 0 0 1 12 12 A4.5 4.5 0 0 0 12 21 M12 7 V7.2 M12 16.8 V17',
  stamina: 'M12 21 C8 21 6 18 6 15 C6 11 10 9 10 5 C12 7 13 8.5 13 10.5 C14 9.5 14.5 8.5 14.5 7.5 C17 9.5 18 12 18 15 C18 18 16 21 12 21 Z',
  cultivation: 'M12 21 V11 M12 11 C12 7 9 4 5 4 C5 8 8 11 12 11 Z M12 11 C12 7 15 4 19 4 C19 8 16 11 12 11 Z M8 21 H16',
  sun: 'M12 7.5 A4.5 4.5 0 1 0 12 16.5 A4.5 4.5 0 1 0 12 7.5 Z M12 2.5 V4.5 M12 19.5 V21.5 M2.5 12 H4.5 M19.5 12 H21.5 M5.3 5.3 L6.7 6.7 M17.3 17.3 L18.7 18.7 M5.3 18.7 L6.7 17.3 M17.3 6.7 L18.7 5.3',
  moon: 'M19 15.5 A8 8 0 1 1 8.5 5 A6.5 6.5 0 0 0 19 15.5 Z',
  cloud: 'M7 18.5 H17.5 A3.5 3.5 0 0 0 17.5 11.5 A5 5 0 0 0 8 10 A4.3 4.3 0 0 0 7 18.5 Z',
  rain: 'M7 14.5 H17.5 A3.5 3.5 0 0 0 17.5 7.5 A5 5 0 0 0 8 6 A4.3 4.3 0 0 0 7 14.5 Z M8 17.5 L7 20 M12 17.5 L11 20 M16 17.5 L15 20',
  wind: 'M3 9 H14 A3 3 0 1 0 11 6 M3 13 H18 A3 3 0 1 1 15 16 M3 17 H9',
  snow: 'M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5 M10 4.5 L12 6.5 L14 4.5 M10 19.5 L12 17.5 L14 19.5',
  fog: 'M3 8 H21 M5 12 H19 M3 16 H21 M7 20 H17',
  storm: 'M7 13.5 H17.5 A3.5 3.5 0 0 0 17.5 6.5 A5 5 0 0 0 8 5 A4.3 4.3 0 0 0 7 13.5 Z M12.5 13.5 L10 18 H13.5 L11.5 22',

  /* 行动 */
  rest: 'M3 9 C6 6.5 9 11.5 12 9 C15 6.5 18 11.5 21 9 M3 15 C6 12.5 9 17.5 12 15 C15 12.5 18 17.5 21 15',
  meditate: 'M12 20 C7 20 3.5 17 3 13 C6 13 9 14.5 12 20 C15 14.5 18 13 21 13 C20.5 17 17 20 12 20 Z M12 20 C9.5 15.5 9.5 10 12 5 C14.5 10 14.5 15.5 12 20 Z',
  train: 'M6.5 10.5 H17.5 L19 20.5 H5 Z M9 10.5 V7.5 A3 3 0 0 1 15 7.5 V10.5 M9 15.5 H15',
  trade: 'M12 3 A9 9 0 1 1 12 21 A9 9 0 1 1 12 3 Z M9.5 9.5 H14.5 V14.5 H9.5 Z',
  hunt: 'M3.5 20.5 L15.5 8.5 M15.5 8.5 L20.5 3.5 L19 9.5 L14.5 10 Z M13 11 L11 9 M5.5 16.5 L7.5 18.5',
  quest: 'M6 4 H16 A2 2 0 0 1 18 6 V20 H8 A2 2 0 0 1 6 18 Z M6 4 A2 2 0 0 0 4 6 V7 H6 M9.5 9 H15 M9.5 12.5 H15 M9.5 16 H13',
  auction: 'M13.5 3.5 L20.5 10.5 M10.8 6.2 L17.8 13.2 M12.2 4.8 L19.2 11.8 M14.3 9.7 L5 19 M3.5 20.5 H11',
  breakthrough: 'M13 2.5 L6 13.5 H11.5 L10.5 21.5 L18 10 H12.5 Z',
  sect: 'M3 6 H21 M5 6 V20 M19 6 V20 M4 10 H20 M9 10 V20 M15 10 V20 M2.5 4 L12 2.5 L21.5 4',
  travel: 'M5 20 L10 4 M19 20 L14 4 M12 7 V9 M12 12 V14 M12 17 V19',
  combat: 'M4 4 L14 14 M4 4 H7.5 M4 4 V7.5 M20 4 L10 14 M20 4 H16.5 M20 4 V7.5 M9 12 L6 15 L4.5 19.5 L9 18 L12 15 M15 12 L18 15 L19.5 19.5 L15 18 L12 15',
  flee: 'M20 12 H6 M11 6 L5 12 L11 18',
  defend: 'M12 3 L19.5 6 V11.5 C19.5 16 16.5 19.5 12 21 C7.5 19.5 4.5 16 4.5 11.5 V6 Z',
  spell: 'M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z',
  potion: 'M12 3.5 V5.5 M10 5.5 H14 M12 5.5 C9.5 5.5 9 9 10.5 10 C7 11 6 14 6 16 A6 5 0 0 0 18 16 C18 14 17 11 13.5 10 C15 9 14.5 5.5 12 5.5 Z',
  auto: 'M4 12 A8 8 0 0 1 18 6.5 M18 3 V6.5 H14.5 M20 12 A8 8 0 0 1 6 17.5 M6 21 V17.5 H9.5',

  /* 书册 */
  bag: 'M5 9 H19 L17.5 20.5 H6.5 Z M9 9 V7 A3 3 0 0 1 15 7 V9 M8 13.5 H16',
  book: 'M5 4 H17 A2 2 0 0 1 19 6 V20 H7 A2 2 0 0 1 5 18 Z M5 18 A2 2 0 0 1 7 16 H19 M9 4 V16',
  map: 'M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z M9 4 V18 M15 6 V20',
  market: 'M3 9 L5 4 H19 L21 9 M3 9 A3 3 0 0 0 9 9 A3 3 0 0 0 15 9 A3 3 0 0 0 21 9 M5 11 V20 H19 V11 M10 20 V15 H14 V20',
  industry: 'M12 20 V10 M12 13 C12 10 9.5 8 6 8 C6 11 8.5 13 12 13 Z M12 11 C12 8 14.5 6 18 6 C18 9 15.5 11 12 11 Z M4 20 H20',
  faction: 'M5 21 V3 M5 4 H18 L15.5 8 L18 12 H5 M9 16 H15',
  people: 'M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 Z M3 20 C3 16 5.7 13.5 9 13.5 C12.3 13.5 15 16 15 20 M16 4.5 A3 3 0 0 1 16 10.5 M18 13.8 C20 14.6 21 16.8 21 20',
  chronicle: 'M18.5 3.5 L20.5 5.5 L11 15 L9 13 Z M9 13 C6 13 5 15 5 17 C5 19 4 20 3 20.5 C7 21 10.5 19.5 11 15',
  world: 'M8.5 3 H15.5 L21 8.5 V15.5 L15.5 21 H8.5 L3 15.5 V8.5 Z M12 7.5 V16.5 M7.5 12 H16.5',
  character: 'M12 11 A4 4 0 1 0 12 3 A4 4 0 1 0 12 11 Z M4.5 21 C4.5 16.5 7.9 13.5 12 13.5 C16.1 13.5 19.5 16.5 19.5 21',
  strategy: 'M4 5 H20 M4 12 H20 M4 19 H20 M8 3 V7 M15 10 V14 M10 17 V21',

  /* 界面 */
  settings: 'M12 9 A3 3 0 1 0 12 15 A3 3 0 1 0 12 9 Z M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7.1 7.1 M16.9 16.9 L18.7 18.7 M5.3 18.7 L7.1 16.9 M16.9 7.1 L18.7 5.3',
  save: 'M5 3.5 H16 L20.5 8 V20.5 H3.5 V3.5 Z M8 3.5 V8.5 H15 V3.5 M7 20.5 V14 H17 V20.5',
  load: 'M4 7 V19 H20 V9 H11 L9 7 Z M12 16.5 V11 M9.5 13.5 L12 11 L14.5 13.5',
  pause: 'M8 5 V19 M16 5 V19',
  play: 'M7 4.5 L19 12 L7 19.5 Z',
  close: 'M6 6 L18 18 M18 6 L6 18',
  check: 'M4.5 12.5 L9.5 17.5 L19.5 6.5',
  plus: 'M12 5 V19 M5 12 H19',
  minus: 'M5 12 H19',
  chevronRight: 'M9 5 L16 12 L9 19',
  chevronDown: 'M5 9 L12 16 L19 9',
  arrowUp: 'M12 20 V5 M6 11 L12 5 L18 11',
  target: 'M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z M12 7 A2.5 2.5 0 1 0 12 12 A2.5 2.5 0 1 0 12 7 Z',
  lock: 'M6 11 H18 V20.5 H6 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11 M12 14.5 V17',
  warning: 'M12 3.5 L21.5 20 H2.5 Z M12 9.5 V14 M12 16.8 V17',
  sound: 'M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z M16 9 A4 4 0 0 1 16 15 M18.5 6.5 A7.5 7.5 0 0 1 18.5 17.5',
  mute: 'M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z M16.5 9.5 L21 14 M21 9.5 L16.5 14',
  exit: 'M14 4 H19.5 V20 H14 M10 8 L6 12 L10 16 M6 12 H15',
  scroll: 'M5 6 C5 4.5 6 3.5 7.5 3.5 H18.5 C17 3.5 16 4.5 16 6 V18 C16 19.5 15 20.5 13.5 20.5 H3.5 C5 20.5 5 19.5 5 18 Z M8.5 8 H13 M8.5 11 H13 M8.5 14 H11',

  /* 物品门类 */
  herb: 'M5 19 C5 11 10 5 19 5 C19 14 13 19 5 19 Z M5 19 L14 10',
  grain: 'M12 21 V6 M12 9 C10 8 9 6.5 9 5 C11 5.5 12 7 12 9 Z M12 9 C14 8 15 6.5 15 5 C13 5.5 12 7 12 9 Z M12 13 C10 12 9 10.5 9 9 C11 9.5 12 11 12 13 Z M12 13 C14 12 15 10.5 15 9 C13 9.5 12 11 12 13 Z M12 17 C10 16 9 14.5 9 13 C11 13.5 12 15 12 17 Z M12 17 C14 16 15 14.5 15 13 C13 13.5 12 15 12 17 Z',
  wood: 'M5 9 H16.5 A2.5 5 0 0 1 16.5 19 H5 A2.5 5 0 0 1 5 9 Z M16.5 9 A2.5 5 0 0 0 16.5 19 M16.5 12.5 A0.8 1.5 0 0 0 16.5 15.5',
  ore: 'M4 17 L7 9 L12 6 L17 8 L20 14 L16 19 H7 Z M7 9 L11 13 L17 8 M11 13 L16 19',
  cloth: 'M5 6 H15 A2 6 0 0 1 15 18 H5 Z M15 6 A2 6 0 0 0 15 18 M17 12 H20.5 M8 6 V18',
  paper: 'M6 3.5 H15 L19 7.5 V20.5 H6 Z M15 3.5 V7.5 H19 M9 11 H16 M9 14 H16 M9 17 H13',
  ink: 'M9 3 H15 V15 H9 Z M9 15 L10 20.5 H14 L15 15 M11 6 H13 M11 9 H13',
  seed: 'M12 20 C8 20 6 16 6 12 C6 8 9 4 12 4 C15 4 18 8 18 12 C18 16 16 20 12 20 Z M12 6 C10.5 10 10.5 14 12 18',
  weapon: 'M20 4 L10.5 13.5 M20 4 H16.5 M20 4 V7.5 M6.8 12.2 L11.8 17.2 M9.3 14.7 L4 20',
  armor: 'M7 4 L12 6 L17 4 L20 7 L18 11 V19 C15.5 20.5 8.5 20.5 6 19 V11 L4 7 Z M12 6 V19',
  leather: 'M6 5 C8 6 9 4 12 4 C15 4 16 6 18 5 C19 8 17 9 18 12 C19 15 17 17 17 19 C14 18 10 18 7 19 C7 17 5 15 6 12 C7 9 5 8 6 5 Z',
  pill: 'M12 6.5 A5.5 5.5 0 1 0 12 17.5 A5.5 5.5 0 1 0 12 6.5 Z M9 10.5 A3.2 3.2 0 0 1 12 8.6 M5 5 L6.2 6.2 M19 5 L17.8 6.2 M12 2.5 V4',
  manual: 'M5 4 H17 A2 2 0 0 1 19 6 V20 H7 A2 2 0 0 1 5 18 Z M5 18 A2 2 0 0 1 7 16 H19 M9 4 V16 M12 8 H16 M12 11 H16',
  deed: 'M6 3.5 H18 V20.5 H6 Z M9 7.5 H15 M9 10.5 H15 M14 14 H17 V17 H14 Z',
  permit: 'M8 6 H16 V20 L12 22 L8 20 Z M12 6 V2.5 M10.5 10 H13.5 M10.5 13 H13.5',
  relic: 'M12 3.5 A8.5 8.5 0 1 1 12 20.5 A8.5 8.5 0 1 1 12 3.5 Z M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9 Z',
  ice: 'M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5 M10 4.5 L12 6.5 L14 4.5 M10 19.5 L12 17.5 L14 19.5',
  fire: 'M12 21 C8 21 6 18 6 15 C6 11 10 9 10 5 C12 7 13 8.5 13 10.5 C14 9.5 14.5 8.5 14.5 7.5 C17 9.5 18 12 18 15 C18 18 16 21 12 21 Z',
  tool: 'M14 4 L20 10 L17.5 12.5 L11.5 6.5 Z M13 8 L4.5 16.5 L7.5 19.5 L16 11',
  token: 'M8 6 H16 V20 L12 22 L8 20 Z M12 6 V2.5 M10.5 10 H13.5 M10.5 13 H13.5',
  bell: 'M12 3 V5 M6.5 17 C6.5 17 7 8 12 5 C17 8 17.5 17 17.5 17 Z M4.5 17 H19.5 M10.5 19.5 A1.5 1.5 0 0 0 13.5 19.5',
  misc: 'M5 8 L12 4 L19 8 V16 L12 20 L5 16 Z M5 8 L12 12 L19 8 M12 12 V20',
} as const

export type IconName = keyof typeof ICONS

const ITEM_TYPE_ICONS: Record<string, IconName> = {
  herb: 'herb', grain: 'grain', wood: 'wood', ore: 'ore', cloth: 'cloth', paper: 'paper', ink: 'ink', seed: 'seed',
  weapon: 'weapon', armor: 'armor', leather: 'leather', pill: 'pill', manual: 'manual', deed: 'deed', permit: 'permit',
  relic: 'relic', ice: 'ice', fire: 'fire', scroll: 'scroll', tool: 'tool', token: 'token', sect: 'bell',
}

export function iconForItemType(type: string | null | undefined): IconName {
  return ITEM_TYPE_ICONS[type || ''] || 'misc'
}

const ACTION_ICONS: Record<string, IconName> = {
  rest: 'rest', meditate: 'meditate', train: 'train', trade: 'trade', hunt: 'hunt', quest: 'quest',
  auction: 'auction', breakthrough: 'breakthrough', sect: 'sect', travel: 'travel', combat: 'combat',
}

export function iconForAction(action: string | null | undefined): IconName {
  return ACTION_ICONS[action || ''] || 'misc'
}

const WEATHER_ICONS: Record<string, IconName> = {
  晴: 'sun', 微雨: 'rain', 大风: 'wind', 寒霜: 'snow', 雾起: 'fog', 雷暴: 'storm',
}

export function iconForWeather(weather: string | null | undefined): IconName {
  return WEATHER_ICONS[weather || ''] || 'cloud'
}
