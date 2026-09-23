"""Reproducible, non-destructive animation authoring for five Niulai evolution rigs.
Run with Blender 5.2: blender -b --python source/build_actions.py
NIULAI_FORM selects normal/celestial/dark/calf/tough; NIULAI_SOURCE and NIULAI_OUTPUT override paths.
"""
import bpy
import copy
import hashlib
import json
import math
import os
from pathlib import Path
from mathutils import Quaternion, Vector

OUT = Path(os.environ.get('NIULAI_OUTPUT', Path(__file__).resolve().parents[1]))
SOURCE = Path(os.environ.get('NIULAI_SOURCE', Path(__file__).resolve().parent / 'niulai-mouth-source.glb'))
FORM = os.environ.get('NIULAI_FORM', 'normal')
LABELS = {'normal':'普通牛来','celestial':'仙牛','dark':'暗黑牛','calf':'小牛','tough':'硬牛'}
assert FORM in LABELS
STEM = f'niulai-{FORM}-actions'
OUT.mkdir(parents=True, exist_ok=True)
(OUT/'source').mkdir(exist_ok=True)
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
meshes = [o for o in scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)]
assert len(arm.data.bones) == {'normal':21,'celestial':20,'dark':27,'calf':13,'tough':17}[FORM]
# glTF skins already follow their joint matrices. Keep skinned mesh nodes at
# scene root so no importer/exporter adds an ambiguous armature parent transform.
for obj in meshes:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world
original_actions = list(bpy.data.actions)
for a in original_actions:
    a.use_fake_user = True
for obj in [arm, *meshes]:
    if obj.animation_data:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = True
    if obj.type == 'MESH' and obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            if key.name != 'Basis':
                key.value = 0

# Axis conventions here are armature space: X pitch (positive = down),
# Y roll (positive = character's left), Z yaw (positive = character's left).
# Convert each requested axis to the REST bone's local basis; never assume
# an arbitrary Blender bone's local Euler axes equal head/servo axes.
def rotate(bone, pitch=0, roll=0, yaw=0):
    rest = arm.data.bones[bone].matrix_local.to_quaternion()
    desired = (Quaternion((0, 0, 1), math.radians(yaw)) @
               Quaternion((0, 1, 0), math.radians(roll)) @
               Quaternion((1, 0, 0), math.radians(pitch)))
    arm.pose.bones[bone].rotation_quaternion = rest.inverted() @ desired @ rest


def curve(t, keys):
    if t <= keys[0][0]:
        return keys[0][1]
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        if t <= tb:
            u = (t - ta) / (tb - ta)
            return va + (vb - va) * (u*u*(3-2*u))
    return keys[-1][1]


def reset():
    for b in arm.pose.bones:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
        b.scale = (1, 1, 1)


