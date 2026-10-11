# Guide 02 — Blender from zero (only if you want to)

**You do not need Blender for v1.** Claude drives Blender headlessly with Python scripts in `tools/blender/` to make figures, the corpse mountain and props. This guide exists for the day you want to look inside, tweak a model, or make your own.

Blender 5.2 is already installed (`/usr/bin/blender`), and Cycles renders on your RTX 5050 via OptiX.

---

## 1. One-time setup (5 minutes)

1. Open Blender from the app menu, or run `blender` in a terminal. Close the splash screen.
2. **Edit → Preferences**:
   - **System** → Cycles Render Devices → **OptiX** → tick **NVIDIA GeForce RTX 5050**.
   - **Input** → tick **Emulate 3 Button Mouse** (helps on a laptop trackpad).
   - **Save Preferences** (bottom-left menu ☰).
3. Close Preferences.

## 2. The five things you need to know in the interface

| Do this | How |
|---|---|
| Orbit the view | Middle-mouse drag (or **Alt + left-drag** with emulate on) |
| Pan | **Shift** + middle-drag |
| Zoom | Scroll wheel |
| Frame the selected object | Numpad **.** (or **View → Frame Selected**) |
| Select / move / rotate / scale | Click; then **G** / **R** / **S**. Type a number to be exact. **Esc** cancels. |

**Panels:**
- The **Outliner** (top-right) lists every object.
- The **Properties** panel (bottom-right) has tabs for object, modifiers, materials and render.
- To see colours and lighting, use **Z → Material Preview** (fast) or **Z → Rendered** (Cycles, slower).

## 3. Open a model from the film

The film's models live in `public/models/*.glb`.

1. **File → Import → glTF 2.0 (.glb/.gltf)** → pick the file.
2. Look around (section 2). Press **Numpad 0** for the camera view if there is a camera.

## 4. Change something and export it back

1. Select the object in the Outliner, then change it (G/R/S). Or, with the object selected, press **Tab** for Edit Mode to move vertices; **Tab** again to leave.
2. **File → Export → glTF 2.0**:
   - **Format:** glTF Binary (.glb)
   - **Include:** tick **Selected Objects** if you only want what you selected
   - **Transform:** keep **+Y Up** ticked
   - **Mesh:** tick **Apply Modifiers**
   - **Compression:** leave off (Claude compresses in the build step)
3. Save it over the same file in `public/models/`. Reload the browser.

## 5. Make a human with MakeHuman (MPFB2, free, CC0)

This is how the cast and the crowds are made.

1. **Edit → Preferences → Get Extensions** → search **MPFB** → **Install**. If the online list is off, allow online access when Blender asks.
2. Press **N** in the 3D view to open the side panel → **MPFB** tab.
3. **New human → From scratch** → **Create human**.
4. Under **Model**, use the sliders:
   - gender, age, muscle, weight, height, proportions;
   - breast size, hips and other details in the "modifiers" lists.

   For example, Mishti is 4'10½": set height low and weight medium-low.
5. **Rigging → Add standard rig** (needed to pose).
6. **Ctrl+Tab** → Pose Mode. Click a bone, then **R** to rotate it. **Ctrl+Tab** returns to Object Mode.
7. Export as in section 4.

## 6. Run Claude's scripts yourself

All scripts run headless (no window) from the project folder:

```bash
blender -b -P tools/blender/<script>.py
```

Their output goes to `public/models/`. Each script's top comment says what it makes.

## 7. Render a still in Cycles (to preview a composition)

1. **Properties → Render** tab → Render Engine: **Cycles** → Device: **GPU Compute**.
2. Press **F12**. In the image window, use **Image → Save As**.

## 8. If you get stuck

- **Ctrl+Z** undoes.
- **F3** searches every command by name.
- The interface layout can always be reset: **File → Defaults → Load Factory Settings**.
- Or just ask Claude: "open X in Blender and do Y", and it will script it.
