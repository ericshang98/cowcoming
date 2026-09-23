import test from 'node:test';
import assert from 'node:assert/strict';
import {pickWaveVoice,isWaveShortcut} from '../src/voice-interactions.mjs';
test('wave chooses long lines without consecutive repeats or a jumping/mama reply',()=>{
 const voices=['mama','okay','jump-later','growing','tomorrow','same-different'].map(id=>({id}));
 let last;
 for(const random of [0,.2,.99,0,.8,.5]) {
  const next=pickWaveVoice(voices,last,()=>random);
  assert.ok(['growing','tomorrow','same-different'].includes(next.id));
  assert.notEqual(next.id,last);last=next.id;
 }
});
test('L works when a button has focus, but typing, key repeat and browser shortcuts are ignored',()=>{
 const e={key:'l',target:{closest:()=>null}};
 assert.equal(isWaveShortcut(e),true);
 for(const override of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{key:'a'},{target:{isContentEditable:true,closest:()=>null}},{target:{closest:()=>({})}}])
  assert.equal(isWaveShortcut({...e,...override}),false);
});
