// Wraps every scene: toggles visibility around its time range, and gives the
// scene a frame hook that only runs while it's near the camera.

import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import type { SceneRange } from '../content/film'
import { film } from '../engine/director'

/** Units of film time before/after a scene in which it stays rendered. */
export const PRE = 1.25
export const POST = 1.25

/** Global switch used during shader warm-up (everything visible once). */
export const warmup = { all: false }

export function SceneRoot({
  range,
  children,
  before = PRE,
  after = POST,
}: {
  range: SceneRange
  children: ReactNode
  before?: number
  after?: number
}) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.visible = warmup.all || film.near(range, before, after)
  }, -40)
  return <group ref={ref}>{children}</group>
}

/**
 * Per-frame callback for a scene. `u` is scene-local time in units
 * (can be <0 or >length within the margins), `p` is 0..1 progress.
 */
export function useSceneFrame(
  range: SceneRange,
  fn: (u: number, p: number, dt: number) => void,
  { before = PRE, after = POST } = {},
) {
  useFrame(() => {
    if (!warmup.all && !film.near(range, before, after)) return
    const u = film.t - range.start
    fn(u, film.local(range), film.dt)
  })
}

/** True when this scene owns the frame (for global lights / sun). */
export const isCurrent = (range: SceneRange) => film.t >= range.start && film.t < range.end
