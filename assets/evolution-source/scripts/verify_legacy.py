"""Compare the four preserved clips against the shipped original source GLB."""
import bpy,json,os
from pathlib import Path
import numpy as np
OUT=Path(os.environ.get('NIULAI_OUTPUT',Path(__file__).resolve().parents[1]))
manifest=json.loads((OUT/'actions.json').read_text())
NAMES=manifest['preservedClips']
def sample(file):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(file))
    arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    for track in arm.animation_data.nla_tracks:track.mute=True
    result={}
    for name in NAMES:
        a=bpy.data.actions[name];arm.animation_data.action=a
        if a.slots:arm.animation_data.action_slot=a.slots[0]
        values=[]
        for u in np.linspace(0,1,9):
            f=a.frame_range[0]+u*(a.frame_range[1]-a.frame_range[0])
            bpy.context.scene.frame_set(int(f),subframe=f-int(f))
            values.append({b.name:np.array(b.matrix) for b in arm.pose.bones})
        result[name]=((a.frame_range[1]-a.frame_range[0])/30,values)
    return result
original=sample(OUT/manifest['sourceFile'])
exported=sample(OUT/manifest['model'])
checks=[]
for name in NAMES:
    od,ov=original[name];ed,ev=exported[name];assert abs(od-ed)<1e-6
    error=max(float(np.max(np.abs(a[b]-c[b]))) for a,c in zip(ov,ev) for b in a)
    assert error<.0001,(name,error)
    checks.append(dict(clip=name,durationSeconds=ed,sampledPoses=9,maxBoneMatrixDifference=error))
(OUT/'legacy-verification.json').write_text(json.dumps(dict(method='Original and final GLB reimported separately; compare every bone matrix at nine times per original clip',checks=checks),indent=2)+'\n')
print('LEGACY_CLIPS_PRESERVED',checks)
