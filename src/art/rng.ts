/** 可复现的随机数：同一地点每次画出的山水一致。 */
export type Rng = () => number

export function hashString(text: string) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function range(rng: Rng, min: number, max: number) {
  return min + (max - min) * rng()
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length) % list.length]
}

/** 周期一维值噪声：横向可无缝平铺，用于山脊线和雾带。 */
export function createPeriodicNoise(rng: Rng, period = 64) {
  const lattice = Array.from({ length: period }, () => rng())
  return (t: number) => {
    const x = ((t % period) + period) % period
    const i = Math.floor(x)
    const f = x - i
    const a = lattice[i]
    const b = lattice[(i + 1) % period]
    const s = f * f * (3 - 2 * f)
    return a + (b - a) * s
  }
}

/**
 * 分形叠加噪声，返回 0..1。t 取 0..1 表示整幅宽度，t 与 t+1 等值，
 * basePeriod 为最低一层在整幅内起伏的次数。
 */
export function createFbm(rng: Rng, basePeriod: number, octaves = 4, gain = 0.5) {
  const layers = Array.from({ length: octaves }, (_, o) => {
    const period = basePeriod * 2 ** o
    return { period, noise: createPeriodicNoise(rng, period), amplitude: gain ** o }
  })
  const norm = layers.reduce((sum, layer) => sum + layer.amplitude, 0)
  return (t: number) => layers.reduce((sum, layer) => sum + layer.amplitude * layer.noise(t * layer.period), 0) / norm
}
