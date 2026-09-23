import { damp } from './motion.mjs';

export const NIULAI_ASSET = '/models/niulai-mouth.glb';
const shapes = { open: 'MouthOpen', wide: 'MouthWide', round: 'MouthRound' };
// Width/roundness affect the lip outline; combine them with an opening.
const poses = {
  closed: {},
  open: { MouthOpen: 1 },
  wide: { MouthOpen: 0.55, MouthWide: 1 },
  round: { MouthOpen: 0.8, MouthRound: 1 },
};

export function prepareMouth(model) {
  const mouths = [];
  model.traverse(mesh => {
    if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;
    if (!Object.values(shapes).some(name => name in mesh.morphTargetDictionary)) return;
    // The supplied file exports all three mouth shapes at weight 1.
    // Reset only the cloned instance; retain the original asset unchanged.
    for (const name of Object.values(shapes)) {
      const index = mesh.morphTargetDictionary[name];
      if (index !== undefined) mesh.morphTargetInfluences[index] = 0;
    }
    mouths.push(mesh);
  });
  return mouths;
}

export function updateMouth(mouths, pose, dt) {
  for (const mesh of mouths) {
    for (const name of Object.values(shapes)) {
      const index = mesh.morphTargetDictionary[name];
      if (index === undefined) continue;
      mesh.morphTargetInfluences[index] = damp(
        mesh.morphTargetInfluences[index], poses[pose]?.[name] || 0, 12, dt,
      );
    }
  }
}
