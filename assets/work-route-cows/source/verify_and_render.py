import bpy, math, json, os
import numpy as np
from pathlib import Path
from mathutils import Vector
OUT=Path(os.environ.get('COW_RIG_OUTPUT',Path(__file__).resolve().parent.parent))
for slug in ['xianniu','dark-niulai']:
 dest=OUT/slug
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(dest/f'{slug}-web.glb'))
 print('OBJECTS',[(o.name,o.type,len(o.vertex_groups) if o.type=='MESH' else None,o.name in bpy.context.scene.objects) for o in bpy.data.objects],flush=True)
 arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');obj=next(o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
 names={a.name:a for a in bpy.data.actions};print('ACTIONS',list(names),flush=True)
 print('WEIGHTS',min(sum(g.weight for g in v.groups) for v in obj.data.vertices),max(len(v.groups) for v in obj.data.vertices),[(v.index,[(g.group,g.weight) for g in v.groups]) for v in obj.data.vertices if sum(g.weight for g in v.groups)<.99 or len(v.groups)>4][:3],flush=True)
 assert all(sum(g.weight for g in v.groups)>.99 and sum(g.weight>1e-6 for g in v.groups)<=4 for v in obj.data.vertices)
 assert {'Head','Neck','Hips'}.issubset(arm.data.bones.keys())
 if arm.animation_data:
  arm.animation_data.action=None
  for t in arm.animation_data.nla_tracks:t.mute=True
 for pb in arm.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
 def vertices():
  bpy.context.view_layer.update();ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();a=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',a);ev.to_mesh_clear();return a.reshape(-1,3)
 base=vertices();sc=bpy.context.scene
 report={'reimported':True,'bones':len(arm.data.bones),'vertices':len(base),'allVerticesWeighted':True,'maxInfluences':4,'clips':{},'headTests':{}}
 for key,act in names.items():
  arm.animation_data.action=act
  if len(act.slots):arm.animation_data.action_slot=act.slots[0]
  start,end=act.frame_range;maxdelta=0
  for frame in np.linspace(start,end,7):
   sc.frame_set(int(frame));posed=vertices();assert np.isfinite(posed).all();assert np.max(np.linalg.norm(posed-base,axis=1))<.8
   maxdelta=max(maxdelta,float(np.max(np.linalg.norm(posed-base,axis=1))))
  assert maxdelta>1e-4,(key,'clip did not move vertices')
  report['clips'][key]={'durationSeconds':float((end-start)/sc.render.fps),'samples':7,'maxVertexMovement':maxdelta}
 arm.animation_data.action=None
 for pb in arm.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
 for name,rot in [('yaw-left',(0,-.61,0)),('yaw-right',(0,.61,0)),('pitch-up',(-.40,0,0)),('pitch-down',(.40,0,0))]:
  arm.pose.bones['Head'].rotation_euler=rot;posed=vertices();d=np.linalg.norm(posed-base,axis=1);feet=d[base[:,2]<.16]
  assert np.isfinite(posed).all();assert float(feet.max())<1e-5;assert d.max()>.05
  report['headTests'][name]={'maxDisplacement':float(d.max()),'feetDisplacement':float(feet.max())}
 arm.pose.bones['Head'].rotation_euler=(0,0,0)
 (dest/'roundtrip-verification.json').write_text(json.dumps(report,indent=2))
 sc.render.engine='CYCLES';sc.cycles.samples=16;sc.cycles.use_denoising=True
 sc.render.resolution_x=800;sc.render.resolution_y=800;sc.render.resolution_percentage=100
 sc.world=bpy.data.worlds.new('Studio');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.12,.12,1)
 for pos,power,size in [((3,-4,5),650,4),((-3,-1,3),450,3),((1,3,5),700,3)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(.3,-6,1.8));cam=bpy.context.object;sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.45;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler()
 for pose in ['rest','bow','wave','yaw-left','pitch-down']:
  arm.animation_data.action=None
  for pb in arm.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
  if pose in names:
   for pb in arm.pose.bones:pb.rotation_mode='QUATERNION'
   act=names[pose];arm.animation_data.action=act
   if len(act.slots):arm.animation_data.action_slot=act.slots[0]
   sc.frame_set(int(sum(act.frame_range)/2))
  if pose=='yaw-left':arm.pose.bones['Head'].rotation_euler.y=-.61
  if pose=='pitch-down':arm.pose.bones['Head'].rotation_euler.x=.40
  sc.render.filepath=str(dest/f'preview-{pose}.png');bpy.ops.render.render(write_still=True)
 print('VERIFIED',slug,json.dumps(report),flush=True)
