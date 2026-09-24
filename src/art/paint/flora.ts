import type { Canvas2D } from '@/art/paint/brush'
import { CINNABAR, brushStroke, inkBlob, inkDot, rgb, shade } from '@/art/paint/brush'
import { range } from '@/art/rng'
import type { RGB } from '@/art/scene/palette'

/** 松针簇：一片淡墨托底，上面密排放射短笔。 */
function paintNeedlePad(c: Canvas2D, x: number, y: number, width: number, ink: RGB) {
  const { ctx, rng, u } = c
  const height = width * 0.32
  ctx.fillStyle = rgb(shade(ink, 1.25), 0.4)
  ctx.beginPath()
  ctx.ellipse(x, y, width * 0.52, height * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  const fans = Math.max(4, Math.round(width / (4.2 * u)))
  ctx.lineCap = 'round'
  for (let f = 0; f < fans; f += 1) {
    const fx = x + range(rng, -0.45, 0.45) * width
    const fy = y + range(rng, -0.15, 0.3) * height
    const len = height * range(rng, 0.7, 1.25)
    ctx.strokeStyle = rgb(ink, range(rng, 0.55, 0.9))
    ctx.lineWidth = range(rng, 0.5, 1) * u
    ctx.beginPath()
    for (let k = 0; k < 7; k += 1) {
      const a = -Math.PI * (0.12 + 0.76 * (k / 6)) + range(rng, -0.08, 0.08)
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx + Math.cos(a) * len * 0.9, fy + Math.sin(a) * len * 0.75)
    }
    ctx.stroke()
  }
}

/** 松：曲干鳞皮，平展的枝，枝梢一簇簇松针。lean 为整体倾斜（负向左）。 */
export function paintPine(c: Canvas2D, x: number, ground: number, h: number, ink: RGB, lean = 0) {
  const { ctx, rng, u } = c
  const topX = x + lean * h * 0.45
  const topY = ground - h
  const trunkW = Math.max(1.2 * u, h * 0.04)
  const trunkAt = (t: number) => {
    const s = 1 - t
    const bx = s * s * s * x + 3 * s * s * t * (x - lean * h * 0.2) + 3 * s * t * t * (topX + lean * h * 0.25) + t * t * t * topX
    return { x: bx, y: ground - h * t }
  }
  ctx.lineCap = 'round'
  for (let k = 0; k < 3; k += 1) {
    ctx.strokeStyle = rgb(ink, 0.9 - k * 0.2)
    ctx.lineWidth = trunkW * (1 - k * 0.3)
    ctx.beginPath()
    ctx.moveTo(x + k * trunkW * 0.25, ground)
    ctx.bezierCurveTo(x - lean * h * 0.2, ground - h * 0.35, topX + lean * h * 0.25, ground - h * 0.7, topX, topY + h * 0.06)
    ctx.stroke()
  }
  for (let i = 0; i < h / (5 * u); i += 1) {
    const p = trunkAt(range(rng, 0.02, 0.8))
    brushStroke(c, p.x - trunkW * 0.4, p.y, p.x + trunkW * 0.3, p.y - 1.5 * u, 0.7 * u, shade(ink, 1.6), 0.45)
  }
  const tiers = Math.max(3, Math.min(6, Math.round(h / (22 * u))))
  for (let i = 0; i < tiers; i += 1) {
    const t = 0.42 + (i / tiers) * 0.52
    const base = trunkAt(t)
    const side = i % 2 === 0 ? -1 : 1
    const reach = h * range(rng, 0.2, 0.3) * (1.1 - t * 0.55)
    const tipX = base.x + side * reach
    const tipY = base.y - reach * range(rng, 0.05, 0.25)
    brushStroke(c, base.x, base.y, tipX, tipY, trunkW * 0.45, ink, 0.85, 0.12 * side)
    paintNeedlePad(c, tipX - side * reach * 0.15, tipY - reach * 0.08, reach * range(rng, 0.9, 1.25), ink)
    if (rng() < 0.6) paintNeedlePad(c, base.x + side * reach * 0.35, base.y - reach * 0.12, reach * 0.6, ink)
  }
  paintNeedlePad(c, topX, topY + h * 0.05, h * 0.2, ink)
}

