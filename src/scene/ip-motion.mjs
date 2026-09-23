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
