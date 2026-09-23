import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createResponsePlayer} from '../src/live/response-player.mjs';
import {ACTION_CATALOG,availableDeviceActions} from '../shared/action-catalog.mjs';
import {initialRoom,updateProfile} from '../shared/live-protocol.mjs';
function fixture(){
 const root=new THREE.Group(),bone=new THREE.Bone();bone.name='Head';root.add(bone);
 const mixer=new THREE.AnimationMixer(root),actions={};
 for(const name of ['idle',...Object.values(ACTION_CATALOG).map(a=>a.suffix)]) actions[name]=mixer.clipAction(new THREE.AnimationClip(name,.4,[new THREE.NumberKeyframeTrack('Head.rotation[x]',[0,.2,.4],[0,.2,0])]));
 const manifest={formId:'calf',variants:Object.values(ACTION_CATALOG).map(a=>({logicalId:a.suffix,clip:a.suffix,requiredBones:['Head']}))};
 const player=createResponsePlayer({mixer,actions,manifest,bones:new Set(['Head'])});
 return {player,mixer,actions,advance(){for(let i=0;i<100;i++){player.update(.01);mixer.update(.01);}}};
}
test('all five actions play their distinct clip, complete after recovery and deduplicate',async()=>{
 const f=fixture();
 for(const [id,a] of Object.entries(ACTION_CATALOG)){
  const request={eventId:id,formId:'calf',actionId:id};const result=f.player.play(request);
  assert.equal(f.player.clip,a.suffix);assert.equal(f.player.busy,true);
  assert.equal((await f.player.play(request)).status,'duplicate');
  f.advance();assert.equal((await result).status,'completed');assert.equal(f.player.busy,false);
 }
 f.player.dispose();
});
test('unavailable models never claim completion; stop interrupts actual playback',async()=>{
 const f=fixture();assert.equal((await f.player.play({eventId:'a',formId:'dark',actionId:'NOD'})).status,'unavailable');
 const p=f.player.play({eventId:'b',formId:'calf',actionId:'NOD'});
 assert.equal((await f.player.play({eventId:'c',formId:'calf',actionId:'SHAKE'})).reason,'animation-busy');
 f.player.stop();assert.equal((await p).status,'interrupted');f.advance();assert.equal(f.player.busy,false);f.player.dispose();
});
test('protocol migration is explicit and action semantics cannot be swapped',()=>{
 const state=initialRoom('test','test');delete state.profile.actionContractVersion;
 assert.throws(()=>updateProfile(state,{expectedRevision:1,prompt:'new'}),/upgrade/);
 const next=updateProfile(state,{expectedRevision:1,migrateActions:true});assert.equal(next.profile.actionContractVersion,2);
 for(const [id,a] of Object.entries(ACTION_CATALOG))for(const other of Object.values(ACTION_CATALOG))if(a!==other)assert.throws(()=>updateProfile(next,{expectedRevision:2,animationMap:{[id]:[other.animation]}}),/mapping/);
 next.device={hardware:'ready',actionContractVersion:2,supportedActions:['NOD']};
 assert.deepEqual(availableDeviceActions(next),['NOD','WAIT']);
 next.device.hardware='offline';assert.deepEqual(availableDeviceActions(next),['WAIT']);
 next.device.actionContractVersion=1;assert.deepEqual(availableDeviceActions(next),[]);
});
