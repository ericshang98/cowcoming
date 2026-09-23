import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialRoom, updateProfile, applyDeviceEvent, upgradeRoomPersonality, FORM_IDS } from '../shared/live-protocol.mjs';
import { PERSONA_VERSION, personaProfile } from '../shared/personas.mjs';

test('all six forms load their own prompt and need a matching local persona acknowledgement', () => {
  let s = initialRoom('test','Personas');
  s.device.actionContractVersion = 2;
  const prompts = new Set();
  for (const formId of FORM_IDS) {
    s = updateProfile(s, {expectedRevision:s.profile.revision, formId});
    assert.equal(s.profile.prompt, personaProfile(formId).prompt);
    assert.equal(s.profile.personaVersion, PERSONA_VERSION);
    prompts.add(s.profile.prompt);
    const receipt = {type:'profile.applied',eventId:formId,revision:s.profile.revision,formId,personaVersion:PERSONA_VERSION};
    assert.throws(()=>applyDeviceEvent(s,{...receipt,personaVersion:'old'}),/Persona/);
    assert.throws(()=>applyDeviceEvent(s,{...receipt,formId:'other'}),/Persona/);
    const {personaVersion, ...legacy} = receipt;
    assert.throws(()=>applyDeviceEvent(s,legacy),/Persona/);
    s = applyDeviceEvent(s,receipt);
    assert.equal(s.appliedRevision,s.profile.revision);
  }
  assert.equal(prompts.size,6);
});

test('old generic profiles migrate; per-form edited JEV preferences remain independent', () => {
  let s = initialRoom('test','Personas');
  delete s.profile.personaVersion;
  s.profile.prompt = 'Old generic prompt';
  s = updateProfile(s,{expectedRevision:1,formId:'normal'});
  assert.equal(s.profile.prompt,personaProfile('normal').prompt);
  s = updateProfile(s,{expectedRevision:2,prompt:'Custom nod preference'});
  s = updateProfile(s,{expectedRevision:3,formId:'dark'});
  assert.equal(s.profile.prompt,personaProfile('dark').prompt);
  s = updateProfile(s,{expectedRevision:4,formId:'normal'});
  assert.equal(s.profile.prompt,'Custom nod preference');
});

test('switching interrupts the old language stream and rejects late old-form text', () => {
  let s = initialRoom('test','Personas');
  s.device.actionContractVersion = 2;
  s = applyDeviceEvent(s,{type:'profile.applied',eventId:'apply',revision:1,formId:'calf',personaVersion:PERSONA_VERSION});
  s = applyDeviceEvent(s,{type:'language.start',eventId:'start',messageId:'old',role:'assistant',text:'哞？',profileRevision:1});
  s = updateProfile(s,{expectedRevision:1,formId:'dark'});
  assert.equal(s.messages[0].status,'interrupted');
  assert.throws(()=>applyDeviceEvent(s,{type:'language.delta',eventId:'late',messageId:'old',text:'旧台词',profileRevision:1}),/stale/);
});


test('production personality v1 rooms upgrade once without changing custom JEV or action capabilities', () => {
  const old = initialRoom('existing','Existing room');
  old.personalityVersion = 1;
  delete old.profile.personaVersion;
  old.profile.prompt = 'Keep this custom JEV preference';
  old.profile.revision = 4;
  old.appliedRevision = 4;
  old.messages = [{status:'streaming',text:'old'}];
  const upgraded = upgradeRoomPersonality(old);
  assert.equal(upgraded.profile.revision,5);
  assert.equal(upgraded.profile.personaVersion,PERSONA_VERSION);
  assert.equal(upgraded.profile.prompt,old.profile.prompt);
  assert.deepEqual(upgraded.profile.allowedActions,old.profile.allowedActions);
  assert.equal(upgraded.appliedRevision,null);
  assert.equal(upgraded.messages[0].status,'interrupted');
  assert.equal(upgradeRoomPersonality(upgraded),upgraded);
});