/** 点叶杂树：干枝加墨点团。 */
export function paintTree(c: Canvas2D, x: number, ground: number, h: number, ink: RGB, accent: RGB | null = null) {
  const { rng, u } = c
  brushStroke(c, x, ground, x + range(rng, -0.1, 0.1) * h, ground - h * 0.62, Math.max(1, h * 0.05), ink, 0.9, range(rng, -0.1, 0.1))
  const clumps = 5 + Math.round(h / (8 * u))
  for (let i = 0; i < clumps; i += 1) {
    const cx = x + range(rng, -0.32, 0.32) * h
    const cy = ground - h * range(rng, 0.55, 0.98)
    inkBlob(c, cx, cy, h * range(rng, 0.1, 0.2), h * range(rng, 0.08, 0.14), shade(ink, range(rng, 0.9, 1.4)), range(rng, 0.55, 0.85), 0.35, 14)
  }
  if (accent) {
    for (let i = 0; i < clumps * 3; i += 1) {
      inkDot(c, x + range(rng, -0.36, 0.36) * h, ground - h * range(rng, 0.5, 1), range(rng, 0.8, 2.2) * u, accent, range(rng, 0.45, 0.8))
    }
  }
}

export function paintMaple(c: Canvas2D, x: number, ground: number, h: number, ink: RGB) {
  paintTree(c, x, ground, h, ink, CINNABAR)
}

/** 垂柳：短干，万缕下垂。 */
export function paintWillow(c: Canvas2D, x: number, ground: number, h: number, ink: RGB) {
  const { ctx, rng, u } = c
  brushStroke(c, x, ground, x + h * 0.06, ground - h * 0.55, Math.max(1.4 * u, h * 0.06), ink, 0.92, 0.12)
  const crownX = x + h * 0.06
  const crownY = ground - h * 0.6
  ctx.lineCap = 'round'
  const strands = Math.round(h / (1.6 * u))
  for (let i = 0; i < strands; i += 1) {
    const a = range(rng, -Math.PI * 0.95, -Math.PI * 0.05)
    const r = h * range(rng, 0.12, 0.34)
    const sx = crownX + Math.cos(a) * r
    const sy = crownY + Math.sin(a) * r * 0.55
    const len = h * range(rng, 0.25, 0.6)
    ctx.strokeStyle = rgb(ink, range(rng, 0.25, 0.6))
    ctx.lineWidth = range(rng, 0.4, 0.9) * u
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(sx + Math.cos(a) * h * 0.1, sy + len * 0.3, sx + Math.cos(a) * h * 0.06, sy + len)
    ctx.stroke()
  }
}

