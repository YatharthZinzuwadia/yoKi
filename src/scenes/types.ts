import type { ComponentType } from 'react'
import type { SceneRange } from '../content/film'
import type { LookKey } from '../content/looks'

export type V3 = readonly [number, number, number]

/** A camera keyframe in scene-local time `u` (units from scene start), world-space positions. */
export interface CamKey {
  u: number
  pos: V3
  /** Point the camera looks at. */
  at: V3
  /** Vertical field of view in degrees (authored for 16:9). */
  fov?: number
  /** Roll in radians. */
  roll?: number
  /** 0 = flowing, 1 = hold (zero velocity at this key). */
  tension?: number
  /** Hidden cut: no interpolation from the previous key. Must be masked by the scene. */
  cut?: boolean
}

export interface SceneSpec {
  id: string
  Component: ComponentType<{ range: SceneRange }>
  camera: CamKey[]
  look?: LookKey[]
  /** Background / fog colour for this scene (linear-ish hex). */
  fog?: { color: string; near: number; far: number }
}

export const v3 = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z]
