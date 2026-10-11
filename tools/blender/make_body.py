"""
make_body.py — build a rigged human (or just their right arm) from a JSON preset, headless.

    blender -b -P tools/blender/make_body.py -- tools/blender/presets/yoki.json

HOW IT WORKS (read this to learn the technique)
1. MPFB2 (MakeHuman's Blender extension, installed once — see docs/guides/05) creates the
   MakeHuman base mesh. Its "macro" sliders (gender, age, muscle, weight, height, proportions,
   ethnicity mix) are shape keys blended from scanned target sets. Extra "targets" (e.g. a little
   stomach) are more shape keys we add on top.
2. We add the "game_engine" skeleton (53 bones incl. every finger joint). MPFB places each bone
   using invisible "joint cubes" inside the mesh, so the rig fits *this* body exactly.
3. We bake all shape keys into the mesh, then delete the helper geometry (joint cubes, tights,
   skirt, hair helpers) — they only exist to help fitting clothes/rigs.
4. For POV arms we keep only the vertices that belong to the right arm bones, subdivide once for
   smooth close-ups (applying a Subdivision modifier interpolates the bone weights too), and
   delete everything else.
5. Export glTF binary (.glb) with the skin (bone weights) so three.js can pose fingers by name:
   bones are called upperarm_r, lowerarm_r, hand_r, thumb_01_r … pinky_03_r.

The output mesh is CC0 (MakeHuman assets are CC0). The MPFB2 code itself is GPL, but we don't ship it.
"""

import json
import math
import os
import sys

import bpy

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if not argv:
    raise SystemExit("usage: blender -b -P make_body.py -- preset.json")
preset_path = os.path.abspath(argv[0])
preset = json.load(open(preset_path))
root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# ── 0. empty scene ──────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# ── 1. the body ─────────────────────────────────────────────────────────────
macro = TargetService.get_default_macro_info_dict()
for k, v in preset["macro"].items():
    if k == "race":
        macro["race"].update(v)
    else:
        macro[k] = v
body = HumanService.create_human(mask_helpers=False, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
body.name = preset["name"]

targets_dir = LocationService.get_mpfb_data("targets")
for rel, weight in preset.get("targets", {}).items():
    path = os.path.join(targets_dir, rel + ".target.gz")
    TargetService.load_target(body, path, weight=weight)
    print(f"[make_body] target {rel} = {weight}")

# ── 2. the skeleton (fitted to this body) ───────────────────────────────────
rig = HumanService.add_builtin_rig(body, "game_engine", import_weights=True)
rig.name = preset["name"] + "_rig"

# ── 3. bake shape keys, remove helper geometry ──────────────────────────────
bpy.context.view_layer.objects.active = body
TargetService.bake_targets(body)
for m in list(body.modifiers):
    if m.type == "MASK":
        body.modifiers.remove(m)


def delete_vertices(obj, keep):
    """Delete every vertex for which keep(vertex) is False (object mode → bmesh-free)."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in obj.data.vertices:
        v.select = not keep(v)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")


group_index = {g.name: g.index for g in body.vertex_groups}
body_gi = group_index["body"]
delete_vertices(body, lambda v: any(g.group == body_gi and g.weight > 0.5 for g in v.groups))
print(f"[make_body] body verts after helper removal: {len(body.data.vertices)}")

# keep only bone weight groups (drop MakeHuman helper/joint groups) so the glTF skin stays clean
bone_names = {b.name for b in rig.data.bones}
for g in list(body.vertex_groups):
    if g.name not in bone_names:
        body.vertex_groups.remove(g)

# smooth shading
for p in body.data.polygons:
    p.use_smooth = True

# ── 4. optional: right arm only (POV) ───────────────────────────────────────
part = preset.get("part", "full")
if part == "arm_r":
    arm_bones = {"upperarm_r", "lowerarm_r", "hand_r"} | {b for b in bone_names if b.endswith("_r") and b.split("_")[0] in ("thumb", "index", "middle", "ring", "pinky")}
    gi = {g.index: g.name for g in body.vertex_groups}

    def arm_weight(v):
        return sum(g.weight for g in v.groups if gi.get(g.group) in arm_bones)

    # keep the forearm/hand fully and the upper arm up to just below the shoulder
    delete_vertices(body, lambda v: arm_weight(v) > 0.6)
    print(f"[make_body] arm verts: {len(body.data.vertices)}")

subdiv = preset.get("subdivide", 0)
if subdiv:
    # The Subdivision modifier must come BEFORE the Armature modifier to be applied.
    mod = body.modifiers.new("Subdiv", "SUBSURF")
    mod.levels = subdiv
    mod.render_levels = subdiv
    bpy.context.view_layer.objects.active = body
    with bpy.context.temp_override(object=body, active_object=body):
        bpy.ops.object.modifier_move_to_index(modifier="Subdiv", index=0)
        bpy.ops.object.modifier_apply(modifier="Subdiv")
    print(f"[make_body] after subdivision: {len(body.data.vertices)} verts")

# ── 5. export ───────────────────────────────────────────────────────────────
out = os.path.join(root, preset["out"])
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    use_selection=True,
    export_skins=True,
    export_animations=False,
    export_morph=False,
    export_yup=True,
    export_apply=False,
    export_texcoords=True,
    export_normals=True,
)
h = max(v.co.z for v in body.data.vertices) - min(v.co.z for v in body.data.vertices)
print(f"[make_body] wrote {out}  ({os.path.getsize(out) // 1024} KB, mesh height {h:.3f} m, bones {len(bone_names)})")
