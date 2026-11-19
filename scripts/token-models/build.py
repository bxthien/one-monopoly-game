"""Rebuild shipped GLBs and transparent picker posters using Blender 4.3+.

From the repository root run:
    blender -b -t 4 -P scripts/token-models/build.py
Append -- one-apus pilot-boat to regenerate just those pieces.
"""

from pathlib import Path
import sys

import bpy
from mathutils import Vector

SOURCE = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(SOURCE))
from vessels import build_apus, build_magenta, build_pilot, build_barge
from vehicles import build_crane, build_truck, build_train, build_reefer

MODELS = {
    "one-apus": build_apus, "one-magenta": build_magenta,
    "gantry-crane": build_crane, "container-truck": build_truck,
    "freight-train": build_train, "reefer-truck": build_reefer,
    "pilot-boat": build_pilot, "bunker-barge": build_barge,
}
DEST = SOURCE.parents[1] / "packages/client/public/models/tokens"


def add_light(name, offset, target, power, size, tint):
    lamp = bpy.data.lights.new(name, "AREA")
    lamp.energy, lamp.shape, lamp.size, lamp.color = power, "DISK", size, tint
    light = bpy.data.objects.new(name, lamp)
    bpy.context.collection.objects.link(light)
    light.location = target + Vector(offset)
    light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()


def poster(model, path):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.render.film_transparent = True
    scene.render.resolution_x = 480
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new("Softbox")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.75, .85, 1, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .42

    points = [model.matrix_world @ v.co for v in model.data.vertices]
    center = Vector([(min(p[i] for p in points) + max(p[i] for p in points)) / 2
                     for i in range(3)])
    view = Vector((4, -7, 4.8)).normalized()
    rotation = (-view).to_track_quat('-Z', 'Y')
    right, up = rotation @ Vector((1, 0, 0)), rotation @ Vector((0, 1, 0))
    def extent(axis):
        projected = [(p-center).dot(axis) for p in points]
        return min(projected), max(projected)
    left, rightmost = extent(right)
    bottom, top = extent(up)
    focus = center + right * ((left+rightmost)/2) + up * ((bottom+top)/2)
    camera = bpy.data.cameras.new("Harbor studio")
    camera.type = 'ORTHO'
    camera.ortho_scale = 1.12 * max(rightmost-left, (top-bottom)*4/3)
    obj = bpy.data.objects.new("Camera", camera)
    bpy.context.collection.objects.link(obj)
    obj.location, obj.rotation_euler = focus + view*8, rotation.to_euler()
    scene.camera = obj
    add_light("Key", (1, -4, 6), center, 490, 5, (1, .94, .87))
    add_light("Fill", (-4, -2, 2), center, 150, 4, (.78, .88, 1))
    add_light("Rim", (-1, 4, 4), center, 440, 3, (1, .91, .81))
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.quality = 94
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def build(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MODELS[name]()
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(filepath=str(DEST / (name + ".glb")),
                              export_format='GLB', use_selection=True,
                              export_texcoords=False, export_animations=False,
                              export_cameras=False, export_lights=False)
    poster(model, DEST / (name + ".webp"))


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    names = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else MODELS
    for name in names:
        build(name)
