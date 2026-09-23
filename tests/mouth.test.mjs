import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { prepareMouth, updateMouth } from '../src/scene/niulai.mjs';
function fixture() {
 const scene=new Group(), mesh=new Mesh();
 mesh.morphTargetDictionary={MouthOpen:0,MouthWide:1,MouthRound:2};
 mesh.morphTargetInfluences=[1,1,1]; scene.add(mesh);
 return {scene,mesh};
}
test('initializes a cloned mouth closed without changing the source model',()=>{
 const {scene,mesh}=fixture(); const copy=clone(scene); const mouths=prepareMouth(copy);
 assert.equal(mouths.length,1);
 assert.deepEqual(mouths[0].morphTargetInfluences,[0,0,0]);
 assert.deepEqual(mesh.morphTargetInfluences,[1,1,1]);
});
test('combines opening with wide or round lips smoothly and returns to closed',()=>{
 const {scene}=fixture();const mouths=prepareMouth(scene);
 for(const [pose,index,target] of [['open',0,[1,0,0]],['wide',1,[.55,1,0]],['round',2,[.8,0,1]]]) {
  updateMouth(mouths,pose,1/60);
  assert.ok(mouths[0].morphTargetInfluences[index]>0 && mouths[0].morphTargetInfluences[index]<1);
  for(let i=0;i<120;i++)updateMouth(mouths,pose,1/60);
  mouths[0].morphTargetInfluences.forEach((value,i)=>assert.ok(Math.abs(value-target[i])<0.001));
 }
 for(let i=0;i<120;i++)updateMouth(mouths,'closed',1/60);
 assert.ok(mouths[0].morphTargetInfluences.every(w=>w<0.001));
});
test('mouth controls tolerate a character without mouth shapes',()=>{
 assert.deepEqual(prepareMouth(new Group()),[]);
 assert.doesNotThrow(()=>updateMouth([],'open',1/60));
});
