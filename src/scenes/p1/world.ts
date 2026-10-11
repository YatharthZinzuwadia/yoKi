// Phase 01 world layout (metres). The cave, chamber and frame share one continuous
// space; the gallery begins after a flash white-out and continues into the house
// and the black glass without another cut.

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

export const FOUND = {
  sandal: v(0.95, 0.03, -7.9),
  crayon: v(-1.05, 0.62, -14.8),
  tooth: v(1.3, 1.02, -22.3),
}

export const GALLERY = { z0: -198, z1: -270, halfW: 4.6, height: 8 }

export const GALLERY_FRAMES = [
  { id: 'p1.g0', img: 'p1/modelling2', side: 1, z: -212, y: 2.95, w: 2.46, h: 3.33 },
  { id: 'p1.g1', img: 'p1/spellbee', side: -1, z: -219, y: 2.75, w: 2.75, h: 2.17 },
  { id: 'p1.g2', img: 'p1/stage', side: 1, z: -226, y: 2.65, w: 3.48, h: 2.46 },
  { id: 'p1.g3', img: 'p1/olympiad', side: -1, z: -234, y: 3.15, w: 2.17, h: 2.90 },
  { id: 'p1.g4', img: 'p1/debate', side: 1, z: -242, y: 2.75, w: 2.90, h: 2.17 },
  { id: 'p1.g5', img: 'p1/smile', side: -1, z: -249, y: 2.55, w: 2.32, h: 3.19 },
]

export const HOUSE = { z0: -271, z1: -296, halfW: 1.6 }
export const GLASS = { center: v(0, 1.42, -304), w: 1.25, h: 0.78 }
