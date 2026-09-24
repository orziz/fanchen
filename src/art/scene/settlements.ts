import type { Canvas2D } from '@/art/paint/brush'
import { INK_DEEP, INK_MID, PAPER, CINNABAR, shade } from '@/art/paint/brush'
import {
  paintArchway, paintBanner, paintBridge, paintCityWall, paintHouse, paintPagoda, paintPavilion, paintPier,
  type Point,
} from '@/art/paint/buildings'
import { paintBoat, type WaterBand } from '@/art/paint/water'
import type { Ridge } from '@/art/paint/mountains'
import { range } from '@/art/rng'
import type { SceneArchetype } from '@/art/scene/archetype'

export interface SettlementAnchors {
  lanterns: Point[]
  smoke: Point[]
}

function houseRow(c: Canvas2D, xs: number[], ground: number, sizes: [number, number], ink = INK_MID) {
  const anchors: Point[] = []
  const order = xs.map((x, i) => ({ x, i })).sort(() => c.rng() - 0.5)
  for (const { x } of order) {
    const w = c.w * range(c.rng, sizes[0], sizes[1])
    const top = paintHouse(c, x, ground + range(c.rng, -2, 3) * c.u, w, ink, shade(PAPER, range(c.rng, 0.82, 0.95)))
    anchors.push({ x: x + w * 0.3, y: ground - w * 0.18 }, top)
  }
  return anchors
}

function peakTops(ridge: Ridge, width: number, count: number) {
  const tops: Point[] = []
  const n = ridge.ys.length
  for (let i = 2; i < n - 2; i += 1) {
    const y = ridge.ys[i]
    if (y < ridge.ys[i - 2] && y < ridge.ys[i + 2]) tops.push({ x: i * ridge.step, y })
  }
  return tops
    .filter(p => p.x > width * 0.06 && p.x < width * 0.94)
    .sort((a, b) => a.y - b.y)
    .slice(0, count)
}

/** 中景人烟：依原型摆放屋舍、城垣、山门、码头，并回报灯火与炊烟的位置。 */
export function paintSettlement(
  c: Canvas2D, arch: SceneArchetype, groundY: number, water: WaterBand | null, farRidge: Ridge,
): SettlementAnchors {
  const { w, h, rng, u } = c
  const lanterns: Point[] = []
  const smoke: Point[] = []
  const bankY = water ? water.top + 2 * u : groundY

  switch (arch.settlement) {
    case 'village':
    case 'town': {
      const count = arch.settlement === 'town' ? 7 : 4
      const xs = Array.from({ length: count }, (_, i) => {
        const left = i % 2 === 0
        return w * (left ? range(rng, 0.08, 0.36) : range(rng, 0.62, 0.92))
      })
      const tops = houseRow(c, xs, bankY, arch.settlement === 'town' ? [0.05, 0.075] : [0.045, 0.065])
      lanterns.push(...tops.filter((_, i) => i % 2 === 0))
      if (arch.settlement === 'town') paintPagoda(c, w * range(rng, 0.7, 0.82), bankY - 2 * u, w * 0.05, 4, INK_MID)
      if (water && arch.water === 'river') paintBridge(c, w * range(rng, 0.42, 0.58), water.top + (water.bottom - water.top) * 0.4, w * 0.12, INK_MID)
      if (arch.smoke) smoke.push(...tops.filter((_, i) => i % 2 === 1).slice(0, 2))
      break
    }
    case 'city': {
      const wallGround = water ? water.top + 1 * u : groundY + h * 0.01
      houseRow(c, [0.2, 0.3, 0.42, 0.58, 0.7, 0.8].map(t => w * t), wallGround - h * 0.075, [0.05, 0.07])
      paintPagoda(c, w * 0.26, wallGround - h * 0.08, w * 0.055, 5, INK_MID)
      lanterns.push(...paintCityWall(c, w * 0.08, w * 0.92, wallGround, h * 0.085, INK_MID, shade(PAPER, 0.85)))
      if (arch.smoke) smoke.push({ x: w * 0.36, y: wallGround - h * 0.16 }, { x: w * 0.66, y: wallGround - h * 0.15 })
      if (water) {
        for (let i = 0; i < 4; i += 1) paintBoat(c, w * range(rng, 0.1, 0.9), range(rng, water.top + 12 * u, water.bottom - 6 * u), range(rng, 10, 16) * u, INK_DEEP, arch.water === 'sea')
      }
      break
    }
    case 'fort': {
      const wallGround = groundY + h * 0.005
      lanterns.push(...paintCityWall(c, -w * 0.02, w * 1.02, wallGround, h * 0.1, INK_MID, shade(PAPER, 0.7)))
      paintBanner(c, w * 0.18, wallGround - h * 0.1, h * 0.09, INK_DEEP, CINNABAR)
      paintBanner(c, w * 0.82, wallGround - h * 0.1, h * 0.09, INK_DEEP, CINNABAR)
      if (arch.smoke) smoke.push({ x: w * 0.3, y: wallGround - h * 0.12 })
      break
    }
    case 'sect': {
      for (const top of peakTops(farRidge, w, 3)) paintPavilion(c, top.x, top.y + 1 * u, w * 0.022, shade(INK_MID, 1.25))
      const hallX = w * (rng() < 0.5 ? range(rng, 0.2, 0.3) : range(rng, 0.7, 0.8))
      const hallY = groundY + 1 * u
      c.ctx.fillStyle = `rgba(${shade(PAPER, 0.62).join(',')}, 0.9)`
      c.ctx.fillRect(hallX - w * 0.085, hallY - 3 * u, w * 0.17, 5 * u)
      const hall = paintHouse(c, hallX, hallY - 3 * u, w * 0.12, INK_DEEP, shade(PAPER, 0.72))
      paintPagoda(c, hallX + (hallX < w / 2 ? 1 : -1) * w * 0.1, hallY - 2 * u, w * 0.04, 3, INK_MID, shade(PAPER, 0.7))
      lanterns.push(hall)
      paintArchway(c, w * 0.5, groundY + 2 * u, w * 0.1, INK_DEEP)
      if (arch.smoke) smoke.push({ x: hallX + w * 0.03, y: hallY - w * 0.06 })
      break
    }
    case 'port': {
      const shoreY = water ? water.top + 1 * u : groundY
      const tops = houseRow(c, [0.1, 0.2, 0.8, 0.9].map(t => w * t), shoreY, [0.045, 0.06])
      lanterns.push(...tops.filter((_, i) => i % 2 === 0))
      if (water) {
        paintPier(c, w * 0.14, water.top + (water.bottom - water.top) * 0.55, w * 0.2, INK_DEEP)
        paintPier(c, w * 0.66, water.top + (water.bottom - water.top) * 0.65, w * 0.22, INK_DEEP)
        for (let i = 0; i < 5; i += 1) {
          paintBoat(c, w * range(rng, 0.05, 0.95), range(rng, water.top + 10 * u, water.bottom - 8 * u), range(rng, 10, 18) * u, INK_DEEP, arch.water === 'sea' && rng() < 0.6)
        }
      }
      break
    }
    case 'post': {
      const tops = houseRow(c, [w * range(rng, 0.66, 0.78)], bankY, [0.065, 0.08])
      lanterns.push(...tops)
      paintBanner(c, w * range(rng, 0.84, 0.9), bankY, h * 0.13, INK_DEEP, CINNABAR)
      break
    }
    default:
      break
  }
  return { lanterns, smoke }
}
