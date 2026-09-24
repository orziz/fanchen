/** 十二时辰的天光：天色、雾色、整体着色与日月位置。 */
export type RGB = [number, number, number]

export interface HourLight {
  skyTop: RGB
  skyBottom: RGB
  /** multiply 叠色，白色为不改变 */
  tint: RGB
  mist: RGB
  celestial: 'sun' | 'moon' | 'none'
  /** 日月位置，占画面宽高的比例 */
  cx: number
  cy: number
  celestialColor: RGB
  night: number
}

const HOURS: HourLight[] = [
  /* 子 */ { skyTop: [12, 16, 24], skyBottom: [34, 42, 54], tint: [104, 116, 148], mist: [74, 84, 102], celestial: 'moon', cx: 0.62, cy: 0.16, celestialColor: [226, 228, 214], night: 1 },
  /* 丑 */ { skyTop: [10, 14, 20], skyBottom: [30, 37, 48], tint: [96, 108, 140], mist: [70, 80, 98], celestial: 'moon', cx: 0.78, cy: 0.2, celestialColor: [220, 224, 212], night: 1 },
  /* 寅 */ { skyTop: [22, 28, 42], skyBottom: [70, 72, 86], tint: [128, 136, 164], mist: [96, 102, 120], celestial: 'moon', cx: 0.9, cy: 0.3, celestialColor: [206, 210, 204], night: 0.8 },
  /* 卯 */ { skyTop: [86, 96, 114], skyBottom: [214, 180, 146], tint: [236, 218, 200], mist: [218, 202, 184], celestial: 'sun', cx: 0.2, cy: 0.36, celestialColor: [214, 96, 64], night: 0.25 },
  /* 辰 */ { skyTop: [126, 138, 148], skyBottom: [214, 206, 188], tint: [250, 246, 238], mist: [224, 220, 208], celestial: 'sun', cx: 0.26, cy: 0.22, celestialColor: [236, 214, 170], night: 0 },
  /* 巳 */ { skyTop: [140, 152, 160], skyBottom: [216, 213, 202], tint: [255, 255, 252], mist: [228, 226, 216], celestial: 'sun', cx: 0.36, cy: 0.13, celestialColor: [244, 236, 214], night: 0 },
  /* 午 */ { skyTop: [146, 158, 166], skyBottom: [220, 218, 208], tint: [255, 255, 255], mist: [232, 230, 220], celestial: 'sun', cx: 0.5, cy: 0.1, celestialColor: [248, 242, 224], night: 0 },
  /* 未 */ { skyTop: [140, 150, 158], skyBottom: [218, 212, 198], tint: [255, 252, 246], mist: [228, 224, 212], celestial: 'sun', cx: 0.64, cy: 0.13, celestialColor: [244, 232, 204], night: 0 },
  /* 申 */ { skyTop: [124, 130, 142], skyBottom: [220, 196, 164], tint: [248, 236, 220], mist: [224, 212, 194], celestial: 'sun', cx: 0.74, cy: 0.22, celestialColor: [232, 186, 128], night: 0.05 },
  /* 酉 */ { skyTop: [74, 76, 94], skyBottom: [204, 144, 106], tint: [232, 200, 176], mist: [206, 176, 158], celestial: 'sun', cx: 0.82, cy: 0.36, celestialColor: [196, 70, 50], night: 0.3 },
  /* 戌 */ { skyTop: [30, 36, 52], skyBottom: [72, 76, 92], tint: [148, 156, 184], mist: [104, 110, 126], celestial: 'moon', cx: 0.16, cy: 0.3, celestialColor: [214, 216, 204], night: 0.75 },
  /* 亥 */ { skyTop: [16, 20, 30], skyBottom: [40, 48, 60], tint: [112, 122, 154], mist: [82, 92, 108], celestial: 'moon', cx: 0.38, cy: 0.18, celestialColor: [224, 226, 214], night: 0.95 },
]

export type WeatherKind = 'clear' | 'drizzle' | 'wind' | 'frost' | 'fog' | 'storm'

const WEATHER_MAP: Record<string, WeatherKind> = {
  晴: 'clear',
  微雨: 'drizzle',
  大风: 'wind',
  寒霜: 'frost',
  雾起: 'fog',
  雷暴: 'storm',
}

export function resolveWeather(label: string | null | undefined): WeatherKind {
  return WEATHER_MAP[label || ''] || 'clear'
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function scale(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k]
}

const GREY: RGB = [150, 154, 158]

/** 按时辰与天气得出本帧光照；天气只在时辰光的基础上压暗、去饱和或偏冷。 */
export function resolveLight(hour: number, weather: WeatherKind): HourLight {
  const base = HOURS[((hour % 12) + 12) % 12]
  const light: HourLight = { ...base }
  if (weather === 'drizzle' || weather === 'fog') {
    light.skyTop = mix(base.skyTop, scale(GREY, 1 - base.night * 0.7), 0.45)
    light.skyBottom = mix(base.skyBottom, scale(GREY, 1.2 - base.night * 0.8), 0.5)
    light.tint = mix(base.tint, [226, 228, 230], 0.35)
    light.celestial = weather === 'fog' ? base.celestial : 'none'
  } else if (weather === 'storm') {
    light.skyTop = scale(mix(base.skyTop, [40, 46, 54], 0.7), 0.9)
    light.skyBottom = scale(mix(base.skyBottom, [86, 92, 98], 0.65), 0.9)
    light.tint = scale(mix(base.tint, [190, 196, 206], 0.4), 0.82)
    light.celestial = 'none'
  } else if (weather === 'frost') {
    light.skyBottom = mix(base.skyBottom, [206, 216, 226], 0.35)
    light.tint = mix(base.tint, [226, 236, 250], 0.25)
    light.mist = mix(base.mist, [226, 232, 240], 0.3)
  }
  return light
}

export function rgb(c: RGB, alpha = 1) {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`
}

export { mix as mixColor }
