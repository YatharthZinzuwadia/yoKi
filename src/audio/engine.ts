// The audio engine. Sound is ON by default; the entry click unlocks it.
// Beds crossfade along film time (scrubbing back reverses them); one-shots are
// pre-rendered buffers fired by scenes. Mute fades the master.

import { film, useUI } from '../engine/director'
import { BEDS } from './cues'
import * as S from './synth'

type BedName = keyof typeof BED_SOURCES

const BED_SOURCES = {
  air: () => S.bedAir(),
  room: () => S.bedRoom(),
  wind: () => S.bedWind(),
  hum: () => S.bedHum(),
  crowd: () => S.bedCrowd(),
  droneLow: () => S.bedDrone([73.42, 110, 146.83], 8, 21), // D2 A2 D3
  droneDark: () => S.bedDrone([55, 82.41, 130.81], 8, 22), // A1 E2 C3
}

const ONE_SHOTS = {
  enter: () => S.swell(3.4),
  breath: () => S.breath(2.6, 81),
  drip0: () => S.drip(1),
  drip1: () => S.drip(2),
  drip2: () => S.drip(3),
  shutter: () => S.shutter(),
  flash: () => S.flash(),
  applause: () => S.applause(4.5),
  clap: () => S.clap(2),
  shatter: () => S.shatter(),
  squeak: () => S.squeak(0.45, 91),
  thud: () => S.thud(52, 1.2),
  clink: () => S.clink(1),
  heart: () => S.heartbeat(),
  shout0: () => S.shout(1, 0.9),
  shout1: () => S.shout(2, 1.1),
  shout2: () => S.shout(3, 0.7),
  pluckD: () => S.pluck(146.83, 2.8, 0.6, 61),
  pluckA: () => S.pluck(220, 2.6, 0.6, 62),
  pluckF: () => S.pluck(174.61, 2.6, 0.6, 63),
}
export type Cue = keyof typeof ONE_SHOTS

class AudioEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private dry!: GainNode
  private wet!: GainNode
  private buffers = new Map<string, AudioBuffer>()
  private beds = new Map<BedName, { gain: GainNode; level: number }>()
  private unsub: (() => void) | null = null
  private muted = false

  private toBuffer(data: Float32Array) {
    const ctx = this.ctx!
    const b = ctx.createBuffer(1, data.length, S.SR)
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
    return b
  }

  async unlock(muted: boolean) {
    if (this.ctx) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = (this.ctx = new Ctx({ latencyHint: 'interactive' }))
    this.muted = muted
    this.master = ctx.createGain()
    this.master.gain.value = muted ? 0 : 1
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    comp.attack.value = 0.01
    comp.release.value = 0.25
    this.dry = ctx.createGain()
    this.wet = ctx.createGain()
    this.wet.gain.value = 0.35
    const verb = ctx.createConvolver()
    verb.buffer = S.impulse(ctx, 3.4, 2.8)
    this.dry.connect(this.master)
    this.wet.connect(verb).connect(this.master)
    this.master.connect(comp).connect(ctx.destination)
    if (ctx.state !== 'running') await ctx.resume().catch(() => {})

    // render the entry sound first so the click answers immediately
    this.buffers.set('enter', this.toBuffer(ONE_SHOTS.enter()))
    this.buffers.set('breath', this.toBuffer(ONE_SHOTS.breath()))
    // everything else in idle slices, so the main thread never stalls
    const rest = (Object.keys(ONE_SHOTS) as Cue[]).filter((k) => !this.buffers.has(k))
    const bedNames = Object.keys(BED_SOURCES) as BedName[]
    const work: (() => void)[] = [
      ...bedNames.map((name) => () => this.startBed(name)),
      ...rest.map((k) => () => this.buffers.set(k, this.toBuffer(ONE_SHOTS[k]()))),
    ]
    const step = () => {
      const job = work.shift()
      if (job) {
        job()
        setTimeout(step, 0)
      }
    }
    setTimeout(step, 30)

    this.unsub = film.onAfterFrame(() => this.update())
    useUI.subscribe((s) => {
      if (s.muted !== this.muted) this.setMuted(s.muted)
    })
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) this.ctx.suspend()
      else this.ctx.resume()
    })
  }

  private startBed(name: BedName) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.toBuffer(BED_SOURCES[name]())
    src.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(gain)
    gain.connect(this.dry)
    const send = ctx.createGain()
    send.gain.value = 0.5
    gain.connect(send).connect(this.wet)
    src.start(ctx.currentTime + Math.random() * 0.05)
    this.beds.set(name, { gain, level: 0 })
  }

  setMuted(m: boolean) {
    this.muted = m
    if (!this.ctx) return
    const g = this.master.gain
    g.cancelScheduledValues(this.ctx.currentTime)
    g.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.1)
  }

  /** Play a one-shot. pan −1..1, gain linear, rate playback speed, wet reverb send. */
  cue(name: Cue, { gain = 1, pan = 0, rate = 1, wet = 0.4, delay = 0 } = {}) {
    const ctx = this.ctx
    const b = this.buffers.get(name)
    if (!ctx || !b || this.muted) return
    const src = ctx.createBufferSource()
    src.buffer = b
    src.playbackRate.value = rate
    const g = ctx.createGain()
    g.gain.value = gain
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    src.connect(g).connect(p)
    p.connect(this.dry)
    if (wet > 0) {
      const s = ctx.createGain()
      s.gain.value = wet
      p.connect(s).connect(this.wet)
    }
    src.start(ctx.currentTime + delay)
  }

  /** Bed levels follow film time (evaluated from the cue sheet). */
  private update() {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    for (const [name, bed] of this.beds) {
      const target = BEDS.level(name, film.t)
      if (Math.abs(target - bed.level) > 0.002) {
        bed.level = target
        bed.gain.gain.setTargetAtTime(target, now, 0.25)
      }
    }
  }

  dispose() {
    this.unsub?.()
  }
}

export const audio = new AudioEngine()
