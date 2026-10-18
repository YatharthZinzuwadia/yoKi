// Phase 01 world layout (metres). ONE continuous space, no cuts: the cave opens into a
// chamber; the giant frame stands in a quarried rock wall (STUDIO_WALL) and its opening IS
// the doorway into the gallery behind it (P1-07: walk through the photograph); the gallery
// leads into the house and the bathroom mirror.

import { CatmullRomCurve3, Vector3 } from 'three'

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const CAVE_CURVE = new CatmullRomCurve3(
  [v(0, 0, 7), v(0.2, 0, 0), v(0.5, 0, -6), v(0.1, 0, -11), v(-0.3, 0, -15), v(0.3, 0, -20), v(0.6, 0, -25), v(0.1, 0, -30), v(0, 0, -37), v(0, 0, -43)],
  false,
  'centripetal',
)

export const CHAMBER = { center: [0, 6, -59] as const, radius: 20 }

export const FRAME = {
  center: new Vector3(0, 5.4, -64),
  outerW: 6.8,
  outerH: 9.2,
  bar: 0.42,
  depth: 0.34,
}

/** The filament: cave floor → chamber floor → the frame's bottom-right corner. */
export const FILAMENT_CURVE = new CatmullRomCurve3(
  [
    v(0.2, 0.075, 4.5), v(0.4, 0.075, -2), v(0.75, 0.075, -7.2), v(0.35, 0.075, -11.5), v(-0.05, 0.075, -15.5),
    v(0.6, 0.075, -20.5), v(0.85, 0.075, -25), v(0.45, 0.075, -31), v(0.55, 0.075, -38), v(1.3, 0.075, -45),
    v(2.4, 0.075, -53), v(3.1, 0.075, -60), v(3.3, 0.075, -63.3), v(3.32, 0.6, -63.75), v(3.32, 1.0, -63.8),
  ],
  false,
  'centripetal',
)

/** The flat rock face the frame stands in; everything at z below it is the gallery. */
export const STUDIO_WALL = { z: -64.45, halfW: 22, height: 21 }

export const GALLERY = { z0: -68.4, z1: -140.4, halfW: 4.6, height: 10.5, pilasterEvery: 6 }

// one photograph per bay, centred between the pilasters (bays every 6 m from the wall)
export const GALLERY_FRAMES = [
  { id: 'p1.g0', img: 'p1/modelling2', side: 1, z: -76.95, y: 3.55, w: 2.46, h: 3.33 },
  { id: 'p1.g1', img: 'p1/spellbee', side: -1, z: -82.95, y: 3.4, w: 2.75, h: 2.17 },
  { id: 'p1.g2', img: 'p1/stage', side: 1, z: -88.95, y: 3.3, w: 3.48, h: 2.46 },
  { id: 'p1.g3', img: 'p1/olympiad', side: -1, z: -94.95, y: 3.6, w: 2.17, h: 2.9 },
  { id: 'p1.g4', img: 'p1/debate', side: 1, z: -100.95, y: 3.4, w: 2.9, h: 2.17 },
  { id: 'p1.g5', img: 'p1/smile', side: -1, z: -106.95, y: 3.55, w: 2.32, h: 3.19 },
]

export const HOUSE = { z0: -141.4, z1: -166.4, halfW: 1.6 }
export const GLASS = { center: v(0, 1.42, -174.4), w: 1.25, h: 0.78 }
