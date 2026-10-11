// Named 3D points that DOM annotations attach to. Scenes register them.

import { Vector3, type PerspectiveCamera, type Scene } from 'three'

export const anchors = new Map<string, Vector3>()

export function setAnchor(name: string, x: number, y: number, z: number) {
  const v = anchors.get(name)
  if (v) v.set(x, y, z)
  else anchors.set(name, new Vector3(x, y, z))
}

/** The live camera, for projecting anchors to the screen. */
export const view = { camera: null as PerspectiveCamera | null, scene: null as Scene | null }

const tmp = new Vector3()
/** Project a world point to CSS pixels. Returns null if behind the camera. */
export function project(p: Vector3, out: { x: number; y: number; z: number }) {
  const cam = view.camera
  if (!cam) return null
  tmp.copy(p).project(cam)
  if (tmp.z > 1 || tmp.z < -1) return null
  out.x = (tmp.x * 0.5 + 0.5) * window.innerWidth
  out.y = (-tmp.y * 0.5 + 0.5) * window.innerHeight
  out.z = tmp.z
  return out
}