DEFS = [
    dict(id='normal_nod_confirm', label='确认点头', base='nod', group='点头', duration=2.2,
         description='先关注，干脆点一下，再自然回正。', peak=0.86,
         channels={
             'Head': {'pitch': [(0,0),(.28,0),(.78,13),(.95,13),(1.55,0),(2.2,0)]},
             'Neck': {'pitch': [(0,0),(.35,0),(.82,3),(1.0,3),(1.65,0),(2.2,0)]},
             'Chest': {'pitch': [(0,0),(.4,0),(.86,1.2),(1.7,0),(2.2,0)]},
         }),
    dict(id='normal_nod_proud', label='得意双点头', base='nod', group='点头', duration=2.9,
         description='轻轻挺胸，两次点头；第二下收小，留一点得意劲。', peak=1.0,
         channels={
             'Chest': {'pitch': [(0,0),(.4,-2.5),(.75,-2.5),(1.6,-1.5),(2.55,0),(2.9,0)]},
             'Head': {'pitch': [(0,0),(.42,-4),(.96,14),(1.28,-2),(1.69,10),(2.13,-1),(2.55,0),(2.9,0)]},
             'Neck': {'pitch': [(0,0),(.42,-1),(.98,2),(1.3,0),(1.72,1.5),(2.55,0),(2.9,0)]},
             'UpperArm.L': {'roll': [(0,0),(.45,-3),(1.6,-3),(2.55,0),(2.9,0)]},
             'UpperArm.R': {'roll': [(0,0),(.45,3),(1.6,3),(2.55,0),(2.9,0)]},
         }),
    dict(id='normal_tilt_curious_left', label='左侧好奇歪头', base='head_tilt_left', group='左歪头', duration=3.1,
         description='先停半拍，向自己的左侧歪头，略微探身，等你解释。', peak=1.65,
         channels={
             'Head': {'roll': [(0,0),(.48,0),(1.18,15),(2.03,15),(2.75,0),(3.1,0)],
                      'pitch': [(0,0),(.6,0),(1.4,2),(2.0,2),(2.8,0),(3.1,0)]},
             'Neck': {'roll': [(0,0),(.52,0),(1.25,3),(2.03,3),(2.8,0),(3.1,0)]},
             'Chest': {'pitch': [(0,0),(.75,0),(1.45,2.5),(2.03,2.5),(2.85,0),(3.1,0)]},
         }),
    dict(id='normal_head_shake', label='摇头', base='head_shake', group='摇头', duration=3.0,
         description='左右连续摇头，最后一下收小，自然回正。', peak=1.05,
         channels={
             'Head': {'yaw': [(0,0),(.25,0),(.65,17),(1.05,-17),(1.45,14),(1.85,-11),(2.2,5),(2.6,0),(3,0)]},
             'Neck': {'yaw': [(0,0),(.3,0),(.7,3),(1.1,-3),(1.5,2.5),(1.9,-2),(2.25,1),(2.65,0),(3,0)]},
         }),
]

right = copy.deepcopy(next(d for d in DEFS if d['base']=='head_tilt_left'))
right.update(id='normal_tilt_curious_right', label='右侧好奇歪头', base='head_tilt_right', group='右歪头', description='先停半拍，向自己的右侧歪头，略微探身，等你解释。')
for channels in right['channels'].values():
    if 'roll' in channels: channels['roll']=[(t,-v) for t,v in channels['roll']]
DEFS.append(right)
order=['normal_nod_confirm','normal_head_shake','normal_nod_proud','normal_tilt_curious_left','normal_tilt_curious_right']
DEFS.sort(key=lambda d:order.index(d['id']))
for d in DEFS:
    d['logicalId']=d['id'].removeprefix('normal_')
    d['id']=f"{FORM}_{d['logicalId']}"

if FORM in ('calf','tough'):
    aliases={'Chest':'Spine','UpperArm.L':'UpperArm_L','UpperArm.R':'UpperArm_R'}
    for d in DEFS:
        mapped={}
        for bone,channels in d['channels'].items():
            target=bone if bone in arm.pose.bones else aliases.get(bone,bone)
            assert target in arm.pose.bones,(FORM,target)
            for axis,keys in channels.items():
                dest=mapped.setdefault(target,{})
                if axis in dest:
                    old=dest[axis];times=sorted({t for t,v in old+keys})
                    dest[axis]=[(t,curve(t,old)+curve(t,keys)) for t in times]
                else:dest[axis]=keys
        d['channels']=mapped

for d in DEFS:
    action = bpy.data.actions.new(d['id'])
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    reset()
    for frame in range(round(d['duration'] * FPS) + 1):
        t = frame / FPS
        reset()
        for bone, channels in d['channels'].items():
            rotate(bone, **{axis: curve(t, keys) for axis, keys in channels.items()})
        for b in arm.pose.bones:
            b.keyframe_insert('rotation_quaternion', frame=frame, group=b.name)
            b.keyframe_insert('location', frame=frame, group=b.name)
            b.keyframe_insert('scale', frame=frame, group=b.name)
    # Dense, deterministic sampling; linear interpolation between authored frames.
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for k in fc.keyframe_points:
                        k.interpolation = 'LINEAR'
    action['base_action_id'] = d['base']
    action['form_id'] = FORM
    action['label'] = d['label']