/** 竹：分节竹竿与撇叶。 */
export function paintBamboo(c: Canvas2D, x: number, ground: number, h: number, ink: RGB) {
  const { ctx, rng, u } = c
  const stems = 3 + Math.round(rng() * 3)
  for (let s = 0; s < stems; s += 1) {
    const sx = x + range(rng, -0.12, 0.12) * h
    const lean = range(rng, -0.08, 0.08) * h
    const sh = h * range(rng, 0.7, 1)
    ctx.strokeStyle = rgb(ink, 0.85)
    ctx.lineWidth = Math.max(1 * u, h * 0.022)
    const joints = 6
    for (let j = 0; j < joints; j += 1) {
      const y0 = ground - (sh * j) / joints
      const y1 = ground - (sh * (j + 1)) / joints + u
      const x0 = sx + (lean * j) / joints
      const x1 = sx + (lean * (j + 1)) / joints
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
    for (let l = 0; l < 7; l += 1) {
      const ly = ground - sh * range(rng, 0.45, 1)
      const lx = sx + lean * ((ground - ly) / sh)
      const dir = rng() < 0.5 ? -1 : 1
      brushStroke(c, lx, ly, lx + dir * h * range(rng, 0.08, 0.16), ly + h * range(rng, 0.02, 0.07), h * 0.018 + u, ink, 0.8, 0.15 * dir)
    }
  }
}

/** 芦苇：细长弯茎，顶端芦花。 */
export function paintReeds(c: Canvas2D, x: number, ground: number, h: number, ink: RGB, spread = 1) {
  const { ctx, rng, u } = c
  const count = 8 + Math.round(rng() * 10)
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i += 1) {
    const bx = x + range(rng, -18, 18) * u * spread
    const rh = h * range(rng, 0.5, 1)
    const bend = range(rng, -0.25, 0.25) * rh
    ctx.strokeStyle = rgb(ink, range(rng, 0.5, 0.85))
    ctx.lineWidth = range(rng, 0.6, 1.2) * u
    ctx.beginPath()
    ctx.moveTo(bx, ground)
    ctx.quadraticCurveTo(bx + bend * 0.2, ground - rh * 0.6, bx + bend, ground - rh)
    ctx.stroke()
    if (rng() < 0.55) inkBlob(c, bx + bend, ground - rh - 2 * u, 1.4 * u, 4 * u, ink, 0.55, 0.3, 10)
  }
}

/** 荷叶与花苞。 */
export function paintLotus(c: Canvas2D, x: number, y: number, size: number, ink: RGB) {
  const { ctx, rng, u } = c
  ctx.fillStyle = rgb(ink, 0.7)
  ctx.beginPath()
  ctx.ellipse(x, y, size, size * 0.3, range(rng, -0.1, 0.1), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rgb(shade(ink, 1.6), 0.5)
  ctx.lineWidth = 0.5 * u
  for (let k = 0; k < 5; k += 1) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(k * 1.25) * size * 0.9, y + Math.sin(k * 1.25) * size * 0.27)
    ctx.stroke()
  }
  if (rng() < 0.5) {
    brushStroke(c, x + size * 0.3, y, x + size * 0.35, y - size * 1.1, 0.8 * u, ink, 0.8)
    inkBlob(c, x + size * 0.35, y - size * 1.2, size * 0.14, size * 0.2, CINNABAR, 0.6, 0.15, 10)
  }
}

/** 草丛：一撮撇笔。 */
export function paintGrass(c: Canvas2D, x: number, ground: number, h: number, ink: RGB) {
  const { rng, u } = c
  const blades = 4 + Math.round(rng() * 5)
  for (let i = 0; i < blades; i += 1) {
    const dir = range(rng, -1, 1)
    brushStroke(c, x + dir * 2 * u, ground, x + dir * h * 0.5, ground - h * range(rng, 0.5, 1), range(rng, 0.6, 1.2) * u, ink, range(rng, 0.5, 0.85), dir * 0.2)
  }
}

/** 岩石：墨团加斧劈皴。 */
export function paintRock(c: Canvas2D, x: number, ground: number, w: number, ink: RGB) {
  const { rng, u } = c
  const h = w * range(rng, 0.45, 0.75)
  inkBlob(c, x, ground - h * 0.45, w * 0.5, h * 0.55, shade(ink, 1.25), 0.95, 0.18, 16)
  inkBlob(c, x - w * 0.08, ground - h * 0.55, w * 0.34, h * 0.36, ink, 0.55, 0.22, 14)
  for (let i = 0; i < w / (3 * u); i += 1) {
    const sx = x + range(rng, -0.45, 0.45) * w
    const sy = ground - range(rng, 0.2, 0.9) * h
    brushStroke(c, sx, sy, sx + range(rng, -3, 3) * u, sy + range(rng, 4, 9) * u, range(rng, 0.6, 1.4) * u, shade(ink, 0.6), 0.5)
  }
}
