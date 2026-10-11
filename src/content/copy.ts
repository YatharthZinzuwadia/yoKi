// ALL WORDS IN THE FILM. Edit freely — no rendering code here.
// Times are scene-local units (`from`/`to`), see film.ts for scene lengths.
// Statements are project-authored first-person lines (not literal quotes)
// unless marked `quote: true`.

import type { SigilPart } from '../ui/sigil/paths'

export interface Statement {
  scene: string
  from: number
  to: number
  text: string
  /** Where on screen: lower third (default), centre, left or right negative space. */
  at?: 'low' | 'mid' | 'left' | 'right' | 'high'
  /** A real (or reconstructed) spoken line → shown in quotation style. */
  quote?: boolean
  /** Script: devanagari lines use the Devanagari face. */
  script?: 'latin' | 'devanagari'
}

export const STATEMENTS: Statement[] = [
  // 01 THE NAME
  { scene: 'p1.cave', from: 3.2, to: 6.2, text: 'Before I had a name, I had an audience.' },
  { scene: 'p1.gallery', from: 3.6, to: 6.4, text: 'Smile. Again. Bigger.', at: 'high' },
  { scene: 'p1.house', from: 3.9, to: 5.6, text: 'Be the elder. Don’t cry.', at: 'left' },
  { scene: 'p1.name', from: 2.2, to: 3.9, text: 'They gave me a frame. I gave myself a name.' },
  // 02 THE MANY
  { scene: 'p2.paper', from: 1.2, to: 4.2, text: 'I wanted to be everything. So I tried.' },
  { scene: 'p2.converge', from: 1.4, to: 3.6, text: 'Every extreme. Same man.', at: 'mid' },
  // 03 THE LAW OF FORCE
  { scene: 'p3.street', from: 2.4, to: 5.2, text: 'Rooms changed when I walked in. I noticed. I liked it.' },
  { scene: 'p3.calls', from: 3.4, to: 5.6, text: 'Whenever something broke, they called me. I always came.' },
  { scene: 'p3.fight', from: 4.3, to: 5.8, text: 'The same hands that held people together.' },
  { scene: 'p3.ward', from: 4.8, to: 6.8, text: 'I learned to live with the voices. Some days I still negotiate.' },
  // 04 LOVE, LOYALTY & THE COST OF STAYING
  { scene: 'p4.sukki', from: 4.2, to: 5.9, text: 'I knew. I stayed. Then I let her go properly.' },
  { scene: 'p4.panditaein', from: 3.0, to: 4.6, text: 'Take it to a therapist. Not me.', quote: true, at: 'right' },
  { scene: 'p4.panditaein', from: 6.0, to: 7.8, text: 'I wanted a future with her. I just couldn’t hand her the key to me.' },
  { scene: 'p4.group', from: 5.0, to: 6.9, text: 'Some of them left me. Some of them, I left. I’d do it again.' },
  { scene: 'p4.shivi', from: 3.6, to: 5.4, text: 'You’re not a bad person. You’re just misunderstood.', quote: true },
  // 05 THE QUIET THRONE
  { scene: 'p5.landing', from: 2.2, to: 3.9, text: 'I fell. I got up. That’s all that happened.' },
  {
    scene: 'p5.cut',
    from: 1.0,
    to: 2.6,
    text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।',
    script: 'devanagari',
    at: 'high',
  },
  { scene: 'p5.cut', from: 4.0, to: 5.8, text: 'Nobody left me with nothing. I chose what to keep.' },
  { scene: 'p5.climb', from: 5.5, to: 8.4, text: 'People I left. People who left me. Every version of me I outgrew.' },
  { scene: 'p5.summit', from: 5.2, to: 6.6, text: 'Not a curse. A requirement. I’m good here.', at: 'high' },
]

export interface Annotation {
  scene: string
  from: number
  to: number
  /** Name of a 3D anchor registered by the scene (see engine/anchors.ts). */
  anchor: string
  text: string
  side?: 'left' | 'right'
  /** Optional counter: `{n}` in text is replaced with an animated number. */
  counter?: { from: number; to: number; decimals?: number; suffix?: string }
}