# Keep only the character selected for export, excluding importer bone widgets.
bpy.ops.object.select_all(action='DESELECT')
for o in [arm, *meshes]:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
arm.animation_data.action = None
reset()
scene.frame_start = 0
scene.frame_end = 105
scene.frame_set(0)
# The source clips have 24 Hz keys; new curves are authored at 30 Hz.
# A shared 120 Hz export grid includes both sets of keys without smoothing
# away original walk extrema. Restore the editable project to 30 Hz afterward.
def rescale_keys(factor):
    for action in bpy.data.actions:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for key in fc.keyframe_points:
                            key.co.x *= factor
                            key.handle_left.x *= factor
                            key.handle_right.x *= factor
                        fc.update()
rescale_keys(4)
scene.render.fps = 120
bpy.ops.export_scene.gltf(
    filepath=str(OUT / f'{STEM}.glb'), export_format='GLB',
    use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_frame_range=False, export_reset_pose_bones=True,
    export_morph=True, export_morph_animation=False, export_skins=True,
    export_yup=True, export_cameras=False, export_lights=False,
)
rescale_keys(.25)
scene.render.fps = FPS
arm.animation_data.action = bpy.data.actions[f'{FORM}_nod_confirm']
if arm.animation_data.action.slots:
    arm.animation_data.action_slot = arm.animation_data.action.slots[0]
scene.frame_set(0)
scene.frame_end = 66
arm.show_in_front = True
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_distance = 4.8
        area.spaces.active.region_3d.view_location = (0,0,1.0)
        area.spaces.active.region_3d.view_rotation = Quaternion((1,0,0), math.radians(90))
        area.spaces.active.shading.type = 'MATERIAL'
arm.data.bones.active = arm.data.bones['Head']
bpy.ops.object.mode_set(mode='POSE')
# Pack all textures for a portable authoring project.
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{STEM}.blend'))

manifest = {
    'schemaVersion': 1, 'packageId': STEM, 'version': '2.0.0',
    'formId': FORM, 'formLabel': LABELS[FORM], 'model': f'{STEM}.glb',
    'boneCount': len(arm.data.bones), 'sourceFile': 'source/niulai-mouth-source.glb' if FORM=='normal' else 'source/niulai-source.glb',
    'morphNames': ['MouthOpen','MouthRound','MouthWide'] if FORM in ('normal','calf','tough') else [],
    'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'coordinateConvention': 'glTF Y up, character front +Z; left means character left (+X)',
    'execution': 'software-animation-only', 'hardwareProfile': None,
    'preservedClips': sorted(a.name for a in original_actions),
    'idleClip': 'idle', 'neutralPose': 'standing',
    'selection': {'mode': 'uniform-without-immediate-repeat', 'deduplicateBy': 'sessionId+eventId', 'emptyCandidate': 'idle-with-unavailable-status'},
    'variants': [],
}
for d in DEFS:
    manifest['variants'].append({
        'id': d['id'], 'clip': d['id'], 'label': d['label'], 'formId': FORM, 'logicalId': d['logicalId'],
        'baseActionId': d['base'], 'baseActionLabel': d['group'],
        'durationSeconds': d['duration'], 'description': d['description'],
        'requiredBones': list(d['channels']), 'occupiedBones': list(d['channels']),
        'entryPose': 'standing', 'exitPose': 'standing',
        'interruptible': True, 'recoverySeconds': .35,
        'semanticTags': {'nod_confirm':['confirmation'], 'nod_proud':['proud-confirmation'], 'tilt_curious_left':['curiosity'], 'tilt_curious_right':['curiosity'], 'head_shake':['disagreement']}[d['logicalId']],
        'historicalScreenshotJointReference': {'nod':[3],'head_tilt_left':[4],'head_tilt_right':[4],'head_shake':[5]}[d['base']],
        'hardwareCommands': False,
    })
(OUT/'actions.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
(OUT/'source/authoring-curves.json').write_text(json.dumps(DEFS, ensure_ascii=False, indent=2)+'\n')
print('NIULAI_ACTIONS_BUILT', json.dumps({'clips':len(bpy.data.actions),'new':len(DEFS),'meshes':len(meshes),'bytes':(OUT/f'{STEM}.glb').stat().st_size}),flush=True)
