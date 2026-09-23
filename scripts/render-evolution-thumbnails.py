"""Render real published GLBs as atlas thumbnails. Run with Blender -b --python this_file."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
assets=json.loads((root/'public/models/evolution/manifest.json').read_text())
# The runtime manifest has a forms mapping.
forms=assets.get('forms',assets)
print('Manifest keys', list(forms)[:8])
for form,asset in forms.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/'public'/asset['model'].lstrip('/')))
    scene=bpy.context.scene
    imported=list(scene.objects)
    holder=bpy.data.objects.new('ThumbnailOrientation',None);scene.collection.objects.link(holder)
    for obj in imported:
        if obj.parent is None: obj.parent=holder
    holder.rotation_euler.z=asset.get('viewYawRadians',0)
    bpy.context.view_layer.update()
    meshes=[o for o in imported if o.type=='MESH']
    points=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)])
    hi=Vector([max(p[i] for p in points) for i in range(3)])
    center=(lo+hi)/2; size=hi-lo; extent=max(size)
    bpy.ops.object.camera_add(location=center+Vector((.24,-1,.14)).normalized()*extent*3)
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=max(size.z,size.x)*1.22;scene.camera=camera
    for location,power,radius in [((3,-4,6),700,5),((-4,-2,3),450,4),((1,3,4),650,3)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(location)*extent/4)
        light=bpy.context.object;light.data.energy=power*(extent/2)**2;light.data.shape='DISK';light.data.size=radius*extent/4
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    world=bpy.data.worlds.new('Studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.85,.9,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5;scene.world=world
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX'
    dest=root/'public/models/evolution/thumbnails'/f'{form}-{asset["sha256"][:12]}.png'
    dest.parent.mkdir(exist_ok=True);scene.render.filepath=str(dest)
    bpy.ops.render.render(write_still=True)
    print('THUMBNAIL',form,str(dest),flush=True)
