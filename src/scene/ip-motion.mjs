import * as THREE from 'three';

// Authored in normalized audio time, in the model's bind-pose world axes.
// The supplied GLBs remain intact. Smooth anticipation / action / recovery
// replaces their tiny demonstration clips with coordinated skeletal gestures.
const frames = (...values) => values;
const motion = {
  fengge: {
    nod: {
      Head: frames([0,0,0,0],[.12,-9,0,0],[.32,25,0,-3],[.48,-7,0,0],[.67,19,0,2],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.15,-3,0,0],[.34,7,0,0],[.55,0,0,0],[.7,4,0,0],[1,0,0,0]),
      'UpperArm.L': frames([0,0,0,0],[.28,-10,0,12],[.6,-6,0,7],[1,0,0,0]),
      'Forearm.L': frames([0,0,0,0],[.3,-24,0,8],[.65,-14,0,4],[1,0,0,0]),
    },
    reflect: {
      Head: frames([0,0,0,0],[.17,-7,-15,9],[.38,-3,10,-7],[.57,-8,0,0],[.74,17,0,0],[.86,-4,0,0],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.2,-5,-8,0],[.48,-4,7,0],[.73,6,0,0],[1,0,0,0]),
      'UpperArm.L': frames([0,0,0,0],[.22,-19,-8,36],[.48,-22,0,43],[.72,-13,0,28],[1,0,0,0]),
      'UpperArm.R': frames([0,0,0,0],[.27,-19,8,-36],[.5,-22,0,-43],[.72,-13,0,-28],[1,0,0,0]),
      'Forearm.L': frames([0,0,0,0],[.25,-47,0,8],[.55,-58,0,15],[.78,-30,0,6],[1,0,0,0]),
      'Forearm.R': frames([0,0,0,0],[.3,-47,0,-8],[.55,-58,0,-15],[.78,-30,0,-6],[1,0,0,0]),
      'Hand.L': frames([0,0,0,0],[.3,0,-30,12],[.65,0,-22,8],[1,0,0,0]),
      'Hand.R': frames([0,0,0,0],[.3,0,30,-12],[.65,0,22,-8],[1,0,0,0]),
    },
  },
  nailong: {
    tilt: {
      Head: frames([0,0,0,0],[.13,-9,0,-6],[.36,-5,-12,25],[.63,4,8,-17],[.83,-4,0,8],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.35,-4,0,-8],[.64,3,0,6],[1,0,0,0]),
      LeftArm: frames([0,0,0,0],[.35,-10,0,16],[.64,-4,0,14],[1,0,0,0]),
      RightArm: frames([0,0,0,0],[.35,-5,0,-15],[.64,-10,0,-16],[1,0,0,0]),
      Tail: frames([0,0,0,0],[.3,0,22,0],[.6,0,-18,0],[1,0,0,0]),
    },
    wave: {
      Root: frames([0,0,0,0],[.18,0,-7,-5],[.38,0,8,6],[.58,0,-7,-5],[.78,0,6,4],[1,0,0,0]),
      Head: frames([0,0,0,0],[.15,-12,0,8],[.36,6,0,-12],[.55,-10,0,12],[.76,5,0,-8],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.17,7,0,0],[.33,-8,0,0],[.52,6,0,0],[.69,-7,0,0],[1,0,0,0]),
      LeftArm: frames([0,0,0,0],[.19,-12,0,24],[.34,-8,0,32],[.48,-10,0,12],[.63,-8,0,32],[.78,-8,0,24],[1,0,0,0]),
      RightArm: frames([0,0,0,0],[.22,-12,0,-24],[.37,-8,0,-32],[.51,-10,0,-12],[.66,-8,0,-32],[.81,-8,0,-24],[1,0,0,0]),
      LeftForeArm: frames([0,0,0,0],[.22,-20,0,20],[.48,-10,0,-5],[.68,-22,0,20],[1,0,0,0]),
      RightForeArm: frames([0,0,0,0],[.25,-20,0,-20],[.51,-10,0,5],[.71,-22,0,-20],[1,0,0,0]),
      Tail: frames([0,0,0,0],[.2,0,25,0],[.4,0,-25,0],[.6,0,25,0],[.8,0,-18,0],[1,0,0,0]),
      $Root: frames([0,0,0,0],[.14,0,-.045,0],[.3,0,.08,0],[.43,0,-.035,0],[.6,0,.07,0],[.73,0,-.025,0],[1,0,0,0]),
    },
  },
  spiderman: {
    wave: {
      Chest: frames([0,0,0,0],[.14,2,-12,-5],[.34,-7,16,7],[.55,-3,10,4],[1,0,0,0]),
      Head: frames([0,0,0,0],[.16,-6,-12,0],[.34,-5,18,-8],[.66,0,8,0],[1,0,0,0]),
      LeftArm: frames([0,0,0,0],[.16,0,-18,12],[.34,-15,18,-24],[.6,-8,12,-16],[1,0,0,0]),
      LeftForeArm: frames([0,0,0,0],[.16,0,-12,25],[.34,-15,20,-28],[.6,-8,12,-18],[1,0,0,0]),
      LeftHand: frames([0,0,0,0],[.18,30,0,0],[.32,-38,0,8],[.52,-26,0,5],[1,0,0,0]),
    },
    bow: {
      $Root: frames([0,0,0,0],[.18,0,-.1,0],[.38,.12,.3,.03],[.52,.17,.32,.03],[.69,.08,-.07,0],[1,0,0,0]),
      Root: frames([0,0,0,0],[.18,0,-12,0],[.4,0,24,-7],[.55,0,18,-4],[.7,0,7,0],[1,0,0,0]),
      Spine: frames([0,0,0,0],[.18,13,0,0],[.4,-10,0,-5],[.69,14,0,0],[1,0,0,0]),
      Head: frames([0,0,0,0],[.18,10,-8,0],[.4,-17,8,0],[.69,12,0,0],[.85,-8,0,0],[1,0,0,0]),
      LeftArm: frames([0,0,0,0],[.18,6,-8,15],[.4,-15,10,38],[.6,-8,5,25],[.73,4,0,-10],[1,0,0,0]),
      RightArm: frames([0,0,0,0],[.18,0,0,-8],[.4,-32,0,-25],[.58,-24,0,-18],[.7,0,0,4],[1,0,0,0]),
      RightForeArm: frames([0,0,0,0],[.2,-12,0,0],[.4,-28,0,-14],[.59,-18,0,-8],[1,0,0,0]),
      LeftUpLeg: frames([0,0,0,0],[.18,8,0,0],[.4,-10,0,0],[.7,8,0,0],[1,0,0,0]),
      RightUpLeg: frames([0,0,0,0],[.18,6,0,0],[.4,-8,0,0],[.7,7,0,0],[1,0,0,0]),
    },
  },
  toothless: {
    tilt: {
      Head: frames([0,0,0,0],[.15,-10,0,0],[.35,-7,-17,23],[.62,6,15,-16],[.82,-8,0,7],[1,0,0,0]),
      Neck: frames([0,0,0,0],[.3,-8,0,-5],[.6,4,0,5],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.32,6,0,-6],[.62,-4,0,5],[1,0,0,0]),
      'Tail.01': frames([0,0,0,0],[.3,0,22,0],[.62,0,-20,0],[1,0,0,0]),
      'Tail.02': frames([0,0,0,0],[.36,0,17,0],[.69,0,-17,0],[1,0,0,0]),
      'Wing.L': frames([0,0,0,0],[.36,0,-8,12],[.7,0,0,4],[1,0,0,0]),
      'Wing.R': frames([0,0,0,0],[.36,0,8,-12],[.7,0,0,-4],[1,0,0,0]),
    },
    wing_flap: {
      Head: frames([0,0,0,0],[.14,9,0,0],[.3,-18,0,0],[.48,3,0,0],[.65,-12,0,0],[.82,4,0,0],[1,0,0,0]),
      Chest: frames([0,0,0,0],[.14,6,0,0],[.3,-8,0,0],[.48,4,0,0],[.65,-6,0,0],[1,0,0,0]),
      'Wing.L': frames([0,0,0,0],[.14,0,8,-12],[.3,-8,-22,-42],[.44,10,8,25],[.59,-8,-22,-40],[.73,8,6,23],[.85,-4,-8,-22],[1,0,0,0]),
      'Wing.R': frames([0,0,0,0],[.14,0,-8,12],[.3,-8,22,42],[.44,10,-8,-25],[.59,-8,22,40],[.73,8,-6,-23],[.85,-4,8,22],[1,0,0,0]),
      'WingTip.L': frames([0,0,0,0],[.19,0,0,-8],[.35,0,-10,24],[.49,0,5,-12],[.64,0,-10,24],[.78,0,5,-12],[1,0,0,0]),
      'WingTip.R': frames([0,0,0,0],[.19,0,0,8],[.35,0,10,-24],[.49,0,-5,12],[.64,0,10,-24],[.78,0,-5,12],[1,0,0,0]),
      'Tail.01': frames([0,0,0,0],[.25,0,22,0],[.5,0,-24,0],[.75,0,18,0],[1,0,0,0]),
      'Tail.02': frames([0,0,0,0],[.33,0,17,0],[.57,0,-20,0],[.82,0,12,0],[1,0,0,0]),
    },
  },
};

