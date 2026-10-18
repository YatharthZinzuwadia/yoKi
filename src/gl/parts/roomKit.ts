// roomKit — builds a believable interior from a few numbers: floor, ceiling, plaster walls,
// wood wainscot with panel joints, chair rail, baseboards, picture rail, a stepped cornice,
// pilasters, a coffered ceiling with skylight panes, and an end wall with a doorway.
//
// WHY: a "room" reads as a room because of its JOINTS — where wall meets floor (baseboard),
// wall meets ceiling (cornice), and where the wall is divided (rails, pilasters). Four bare
// planes look like "what a base model thinks a wall is". These pieces catch light and
// ambient occlusion, which is what tells the eye it is enclosed.
//
// HOW: every piece is a box (or plane) positioned in world space, then all pieces that share
// a material are MERGED into one geometry (BufferGeometryUtils.mergeGeometries). The whole
// room is ~7 draw calls no matter how many panels it has. Materials use triplanar CC0
// textures (painted.ts), so merged world-space geometry needs no UVs.

import { BoxGeometry, BufferGeometry, Group, Mesh, PlaneGeometry, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface RoomSpec {
  /** Inner faces of the side walls (x0 < x1). */
  x0: number
  x1: number
  /** Floor and ceiling heights. */
  y0?: number
  y1: number
  /** Near end (z0) and far end (z1), z0 > z1 — the room runs toward −z. */
  z0: number
  z1: number
  wainscot?: number
  pictureRail?: number
  pilasterEvery?: number
  beamsEvery?: number
  /** Doorway in the far end wall (centred on x). Omit for no end wall. */
  endDoor?: { x: number; w: number; h: number }
  /** Close the near end too (a doorway can be cut into it). */
  startDoor?: { x: number; w: number; h: number }
}

export interface RoomMaterials {
  wall: Material
  wood: Material
  trim: Material
  floor: Material
  ceiling: Material
  /** Emissive skylight panes (optional). */
  glass?: Material
}

type Bucket = 'wall' | 'wood' | 'trim' | 'floor' | 'ceiling' | 'glass'

export function buildRoom(s: RoomSpec, m: RoomMaterials) {
  const y0 = s.y0 ?? 0
  const W = s.x1 - s.x0, L = s.z0 - s.z1, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2
  const ws = s.wainscot ?? 1.15
  const pr = s.pictureRail ?? Math.min(4.6, s.y1 - 1.2)
  const buckets: Record<Bucket, BufferGeometry[]> = { wall: [], wood: [], trim: [], floor: [], ceiling: [], glass: [] }
  /** A box by its min/max corners (world space). */
  const box = (b: Bucket, x0: number, y0b: number, z0b: number, x1: number, y1b: number, z1b: number) => {
    const g = new BoxGeometry(Math.abs(x1 - x0), Math.abs(y1b - y0b), Math.abs(z1b - z0b))
    g.translate((x0 + x1) / 2, (y0b + y1b) / 2, (z0b + z1b) / 2)
    buckets[b].push(g.toNonIndexed())
  }

  // floor + ceiling (planes facing into the room)
  const floor = new PlaneGeometry(W, L)
  floor.rotateX(-Math.PI / 2)
  floor.translate(cx, y0, cz)
  buckets.floor.push(floor.toNonIndexed())
  const ceil = new PlaneGeometry(W, L)
  ceil.rotateX(Math.PI / 2)
  ceil.translate(cx, s.y1, cz)
  buckets.ceiling.push(ceil.toNonIndexed())

  for (const side of [-1, 1] as const) {
    const xw = side < 0 ? s.x0 : s.x1 // the wall's inner face
    const inward = -side // +x for the left wall
    // plaster from the chair rail up (a thin box so the back is closed)
    box('wall', xw, y0 + ws, s.z1, xw - inward * 0.2, s.y1, s.z0)
    // wainscot: panels with 2 cm joints every 1.2 m, proud of the wall by 3 cm
    const n = Math.max(1, Math.round(L / 1.2))
    const step = L / n
    for (let i = 0; i < n; i++) {
      const za = s.z0 - i * step - 0.01, zb = s.z0 - (i + 1) * step + 0.01
      box('wood', xw, y0 + 0.18, za, xw + inward * 0.03, y0 + ws, zb)
    }
    box('wall', xw, y0, s.z1, xw - inward * 0.2, y0 + ws, s.z0) // behind the joints
    // chair rail, baseboard, picture rail
    box('trim', xw, y0 + ws - 0.03, s.z1, xw + inward * 0.07, y0 + ws + 0.05, s.z0)
    box('trim', xw, y0, s.z1, xw + inward * 0.04, y0 + 0.2, s.z0)
    box('trim', xw, pr, s.z1, xw + inward * 0.035, pr + 0.04, s.z0)
    // stepped cornice
    box('trim', xw, s.y1 - 0.22, s.z1, xw + inward * 0.26, s.y1, s.z0)
    box('trim', xw, s.y1 - 0.42, s.z1, xw + inward * 0.12, s.y1 - 0.22, s.z0)
    // pilasters
    if (s.pilasterEvery) {
      for (let z = s.z0 - s.pilasterEvery / 2; z > s.z1 + 0.5; z -= s.pilasterEvery) {
        box('trim', xw, y0, z + 0.36, xw + inward * 0.22, s.y1 - 0.42, z - 0.36)
        box('trim', xw, s.y1 - 0.75, z + 0.46, xw + inward * 0.3, s.y1 - 0.42, z - 0.46) // capital
        box('trim', xw, y0, z + 0.44, xw + inward * 0.28, y0 + 0.32, z - 0.44) // base
      }
    }
  }

  // coffered ceiling: cross beams + two long beams; skylight panes in the middle bays
  if (s.beamsEvery) {
    const bd = 0.5
    for (let z = s.z0 - s.beamsEvery; z > s.z1; z -= s.beamsEvery) {
      box('trim', s.x0, s.y1 - bd, z + 0.2, s.x1, s.y1, z - 0.2)
    }
    const inset = W * 0.28
    box('trim', s.x0 + inset - 0.2, s.y1 - bd, s.z1, s.x0 + inset + 0.2, s.y1, s.z0)
    box('trim', s.x1 - inset - 0.2, s.y1 - bd, s.z1, s.x1 - inset + 0.2, s.y1, s.z0)
    if (m.glass) {
      for (let z = s.z0 - s.beamsEvery / 2; z > s.z1 + 0.5; z -= s.beamsEvery) {
        const g = new PlaneGeometry(W - inset * 2 - 0.8, s.beamsEvery - 0.8)
        g.rotateX(Math.PI / 2)
        g.translate(cx, s.y1 - 0.02, z)
        buckets.glass.push(g.toNonIndexed())
      }
    }
  }

  // end walls with doorways (three boxes around the opening)
  const endWall = (z: number, thick: number, door?: { x: number; w: number; h: number }) => {
    const za = z, zb = z + thick
    if (!door) {
      box('wall', s.x0, y0, za, s.x1, s.y1, zb)
      return
    }
    box('wall', s.x0, y0, za, door.x - door.w / 2, s.y1, zb)
    box('wall', door.x + door.w / 2, y0, za, s.x1, s.y1, zb)
    box('wall', door.x - door.w / 2, y0 + door.h, za, door.x + door.w / 2, s.y1, zb)
    // a door casing (trim) around the opening, on the room side
    const t = 0.16, f = Math.sign(thick) * -0.05
    box('trim', door.x - door.w / 2 - t, y0, z, door.x - door.w / 2, y0 + door.h + t, z + f)
    box('trim', door.x + door.w / 2, y0, z, door.x + door.w / 2 + t, y0 + door.h + t, z + f)
    box('trim', door.x - door.w / 2 - t, y0 + door.h, z, door.x + door.w / 2 + t, y0 + door.h + t, z + f)
  }
  if (s.endDoor) endWall(s.z1, -0.25, s.endDoor)
  if (s.startDoor) endWall(s.z0, 0.25, s.startDoor)

  const group = new Group()
  const mats: Record<Bucket, Material | undefined> = { wall: m.wall, wood: m.wood, trim: m.trim, floor: m.floor, ceiling: m.ceiling, glass: m.glass }
  for (const k of Object.keys(buckets) as Bucket[]) {
    const list = buckets[k]
    const mat = mats[k]
    if (!list.length || !mat) continue
    const geo = mergeGeometries(list)
    list.forEach((g) => g.dispose())
    geo.computeVertexNormals()
    const mesh = new Mesh(geo, mat)
    mesh.name = `room.${k}`
    mesh.receiveShadow = k !== 'glass'
    // only the jutting pieces cast shadows (beams stripe the floor in skylight); big
    // surfaces would just put the whole room in shadow
    mesh.castShadow = k === 'trim'
    mesh.frustumCulled = false
    group.add(mesh)
  }
  return group
}
