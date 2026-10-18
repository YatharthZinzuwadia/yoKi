// THE FILM — every scene of the single take, in order.
// Edit lengths to change pacing (1 unit ≈ one screen of scrolling at default speed).
// `source` is internal only: what is memory vs. authored (never shown to visitors).

export type Source = 'MEMORY' | 'PATTERN' | 'RECONSTRUCTION' | 'COMPOSITE' | 'FICTION' | 'SYMBOLIC'

export interface PhaseDef {
  index: 1 | 2 | 3 | 4 | 5
  id: string
  name: string
  subtitle: string
  /** Optional takiya-kalaam shown under the phase sigil. Empty until the creator supplies it. */
  quote?: string
}

export interface SceneDef {
  id: string
  phase: 1 | 2 | 3 | 4 | 5
  title: string
  length: number
  source: Source
}

export const PHASES: PhaseDef[] = [
  { index: 1, id: 'p1', name: 'The Name', subtitle: 'born into the gaze' },
  { index: 2, id: 'p2', name: 'The Many', subtitle: 'every extreme, the same man' },
  { index: 3, id: 'p3', name: 'The Law of Force', subtitle: 'the centre of the room' },
  { index: 4, id: 'p4', name: 'Love, Loyalty & the Cost of Staying', subtitle: 'the ones who left' },
  { index: 5, id: 'p5', name: 'The Quiet Throne', subtitle: 'the man who chooses what remains' },
]

export const SCENES: SceneDef[] = [
  // ── 01 THE NAME ──────────────────────────────────────────────
  { id: 'p1.cave', phase: 1, title: 'The cave', length: 8, source: 'SYMBOLIC' },
  { id: 'p1.frame', phase: 1, title: 'The first frame', length: 5, source: 'RECONSTRUCTION' },
  { id: 'p1.gallery', phase: 1, title: 'The gallery of the gaze', length: 9, source: 'COMPOSITE' },
  { id: 'p1.house', phase: 1, title: 'The house of frosted glass', length: 6, source: 'COMPOSITE' },
  { id: 'p1.name', phase: 1, title: 'The name', length: 6, source: 'MEMORY' },

  // ── 02 THE MANY ──────────────────────────────────────────────
  { id: 'p2.paper', phase: 2, title: 'The paper world', length: 5, source: 'SYMBOLIC' },
  { id: 'p2.drawings', phase: 2, title: 'The drawings', length: 6, source: 'MEMORY' },
  { id: 'p2.strings', phase: 2, title: 'Strings, keys and bellows', length: 5, source: 'MEMORY' },
  { id: 'p2.court', phase: 2, title: 'The court', length: 6, source: 'MEMORY' },
  { id: 'p2.stage', phase: 2, title: 'The stage', length: 5, source: 'MEMORY' },
  { id: 'p2.machine', phase: 2, title: 'The first machine', length: 6, source: 'MEMORY' },
  { id: 'p2.converge', phase: 2, title: 'One man, every material', length: 6, source: 'SYMBOLIC' },

  // ── 03 THE LAW OF FORCE ──────────────────────────────────────
  { id: 'p3.street', phase: 3, title: 'The street', length: 6, source: 'COMPOSITE' },
  { id: 'p3.club', phase: 3, title: 'Ballers Club', length: 5, source: 'MEMORY' },
  { id: 'p3.calls', phase: 3, title: 'The one people call', length: 6, source: 'PATTERN' },
  { id: 'p3.fight', phase: 3, title: 'Force becomes friction', length: 6, source: 'COMPOSITE' },
  { id: 'p3.ward', phase: 3, title: 'The ward', length: 7, source: 'RECONSTRUCTION' },

  // ── 04 LOVE, LOYALTY & THE COST OF STAYING ───────────────────
  { id: 'p4.corridor', phase: 4, title: 'The corridor of doors', length: 6, source: 'SYMBOLIC' },
  { id: 'p4.sukki', phase: 4, title: 'Sukki · heat', length: 6, source: 'RECONSTRUCTION' },
  { id: 'p4.sendoff', phase: 4, title: 'Sukki · the send-off', length: 5, source: 'MEMORY' },
  { id: 'p4.crash', phase: 4, title: 'The crash', length: 6, source: 'MEMORY' },
  { id: 'p4.panditaein', phase: 4, title: 'Panditaein · the long parallel', length: 8, source: 'RECONSTRUCTION' },
  { id: 'p4.group', phase: 4, title: 'The group · Kshitij', length: 7, source: 'COMPOSITE' },
  { id: 'p4.shivi', phase: 4, title: 'Shivi · the bite', length: 6, source: 'RECONSTRUCTION' },
  { id: 'p4.clearing', phase: 4, title: 'The clearing', length: 5, source: 'SYMBOLIC' },
  { id: 'p4.push', phase: 4, title: 'The push', length: 5, source: 'SYMBOLIC' },

  // ── 05 THE QUIET THRONE ──────────────────────────────────────
  { id: 'p5.madness', phase: 5, title: 'The pit', length: 7, source: 'SYMBOLIC' },
  { id: 'p5.landing', phase: 5, title: 'The landing', length: 4, source: 'SYMBOLIC' },
  { id: 'p5.carry', phase: 5, title: 'What is worth carrying', length: 4, source: 'SYMBOLIC' },
  { id: 'p5.cut', phase: 5, title: 'The cut', length: 6, source: 'SYMBOLIC' },
  { id: 'p5.climb', phase: 5, title: 'The climb through the discarded', length: 9, source: 'SYMBOLIC' },
  { id: 'p5.summit', phase: 5, title: 'The summit', length: 9, source: 'SYMBOLIC' },
]

/** Scroll distance per unit, as a fraction of the viewport height. */
export const UNIT_VH = 0.9

export interface SceneRange extends SceneDef {
  start: number
  end: number
}

export const RANGES: SceneRange[] = (() => {
  let t = 0
  return SCENES.map((s) => {
    const r = { ...s, start: t, end: t + s.length }
    t += s.length
    return r
  })
})()

export const TOTAL = RANGES[RANGES.length - 1].end

export const sceneRange = (id: string) => {
  const r = RANGES.find((s) => s.id === id)
  if (!r) throw new Error(`Unknown scene ${id}`)
  return r
}

export const PHASE_STARTS = PHASES.map((p) => RANGES.find((s) => s.phase === p.index)!.start)
