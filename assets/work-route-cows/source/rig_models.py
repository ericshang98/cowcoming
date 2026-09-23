import bpy, bmesh, math, json, hashlib, os
import numpy as np
from pathlib import Path
from mathutils import Matrix, Vector
WORK=Path(os.environ.get('COW_RIG_OUTPUT',Path(__file__).resolve().parent.parent))
SOURCE=Path(os.environ.get('COW_RIG_SOURCE',str(Path.home()/'Downloads')))
OUT=WORK;OUT.mkdir(exist_ok=True)
for slug,label in [('xianniu','仙牛'),('dark-niulai','暗黑牛')]:
 dest=OUT/slug;dest.mkdir(exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(WORK/slug/'imported.blend'))
 obj=next(o for o in bpy.data.objects if o.type=='MESH');obj.name=label
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 obj.data.transform(Matrix.Rotation(-math.pi/2,4,'Z'))
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=bm.verts[:],dist=.000001);bm.to_mesh(obj.data);bm.free()
 source_triangles=len(obj.data.polygons)
 mod=obj.modifiers.new('Web polygon budget','DECIMATE');mod.ratio=80000/source_triangles
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mesh=obj.data
 for p in mesh.polygons:p.use_smooth=True
 for im in bpy.data.images:
  if im.size[0]:im.pack()
 print(label,'simplified',len(mesh.vertices),len(mesh.polygons),flush=True)
 # Blender Z-up, -Y facing. glTF export converts to Y-up, +Z facing.
 bones=[('Root',(0,0,0),(0,0,.13),None,False),
 ('Hips',(0,.02,.32),(0,.02,.58),'Root',True),
 ('Spine',(0,.02,.58),(0,.01,.85),'Hips',True),
 ('Chest',(0,.01,.85),(0,0,1.13),'Spine',True),
 ('Neck',(0,0,1.13),(0,0,1.27),'Chest',True),
 ('Head',(0,0,1.27),(0,0,1.75),'Neck',True)]
 for side,sgn in [('L',1),('R',-1)]:
  bones += [(f'Shoulder.{side}',(0,0,1.08),(sgn*.33,0,1.08),'Chest',True),
   (f'UpperArm.{side}',(sgn*.33,0,1.08),(sgn*.54,-.015,.87),f'Shoulder.{side}',True),
   (f'Forearm.{side}',(sgn*.54,-.015,.87),(sgn*.70,-.04,.68),f'UpperArm.{side}',True),
   (f'Hand.{side}',(sgn*.70,-.04,.68),(sgn*.78,-.07,.59),f'Forearm.{side}',True),
   (f'Thigh.{side}',(sgn*.23,.02,.42),(sgn*.25,.01,.23),'Hips',True),
   (f'Shin.{side}',(sgn*.25,.01,.23),(sgn*.26,-.025,.11),f'Thigh.{side}',True),
   (f'Foot.{side}',(sgn*.26,-.025,.11),(sgn*.26,-.22,.07),f'Shin.{side}',True)]
 if slug=='dark-niulai':
  for side,sgn in [('L',1),('R',-1)]:
   bones += [(f'Wing.{side}',(sgn*.40,.14,1.11),(sgn*.64,.20,1.29),'Chest',True),
    (f'WingTip.{side}',(sgn*.64,.20,1.29),(sgn*.91,.16,1.13),f'Wing.{side}',True)]
  bones += [('Tail.01',(0,.25,.53),(.15,.42,.35),'Hips',True),('Tail.02',(.15,.42,.35),(.45,.47,.27),'Tail.01',True),('Tail.03',(.45,.47,.27),(.73,.39,.40),'Tail.02',True)]
 armdata=bpy.data.armatures.new(label+'Skeleton');arm=bpy.data.objects.new('Armature',armdata);bpy.context.collection.objects.link(arm)
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
 for name,a,b,parent,deform in bones:
  eb=armdata.edit_bones.new(name);eb.head=a;eb.tail=b;eb.use_deform=deform
  if parent:eb.parent=armdata.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True
 coords=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3);x,y,z=coords.T
 names=[b[0] for b in bones if b[-1]];ds=[]
 for name,a,b,_,deform in bones:
  if not deform:continue
  a=np.array(a);b=np.array(b);ab=b-a;t=np.clip(((coords-a)*ab).sum(1)/(ab*ab).sum(),0,1);d=np.linalg.norm(coords-a-t[:,None]*ab,axis=1)
  if name in ['Hips','Spine','Chest']:d*=.70
  if name.startswith('Wing'):d+=np.where(y<-.18,2,0)
  if name.startswith('Tail'):d+=np.where(y<.30,2,0)
  ds.append(d)
 weights=np.eye(len(names),dtype=np.float32)[np.stack(ds,axis=1).argmin(1)]
 edges=np.empty(len(mesh.edges)*2,dtype=np.int32);mesh.edges.foreach_get('vertices',edges);edges=edges.reshape(-1,2)
 i=np.concatenate([edges[:,0],edges[:,1]]);j=np.concatenate([edges[:,1],edges[:,0]])
 degree=np.maximum(np.bincount(i,minlength=len(coords)).astype(np.float32),1)[:,None]
 for step in range(30):
  sums=np.zeros_like(weights);np.add.at(sums,i,weights[j]);weights=.5*weights+.5*sums/degree
 def smooth(a,b,q):
  t=np.clip((q-a)/(b-a),0,1);return t*t*(3-2*t)
 # Head/face/horns remain a rigid group above the neck. Wings/pauldrons
 # behind and outside the head are deliberately excluded from head weights.
 hreg=(z>1.15)
 if slug=='dark-niulai':
  # Above the neck plane the head and two wings are separate connected
  # components. Use topology, not color or height alone, to keep entire
  # horns/ears with the head and entire wing surfaces with the torso.
  parent=np.arange(len(coords))
  def root(a):
   while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
   return a
  for a,b in edges:
   if z[a]>1.23 and z[b]>1.23:parent[root(b)]=root(a)
  components={}
  for vi in np.flatnonzero(z>1.23):components.setdefault(root(vi),[]).append(vi)
  headids=max(components.values(),key=len)
  hreg=np.zeros(len(coords),dtype=bool);hreg[headids]=True
  hreg |= (z>1.15)&(z<=1.23)&(abs(x)<.26)
  wingArmor=(z>1.23)&~hreg
  wingArmor |= (abs(x)>.62)&(z>.98)&(z<1.23)
  for bn in ['Head','Neck']:weights[~hreg,names.index(bn)]=0
  empty=weights.sum(1)<1e-6;weights[empty,names.index('Chest')]=1
 hw=smooth(1.16,1.31,z)
 weights[hreg]=0;weights[hreg,names.index('Head')]=hw[hreg]
 nw=(1-hw)*smooth(1.13,1.22,z)
 weights[hreg,names.index('Neck')]=nw[hreg];weights[hreg,names.index('Chest')]=1-hw[hreg]-nw[hreg]
 if slug=='dark-niulai':
  for side,sgn in [('L',1),('R',-1)]:
   region=wingArmor&(x*sgn>0)
   weights[region]=0;weights[region,names.index('Wing.'+side)]=1
 if slug=='dark-niulai':
  belt=(z>.58)&(z<.78)&(abs(x)<.56)
  weights[belt]=0;weights[belt,names.index('Hips')]=1
 # Long robe hangs from the pelvis, not from either hand or calf.
 if slug=='xianniu':
  robe=(z<.59)&(z>.24)&((abs(x)>.32)|(y<-.23)|(y>.27))
  weights[robe]=0;weights[robe,names.index('Hips')]=1
 # Feet never inherit upper-body weights.
 feet=z<.16
 for side,sgn in [('L',1),('R',-1)]:
  region=feet&(x*sgn>=0);weights[region]=0;weights[region,names.index('Foot.'+side)]=1
 ids=np.argpartition(weights,-4,axis=1)[:,-4:];mask=np.zeros_like(weights,dtype=bool);np.put_along_axis(mask,ids,True,axis=1);weights[~mask]=0;weights/=weights.sum(1,keepdims=True)
 for k,name in enumerate(names):
  group=obj.vertex_groups.new(name=name)
  for vi in np.flatnonzero(weights[:,k]>1e-6):group.add([int(vi)],float(weights[vi,k]),'REPLACE')
 mod=obj.modifiers.new('Skin','ARMATURE');mod.object=arm;obj.parent=arm
 sc=bpy.context.scene;sc.render.fps=30
 clips={'idle':120,'look':60,'bow':66,'nod':66,'tilt':75,'reflect':108,'wave':72}
 for pb in arm.pose.bones:pb.rotation_mode='XYZ'
 for name,duration in clips.items():
  arm.animation_data_create();action=bpy.data.actions.new(name);arm.animation_data.action=action;action.use_fake_user=True
  for f in sorted(set(range(0,duration+1,2)) | {duration}):
   u=f/duration;env=math.sin(math.pi*u)**2;osc=math.sin(4*math.pi*u)*env
   for pb in arm.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
   head=arm.pose.bones['Head']
   if name=='idle':head.rotation_euler.x=.012*math.sin(2*math.pi*u);head.rotation_euler.y=.016*math.sin(2*math.pi*u)
   if name=='look':head.rotation_euler.y=.26*env
   if name=='bow':head.rotation_euler.x=.24*env
   if name=='nod':head.rotation_euler.x=.17*osc
   if name=='tilt':head.rotation_euler.z=.18*env
   if name=='reflect':head.rotation_euler.x=.10*osc;head.rotation_euler.z=.12*env
   if name=='wave':
    arm.pose.bones['UpperArm.L'].rotation_euler.z=-.14*env;arm.pose.bones['Forearm.L'].rotation_euler.x=.16*osc;head.rotation_euler.z=-.05*env
   for pb in arm.pose.bones:pb.keyframe_insert('rotation_euler',frame=f+1,group=pb.name)
  arm.animation_data.action=None
 arm.animation_data.action=bpy.data.actions['idle'];sc.frame_start=1;sc.frame_end=121;sc.frame_set(1)
 obj['source_file']=label+'.glb';obj['website_scope']='WORK evolution route only; not HOME selection';obj['capabilities']='idle/look/bow/nod/tilt/reflect/wave; no mouth morphs or walking'
 arm['head_limits']='Restrained turns: yaw +/- 35 degrees, pitch +/- 23 degrees; inspect clothing contact at extremes'
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);obj.select_set(True);bpy.context.view_layer.objects.active=arm
 obj.parent=None
 bpy.ops.export_scene.gltf(filepath=str(dest/f'{slug}-web.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_def_bones=False,export_all_influences=False,export_yup=True,export_cameras=False,export_lights=False,export_extras=True)
 obj.parent=arm
 for area in bpy.context.screen.areas if bpy.context.screen else []:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=4;area.spaces.active.region_3d.view_location=(0,0,1)
 bpy.ops.object.mode_set(mode='POSE');arm.data.bones.active=arm.data.bones['Head']
 bpy.ops.wm.save_as_mainfile(filepath=str(dest/f'{slug}-rigged.blend'))
 report={'name':label,'sourceFile':label+'.glb','sourceSha256':hashlib.sha256((SOURCE/(label+'.glb')).read_bytes()).hexdigest(),'sourceTriangles':source_triangles,'webTriangles':len(mesh.polygons),'webVertices':len(mesh.vertices),'bones':[b[0] for b in bones],'animations':{k:v/30 for k,v in clips.items()},'texture':{'resolution':[2048,2048],'sourcePreserved':True,'embedded':True},'mouth':False,'walking':False,'maxInfluences':4,'allVerticesWeighted':bool(np.all(weights.sum(1)>.99)),'pageScope':'work','glbBytes':(dest/f'{slug}-web.glb').stat().st_size,'sha256':hashlib.sha256((dest/f'{slug}-web.glb').read_bytes()).hexdigest()}
 (dest/'asset-info.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False),flush=True)
 actions=[{'id':n,'label':lab,'motion':n,'durationMs':ms} for n,lab,ms in [('look','看向你',2000),('bow','低头致意',2200),('nod','点头回应',2200),('tilt','好奇歪头',2500),('reflect','思考',3600)]]
 (dest/f'{slug}.actions.json').write_text(json.dumps({'version':1,'actions':actions},ensure_ascii=False,indent=2))
 (dest/f'{slug}.evolution.json').write_text(json.dumps({'version':1,'initialForm':slug,'forms':[{'id':slug,'name':label,'model':f'{slug}-web.glb','actions':[a['id'] for a in actions]}],'edges':[]},ensure_ascii=False,indent=2))
