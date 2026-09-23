"""Validate the exported asset, not the in-memory authoring scene; render poses."""
import bpy, json, math, os
from pathlib import Path
from mathutils import Vector
import numpy as np
OUT = Path(os.environ.get('NIULAI_OUTPUT', Path(__file__).resolve().parents[1]))
manifest = json.loads((OUT/'actions.json').read_text())
defs = json.loads((OUT/'source/authoring-curves.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 120
bpy.ops.import_scene.gltf(filepath=str(OUT/manifest['model']))
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
meshes = [o for o in scene.objects if o.type == 'MESH' and any(m.type=='ARMATURE' and m.object==arm for m in o.modifiers)]
for obj in [arm,*meshes]:
    if obj.animation_data:
        obj.animation_data.action=None
        for tr in obj.animation_data.nla_tracks:tr.mute=True
clips = {a.name:a for a in bpy.data.actions}
assert set(clips) == set(manifest['preservedClips']) | {v['clip'] for v in manifest['variants']}, list(clips)
assert len(arm.data.bones)==manifest['boneCount']
morphs = {k.name for o in meshes if o.data.shape_keys for k in o.data.shape_keys.key_blocks if k.name!='Basis'}
assert morphs == set(manifest['morphNames']), morphs
assert all(k.value==0 for o in meshes if o.data.shape_keys for k in o.data.shape_keys.key_blocks if k.name!='Basis')

def activate(name):
    for b in arm.pose.bones:
        b.rotation_mode='QUATERNION'; b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
    a=clips[name];arm.animation_data.action=a
    if a.slots:arm.animation_data.action_slot=a.slots[0]
    scene.frame_set(0)
    return a

def vertices():
    dg=bpy.context.evaluated_depsgraph_get();result=[]
    for o in meshes:
        ev=o.evaluated_get(dg);m=ev.to_mesh();arr=np.empty(len(m.vertices)*3,dtype=np.float32);m.vertices.foreach_get('co',arr)
        arr=arr.reshape(-1,3);mat=np.array(ev.matrix_world)
        result.append(arr@mat[:3,:3].T+mat[:3,3]);ev.to_mesh_clear()
    return np.concatenate(result)

foot_names=['LToeBase','RToeBase'] if manifest['formId'] in ('calf','tough') else ['Foot.L','Foot.R']
checks=[]
for d in defs:
    a=activate(d['id']);first=vertices();rest_feet=[arm.pose.bones[n].matrix.translation.copy() for n in foot_names]
    max_foot=0;max_move=0;pitch=[];roll=[];yaw=[]
    duration=(a.frame_range[1]-a.frame_range[0])/120
    assert abs(duration-d['duration'])<.04,(d['id'],duration)
    for frame in range(round(duration*120)+1):
        scene.frame_set(frame);vs=vertices()
        assert np.isfinite(vs).all()
        extent=np.ptp(vs,axis=0)
        assert max(extent)<max(np.ptp(first,axis=0))*1.35,(d['id'],frame,extent)
        max_move=max(max_move,float(np.linalg.norm(vs-first,axis=1).max()))
        max_foot=max(max_foot,*[(arm.pose.bones[n].matrix.translation-r).length for n,r in zip(foot_names,rest_feet)])
        assert arm.pose.bones.get('Root',arm.pose.bones['Hips']).location.length<1e-6
        delta=(arm.pose.bones['Head'].matrix @ arm.data.bones['Head'].matrix_local.inverted()).to_quaternion()
        forward=delta@Vector((0,-1,0));up=delta@Vector((0,0,1))
        pitch.append(math.degrees(math.atan2(-forward.z,-forward.y)))
        yaw.append(math.degrees(math.atan2(forward.x,-forward.y)))
        roll.append(math.degrees(math.atan2(up.x,up.z)))
    last=vertices();endpoint=float(np.linalg.norm(last-first,axis=1).max())
    assert endpoint<.0001,(d['id'],'endpoint',endpoint)
    assert max_foot<.0001,(d['id'],'feet',max_foot)
    assert max_move>.035,(d['id'],'insufficient visual motion',max_move)
    if d['base']=='nod':assert max(pitch)>10 and max(map(abs,yaw))<1,(d['id'],max(pitch),max(yaw))
    if d['base']=='head_tilt_left':assert max(roll)>14
    if d['base']=='head_tilt_right':assert min(roll)<-14
    if d['base']=='head_shake':assert max(yaw)>18 and min(yaw)<-18 and abs(yaw[-1])<.01
    checks.append(dict(clip=d['id'],frames=round(duration*120)+1,durationSeconds=duration,maxVertexDisplacement=max_move,maxFootDisplacement=max_foot,endpointMaxError=endpoint,pitchRange=[min(pitch),max(pitch)],rollRange=[min(roll),max(roll)],yawRange=[min(yaw),max(yaw)]))
# Ensure the three nods have genuinely distinct motion and the proud version has two down strokes.
activate(f"{manifest['formId']}_nod_proud")
peaks=[]
for time in [.96,1.28,1.69]:
    f=time*120;scene.frame_set(int(f),subframe=f-int(f))
    q=(arm.pose.bones['Head'].matrix@arm.data.bones['Head'].matrix_local.inverted()).to_quaternion();v=q@Vector((0,-1,0));peaks.append(math.degrees(math.atan2(-v.z,-v.y)))
assert peaks[0]>peaks[2]>5 and peaks[1]<0,peaks
report=dict(source='Reimported final GLB',bones=len(arm.data.bones),clips=list(clips),morphs=sorted(morphs),newClipChecks=checks,proudNodPitchSamples=peaks,limitations=['No new hardware control','No sit/stand clips','No eyelid or eyebrow animation','Mesh self-intersection requires visual inspection; finite bounds alone do not prove no intersections'])
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

# Consistent 3/4 view for visual inspection of face, shoulders and planted feet.
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio World');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.28,.33,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
def point(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.6,-7,2.8));camera=bpy.context.object;point(camera,(0,-.05,1.08));camera.data.type='ORTHO';camera.data.ortho_scale=2.65;scene.camera=camera
for pos,power,size in [((2,-4,6),600,4),((-4,-3,3),450,4),((2,4,5),800,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;point(l,(0,0,1))
activate(f"{manifest['formId']}_nod_confirm");scene.frame_set(0)
base=vertices();floor_z=float(base[:,2].min())
height=float(np.ptp(base,axis=0)[2]);width=float(np.ptp(base,axis=0)[0]);center=(base.min(axis=0)+base.max(axis=0))/2
camera.location=Vector(center)+Vector((2.6,-7,1.72))*(height/2.1);point(camera,center);camera.data.ortho_scale=max(height,width)*1.28
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,floor_z-.002));plane=bpy.context.object
mat=bpy.data.materials.new('Ground');mat.diffuse_color=(.79,.8,.8,1);plane.data.materials.append(mat)
(OUT/'poses').mkdir(exist_ok=True)
for name,time in [('neutral',0)]+[(d['id'],d['peak']) for d in defs]:
    activate(f"{manifest['formId']}_nod_confirm" if name=='neutral' else name)
    f=time*120;scene.frame_set(int(f),subframe=f-int(f));scene.render.filepath=str(OUT/'poses'/f'{name}.png');bpy.ops.render.render(write_still=True)
print('VERIFIED_AND_RENDERED',len(checks),flush=True)
