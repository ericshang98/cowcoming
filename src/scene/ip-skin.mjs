import * as THREE from 'three';

// The delivered Nailong auto-weights include large patches of belly in the
// arm chains. Restrict those weights to the arm envelope before posing it;
// otherwise a raised hand pulls the entire belly into a sheet. Keep source
// geometry untouched and redistribute the removed influence to the torso.
export function refineIpSkin(model, id) {
  if (id !== 'nailong') return;
  model.updateMatrixWorld(true);
  const point = new THREE.Vector3(), nearest = new THREE.Vector3();
  model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const skeleton = mesh.skeleton;
    const armIds = new Set(skeleton.bones.flatMap((b,i) => /(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)$/.test(b.name) ? [i] : []));
    const spine = skeleton.bones.findIndex(b => b.name === 'Spine');
    const chest = skeleton.bones.findIndex(b => b.name === 'Chest');
    if (spine < 0 || chest < 0) return;
    const segments = ['Left','Right'].flatMap(side => ['Arm','ForeArm'].map((name,i) => {
      const a = skeleton.bones.find(b => b.name === side + name);
      const b = skeleton.bones.find(b => b.name === side + (i ? 'Hand' : 'ForeArm'));
      return new THREE.Line3(a.getWorldPosition(new THREE.Vector3()),b.getWorldPosition(new THREE.Vector3()));
    }));
    mesh.geometry = mesh.geometry.clone();mesh.userData.ipOwnGeometry = true;
    const indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    for (let i=0;i<indices.count;i++) {
      let originalArm = 0;
      for(let j=0;j<4;j++) if(armIds.has(indices.getComponent(i,j))) originalArm += weights.getComponent(i,j);
      if (originalArm < .0001) continue;
      point.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
      const distance = Math.min(...segments.map(segment => segment.closestPointToPoint(point,true,nearest).distanceTo(point)));
      const gate = (1-THREE.MathUtils.smoothstep(distance,.095,.19))*THREE.MathUtils.smoothstep(Math.abs(point.x),.42,.55)*THREE.MathUtils.smoothstep(point.y,.61,.76);
      const influence = new Map();let removed=0;
      for(let j=0;j<4;j++) {
        const joint=indices.getComponent(i,j), old=weights.getComponent(i,j);
        const weight=armIds.has(joint)?old*gate:old;
        removed+=old-weight;influence.set(joint,(influence.get(joint)||0)+weight);
      }
      const torso = point.y > .88 ? chest : spine;
      influence.set(torso,(influence.get(torso)||0)+removed);
      const top=[...influence].sort((a,b)=>b[1]-a[1]).slice(0,4), sum=top.reduce((s,x)=>s+x[1],0);
      for(let j=0;j<4;j++){indices.setComponent(i,j,top[j]?.[0]||0);weights.setComponent(i,j,(top[j]?.[1]||0)/sum);}
    }
    indices.needsUpdate=true;weights.needsUpdate=true;
  });
}
