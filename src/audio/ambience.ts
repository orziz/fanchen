import { audio } from '@/audio/engine'
import { tone, noiseBurst } from '@/audio/synth'

export type AmbienceWeather = 'clear' | 'drizzle' | 'wind' | 'frost' | 'fog' | 'storm'

interface Bed { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; lfo?: OscillatorNode }

/** 环境声：风与雨两条噪声床，按天气调音量；雷暴时伴雷声。 */
class Ambience {
  private wind: Bed | null = null
  private rain: Bed | null = null

  private makeBed(type: BiquadFilterType, freq: number, q: number, lfoDepth = 0): Bed {
    const ctx = audio.ctx!
    const source = ctx.createBufferSource()
    source.buffer = audio.noise()
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter).connect(gain).connect(audio.ambience)
    source.start()
    let lfo: OscillatorNode | undefined
    if (lfoDepth) {
      lfo = ctx.createOscillator()
      lfo.frequency.value = 0.09
      const depth = ctx.createGain()
      depth.gain.value = lfoDepth
      lfo.connect(depth).connect(filter.frequency)
      lfo.start()
    }
    return { source, filter, gain, lfo }
  }

  set(weather: AmbienceWeather, active: boolean) {
    if (!audio.ctx) return
    if (!this.wind) this.wind = this.makeBed('bandpass', 520, 0.6, 260)
    if (!this.rain) this.rain = this.makeBed('highpass', 1400, 0.4)
    const t = audio.ctx.currentTime
    const windLevel = !active ? 0 : weather === 'wind' ? 0.32 : weather === 'storm' ? 0.26 : weather === 'frost' ? 0.14 : 0.07
    const rainLevel = !active ? 0 : weather === 'storm' ? 0.2 : weather === 'drizzle' ? 0.1 : 0
    this.wind.gain.gain.setTargetAtTime(windLevel, t, 1.5)
    this.rain.gain.gain.setTargetAtTime(rainLevel, t, 1.5)
  }

  thunder() {
    if (!audio.ctx) return
    const t = audio.ctx.currentTime + 0.25 + Math.random() * 0.6
    noiseBurst({ when: t, type: 'lowpass', freq: 260, endFreq: 60, gain: 0.5, decay: 2.4, bus: audio.ambience })
    tone(42, { when: t, gain: 0.3, attack: 0.05, decay: 2, bus: audio.ambience })
  }
}

export const ambience = new Ambience()
