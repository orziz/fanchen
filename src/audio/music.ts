import { audio } from '@/audio/engine'
import { noiseBurst, pentatonic, pluck, tone } from '@/audio/synth'

export type MusicMood = 'title' | 'day' | 'night' | 'combat'

/**
 * 即兴琴曲：在五声音阶上随机游走成句，句间留白；夜里更低更疏，交战时加快并添低鼓。
 * 只提前调度数秒内的音符，切换心境即时生效。
 */
class MusicDirector {
  private timer = 0
  private nextPhraseAt = 0
  private nextDrumAt = 0
  private step = 7
  private mood: MusicMood = 'title'
  private drone: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null = null
  private running = false

  start() {
    if (this.running || !audio.ctx) return
    this.running = true
    this.nextPhraseAt = audio.ctx.currentTime + 1.2
    this.nextDrumAt = audio.ctx.currentTime + 0.5
    this.startDrone()
    this.timer = window.setInterval(() => this.schedule(), 250)
  }

  stop() {
    this.running = false
    window.clearInterval(this.timer)
    if (this.drone && audio.ctx) {
      const t = audio.ctx.currentTime
      this.drone.gain.gain.setTargetAtTime(0, t, 0.6)
      const { osc, lfo } = this.drone
      window.setTimeout(() => { osc.stop(); lfo.stop() }, 2500)
      this.drone = null
    }
  }

  setMood(mood: MusicMood) {
    if (mood === this.mood) return
    this.mood = mood
    if (audio.ctx) this.nextPhraseAt = Math.min(this.nextPhraseAt, audio.ctx.currentTime + 1)
    this.retuneDrone()
  }

  private startDrone() {
    const ctx = audio.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = this.droneFreq()
    const gain = ctx.createGain()
    gain.gain.value = 0
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.012
    lfo.connect(lfoGain).connect(gain.gain)
    osc.connect(gain).connect(audio.music)
    gain.gain.setTargetAtTime(0.03, ctx.currentTime, 2)
    osc.start()
    lfo.start()
    this.drone = { osc, gain, lfo }
  }

  private droneFreq() {
    return this.mood === 'night' ? 49 : this.mood === 'combat' ? 55 : 65.41
  }

  private retuneDrone() {
    if (!this.drone || !audio.ctx) return
    this.drone.osc.frequency.setTargetAtTime(this.droneFreq(), audio.ctx.currentTime, 1.5)
  }

  private schedule() {
    const ctx = audio.ctx
    if (!ctx || !this.running) return
    const horizon = ctx.currentTime + 2.5
    if (this.mood === 'combat') {
      while (this.nextDrumAt < horizon) {
        noiseBurst({ when: this.nextDrumAt, type: 'lowpass', freq: 180, gain: 0.22, decay: 0.28, bus: audio.music })
        tone(58, { when: this.nextDrumAt, gain: 0.18, decay: 0.3, endFreq: 42, bus: audio.music })
        this.nextDrumAt += Math.random() < 0.2 ? 0.33 : 0.66
      }
    } else {
      this.nextDrumAt = ctx.currentTime + 0.5
    }
    if (this.nextPhraseAt < horizon) this.playPhrase(this.nextPhraseAt)
  }

  private playPhrase(start: number) {
    const mood = this.mood
    const low = mood === 'night' ? 0 : mood === 'combat' ? 2 : 4
    const high = mood === 'night' ? 9 : mood === 'combat' ? 11 : 14
    const length = 3 + Math.floor(Math.random() * (mood === 'combat' ? 5 : 4))
    const unit = mood === 'combat' ? 0.33 : mood === 'night' ? 0.85 : 0.62
    let t = start
    for (let i = 0; i < length; i += 1) {
      this.step = Math.max(low, Math.min(high, this.step + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]))
      const freq = pentatonic(this.step)
      const last = i === length - 1
      pluck(freq, {
        when: t,
        gain: 0.2 + Math.random() * 0.08,
        slide: last && Math.random() < 0.35 ? (Math.random() < 0.5 ? -2 : 2) : 0,
        pan: (Math.random() - 0.5) * 0.5,
        brightness: mood === 'combat' ? 0.8 : 0.45,
      })
      if (Math.random() < 0.18) pluck(pentatonic(this.step - 5), { when: t, gain: 0.12, pan: -0.2 })
      if (Math.random() < 0.12 && mood !== 'combat') tone(freq * 2, { when: t + 0.02, gain: 0.03, attack: 0.02, decay: 2.2, bus: audio.music, send: 0.8 })
      t += unit * [1, 1, 1.5, 2, 0.5][Math.floor(Math.random() * 5)]
    }
    const rest = mood === 'combat' ? 0.8 + Math.random() * 1.4 : mood === 'night' ? 5 + Math.random() * 6 : 3 + Math.random() * 5
    this.nextPhraseAt = t + rest
  }
}

export const music = new MusicDirector()