export const ANNOTATIONS: Annotation[] = [
  { scene: 'p1.cave', from: 1.0, to: 2.6, anchor: 'p1.sandal', text: 'sandal · size 9 (child)', side: 'right' },
  { scene: 'p1.cave', from: 2.4, to: 4.0, anchor: 'p1.crayon', text: 'crayon · “flesh”', side: 'left' },
  { scene: 'p1.cave', from: 4.0, to: 5.8, anchor: 'p1.tooth', text: 'tooth · kept', side: 'right' },
  { scene: 'p1.frame', from: 1.6, to: 4.4, anchor: 'p1.frame.tl', text: 'fig. 1 — portfolio · age 9 · f/8 · 1/125', side: 'left' },
  { scene: 'p1.frame', from: 2.4, to: 4.4, anchor: 'p1.frame.smile', text: 'retakes: {n}', side: 'right', counter: { from: 0, to: 14 } },
  { scene: 'p1.gallery', from: 0.8, to: 2.6, anchor: 'p1.g0', text: 'featured · colgate · “best smile”', side: 'right' },
  { scene: 'p1.gallery', from: 1.8, to: 3.6, anchor: 'p1.g1', text: 'spelling bee · winner', side: 'left' },
  { scene: 'p1.gallery', from: 2.8, to: 4.6, anchor: 'p1.g2', text: 'school stage', side: 'right' },
  { scene: 'p1.gallery', from: 3.8, to: 5.6, anchor: 'p1.g3', text: 'olympiad · gold', side: 'left' },
  { scene: 'p1.gallery', from: 4.8, to: 6.6, anchor: 'p1.g4', text: 'debate · mun', side: 'right' },
  { scene: 'p1.gallery', from: 5.4, to: 7.2, anchor: 'p1.g5', text: 'first studio portrait · age 6', side: 'left' },
  { scene: 'p1.gallery', from: 0.5, to: 7.6, anchor: 'screen.counter', text: 'times photographed: {n}', counter: { from: 1, to: 1000, suffix: '+' } },
  { scene: 'p1.house', from: 1.2, to: 4.6, anchor: 'p1.heights', text: 'expectation · measured yearly', side: 'right' },
  { scene: 'p1.house', from: 4.3, to: 5.9, anchor: 'p1.brother', text: 'brother · 8 yrs younger · commerce → CA', side: 'right' },
  { scene: 'p1.name', from: 1.2, to: 3.6, anchor: 'p1.glass', text: 'the name · adopted at 14–15 · by choice', side: 'right' },
]

export interface Threshold {
  scene: string
  from: number
  to: number
  /** Parts that ignite now. */
  ignite: SigilPart[]
  /** Previously earned parts shown as embers. */
  keep: SigilPart[]
  /** Backdrop tint of the veil behind the sigil. */
  backdrop: string
  /** Corner mini-sigil instead of full-screen. */
  mini?: boolean
  /** The broken, wrong sigil (madness). */
  shattered?: boolean
  /** Ends on the wordmark. */
  final?: boolean
}

export const THRESHOLDS: Threshold[] = [
  { scene: 'p1.name', from: 3.9, to: 6.0, ignite: ['kada'], keep: [], backdrop: '#efe4cf' },
  { scene: 'p2.converge', from: 3.7, to: 6.0, ignite: ['thread', 'capsule'], keep: ['kada'], backdrop: '#0e1a2b' },
  { scene: 'p4.corridor', from: 0.0, to: 2.2, ignite: ['scar'], keep: ['kada', 'thread', 'capsule'], backdrop: '#1a0f1f' },
  { scene: 'p4.shivi', from: 2.3, to: 3.5, ignite: ['bite'], keep: ['kada', 'thread', 'capsule', 'scar'], backdrop: '#b0002a', mini: true },
  { scene: 'p5.madness', from: 0.0, to: 1.8, ignite: [], keep: ['kada', 'thread', 'capsule', 'scar', 'bite'], backdrop: '#000000', shattered: true },
  {
    scene: 'p5.summit',
    from: 6.6,
    to: 9.0,
    ignite: ['moustache', 'beard', 'moon'],
    keep: ['kada', 'thread', 'capsule', 'scar', 'bite'],
    backdrop: '#0d1024',
    final: true,
  },
]

/** Takiya-kalaams per phase — empty until the creator supplies them (never shown when empty). */
export const QUOTES: Record<number, string> = {}
