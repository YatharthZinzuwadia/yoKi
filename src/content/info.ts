// THE INFOGRAPHIC LAYER — all data and words for the age ruler, the margin notes and the
// drawn charts. Edit freely; no rendering code here. Times are scene-local units.

// ── age ruler ─────────────────────────────────────────────────────────────────
/** Which years of his life each scene is about (the ruler highlights this span). */
export const AGE_SPANS: { scene: string; from: number; to: number; label: string }[] = [
  { scene: 'p1.cave', from: 0, to: 14, label: 'ages 0–14 · the whole first chapter, in paint' },
  { scene: 'p1.frame', from: 9, to: 9, label: 'age 9 · the portfolio' },
  { scene: 'p1.gallery', from: 4, to: 13, label: 'ages 4–13 · recognition' },
  { scene: 'p1.house', from: 7, to: 12, label: 'ages 7–12 · home' },
  { scene: 'p1.name', from: 14, to: 15, label: 'ages 14–15 · the name' },
]
/** The ruler's scale for each phase. */
export const AGE_SCALE: Record<number, [number, number]> = { 1: [0, 15], 2: [8, 22], 3: [17, 24], 4: [18, 29], 5: [29, 29] }

// ── margin notes (handwritten, first person; project-authored, not quotes) ───
export interface MarginNote {
  scene: string
  from: number
  to: number
  text: string
  /** Screen position in % of the viewport, and a slight rotation in degrees. */
  x: number
  y: number
  rot?: number
}
export const MARGINALIA: MarginNote[] = [
  { scene: 'p1.cave', from: 3.2, to: 4.6, text: 'the oldest paintings in India are in rock shelters like this. I wanted mine to start here too.', x: 70, y: 74, rot: -2 },
  { scene: 'p1.frame', from: 1.0, to: 2.3, text: 'chin up. hands in pockets. don’t blink.', x: 66, y: 70, rot: 2.5 },
  { scene: 'p1.frame', from: 2.6, to: 3.6, text: 'I learned where the light was before I learned who I was.', x: 6, y: 72, rot: -1.5 },
  { scene: 'p1.gallery', from: 1.2, to: 2.6, text: 'every flash = a pat on the head', x: 68, y: 76, rot: 2 },
  { scene: 'p1.gallery', from: 3.4, to: 4.6, text: 'by thirteen I could find the lens in any room.', x: 7, y: 70, rot: -2 },
  { scene: 'p1.gallery', from: 6.6, to: 7.7, text: 'mum kept every single one. I never looked at them again.', x: 8, y: 74, rot: -1.5 },
  { scene: 'p1.house', from: 0.9, to: 2.2, text: 'the loudest room was the one with the door shut.', x: 64, y: 22, rot: 1.5 },
  { scene: 'p1.house', from: 3.0, to: 4.2, text: 'I was nine. I was the adult in the corridor.', x: 6, y: 24, rot: -2 },
  { scene: 'p1.name', from: 0.6, to: 1.9, text: 'the first thing I owned that nobody gave me.', x: 64, y: 20, rot: 2 },
]

// ── drawn charts ──────────────────────────────────────────────────────────────
export interface Chart {
  scene: string
  from: number
  to: number
  title: string
  note?: string
  /** Screen box in % of the viewport. */
  x: number
  y: number
  w: number
  h: number
  kind: 'bars' | 'line' | 'web'
  /** bars/line: [label, value 0..1]; web: centre label + spokes. */
  data: [string, number][]
  centre?: string
}
export const CHARTS: Chart[] = [
  {
    scene: 'p1.gallery',
    from: 6.1,
    to: 7.9,
    title: 'recognition, by age',
    note: 'certificates + medals + trophies (approx.)',
    x: 4,
    y: 12,
    w: 24,
    h: 17,
    kind: 'bars',
    data: [['4', 0.1], ['5', 0.15], ['6', 0.3], ['7', 0.35], ['8', 0.55], ['9', 0.8], ['10', 0.6], ['11', 0.9], ['12', 0.7], ['13', 1]],
  },
  {
    scene: 'p1.house',
    from: 1.3,
    to: 3.4,
    title: 'family money, as a child felt it',
    note: 'comfortable ↔ debt · the swings, not the sums',
    x: 4,
    y: 66,
    w: 26,
    h: 18,
    kind: 'line',
    data: [['7', 0.8], ['7½', 0.62], ['8', 0.2], ['8½', 0.35], ['9', 0.85], ['9½', 0.9], ['10', 0.15], ['10½', 0.05], ['11', 0.5], ['11½', 0.3], ['12', 0.65]],
  },
  {
    scene: 'p1.house',
    from: 3.5,
    to: 5.6,
    title: 'the eldest',
    note: 'roles, age 9',
    x: 68,
    y: 10,
    w: 27,
    h: 32,
    kind: 'web',
    centre: 'me',
    data: [['mother’s support', 1], ['brother’s shield', 1], ['the elder', 1], ['the example', 1], ['the peacekeeper', 1]],
  },
]
