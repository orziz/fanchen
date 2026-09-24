/**
 * 主角立绘：白衣修士的剪影，按姿态分帧。坐标取各自 viewBox，脚底落在 viewBox 底边。
 * part.cls 对应样式：robe 衣袍、shade 衣袍暗部、hair 发、sash 腰带、line 衣纹、blade 剑身、accent 剑穗、skin 手。
 * frame 为 'a' / 'b' 的部件交替显示，形成走步、出拳的两帧动作。
 */
export type HeroPose = 'stand' | 'meditate' | 'walk' | 'fight' | 'train' | 'rest'

export interface FigurePart {
  d: string
  cls: 'robe' | 'shade' | 'hair' | 'sash' | 'line' | 'blade' | 'accent' | 'skin'
  frame?: 'a' | 'b'
}

export interface FigurePose {
  viewBox: [number, number]
  /** 画面中占用的相对高度（站姿为 1） */
  scale: number
  parts: FigurePart[]
}

const circle = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`

export const HERO_POSES: Record<HeroPose, FigurePose> = {
  stand: {
    viewBox: [60, 140],
    scale: 1,
    parts: [
      { cls: 'shade', d: 'M 15 31 C 10 40, 7 58, 6 80 C 5.6 88, 7 95, 11 97 L 17.5 95 C 16 80, 16.5 56, 18 40 Z' },
      { cls: 'robe', d: 'M 25 23 C 19 24, 15 27, 14.5 33 L 13.5 60 C 13 85, 11 110, 8.5 138 L 51.5 138 C 49 110, 47 85, 46.5 60 L 45.5 33 C 45 27, 41 24, 35 23 Z' },
      { cls: 'robe', d: 'M 45 31 C 50 40, 53 58, 54 80 C 54.4 88, 53 95, 49 97 L 42.5 95 C 44 80, 43.5 56, 42 40 Z' },
      { cls: 'shade', d: 'M 9 131 C 22 134.5, 38 134.5, 51 131 L 51.6 138 L 8.4 138 Z' },
      { cls: 'line', d: 'M 22 70 C 20.5 95, 18 118, 16 137 M 38 70 C 39.5 95, 42 118, 44 137 M 30 82 V 136 M 49 50 C 50.5 64, 51 78, 50.5 92 M 25 23 C 27 27, 33 27, 35 23' },
      { cls: 'sash', d: 'M 14 61 C 25 63, 35 63, 46 61 L 46 67 C 35 69, 25 69, 14 67 Z' },
      { cls: 'accent', d: 'M 29 67 C 28.5 80, 27 92, 27.5 104 M 31 67 C 32 82, 33.5 94, 33 108' },
      { cls: 'hair', d: `M 23 14 C 22 24, 23 34, 24.5 44 C 25.5 54, 26.5 62, 27.5 70 L 32.5 70 C 33.5 62, 34.5 54, 35.5 44 C 37 34, 38 24, 37 14 Z ${circle(30, 15, 7.5)} ${circle(30, 6.8, 3.4)}` },
      { cls: 'line', d: 'M 23.5 5.2 L 36.5 8.4' },
    ],
  },
  meditate: {
    viewBox: [80, 100],
    scale: 0.74,
    parts: [
      { cls: 'shade', d: 'M 16 74 C 20 66, 28 62, 40 62 C 52 62, 60 66, 64 74 C 70 82, 74 90, 75 98 C 60 101, 20 101, 5 98 C 6 90, 10 82, 16 74 Z' },
      { cls: 'robe', d: 'M 35 28 C 29 29, 25 32, 24.5 38 L 23 62 L 57 62 L 55.5 38 C 55 32, 51 29, 45 28 Z' },
      { cls: 'robe', d: 'M 25 36 C 18 44, 13 56, 11 70 C 10.5 74, 13 77, 17 76 L 27 72 C 25 62, 26 50, 28.5 42 Z' },
      { cls: 'robe', d: 'M 55 36 C 62 44, 67 56, 69 70 C 69.5 74, 67 77, 63 76 L 53 72 C 55 62, 54 50, 51.5 42 Z' },
      { cls: 'line', d: 'M 30 66 C 25 78, 20 88, 16 97 M 50 66 C 55 78, 60 88, 64 97 M 40 65 V 99 M 15 58 C 14 64, 13.5 68, 14 72 M 65 58 C 66 64, 66.5 68, 66 72' },
      { cls: 'sash', d: 'M 24 55 C 33 57, 47 57, 56 55 L 56.3 60 C 47 62, 33 62, 23.7 60 Z' },
      { cls: 'hair', d: `M 33 19 C 32 30, 33 40, 34.5 50 L 45.5 50 C 47 40, 48 30, 47 19 Z ${circle(40, 20, 7.5)} ${circle(40, 11.6, 3.4)}` },
      { cls: 'line', d: 'M 33.5 10 L 46.5 13.2' },
    ],
  },
  walk: {
    viewBox: [70, 140],
    scale: 1,
    parts: [
      { cls: 'shade', d: 'M 34 30 C 28 38, 24 48, 22 58 C 21.5 64, 24 67, 27.5 66 L 31 64 C 30 56, 32 46, 36 38 Z' },
      { cls: 'robe', frame: 'a', d: 'M 31 58 L 48 58 C 52 76, 57 100, 61 135 L 51 137 C 48 118, 45 104, 40 94 C 36 106, 31 120, 27 137 L 17 135 C 21 110, 26 80, 31 58 Z' },
      { cls: 'hair', frame: 'a', d: 'M 50 135 L 63 134 L 64 139 L 49 139 Z M 16 134 L 28 135 L 27 139 L 15 139 Z' },
      { cls: 'robe', frame: 'b', d: 'M 31 58 L 48 58 C 50 80, 52 104, 53 136 L 43 137 C 42 118, 41 104, 40 96 C 38 106, 36 120, 35 137 L 25 136 C 26 110, 28 80, 31 58 Z' },
      { cls: 'hair', frame: 'b', d: 'M 42 135 L 55 134 L 56 139 L 41 139 Z M 24 135 L 36 135 L 35.5 139 L 23 139 Z' },
      { cls: 'robe', d: 'M 36 22 C 42 22, 46 26, 46.5 34 L 47.5 60 L 31 60 L 32 34 C 32.5 27, 33 23, 36 22 Z' },
      { cls: 'line', d: 'M 39 64 C 39 76, 39.5 86, 40 94 M 33 30 C 34 44, 34 54, 33 60' },
      { cls: 'sash', d: 'M 31 55 L 48 55 L 48.2 60.5 L 30.8 60.5 Z' },
      { cls: 'accent', d: 'M 32 60 C 26 66, 22 74, 17 80' },
      { cls: 'robe', d: 'M 44 30 C 50 38, 54 48, 55 60 C 55.5 66, 53 70, 49 70 L 45 68 C 47 58, 45 46, 41 38 Z' },
      { cls: 'hair', d: `M 34 12 C 28 18, 25 28, 23 42 C 27 38, 30 30, 36 22 Z ${circle(40, 15, 7)} ${circle(34.5, 10, 3.2)}` },
    ],
  },
  fight: {
    viewBox: [120, 140],
    scale: 0.95,
    parts: [
      { cls: 'shade', d: 'M 44 78 C 36 90, 26 98, 12 102 C 26 106, 38 100, 48 88 Z' },
      { cls: 'shade', d: 'M 46 78 C 38 92, 28 108, 16 130 L 8 136 L 19 137 L 27 126 C 38 110, 48 96, 54 84 Z' },
      { cls: 'robe', d: 'M 55 76 C 62 88, 70 102, 76 118 L 80 136 L 70 137 L 66 120 C 60 106, 54 96, 48 86 Z' },
      { cls: 'hair', d: 'M 69 134 L 84 134 L 84 138.5 L 68 138.5 Z M 5 134 L 18 135 L 18 138.5 L 4 138.5 Z' },
      { cls: 'shade', d: 'M 48 46 C 42 40, 38 34, 36 28 L 39.5 26 C 42 32, 46 37, 51 41 Z' },
      { cls: 'robe', d: 'M 50 41 C 57 40, 62 44, 63 52 L 64 76 L 44 78 L 45.5 52 C 46 46, 47 42, 50 41 Z' },
      { cls: 'sash', d: 'M 44 72 L 64 71 L 64.5 76 L 44 77 Z' },
      { cls: 'robe', d: 'M 58 47 C 66 48, 74 49, 82 50 L 82 55 C 74 55, 66 56, 58 56 Z' },
      { cls: 'skin', d: circle(84, 52.5, 2.6) },
      { cls: 'blade', d: 'M 86 51.8 L 118 47.6 L 118.6 49.2 L 86 54 Z' },
      { cls: 'line', d: 'M 85.2 48 L 86.8 57' },
      { cls: 'accent', d: 'M 84 55.5 C 82 62, 80 66, 77 70' },
      { cls: 'hair', d: `M 49 32 C 40 34, 30 32, 20 26 C 30 36, 40 40, 50 39 Z ${circle(54, 34, 7)} ${circle(48.5, 29, 3.2)}` },
    ],
  },
  train: {
    viewBox: [100, 140],
    scale: 0.95,
    parts: [
      { cls: 'robe', d: 'M 34 64 L 58 64 C 64 76, 72 92, 76 110 L 78 136 L 68 137 L 64 112 C 60 98, 52 88, 46 84 C 40 88, 32 98, 28 112 L 24 137 L 14 136 L 16 110 C 20 92, 28 76, 34 64 Z' },
      { cls: 'hair', d: 'M 12 134 L 25 134 L 25 138.5 L 11 138.5 Z M 67 134 L 80 134 L 81 138.5 L 67 138.5 Z' },
      { cls: 'line', d: 'M 46 86 L 46 70 M 22 118 C 24 110, 27 104, 31 98 M 70 118 C 68 110, 65 104, 61 98' },
      { cls: 'robe', d: 'M 40 30 C 36 30, 33 33, 33 38 L 34 66 L 58 66 L 59 38 C 59 33, 56 30, 52 30 Z' },
      { cls: 'sash', d: 'M 33 60 L 59 60 L 59 66 L 33 66 Z' },
      { cls: 'shade', d: 'M 34 36 C 28 42, 26 50, 28 58 L 34 60 C 33 54, 34 47, 38 42 Z' },
      { cls: 'skin', d: circle(30, 60, 3.2) },
      { cls: 'robe', frame: 'a', d: 'M 57 37 C 66 39, 76 40, 86 40 L 86 46 C 76 46, 66 46, 57 45 Z' },
      { cls: 'skin', frame: 'a', d: circle(89, 43, 3.4) },
      { cls: 'robe', frame: 'b', d: 'M 57 37 C 62 42, 64 48, 62 54 L 58 56 C 58 50, 57 45, 55 42 Z' },
      { cls: 'skin', frame: 'b', d: circle(60, 57, 3.2) },
      { cls: 'hair', d: `${circle(46, 22, 7.5)} ${circle(46, 13, 3.2)}` },
    ],
  },
  rest: {
    viewBox: [100, 90],
    scale: 0.66,
    parts: [
      { cls: 'shade', d: 'M 26 66 L 46 64 C 58 70, 72 78, 86 84 L 86 88 L 70 88 C 58 84, 40 80, 26 80 Z' },
      { cls: 'robe', d: 'M 34 28 C 40 28, 44 32, 45 40 L 47 62 L 27 66 C 26 52, 28 38, 34 28 Z' },
      { cls: 'robe', d: 'M 44 58 C 52 50, 58 44, 64 42 C 67 42, 69 44, 69 47 C 66 56, 62 66, 58 76 L 70 84 L 70 88 L 54 88 L 50 80 C 50 74, 51 68, 52 64 Z' },
      { cls: 'sash', d: 'M 27 58 L 46 56 L 46.5 61 L 27 63 Z' },
      { cls: 'robe', d: 'M 42 36 C 50 40, 58 42, 64 44 L 63 48 C 56 47, 48 46, 42 44 Z' },
      { cls: 'line', d: 'M 30 44 C 30 52, 30 58, 29 64 M 60 52 C 58 60, 56 68, 55 76' },
      { cls: 'hair', d: `M 32 20 C 28 26, 26 32, 26 40 C 29 36, 31 30, 35 26 Z ${circle(38, 22, 7)} ${circle(32.5, 17, 3)}` },
    ],
  },
}

/** 行动到姿态。 */
export function poseForAction(action: string | null | undefined, traveling: boolean, fighting: boolean): HeroPose {
  if (fighting) return 'fight'
  if (traveling) return 'walk'
  switch (action) {
    case 'meditate':
    case 'breakthrough':
    case 'sect':
      return 'meditate'
    case 'train':
      return 'train'
    case 'rest':
      return 'rest'
    case 'hunt':
    case 'quest':
    case 'travel':
      return 'walk'
    default:
      return 'stand'
  }
}