export function sampleFrames(keys, t) {
  const i = keys.findIndex(k => k[0] >= t);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1].slice(1);
  const a = keys[i - 1], b = keys[i], p = (t - a[0]) / (b[0] - a[0]);
  const s = p * p * (3 - 2 * p);
  return a.slice(1).map((v, j) => v + (b[j + 1] - v) * s);
}
export function createIpClips(model, id) {
  if (!motion[id]) return [];
  model.updateMatrixWorld(true);
  const bones = []; model.traverse(o => { if (o.isBone) bones.push(o); });
  const times = Array.from({ length: 91 }, (_, i) => i / 90);
  return Object.entries(motion[id]).map(([name, sourcePose]) => {
    const pose = Object.fromEntries(Object.entries(sourcePose).map(([key, value]) => [
      (key.startsWith('$') ? '$' : '') + THREE.PropertyBinding.sanitizeNodeName(key.replace(/^\$/, '')), value,
    ]));
    for (const key of Object.keys(pose)) if (!bones.some(b => b.name === key.replace(/^\$/, ''))) throw new Error(`Missing ${id} joint: ${key}`);
    const tracks = [];
    for (const bone of bones) {
      const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      const inverse = parent.clone().invert();
      const values = times.flatMap(t => {
        const angles = sampleFrames(pose[bone.name] || [[0,0,0,0],[1,0,0,0]], t).map(THREE.MathUtils.degToRad);
        const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles, 'XYZ'));
        return inverse.clone().multiply(delta).multiply(parent).multiply(bone.quaternion).toArray();
      });
      // UUID binding also handles Blender joint names containing dots.
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
      if (pose[`$${bone.name}`]) tracks.push(new THREE.VectorKeyframeTrack(`${bone.uuid}.position`, times,
        times.flatMap(t => sampleFrames(pose[`$${bone.name}`], t).map((v,i) => v + bone.position.getComponent(i)))));
      else tracks.push(new THREE.VectorKeyframeTrack(`${bone.uuid}.position`, [0,1], [...bone.position.toArray(),...bone.position.toArray()]));
    }
    return new THREE.AnimationClip(name, 1, tracks);
  });
}
// Authored normalized-time gestures for non-Niulai IPs are kept above. This
// second layer creates software-only desktop-pet behaviors from whatever
// compatible bones a supplied rig exposes. It never emits servo commands.
const desktopFrames = (...values) => values;
const desktopPose = {
  'look-left': { Head: desktopFrames([0,0,0,0],[.2,0,18,0],[.62,0,18,0],[1,0,0,0]), Neck: desktopFrames([0,0,0,0],[.2,0,8,0],[.62,0,8,0],[1,0,0,0]) },
  'look-right': { Head: desktopFrames([0,0,0,0],[.2,0,-18,0],[.62,0,-18,0],[1,0,0,0]), Neck: desktopFrames([0,0,0,0],[.2,0,-8,0],[.62,0,-8,0],[1,0,0,0]) },
  'look-up': { Head: desktopFrames([0,0,0,0],[.2,-16,0,0],[.62,-16,0,0],[1,0,0,0]), Neck: desktopFrames([0,0,0,0],[.2,-7,0,0],[.62,-7,0,0],[1,0,0,0]) },
  'look-down': { Head: desktopFrames([0,0,0,0],[.2,16,0,0],[.62,16,0,0],[1,0,0,0]), Neck: desktopFrames([0,0,0,0],[.2,7,0,0],[.62,7,0,0],[1,0,0,0]) },
  bow: { Chest: desktopFrames([0,0,0,0],[.18,10,0,0],[.43,18,0,0],[.7,8,0,0],[1,0,0,0]), Spine: desktopFrames([0,0,0,0],[.18,8,0,0],[.43,14,0,0],[.7,6,0,0],[1,0,0,0]), Head: desktopFrames([0,0,0,0],[.2,-8,0,0],[.45,-13,0,0],[.7,-6,0,0],[1,0,0,0]) },
  stretch: { Chest: desktopFrames([0,0,0,0],[.2,-8,0,0],[.5,-14,0,0],[.8,-5,0,0],[1,0,0,0]), 'UpperArm.L': desktopFrames([0,0,0,0],[.2,-16,0,22],[.5,-28,0,30],[.8,-12,0,16],[1,0,0,0]), 'UpperArm.R': desktopFrames([0,0,0,0],[.2,-16,0,-22],[.5,-28,0,-30],[.8,-12,0,-16],[1,0,0,0]) },
  breathe: { Chest: desktopFrames([0,0,0,0],[.2,-5,0,0],[.42,5,0,0],[.64,-5,0,0],[.86,5,0,0],[1,0,0,0]), Spine: desktopFrames([0,0,0,0],[.2,-3,0,0],[.42,3,0,0],[.64,-3,0,0],[.86,3,0,0],[1,0,0,0]) },
  shimmy: { Chest: desktopFrames([0,0,0,0],[.18,0,0,8],[.36,0,0,-8],[.54,0,0,8],[.72,0,0,-8],[1,0,0,0]), Hips: desktopFrames([0,0,0,0],[.18,0,0,-5],[.36,0,0,5],[.54,0,0,-5],[.72,0,0,5],[1,0,0,0]) },
  'turn-left': { Chest: desktopFrames([0,0,0,0],[.2,0,15,0],[.65,0,18,0],[1,0,0,0]), Head: desktopFrames([0,0,0,0],[.2,0,-6,0],[.65,0,-8,0],[1,0,0,0]) },
  'turn-right': { Chest: desktopFrames([0,0,0,0],[.2,0,-15,0],[.65,0,-18,0],[1,0,0,0]), Head: desktopFrames([0,0,0,0],[.2,0,6,0],[.65,0,8,0],[1,0,0,0]) },
  'paw-tap-left': { 'UpperArm.L': desktopFrames([0,0,0,0],[.2,8,0,12],[.42,18,0,16],[.64,8,0,12],[1,0,0,0]), 'Forearm.L': desktopFrames([0,0,0,0],[.2,-12,0,0],[.42,-25,0,0],[.64,-12,0,0],[1,0,0,0]) },
  'paw-tap-right': { 'UpperArm.R': desktopFrames([0,0,0,0],[.2,8,0,-12],[.42,18,0,-16],[.64,8,0,-12],[1,0,0,0]), 'Forearm.R': desktopFrames([0,0,0,0],[.2,-12,0,0],[.42,-25,0,0],[.64,-12,0,0],[1,0,0,0]) },
  'paw-wave': { 'UpperArm.L': desktopFrames([0,0,0,0],[.15,-18,0,28],[.32,-14,0,36],[.5,-18,0,24],[.68,-14,0,36],[1,0,0,0]), 'Forearm.L': desktopFrames([0,0,0,0],[.2,-22,0,10],[.45,-10,0,-5],[.7,-22,0,10],[1,0,0,0]) },
  'paw-reach': { 'UpperArm.L': desktopFrames([0,0,0,0],[.25,-24,0,14],[.58,-30,0,18],[.8,-10,0,8],[1,0,0,0]), 'Forearm.L': desktopFrames([0,0,0,0],[.25,-30,0,0],[.58,-40,0,0],[.8,-15,0,0],[1,0,0,0]) },
  'paw-cross': { 'UpperArm.L': desktopFrames([0,0,0,0],[.28,-18,0,34],[.62,-10,0,22],[1,0,0,0]), 'UpperArm.R': desktopFrames([0,0,0,0],[.28,-18,0,-34],[.62,-10,0,-22],[1,0,0,0]) },
  'belly-breathe': { Chest: desktopFrames([0,0,0,0],[.18,-6,0,0],[.4,6,0,0],[.62,-6,0,0],[.84,6,0,0],[1,0,0,0]), Hips: desktopFrames([0,0,0,0],[.2,0,0,2],[.5,0,0,-2],[.8,0,0,2],[1,0,0,0]) },
  'belly-rub': { 'UpperArm.L': desktopFrames([0,0,0,0],[.25,-20,0,24],[.52,-12,0,18],[.78,-18,0,22],[1,0,0,0]), 'UpperArm.R': desktopFrames([0,0,0,0],[.25,-20,0,-24],[.52,-12,0,-18],[.78,-18,0,-22],[1,0,0,0]) },
  'belly-laugh': { Chest: desktopFrames([0,0,0,0],[.2,-8,0,0],[.42,8,0,0],[.64,-8,0,0],[.86,5,0,0],[1,0,0,0]), 'UpperArm.L': desktopFrames([0,0,0,0],[.2,-18,0,24],[.42,-12,0,20],[.64,-18,0,24],[1,0,0,0]), 'UpperArm.R': desktopFrames([0,0,0,0],[.2,-18,0,-24],[.42,-12,0,-20],[.64,-18,0,-24],[1,0,0,0]) },
  'tail-wag': { Tail: desktopFrames([0,0,0,0],[.18,0,22,0],[.36,0,-22,0],[.54,0,22,0],[.72,0,-18,0],[1,0,0,0]), 'Tail.01': desktopFrames([0,0,0,0],[.2,0,18,0],[.4,0,-18,0],[.6,0,18,0],[1,0,0,0]), Hips: desktopFrames([0,0,0,0],[.2,0,0,4],[.4,0,0,-4],[.6,0,0,4],[1,0,0,0]) },
  sit: { Hips: desktopFrames([0,0,0,0],[.2,-10,0,0],[.55,-22,0,0],[.8,-8,0,0],[1,0,0,0]), 'UpLeg.L': desktopFrames([0,0,0,0],[.25,18,0,0],[.58,28,0,0],[.82,8,0,0],[1,0,0,0]), 'UpLeg.R': desktopFrames([0,0,0,0],[.25,18,0,0],[.58,28,0,0],[.82,8,0,0],[1,0,0,0]) },
  stand: { Hips: desktopFrames([0,0,0,0],[.2,12,0,0],[.52,20,0,0],[.78,6,0,0],[1,0,0,0]), 'UpLeg.L': desktopFrames([0,0,0,0],[.25,-18,0,0],[.58,-26,0,0],[.82,-8,0,0],[1,0,0,0]), 'UpLeg.R': desktopFrames([0,0,0,0],[.25,-18,0,0],[.58,-26,0,0],[.82,-8,0,0],[1,0,0,0]) },
  rest: { Head: desktopFrames([0,0,0,0],[.25,8,0,0],[.65,10,0,0],[1,0,0,0]), Chest: desktopFrames([0,0,0,0],[.25,4,0,0],[.65,6,0,0],[1,0,0,0]) },
  wake: { Head: desktopFrames([0,0,0,0],[.2,10,0,0],[.45,-12,0,0],[.72,6,0,0],[1,0,0,0]), Chest: desktopFrames([0,0,0,0],[.2,8,0,0],[.45,-12,0,0],[.72,4,0,0],[1,0,0,0]) },
  'play-bounce': { Hips: desktopFrames([0,0,0,0],[.2,-8,0,0],[.42,8,0,0],[.64,-8,0,0],[.86,5,0,0],[1,0,0,0]), Head: desktopFrames([0,0,0,0],[.2,-10,0,0],[.42,8,0,0],[.64,-10,0,0],[.86,5,0,0],[1,0,0,0]) },
  celebrate: { Chest: desktopFrames([0,0,0,0],[.18,0,0,8],[.36,0,0,-8],[.54,0,0,8],[.72,0,0,-8],[1,0,0,0]), 'UpperArm.L': desktopFrames([0,0,0,0],[.2,-18,0,26],[.38,-12,0,34],[.56,-18,0,26],[.74,-12,0,34],[1,0,0,0]), 'UpperArm.R': desktopFrames([0,0,0,0],[.2,-18,0,-26],[.38,-12,0,-34],[.56,-18,0,-26],[.74,-12,0,-34],[1,0,0,0]) },
  'shy-hide': { Head: desktopFrames([0,0,0,0],[.2,12,0,0],[.55,18,0,0],[.78,8,0,0],[1,0,0,0]), Chest: desktopFrames([0,0,0,0],[.2,4,0,8],[.55,10,0,12],[.78,4,0,8],[1,0,0,0]) },
  comfort: { Head: desktopFrames([0,0,0,0],[.2,-6,0,0],[.55,-10,0,0],[.78,-4,0,0],[1,0,0,0]), Chest: desktopFrames([0,0,0,0],[.2,-3,0,0],[.55,3,0,0],[.78,-2,0,0],[1,0,0,0]) },
};

function createDesktopClip(model, name, sourcePose) {
  const bones = [];
  const byName = new Map();
  model.traverse((object) => {
    if (object.isBone) {
      bones.push(object);
      byName.set(object.name, object);
      if (object.userData.name) byName.set(object.userData.name, object);
    }
  });
  const keys = Object.entries(sourcePose).filter(([name]) => byName.has(name));
  if (!keys.length) return null;
  const times = Array.from({ length: 91 }, (_, i) => i / 90);
  const tracks = [];
  for (const [name, source] of keys) {
    const bone = byName.get(name);
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const inverse = parent.clone().invert();
    const values = times.flatMap((t) => {
      const angles = sampleFrames(source, t).map(THREE.MathUtils.degToRad);
      const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles, 'XYZ'));
      return inverse.clone().multiply(delta).multiply(parent).multiply(bone.quaternion).toArray();
    });
    tracks.push(new THREE.QuaternionKeyframeTrack(bone.uuid + '.quaternion', times, values));
  }
  return new THREE.AnimationClip(name, 1, tracks);
}

export function createDesktopPetClips(model) {
  return Object.entries(desktopPose)
    .map(([name, pose]) => createDesktopClip(model, name, pose))
    .filter(Boolean);
}
