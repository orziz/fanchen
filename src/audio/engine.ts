/**
 * 声音引擎：一切声音都在浏览器里即时合成，不依赖音频文件。
 * 浏览器要求首次用户操作后才能出声，因此在首次点击时解锁。
 */
type AudioContextCtor = typeof AudioContext

class AudioEngine {
  ctx: AudioContext | null = null
  master!: GainNode
  music!: GainNode
  sfx!: GainNode
  ambience!: GainNode
  reverb!: ConvolverNode
  reverbSend!: GainNode
  /** 各声部送往混响的入口，音量与该声部同步。 */
  private wet = new Map<GainNode, GainNode>()
  private noiseBuffer: AudioBuffer | null = null
  private listeners: Array<() => void> = []

  get ready() {
    return Boolean(this.ctx && this.ctx.state === 'running')
  }

  /** 在用户手势里调用：建立或恢复音频上下文。 */
  unlock() {
    const Ctor: AudioContextCtor | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    if (!Ctor) return
    if (!this.ctx) {
      this.ctx = new Ctor()
      this.build()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (this.listeners.length) {
      const queued = this.listeners
      this.listeners = []
      queued.forEach(fn => fn())
    }
  }

  onReady(fn: () => void) {
    if (this.ready) fn()
    else this.listeners.push(fn)
  }

  private build() {
    const ctx = this.ctx!
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16
    compressor.ratio.value = 3
    this.master.connect(compressor).connect(ctx.destination)
    this.music = ctx.createGain()
    this.sfx = ctx.createGain()
    this.ambience = ctx.createGain()
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.createImpulse(3.2, 2.6)
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 0.9
    this.reverbSend.connect(this.reverb).connect(this.master)
    this.music.connect(this.master)
    this.sfx.connect(this.master)
    this.ambience.connect(this.master)
    for (const bus of [this.music, this.sfx, this.ambience]) {
      const wet = ctx.createGain()
      wet.connect(this.reverbSend)
      this.wet.set(bus, wet)
    }
  }

  /** 某一声部的混响入口；声部音量调到零时，它的混响也一并静下。 */
  wetFor(bus: GainNode) {
    return this.wet.get(bus) ?? this.reverbSend
  }

  private createImpulse(seconds: number, decay: number) {
    const ctx = this.ctx!
    const length = Math.round(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
    return buffer
  }

  noise() {
    if (this.noiseBuffer || !this.ctx) return this.noiseBuffer!
    const length = this.ctx.sampleRate * 2
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
    return this.noiseBuffer
  }

  setVolumes(music: number, sfx: number, muted: boolean) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.08)
    const levels: Array<[GainNode, number, number]> = [[this.music, music * 0.7, 0.2], [this.ambience, music * 0.5, 0.2], [this.sfx, sfx, 0.05]]
    for (const [bus, level, glide] of levels) {
      bus.gain.setTargetAtTime(level, t, glide)
      this.wetFor(bus).gain.setTargetAtTime(level, t, glide)
    }
  }
}

export const audio = new AudioEngine()
