import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createIpClips} from '../src/scene/ip-motion.mjs';

function skeleton(id) {
  const b=fs.readFileSync(new URL(`../public/characters/${id}/v1/model.glb`,import.meta.url));
  const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  const jointIds=new Set(doc.skins.flatMap(s=>s.joints));
  const nodes=doc.nodes.map((n,i)=>{
    const o=jointIds.has(i)?new THREE.Bone():new THREE.Object3D();
    // GLTFLoader removes reserved punctuation from Blender joint names.
    o.name=THREE.PropertyBinding.sanitizeNodeName(n.name||'');
    if(n.translation)o.position.fromArray(n.translation);
    if(n.rotation)o.quaternion.fromArray(n.rotation);
    if(n.scale)o.scale.fromArray(n.scale);
    return o;
  });
  doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const root=new THREE.Group();nodes.filter(n=>!n.parent).forEach(n=>root.add(n));root.updateMatrixWorld(true);return root;
}
for (const id of ['fengge','spiderman','nailong','toothless']) test(`${id}: authored gestures drive multiple actual joints and return to bind pose without drift`,()=>{
  const model=skeleton(id), rest=new Map();model.traverse(b=>{if(b.isBone)rest.set(b,[b.quaternion.clone(),b.position.clone()]);});
  const clips=createIpClips(model,id);assert.equal(clips.length,2);
  for(const clip of clips){
    const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip).play();let peak=0;const moving=new Set();
    for(const t of [0,.15,.32,.5,.65,.84]){
      action.time=t;mixer.update(0);
      for(const [b,[q]] of rest){const angle=b.quaternion.angleTo(q);peak=Math.max(peak,angle);if(angle>.12)moving.add(b.name);}
    }
    assert.ok(moving.size>=3,`${clip.name} must involve at least 3 joints`);assert.ok(peak>.3,`${clip.name} has a readable peak pose`);
    for(let repeat=0;repeat<3;repeat++){
      action.time=.4;mixer.update(0);action.time=.999999;mixer.update(0);
      for(const [b,[q,p]] of rest){assert.ok(b.quaternion.angleTo(q)<.001,`${b.name} rotates back`);assert.ok(b.position.distanceTo(p)<.0001,`${b.name} returns without root drift`);}
    }
    mixer.stopAllAction();mixer.uncacheRoot(model);
  }
});
test('Niulai keeps its supplied animation library',()=>assert.deepEqual(createIpClips(new THREE.Group(),'niulai'),[]));
