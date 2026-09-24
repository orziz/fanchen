import type { Canvas2D } from '@/art/paint/brush'
import { PAPER, rgb, shade } from '@/art/paint/brush'
import { range } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'

export interface Point { x: number; y: number }

/** 飞檐屋顶：两端上翘，正脊平直。y 为檐口高度。 */
export function paintRoof(c: Canvas2D, x: number, y: number, w: number, h: number, ink: RGB, alpha = 0.95) {
  const { ctx, u } = c
  const half = w / 2
  ctx.fillStyle = rgb(ink, alpha)
  ctx.beginPath()
  ctx.moveTo(x - half - w * 0.09, y - h * 0.22)
  ctx.quadraticCurveTo(x - half + w * 0.02, y + h * 0.04, x - half + w * 0.12, y)
  ctx.quadraticCurveTo(x - w * 0.36, y - h * 0.42, x - w * 0.27, y - h)
  ctx.lineTo(x + w * 0.27, y - h)
  ctx.quadraticCurveTo(x + w * 0.36, y - h * 0.42, x + half - w * 0.12, y)
  ctx.quadraticCurveTo(x + half - w * 0.02, y + h * 0.04, x + half + w * 0.09, y - h * 0.22)
  ctx.lineTo(x + half - w * 0.04, y + h * 0.14)
  ctx.lineTo(x - half + w * 0.04, y + h * 0.14)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgb(ink, alpha)
  ctx.lineWidth = Math.max(0.8 * u, h * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.3, y - h * 1.02)
  ctx.lineTo(x + w * 0.3, y - h * 1.02)
  ctx.stroke()
  ctx.lineWidth = Math.max(0.7 * u, h * 0.09)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.3, y - h * 1.02)
  ctx.lineTo(x - w * 0.34, y - h * 1.22)
  ctx.moveTo(x + w * 0.3, y - h * 1.02)
  ctx.lineTo(x + w * 0.34, y - h * 1.22)
  ctx.stroke()
}

/** 屋身：浅墙、深门、窗格。返回屋檐高度。 */
function paintWalls(c: Canvas2D, x: number, ground: number, w: number, bodyH: number, ink: RGB, wall: RGB) {
  const { ctx, u } = c
  const left = x - w * 0.4
  const width = w * 0.8
  ctx.fillStyle = rgb(wall, 0.92)
  ctx.fillRect(left, ground - bodyH, width, bodyH)
  ctx.strokeStyle = rgb(ink, 0.75)
  ctx.lineWidth = 0.7 * u
  ctx.strokeRect(left, ground - bodyH, width, bodyH)
  ctx.fillStyle = rgb(ink, 0.85)
  ctx.fillRect(x - w * 0.08, ground - bodyH * 0.62, w * 0.16, bodyH * 0.62)
  ctx.lineWidth = 0.5 * u
  for (const side of [-1, 1]) {
    const wx = x + side * w * 0.24
    ctx.strokeRect(wx - w * 0.07, ground - bodyH * 0.72, w * 0.14, bodyH * 0.3)
    ctx.beginPath()
    ctx.moveTo(wx, ground - bodyH * 0.72)
    ctx.lineTo(wx, ground - bodyH * 0.42)
    ctx.stroke()
  }
  return ground - bodyH
}

export function paintHouse(c: Canvas2D, x: number, ground: number, w: number, ink: RGB, wall: RGB = PAPER) {
  const bodyH = w * 0.36
  const eave = paintWalls(c, x, ground, w, bodyH, ink, wall)
  paintRoof(c, x, eave, w, w * 0.26, ink)
  return { x, y: eave - w * 0.2 }
}

