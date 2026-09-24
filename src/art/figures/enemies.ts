import type { FigurePart } from '@/art/figures/hero'

/** 敌方剪影：面朝左（主角一侧）。cls：body 墨身、shade 暗部、eye 眼光、line 纹理、blade 兵刃。 */
export type EnemyShape = 'wolf' | 'lizard' | 'ape' | 'bird' | 'humanoid' | 'officer' | 'specter' | 'beast'

export interface EnemyPart { d: string; cls: 'body' | 'shade' | 'eye' | 'line' | 'blade' }

export interface EnemyFigure {
  viewBox: [number, number]
  /** 相对主角站姿的高度 */
  scale: number
  /** 离地悬浮（飞禽、魂魄） */
  float: number
  parts: EnemyPart[]
}

const circle = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`

export const ENEMY_FIGURES: Record<EnemyShape, EnemyFigure> = {
  wolf: {
    viewBox: [120, 100],
    scale: 0.8,
    float: 0,
    parts: [
      { cls: 'shade', d: 'M 84 62 L 90 80 L 86 99 L 93 99 L 97 80 L 95 60 Z M 36 66 L 36 88 L 34 99 L 41 99 L 43 88 L 43 67 Z' },
      { cls: 'body', d: 'M 20 52 C 30 44, 60 41, 86 45 C 96 47, 102 53, 104 61 L 100 70 C 90 66, 70 66, 56 68 C 44 70, 34 68, 28 66 C 22 64, 19 58, 20 52 Z' },
      { cls: 'body', d: 'M 22 50 C 16 46, 9 45, 2 48 C 4 52, 7 55, 12 57 C 16 60, 21 61, 27 62 Z M 17 45 L 19 35 L 24 46 Z M 23 45 L 28 36 L 30 47 Z' },
      { cls: 'body', d: 'M 28 64 L 24 86 L 20 99 L 27 99 L 31 86 L 35 66 Z M 76 64 L 78 84 L 74 99 L 81 99 L 85 84 L 85 64 Z' },
      { cls: 'body', d: 'M 100 51 C 110 48, 117 54, 119 64 C 113 60, 107 58, 100 60 Z' },
      { cls: 'line', d: 'M 40 50 C 46 47, 54 47, 60 49 M 62 48 C 70 46, 78 47, 84 50 M 30 56 L 36 60' },
      { cls: 'eye', d: circle(12, 49.5, 1.4) },
    ],
  },
  lizard: {
    viewBox: [120, 100],
    scale: 0.62,
    float: 0,
    parts: [
      { cls: 'shade', d: 'M 44 80 L 46 92 L 42 99 L 52 99 L 52 84 Z' },
      { cls: 'body', d: 'M 14 72 C 20 64, 40 60, 60 62 C 80 64, 96 70, 118 84 C 96 80, 80 78, 62 80 C 44 82, 26 82, 14 78 Z' },
      { cls: 'body', d: 'M 15 72 C 9 69, 3 71, 1 75 C 5 78, 10 79, 16 78 Z' },
      { cls: 'body', d: 'M 26 78 L 20 92 L 13 99 L 24 99 L 30 86 Z M 66 79 L 72 92 L 70 99 L 80 99 L 76 84 Z' },
      { cls: 'line', d: 'M 28 64 L 31 57 L 35 63 L 39 56 L 43 62 L 47 55 L 51 61 L 55 56 L 58 62' },
      { cls: 'eye', d: circle(8, 72.5, 1.2) },
    ],
  },
  ape: {
    viewBox: [100, 120],
    scale: 1.05,
    float: 0,
    parts: [
      { cls: 'shade', d: 'M 72 44 C 82 58, 86 76, 86 97 L 78 99 C 76 78, 72 64, 66 54 Z M 62 86 L 66 110 L 62 119 L 76 119 L 72 88 Z' },
      { cls: 'body', d: 'M 40 30 C 56 26, 72 34, 76 52 C 78 66, 74 80, 70 88 L 36 88 C 32 76, 30 60, 32 46 C 33 38, 35 32, 40 30 Z' },
      { cls: 'body', d: circle(37, 27, 10) },
      { cls: 'body', d: 'M 36 40 C 24 50, 16 70, 14 97 L 22 99 C 24 76, 30 60, 40 52 Z M 40 86 L 36 110 L 30 119 L 44 119 L 48 90 Z' },
      { cls: 'line', d: 'M 44 44 C 48 52, 50 62, 48 72 M 58 40 C 62 50, 64 60, 62 70 M 28 24 L 36 22' },
      { cls: 'eye', d: `${circle(31.5, 27, 1.4)} ${circle(37, 26, 1.4)}` },
    ],
  },
  bird: {
    viewBox: [120, 100],
    scale: 0.85,
    float: 0.35,
    parts: [
      { cls: 'shade', d: 'M 50 52 C 44 36, 46 18, 56 4 C 60 18, 64 32, 66 50 Z' },
      { cls: 'body', d: 'M 78 58 C 92 60, 106 70, 118 86 C 104 80, 92 74, 80 64 Z M 78 60 C 88 68, 96 80, 100 96 C 90 86, 84 76, 76 66 Z' },
      { cls: 'body', d: 'M 40 56 C 50 48, 70 48, 80 56 C 76 64, 58 68, 44 64 Z' },
      { cls: 'body', d: 'M 42 58 C 34 50, 30 42, 26 36 C 22 34, 18 36, 16 38 L 24 40 C 28 46, 32 54, 38 62 Z M 16 38 L 7 40 L 16 41.5 Z M 26 36 C 26 28, 30 24, 34 21 C 30 28, 30 32, 30 36 Z' },
      { cls: 'body', d: 'M 60 52 C 66 34, 80 20, 100 12 C 92 28, 82 42, 72 54 Z' },
      { cls: 'line', d: 'M 54 64 L 52 80 M 60 64 L 62 80 M 66 44 C 74 36, 82 28, 92 20' },
      { cls: 'eye', d: circle(21, 37.5, 1.2) },
    ],
  },
  humanoid: {
    viewBox: [90, 140],
    scale: 1,
    float: 0,
    parts: [
      { cls: 'shade', d: 'M 56 34 C 62 44, 64 54, 62 64 L 56 64 C 57 56, 56 48, 52 42 Z' },
      { cls: 'body', d: 'M 40 68 L 60 68 C 64 86, 68 104, 72 136 L 62 137 C 60 118, 56 100, 50 90 C 46 102, 42 118, 38 137 L 28 136 C 32 110, 36 84, 40 68 Z' },
      { cls: 'body', d: 'M 44 24 C 38 26, 36 32, 36 40 L 38 70 L 62 70 L 64 40 C 64 32, 60 26, 54 24 Z' },
      { cls: 'body', d: `${circle(50, 16, 7)} M 27 136 L 39 136 L 39 139 L 26 139 Z M 61 136 L 73 136 L 74 139 L 61 139 Z` },
      { cls: 'body', d: 'M 40 34 C 34 42, 28 48, 22 52 L 24 56 C 30 54, 38 48, 44 44 Z' },
      { cls: 'blade', d: 'M 22 53 C 16 45, 10 37, 5 27 L 7.5 26.5 C 12 36, 18 44, 25 51 Z' },
      { cls: 'line', d: 'M 50 72 L 50 90 M 38 62 L 62 62' },
      { cls: 'eye', d: circle(45, 15.5, 1.1) },
    ],
  },
  officer: {
    viewBox: [90, 140],
    scale: 1,
    float: 0,
    parts: [
      { cls: 'body', d: 'M 40 68 L 60 68 C 64 86, 68 104, 72 136 L 62 137 C 60 118, 56 100, 50 90 C 46 102, 42 118, 38 137 L 28 136 C 32 110, 36 84, 40 68 Z' },
      { cls: 'body', d: 'M 44 24 C 38 26, 36 32, 36 40 L 38 70 L 62 70 L 64 40 C 64 32, 60 26, 54 24 Z' },
      { cls: 'body', d: `${circle(50, 17, 7)} M 33 12 L 67 12 L 58 4 L 42 4 Z M 27 136 L 39 136 L 39 139 L 26 139 Z M 61 136 L 73 136 L 74 139 L 61 139 Z` },
      { cls: 'shade', d: 'M 40 36 C 32 40, 24 42, 16 42 L 16 46 C 24 47, 34 46, 42 44 Z' },
      { cls: 'blade', d: 'M 2 44 L 30 44 L 30 45.6 L 2 45.6 Z M 2 44.8 L -2 42 L 8 44 Z' },
      { cls: 'line', d: 'M 36 60 L 64 60 M 50 72 L 50 90' },
      { cls: 'eye', d: circle(45, 17, 1.1) },
    ],
  },
  specter: {
    viewBox: [90, 140],
    scale: 1.05,
    float: 0.12,
    parts: [
      { cls: 'shade', d: 'M 34 34 C 24 44, 20 64, 22 84 C 24 100, 30 116, 20 134 C 32 128, 38 118, 42 130 C 46 118, 52 126, 60 134 C 56 116, 62 100, 66 84 C 70 64, 66 44, 56 34 Z' },
      { cls: 'body', d: 'M 36 36 C 28 46, 26 62, 28 80 C 30 94, 34 104, 30 118 C 38 112, 42 104, 45 112 C 48 104, 52 110, 58 116 C 54 102, 58 92, 60 80 C 63 62, 60 46, 54 36 Z' },
      { cls: 'body', d: 'M 34 20 C 34 10, 56 10, 56 20 C 58 30, 54 36, 45 38 C 36 36, 32 30, 34 20 Z' },
      { cls: 'body', d: 'M 30 50 C 20 56, 12 60, 4 60 L 6 64 C 16 66, 26 62, 34 58 Z' },
      { cls: 'eye', d: `${circle(40, 24, 1.5)} ${circle(47, 24, 1.5)}` },
    ],
  },
  beast: {
    viewBox: [140, 110],
    scale: 1.2,
    float: 0,
    parts: [
      { cls: 'shade', d: 'M 108 84 L 110 108 L 124 108 L 120 82 Z' },
      { cls: 'body', d: 'M 20 60 C 30 36, 70 26, 104 36 C 124 42, 134 58, 132 76 L 126 90 L 30 90 C 22 82, 18 72, 20 60 Z' },
      { cls: 'body', d: 'M 22 60 C 12 58, 4 62, 2 70 C 6 80, 14 84, 24 82 Z M 18 56 C 12 44, 16 34, 26 28 C 22 38, 22 46, 27 54 Z M 30 86 L 28 108 L 42 108 L 44 86 Z' },
      { cls: 'line', d: 'M 44 38 L 48 30 L 52 38 M 60 33 L 65 24 L 69 33 M 78 32 L 83 23 L 87 32 M 96 34 L 100 26 L 104 36 M 40 60 C 56 54, 76 52, 100 56' },
      { cls: 'eye', d: `${circle(10, 67, 1.6)} ${circle(16, 66, 1.3)}` },
    ],
  },
}

const TEMPLATE_SHAPES: Record<string, EnemyShape> = {
  'feral-dog': 'wolf',
  'road-bandit': 'humanoid',
  'marsh-viper': 'lizard',
  'hill-boar': 'beast',
  'marsh-lizard': 'lizard',
  'mist-wolf': 'wolf',
  'forge-puppet': 'humanoid',
  'snow-ape': 'ape',
  'reef-specter': 'specter',
  'blaze-bird': 'bird',
  'star-devourer': 'beast',
  'jade-traitor': 'humanoid',
  'marsh-manor': 'specter',
  'mist-hunt': 'wolf',
  'ice-cavern': 'ape',
  'tide-ruins': 'specter',
  'ember-palace': 'specter',
  'star-sanctum': 'beast',
}

export function shapeForEnemy(templateId: string | null | undefined): EnemyShape {
  if (!templateId) return 'humanoid'
  if (templateId.startsWith('pursuit-')) return 'officer'
  return TEMPLATE_SHAPES[templateId] || 'humanoid'
}

/** 同一剪影的体型差：野犬比狼妖小一圈，獠猪远不及古兽。 */
const TEMPLATE_SIZES: Record<string, number> = {
  'feral-dog': 0.78,
  'marsh-viper': 0.85,
  'hill-boar': 0.6,
  'road-bandit': 0.95,
}

export function sizeForEnemy(templateId: string | null | undefined) {
  return TEMPLATE_SIZES[templateId || ''] || 1
}

export type { FigurePart }
