import bpy,math,os
from pathlib import Path
from mathutils import Euler
ROOT=Path(os.environ.get('COW_RIG_OUTPUT', str(Path(__file__).resolve().parent.parent)))
for slug in ['xianniu','dark-niulai']:
 p=ROOT/slug/(slug+'-rigged.blend');bpy.ops.wm.open_mainfile(filepath=str(p));arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 for b in arm.pose.bones:
  if hasattr(b,'select'):b.select=False
 for b in arm.data.bones:
  if hasattr(b,'select'):b.select=False
 head=arm.pose.bones['Head']
 if hasattr(head,'select'):head.select=True
 if hasattr(arm.data.bones['Head'],'select'):arm.data.bones['Head'].select=True
 arm.data.bones.active=arm.data.bones['Head']
 for screen in bpy.data.screens:
  for a in screen.areas:
   if a.type=='VIEW_3D':
    a.spaces.active.region_3d.view_distance=4.0;a.spaces.active.region_3d.view_location=(0,0,1)
    a.spaces.active.region_3d.view_rotation=Euler((math.radians(82),0,0)).to_quaternion()
    a.spaces.active.region_3d.view_perspective='ORTHO';a.spaces.active.shading.type='MATERIAL'
 bpy.ops.wm.save_as_mainfile(filepath=str(p))