/** 多层塔：逐层收分，顶置塔刹。 */
export function paintPagoda(c: Canvas2D, x: number, ground: number, w: number, levels: number, ink: RGB, wall: RGB = PAPER) {
  const { ctx, u } = c
  let base = ground
  let width = w
  for (let i = 0; i < levels; i += 1) {
    const bodyH = width * (i === 0 ? 0.42 : 0.3)
    ctx.fillStyle = rgb(wall, 0.9)
    ctx.fillRect(x - width * 0.32, base - bodyH, width * 0.64, bodyH)
    ctx.strokeStyle = rgb(ink, 0.7)
    ctx.lineWidth = 0.6 * u
    ctx.strokeRect(x - width * 0.32, base - bodyH, width * 0.64, bodyH)
    base -= bodyH
    paintRoof(c, x, base, width, width * 0.2, ink)
    base -= width * 0.18
    width *= 0.8
  }
  ctx.strokeStyle = rgb(ink, 0.9)
  ctx.lineWidth = 1.2 * u
  ctx.beginPath()
  ctx.moveTo(x, base)
  ctx.lineTo(x, base - w * 0.45)
  ctx.stroke()
  return { x, y: base - w * 0.45 }
}

/** 亭：攒尖顶、细柱、台基。 */
export function paintPavilion(c: Canvas2D, x: number, ground: number, w: number, ink: RGB) {
  const { ctx, u } = c
  ctx.fillStyle = rgb(shade(ink, 1.3), 0.75)
  ctx.fillRect(x - w * 0.5, ground - w * 0.08, w, w * 0.08)
  ctx.strokeStyle = rgb(ink, 0.85)
  ctx.lineWidth = Math.max(0.8 * u, w * 0.035)
  const pillarTop = ground - w * 0.62
  for (const px of [-0.34, -0.12, 0.12, 0.34]) {
    ctx.beginPath()
    ctx.moveTo(x + px * w, ground - w * 0.08)
    ctx.lineTo(x + px * w, pillarTop)
    ctx.stroke()
  }
  ctx.fillStyle = rgb(ink, 0.95)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.62, pillarTop - w * 0.05)
  ctx.quadraticCurveTo(x - w * 0.42, pillarTop + w * 0.04, x - w * 0.36, pillarTop)
  ctx.quadraticCurveTo(x - w * 0.1, pillarTop - w * 0.16, x, pillarTop - w * 0.42)
  ctx.quadraticCurveTo(x + w * 0.1, pillarTop - w * 0.16, x + w * 0.36, pillarTop)
  ctx.quadraticCurveTo(x + w * 0.42, pillarTop + w * 0.04, x + w * 0.62, pillarTop - w * 0.05)
  ctx.lineTo(x + w * 0.5, pillarTop + w * 0.07)
  ctx.lineTo(x - w * 0.5, pillarTop + w * 0.07)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, pillarTop - w * 0.44, w * 0.04, 0, Math.PI * 2)
  ctx.fill()
  return { x, y: pillarTop }
}

/** 城墙：垛口、墙砖、城门洞与门楼。 */
export function paintCityWall(
  c: Canvas2D, x0: number, x1: number, ground: number, wallH: number, ink: RGB, wall: RGB, withGate = true,
): Point[] {
  const { ctx, u, rng } = c
  const top = ground - wallH
  ctx.fillStyle = rgb(shade(wall, 0.72), 0.95)
  ctx.fillRect(x0, top, x1 - x0, wallH)
  const merlon = wallH * 0.22
  ctx.fillStyle = rgb(shade(wall, 0.64), 0.95)
  for (let x = x0; x < x1; x += merlon * 1.6) ctx.fillRect(x, top - merlon * 0.7, merlon, merlon * 0.7)
  ctx.strokeStyle = rgb(ink, 0.18)
  ctx.lineWidth = 0.5 * u
  for (let y = top + wallH * 0.18; y < ground; y += wallH * 0.16) {
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y + range(rng, -0.5, 0.5) * u)
    ctx.stroke()
  }
  ctx.strokeStyle = rgb(ink, 0.8)
  ctx.lineWidth = 1 * u
  ctx.strokeRect(x0, top, x1 - x0, wallH)
  const lanterns: Point[] = []
  if (withGate) {
    const gx = (x0 + x1) / 2
    const gw = wallH * 0.62
    ctx.fillStyle = rgb(ink, 0.95)
    ctx.beginPath()
    ctx.moveTo(gx - gw / 2, ground)
    ctx.lineTo(gx - gw / 2, ground - wallH * 0.5)
    ctx.quadraticCurveTo(gx, ground - wallH * 0.86, gx + gw / 2, ground - wallH * 0.5)
    ctx.lineTo(gx + gw / 2, ground)
    ctx.closePath()
    ctx.fill()
    const towerW = wallH * 1.9
    const towerBase = top - merlon * 0.7
    ctx.fillStyle = rgb(wall, 0.92)
    ctx.fillRect(gx - towerW * 0.36, towerBase - towerW * 0.24, towerW * 0.72, towerW * 0.24)
    paintRoof(c, gx, towerBase - towerW * 0.24, towerW, towerW * 0.2, ink)
    paintRoof(c, gx, towerBase - towerW * 0.52, towerW * 0.72, towerW * 0.16, ink)
    lanterns.push({ x: gx - gw * 0.8, y: ground - wallH * 0.62 }, { x: gx + gw * 0.8, y: ground - wallH * 0.62 })
  }
  return lanterns
}

