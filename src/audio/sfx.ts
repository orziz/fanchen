import { audio } from '@/audio/engine'
import { noiseBurst, pentatonic, pluck, tone } from '@/audio/synth'

function now() {
  return audio.ctx?.currentTime ?? 0
}

let lastTick = 0
function throttled(ms: number) {
  const t = performance.now()
  if (t - lastTick < ms) return true
  lastTick = t
  return false
}

/** 界面与玩法音效：全部即时合成。上下文未解锁时静默跳过。 */
export const sfx = {
  /** 翻开书册、切换页签 */
  page() {
    if (!audio.ctx) return
    noiseBurst({ freq: 3200, q: 0.8, gain: 0.07, decay: 0.12, endFreq: 1800 })
  },
  /** 确认、落子：木鱼般一声 */
  confirm() {
    if (!audio.ctx) return
    tone(760, { type: 'sine', gain: 0.18, decay: 0.12, endFreq: 520 })
    noiseBurst({ freq: 1800, q: 4, gain: 0.05, decay: 0.03 })
  },
  /** 条件不足：闷声 */
  deny() {
    if (!audio.ctx) return
    tone(170, { type: 'triangle', gain: 0.16, decay: 0.16, endFreq: 140 })
  },
  /** 点选行动 */
  action() {
    if (!audio.ctx) return
    pluck(pentatonic(7), { gain: 0.16, send: 0.25, bus: audio.sfx, brightness: 0.7 })
  },
  /** 灵石入账 */
  coin() {
    if (!audio.ctx || throttled(120)) return
    const t = now()
    tone(1760, { when: t, gain: 0.06, decay: 0.25, send: 0.2 })
    tone(2350, { when: t + 0.05, gain: 0.05, decay: 0.3, send: 0.2 })
  },
  /** 修为、火候增长：轻微泛音 */
  gain() {
    if (!audio.ctx || throttled(200)) return
    tone(pentatonic(10 + Math.floor(Math.random() * 3)), { gain: 0.035, attack: 0.02, decay: 0.6, send: 0.5 })
  },
  /** 获得物品 */
  loot() {
    if (!audio.ctx) return
    const t = now()
    pluck(pentatonic(9), { when: t, gain: 0.18, send: 0.4, bus: audio.sfx })
    pluck(pentatonic(11), { when: t + 0.09, gain: 0.15, send: 0.4, bus: audio.sfx })
  },
  /** 出手：破风 */
  swing() {
    if (!audio.ctx) return
    noiseBurst({ type: 'highpass', freq: 900, endFreq: 3600, gain: 0.12, decay: 0.16, q: 0.7 })
  },
  /** 命中：闷击 */
  hit(heavy = false) {
    if (!audio.ctx) return
    tone(heavy ? 90 : 120, { type: 'sine', gain: heavy ? 0.4 : 0.28, decay: 0.18, endFreq: 50 })
    noiseBurst({ type: 'lowpass', freq: 1400, gain: heavy ? 0.22 : 0.14, decay: 0.12 })
  },
  /** 受创 */
  hurt() {
    if (!audio.ctx) return
    tone(210, { type: 'sawtooth', gain: 0.06, decay: 0.2, endFreq: 120 })
    noiseBurst({ type: 'lowpass', freq: 700, gain: 0.18, decay: 0.16 })
  },
  /** 术法：清音上扬 */
  spell() {
    if (!audio.ctx) return
    const t = now()
    ;[12, 14, 16].forEach((step, i) => tone(pentatonic(step), { when: t + i * 0.06, gain: 0.06, decay: 0.5, send: 0.6 }))
    noiseBurst({ type: 'bandpass', freq: 3000, endFreq: 6000, gain: 0.05, decay: 0.3, q: 2 })
  },
  /** 得胜 */
  victory() {
    if (!audio.ctx) return
    const t = now()
    ;[5, 7, 9, 12].forEach((step, i) => pluck(pentatonic(step), { when: t + i * 0.11, gain: 0.22, send: 0.5, bus: audio.sfx }))
  },
  /** 落败 */
  defeat() {
    if (!audio.ctx) return
    const t = now()
    ;[7, 5, 3, 1].forEach((step, i) => pluck(pentatonic(step), { when: t + i * 0.16, gain: 0.2, send: 0.6, bus: audio.sfx, slide: -1 }))
  },
  /** 破境：钟磬齐鸣 */
  breakthrough() {
    if (!audio.ctx) return
    const t = now()
    ;[110, 176.5, 231, 297, 363, 440].forEach((f, i) => tone(f, { when: t, gain: 0.16 / (i + 1) + 0.03, attack: 0.01, decay: 4.2 - i * 0.4, send: 0.8 }))
    ;[10, 12, 14, 15, 17].forEach((step, i) => tone(pentatonic(step), { when: t + 0.5 + i * 0.12, gain: 0.06, attack: 0.01, decay: 1.6, send: 0.7 }))
  },
  /** 冲关受挫 */
  breakthroughFail() {
    if (!audio.ctx) return
    tone(98, { gain: 0.3, attack: 0.01, decay: 1.8, send: 0.5 })
    tone(116, { gain: 0.14, attack: 0.01, decay: 1.4, send: 0.5 })
  },
  /** 抵达 / 解锁：一声清磬 */
  chime() {
    if (!audio.ctx) return
    const t = now()
    tone(pentatonic(12), { when: t, gain: 0.1, decay: 1.4, send: 0.7 })
    tone(pentatonic(14), { when: t + 0.08, gain: 0.07, decay: 1.2, send: 0.7 })
  },
}
