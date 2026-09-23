import bpy, math, json, os
from pathlib import Path
from mathutils import Vector
OUT=Path(os.environ.get('COW_RIG_OUTPUT',Path(__file__).resolve().parent.parent));OUT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(os.environ.get('COW_RIG_SOURCE',str(Path.home()/'Downloads')))
for slug,name in [('xianniu','仙牛'),('dark-niulai','暗黑牛')]:
    dest=OUT/slug;dest.mkdir(exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE/(name+'.glb')))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    pts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
    factor=2/(hi.z-lo.z);center=Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z))
    for o in meshes:
        mx=o.matrix_world.copy()
        for v in o.data.vertices:v.co=(mx@v.co-center)*factor
        o.matrix_world.identity();o.name=name
    pts=[v.co for o in meshes for v in o.data.vertices]
    report={'name':name,'meshes':len(meshes),'vertices':len(pts),'triangles':sum(len(o.data.polygons) for o in meshes),'bounds':[[min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]],'textures':[{ 'name':im.name,'size':list(im.size)} for im in bpy.data.images]}
    (dest/'import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report,flush=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(dest/'imported.blend'))
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=12;sc.cycles.use_denoising=True
    sc.render.resolution_x=800;sc.render.resolution_y=800;sc.render.resolution_percentage=100
    sc.world=bpy.data.worlds.new('Studio');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.15,.15,1)
    for pos,power,size in [((3,-4,5),650,4),((-3,-1,3),450,3),((1,3,5),700,3)]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=max(2.5,report['bounds'][1][0]*2.3)
    for view,pos in [('front',(0,-6,1)),('side',(6,0,1))]:
        cam.location=pos;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(dest/f'inspect-{view}.png');bpy.ops.render.render(write_still=True)
