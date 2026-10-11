# 06 — Experience & Interface

The interface should almost disappear. There are two persistent pieces (a **cursor** and a **collapsing nav pill**) plus the **text/annotation layer**. Everything else is the film.

## 1. Loader (the sigil draws itself)

Built in the spirit of mithilamakhana's preloader: the logo is the whole screen.

1. **Ink field.** A single point of warm light appears at centre.
2. The point **traces the sigil contour**. Its progress is the *real* loading progress (assets + shader compilation), so it is never a fake bar. The light leaves a bone-white line behind it.
3. At 100%, `yoKi` **signs itself** under the sigil in pen order.
4. A small mono prompt fades in under the wordmark:

   ```
   click anywhere to enter · sound on
   ```

   Under it, very small:

   ```
   18+ · violence · gore · sexuality · psychosis · death
   ```
5. **On click:**
   - The AudioContext unlocks (sound is **on by default**).
   - A breath of air sounds.
   - The sigil **scales toward the camera** while the field fades (mithilamakhana's rise-and-scale reveal).
   - The camera passes through the contour's eye.
   - The contour unravels into the cave filament.

   The film has begun.

**Notes:**
- `M` or the nav toggle mutes at any time. Mute state persists in `localStorage`.
- If loading is slow, the drawing simply waits mid-stroke. The point keeps breathing so the page never looks frozen.

## 2. Cursor: the kada

On desktop the system cursor is replaced by a **small steel ring** (the kada):
- 18 px, 1.5 px stroke, slight specular glint, damped follow (≈0.15 s).
- **Hovering something meaningful:** the ring tightens and a mono label appears beside it (`the smile`, `₹350`, `hunter 350`).
- **Scrolling:** the ring stretches slightly in the scroll direction.
- **Touch devices:** no custom cursor.

## 3. The nav pill (the only control)

A small pill **bottom-centre**, like mithilamakhana's collapsing header turned into a dock.

- **Collapsed** (while scrolling): ~120 × 8 px. A hairline progress bar of the whole take, with five tick marks at phase boundaries. Semi-transparent.
- **Expanded** (on hover, after ~1.5 s idle, at the very top, at the very end):
  - tiny sigil glyph (current state);
  - five phase dots;
  - the current phase name in mono;
  - a sound toggle (a tiny live waveform that flatlines when muted).
- **Phase dots:** hovering shows the phase name. Clicking jumps there with a **0.5 s fade to black, a jump, then a fade in**. It is a deliberate editorial cut, never a fast-forward through the take.
- **Keyboard:**

  | Key | Action |
  |---|---|
  | Space, PageUp/PageDown, arrows | Native scroll |
  | `M` | Mute |
  | `1`–`5` | Jump to phase |
  | `0` | Back to start |

There is **no** play/pause, continue, skip, index or restart button. Scroll is the control.

## 4. Scroll and camera feel

- **Mapping:** the page is a tall scroll track, and position maps to time along the take. Scroll is smoothed (Lenis) so wheel, trackpad and touch all feel equally weighted.
- **Settling:** when scrolling stops, the camera **eases into the nearest authored "rest pose"** within a small window, so a stopped frame is always a composed frame. Scroll position itself is never snapped or hijacked.
- **Aliveness:**
  - **Pointer look:** the POV glances a few degrees toward the cursor, heavily damped, so the world feels alive under the hand (as in Artisans).
  - **Breathing:** a subtle POV breathing sway (sub-centimetre; off with reduced motion).
- **No dead zones:** every scroll tick moves *something*: camera, light, a counter or a particle.

## 5. Text and annotation layer

- **DOM overlay** above the canvas. It stays crisp at any resolution and is selectable and accessible.
- **Statements:** Fraunces italic, lower third or in the scene's negative space, fading with scroll position.
- **Annotations:** pinned to 3D anchors and projected each frame. Leader lines are drawn in SVG, and labels are mono.
- **Diagrams and counters:** SVG and DOM elements animated directly by film time.
- All text lives in `src/content/` so it can be edited without touching scene code.

## 6. Sound defaults

- **On by default**, unlocked by the entry click (browsers require a gesture).
- **Muting:** the nav toggle or `M` fades in/out over 0.3 s. Sound is suspended when the tab is hidden.
- The story stays fully readable muted. Every important sound event also has a visual.

## 7. Compatibility (desktop first, maximum reach)

- **Targets:** latest two versions of Chrome, Edge, Firefox and Safari (macOS); Linux, Windows and macOS; 1280×720 → 5120×2880; 60/120/144 Hz; DPR 1–3.
- **Requires WebGL2.** With no WebGL2, a static poster frame of each phase and the text are shown as a fallback page.
- **Adaptive quality:** resolution scale and effect tiers adjust live to hold frame rate; there is never a frozen frame.
- **Ultra-wide and portrait desktop windows:** the camera FOV adapts to keep authored compositions (horizontal FOV preserved within limits).
- **Photosensitivity:** flash and strobe frequency is capped (≤3 Hz) with softened luminance jumps everywhere.
- **Reduced motion** (bonus, respected when the OS asks): no sway, softer camera turns, strobes become fades, and the madness stutter becomes slow crossfades.

## 8. Mobile (later)

- **For now:** phones get the same film at a lower quality tier with touch scroll.
- **Later:** a dedicated portrait pass recomposes key shots for 9:16, simplifies the paint pass, uses lighter assets, and replaces the cursor with touch reactions. See the action plan.
