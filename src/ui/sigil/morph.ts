// Path morphing for the sigil's idle life (the fingers rolling the moustache tip).
//
// HOW: two SVG path strings with the SAME commands in the same order differ only in their
// numbers. Split keyframe A into "text between numbers" + "numbers", read keyframe B's
// numbers, and blend each number: d(k) = A + (B − A)·k. Rebuild the string, set it as the
// path's `d`. Cheap enough to run every frame for a handful of strokes.

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

export function makeMorph(a: string, b: string) {
  const na = (a.match(NUM) ?? []).map(Number)
  const nb = (b.match(NUM) ?? []).map(Number)
  if (na.length !== nb.length) throw new Error(`morph: paths differ in structure (${na.length} vs ${nb.length} numbers)`)
  const gaps = a.split(NUM)
  return (k: number) => {
    let s = gaps[0]
    for (let i = 0; i < na.length; i++) s += (na[i] + (nb[i] - na[i]) * k).toFixed(2) + gaps[i + 1]
    return s
  }
}
