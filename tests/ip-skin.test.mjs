import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {loadIpModel} from './helpers/ip-model.mjs';import {refineIpSkin} from '../src/scene/ip-skin.mjs';import {createIpClips} from '../src/scene/ip-motion.mjs';
test('Nailong arm lift preserves the belly instead of stretching it with the arms',()=>{
 const model=loadIpModel('nailong'), samples=[];const v=new THREE.Vector3();
 model.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();const pos=m.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);
   if(Math.abs(v.x)<.45&&v.y>.6&&v.y<.95&&v.z>.25){samples.push({mesh:m,index:i,rest:m.getVertexPosition(i,new THREE.Vector3()).clone(),geometry:m.geometry});}
  }
 });assert.ok(samples.length>100);
 refineIpSkin(model,'nailong');
 for(const s of samples){assert.notEqual(s.mesh.geometry,s.geometry);assert.ok(s.mesh.getVertexPosition(s.index,v).distanceTo(s.rest)<.00001);}
 const mixer=new THREE.AnimationMixer(model);const clip=createIpClips(model,'nailong').find(c=>c.name==='wave');const action=mixer.clipAction(clip).play();
 action.time=.34;mixer.update(0);model.updateMatrixWorld(true);model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 const maximum=Math.max(...samples.map(s=>s.mesh.getVertexPosition(s.index,v).distanceTo(s.rest)));
 assert.ok(maximum<.15,`belly displacement ${maximum} must stay bounded during a full arm lift`);
});
