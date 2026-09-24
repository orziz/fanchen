import { audio } from '@/audio/engine'

/** 拨弦（Karplus–Strong）：噪声经延迟线反复平均，得到近似古琴的拨奏音色。结果按音高缓存。 */
const pluckCache = new Map<string, AudioBuffer>()

export function pluckBuffer(freq: number, seconds = 3.2, brightness = 0.5) {
  const ctx = audio.ctx!
  const key = `${freq.toFixed(2)}:${seconds}:${brightness}`
  const cached = pluckCache.get(key)
  if (cached) return cached
  const rate = ctx.sampleRate
  const length = Math.round(rate * seconds)
  const buffer = ctx.createBuffer(1, length, rate)
  const data = buffer.getChannelData(0)
  const period = Math.max(2, Math.round(rate / freq))
  const line = new Float32Array(period)
  for (let i = 0; i < period; i += 1) line[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin((i / period) * Math.PI))
  const damping = 0.4985 + brightness * 0.0012
  let idx = 0
  let prev = 0
  for (let i = 0; i < length; i += 1) {
    const current = line[idx]
    const next = line[(idx + 1) % period]
    const out = damping * (current + next)
    line[idx] = out * 0.995 + prev * 0.005
    prev = out
    data[i] = current
    idx = (idx + 1) % period
  }
  let peak = 0
  for (let i = 0; i < length; i += 1) peak = Math.max(peak, Math.abs(data[i]))
  if (peak > 0) for (let i = 0; i < length; i += 1) data[i] /= peak
  pluckCache.set(key, buffer)
  return buffer
}

interface PluckOptions {
  when?: number
  gain?: number
  slide?: number
  send?: number
  bus?: GainNode
  brightness?: number
  pan?: number
}

/** 拨一根弦；slide 为吟猱般的滑音（半音数）。 */
export function pluck(freq: number, options: PluckOptions = {}) {
  const ctx = audio.ctx
  if (!ctx) return
  const when = options.when ?? ctx.currentTime
  const source = ctx.createBufferSource()
  source.buffer = pluckBuffer(freq, 3.2, options.brightness ?? 0.5)
  if (options.slide) {
    source.playbackRate.setValueAtTime(1, when + 0.12)
    source.playbackRate.linearRampToValueAtTime(Math.pow(2, options.slide / 12), when + 0.55)
  }
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 2400 + (options.brightness ?? 0.5) * 2400
  const gain = ctx.createGain()
  gain.gain.value = options.gain ?? 0.3
  const panner = ctx.createStereoPanner()
  panner.pan.value = options.pan ?? 0
  source.connect(tone).connect(gain).connect(panner)
  panner.connect(options.bus ?? audio.music)
  const send = ctx.createGain()
  send.gain.value = options.send ?? 0.5
  panner.connect(send).connect(audio.wetFor(options.bus ?? audio.music))
  source.start(when)
  source.stop(when + 3.3)
}

interface ToneOptions {
  when?: number
  type?: OscillatorType
  gain?: number
  attack?: number
  decay?: number
  endFreq?: number
  bus?: GainNode
  send?: number
}

/** 简单音：泛音、钟磬、提示音。 */
export function tone(freq: number, options: ToneOptions = {}) {
  const ctx = audio.ctx
  if (!ctx) return
  const when = options.when ?? ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = options.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, when)
  if (options.endFreq) osc.frequency.exponentialRampToValueAtTime(options.endFreq, when + (options.decay ?? 0.4))
  const gain = ctx.createGain()
  const peak = options.gain ?? 0.2
  const attack = options.attack ?? 0.005
  const decay = options.decay ?? 0.4
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay)
  osc.connect(gain).connect(options.bus ?? audio.sfx)
  if (options.send) {
    const send = ctx.createGain()
    send.gain.value = options.send
    gain.connect(send).connect(audio.wetFor(options.bus ?? audio.sfx))
  }
  osc.start(when)
  osc.stop(when + attack + decay + 0.05)
}

interface NoiseOptions {
  when?: number
  gain?: number
  decay?: number
  type?: BiquadFilterType
  freq?: number
  endFreq?: number
  q?: number
  bus?: GainNode
}

/** 滤波噪声：翻书、风声、击打。 */
export function noiseBurst(options: NoiseOptions = {}) {
  const ctx = audio.ctx
  if (!ctx) return
  const when = options.when ?? ctx.currentTime
  const source = ctx.createBufferSource()
  source.buffer = audio.noise()
  const filter = ctx.createBiquadFilter()
  filter.type = options.type ?? 'bandpass'
  filter.frequency.setValueAtTime(options.freq ?? 2000, when)
  if (options.endFreq) filter.frequency.exponentialRampToValueAtTime(options.endFreq, when + (options.decay ?? 0.2))
  filter.Q.value = options.q ?? 1
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(options.gain ?? 0.2, when)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + (options.decay ?? 0.2))
  source.connect(filter).connect(gain).connect(options.bus ?? audio.sfx)
  source.start(when, Math.random() * 1.5)
  source.stop(when + (options.decay ?? 0.2) + 0.05)
}

/** 宫商角徵羽：以 C 为宫的五声音阶，返回第 n 级的频率。 */
const PENTA = [0, 2, 4, 7, 9]
export function pentatonic(step: number, base = 130.81) {
  const octave = Math.floor(step / 5)
  const degree = ((step % 5) + 5) % 5
  return base * Math.pow(2, octave + PENTA[degree] / 12)
}