/** 牌坊：山门、驿口的标识。 */
export function paintArchway(c: Canvas2D, x: number, ground: number, w: number, ink: RGB) {
  const { ctx, u } = c
  const h = w * 0.78
  ctx.strokeStyle = rgb(ink, 0.9)
  ctx.lineWidth = Math.max(1.2 * u, w * 0.05)
  for (const px of [-0.42, 0.42]) {
    ctx.beginPath()
    ctx.moveTo(x + px * w, ground)
    ctx.lineTo(x + px * w, ground - h)
    ctx.stroke()
  }
  ctx.lineWidth = Math.max(1 * u, w * 0.04)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, ground - h * 0.72)
  ctx.lineTo(x + w * 0.5, ground - h * 0.72)
  ctx.stroke()
  paintRoof(c, x, ground - h, w * 1.05, w * 0.14, ink)
}

/** 旗杆与幡：驿站、市口。 */
export function paintBanner(c: Canvas2D, x: number, ground: number, h: number, ink: RGB, cloth: RGB) {
  const { ctx, u } = c
  ctx.strokeStyle = rgb(ink, 0.9)
  ctx.lineWidth = 1.1 * u
  ctx.beginPath()
  ctx.moveTo(x, ground)
  ctx.lineTo(x, ground - h)
  ctx.stroke()
  ctx.fillStyle = rgb(cloth, 0.82)
  ctx.beginPath()
  ctx.moveTo(x, ground - h * 0.96)
  ctx.quadraticCurveTo(x + h * 0.22, ground - h * 0.9, x + h * 0.2, ground - h * 0.62)
  ctx.lineTo(x, ground - h * 0.66)
  ctx.closePath()
  ctx.fill()
  return { x: x + h * 0.1, y: ground - h * 0.8 }
}

/** 码头栈桥。 */
export function paintPier(c: Canvas2D, x: number, y: number, len: number, ink: RGB) {
  const { ctx, u } = c
  ctx.fillStyle = rgb(ink, 0.85)
  ctx.fillRect(x, y - 2.2 * u, len, 2.6 * u)
  ctx.lineWidth = 1.1 * u
  ctx.strokeStyle = rgb(ink, 0.8)
  for (let px = x + 3 * u; px < x + len; px += 11 * u) {
    ctx.beginPath()
    ctx.moveTo(px, y)
    ctx.lineTo(px, y + 7 * u)
    ctx.stroke()
  }
}

/** 拱桥。 */
export function paintBridge(c: Canvas2D, x: number, y: number, w: number, ink: RGB) {
  const { ctx, u } = c
  ctx.strokeStyle = rgb(ink, 0.85)
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  ctx.quadraticCurveTo(x, y - w * 0.42, x + w / 2, y)
  ctx.stroke()
  ctx.lineWidth = 1 * u
  ctx.beginPath()
  ctx.moveTo(x - w * 0.36, y)
  ctx.quadraticCurveTo(x, y - w * 0.3, x + w * 0.36, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y - w * 0.02)
  ctx.quadraticCurveTo(x, y - w * 0.52, x + w / 2, y - w * 0.02)
  ctx.stroke()
}
