"""
preview.py — render quick turnaround previews of a .glb (front / three-quarter / side), headless.

    blender -b -P tools/blender/preview.py -- public/models/yoki-body.glb tools/qa/out/body

Uses Eevee (fast) with a simple 3-point light so proportions are easy to judge. Output:
<prefix>-front.png, <prefix>-34.png, <prefix>-side.png.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

glb, prefix = sys.argv[sys.argv.index("--") + 1 :][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(glb))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
mins = Vector((1e9, 1e9, 1e9)); maxs = Vector((-1e9, -1e9, -1e9))
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mins = Vector(map(min, mins, w)); maxs = Vector(map(max, maxs, w))
center = (mins + maxs) / 2
size = max(maxs - mins)

mat = bpy.data.materials.new("clay")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.78, 0.6, 0.5, 1)
bsdf.inputs["Roughness"].default_value = 0.6
for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(mat)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1200
scene.world = bpy.data.worlds.new("w")
scene.world.color = (0.06, 0.06, 0.07)

def light(name, loc, energy, size=2.0):
    d = bpy.data.lights.new(name, "AREA")
    d.energy = energy
    d.size = size
    o = bpy.data.objects.new(name, d)
    o.location = center + Vector(loc)
    o.rotation_euler = (center - o.location).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(o)

light("key", (2.5, -3, 2), 900)
light("fill", (-3, -2, 1), 250)
light("rim", (0, 3, 2.5), 600)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 70
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
dist = size * 2.05
for label, ang in (("front", 0), ("34", 35), ("side", 90)):
    a = math.radians(ang)
    cam.location = center + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0))
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.abspath(f"{prefix}-{label}.png")
    bpy.ops.render.render(write_still=True)
print("[preview] done", prefix)
