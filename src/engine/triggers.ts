// Fire one-off events (sounds, bursts) when film time crosses a point going forward.
// Ignores big jumps (nav cuts, deep links) so nothing fires in a burst.

export function makeTriggers() {
  let prev = Number.NaN
  return {
    /** Call once per frame with the current scene-local time; returns the previous one. */
    step(u: number) {
      const p = prev
      prev = u
      return p
    },
    crossed(p: number, u: number, at: number) {
      return !Number.isNaN(p) && p < at && u >= at && u - p < 1
    },
  }
}
