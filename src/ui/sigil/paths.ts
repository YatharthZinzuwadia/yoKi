// The sigil — a monoline three-quarter bust of yoKi, right hand raised twirling
// his moustache (moonch pe taav). Every marker is its own layer so it can be
// traced, lit and dimmed independently. viewBox 0 0 400 480.
// The wordmark — `yoKi` as a single-line signature, strokes in pen order.
//
// To replace with hand-drawn versions: see docs/guides/03-edit-content.md.

export const SIGIL_VIEWBOX = '0 0 400 480'

export type SigilPart =
  | 'contour'
  | 'kada'
  | 'thread'
  | 'capsule'
  | 'scar'
  | 'bite'
  | 'moustache'
  | 'beard'
  | 'moon'

/** Paths per part. Each string is one stroke (traced in order). */
export const SIGIL: Record<SigilPart, string[]> = {
  // head, face profile, near ear, shoulders, raised right arm, torso edge
  contour: [
    // back of head → crown → hairline → forehead → brow → nose → philtrum
    'M 281 176 C 292 140 288 96 258 74 C 228 52 182 56 158 80 C 142 96 138 116 141 134 C 142 144 139 151 134 158 C 130 166 132 172 136 176 C 128 186 121 194 122 200 C 123 206 130 207 138 206',
    // hair: hairline and strands swept back
    'M 143 126 C 148 108 166 96 188 94 C 214 92 238 100 256 114',
    'M 160 84 C 184 74 216 72 244 82',
    'M 192 96 C 212 88 238 90 258 102',
    'M 236 72 C 256 84 270 102 276 126',
    // near ear
    'M 276 176 C 286 170 294 180 291 194 C 289 206 282 212 274 210',
    // near eye (his left) + brow
    'M 186 150 C 196 144 208 144 216 150',
    'M 190 162 C 197 157 207 157 213 162 C 207 166 197 166 190 162 Z',
    // far eye (his right), smaller, foreshortened
    'M 146 152 C 151 149 157 149 160 152',
    'M 148 163 C 152 160 157 160 160 163',
    // neck (near side) → near shoulder → down the near arm (outer edge)
    'M 266 262 C 268 280 272 296 290 306 C 322 318 350 330 360 360 C 368 384 370 420 372 470',
    // inner line of near arm / armpit
    'M 318 380 C 320 410 322 440 324 470',
    // tee neckline
    'M 172 300 C 196 320 238 320 264 298',
    // far side neck → far shoulder (partly hidden by the raised arm)
    'M 168 270 C 166 288 160 300 146 308',
    // raised right arm: upper arm from far shoulder down to elbow, forearm up to the hand
    'M 146 308 C 112 320 82 346 70 380 C 62 404 66 424 86 426 C 104 428 112 410 116 392',
    // forearm (two edges) rising to the wrist
    'M 86 426 C 76 380 80 320 96 278',
    'M 116 392 C 112 350 112 310 118 282',
    // hand: knuckles, index finger and thumb pinching the moustache tip
    'M 96 278 C 90 266 88 252 93 241 C 96 232 101 224 107 218 C 110 214 115 214 116 219 C 116 224 112 229 111 234 C 116 234 121 238 120 244 C 126 246 127 254 122 258 C 127 262 125 270 119 272 C 119 276 118 279 118 282',
    // thumb pressing up against the index fingertip (the twirl)
    'M 120 244 C 127 240 129 230 124 222 C 121 217 117 217 116 220',
  ],
  // the kada on the right wrist (an ellipse in perspective)
  kada: ['M 92 292 C 92 284 120 284 122 292 C 122 300 92 302 92 292 Z', 'M 93 298 C 100 304 116 304 121 298'],
  // Hanumanji's black thread hanging from the neck
  thread: ['M 176 276 C 184 306 200 326 214 334 C 228 326 246 304 258 272'],
  // the capsule trinket: a cylinder with domed ends
  capsule: ['M 209 336 C 209 330 219 330 219 336 L 219 358 C 219 364 209 364 209 358 Z', 'M 209 343 L 219 343'],
  // scar under the left (near) eye
  scar: ['M 196 176 L 214 171', 'M 200 172 L 202 178', 'M 207 170 L 209 176'],
  // bite on the left shoulder/tricep: two dotted arcs
  bite: [
    'M 336 352 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 342 348 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 349 347 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 355 349 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 337 366 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 343 370 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 350 371 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
    'M 356 369 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0',
  ],
  // Rajwadi moustache: two sweeps from under the nose, tips curling upward
  moustache: [
    // near half — top edge sweeping out and up into a curl
    'M 142 205 C 162 203 190 206 212 213 C 226 217 236 211 238 201 C 240 193 233 187 228 191 C 225 194 227 199 231 198',
    // near half — lower edge
    'M 142 214 C 164 221 192 225 214 224 C 226 223 234 218 237 209',
    // far half — top edge, tip curling up between the fingers
    'M 138 205 C 128 205 118 209 112 213 C 106 216 102 212 103 207 C 104 202 109 201 110 205',
    // far half — lower edge
    'M 138 214 C 128 218 119 221 112 220',
  ],
  // full beard: from the near ear along the jaw to the chin and up the far side
  beard: [
    'M 274 212 C 276 240 268 262 248 280 C 226 298 196 304 172 294 C 150 284 136 262 132 238 C 131 230 133 224 136 222',
    // beard texture strokes
    'M 200 240 C 202 254 200 268 196 278',
    'M 226 236 C 230 250 230 262 226 274',
    'M 174 240 C 172 254 174 266 178 276',
  ],
  // crescent moon (finale only)
  moon: ['M 318 26 C 300 26 288 40 290 56 C 292 70 304 78 318 76 C 308 70 302 60 304 48 C 306 36 312 30 318 26 Z'],
}

export const WORDMARK_VIEWBOX = '0 0 250 150'

/** `yoKi`, single-line, in pen order. */
export const WORDMARK: string[] = [
  // y: left arm, cup, rising right arm continuing into the descender loop, sweeping into the o
  'M 14 50 C 16 66 20 86 30 90 C 40 94 48 80 50 52 C 52 80 52 108 46 124 C 40 140 22 142 20 130 C 18 118 40 104 64 92 C 70 89 74 86 76 82',
  // o
  'M 92 56 C 78 54 70 68 72 80 C 74 92 86 96 96 88 C 104 80 104 62 92 56',
  // K stem
  'M 128 12 C 127 40 126 70 124 98',
  // K arm, flicking up like a moustache tip
  'M 126 64 C 140 52 156 36 164 20 C 168 12 176 12 176 20 C 176 26 170 28 166 24',
  // K leg
  'M 132 60 C 142 72 152 86 170 96 C 174 98 178 96 180 92',
  // i stem with a tail
  'M 196 58 C 196 72 195 84 196 92 C 197 98 202 98 208 92',
  // i dot
  'M 197 38 C 199 37 200 38 199 40 C 198 41 196 40 197 38 Z',
]
