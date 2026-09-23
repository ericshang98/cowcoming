import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoom,updateProfile,applyDeviceEvent,FORM_IDS} from '../shared/live-protocol.mjs';
import {completedEvolutionTurn,localInteractionContext} from '../src/live/evolution-turn.mjs';
test('six forms get distinct product prompts and retain edits when revisited',()=>{
 let state=initialRoom('test','test'); const prompts=new Set(),language=new Set();
 for(const formId of FORM_IDS){state=updateProfile(state,{expectedRevision:state.profile.revision,formId});prompts.add(state.profile.prompt);language.add(state.profile.languagePrompt);}
 assert.equal(prompts.size,6);assert.equal(language.size,6);
 state=updateProfile(state,{expectedRevision:state.profile.revision,formId:'normal',prompt:'custom'});
 state=updateProfile(state,{expectedRevision:state.profile.revision,formId:'dark'});
 state=updateProfile(state,{expectedRevision:state.profile.revision,formId:'normal'});
 assert.equal(state.profile.prompt,'custom');
});
test('local silent round is correlated, counted once by runtime, and stale starts rejected',()=>{
 let state=initialRoom('test','test');let seq=0;
 const emit=(type,data)=>state=applyDeviceEvent(state,{type,eventId:`event_${++seq}`,...data});
 emit('device.status',{actionContractVersion:2,supportedActions:['NOD'],hardware:'ready'});
 emit('profile.applied',{revision:1});
 emit('interaction.start',{commandId:'local',profileRevision:1,userText:'你好',replyMode:'silent'});
 const start=state.events.at(-1), ctx=localInteractionContext(start,state.profile,{formId:'calf',sessionId:'s',generation:1});
 assert.ok(ctx);assert.equal(localInteractionContext(start,{...state.profile,revision:2},ctx),null);
 assert.throws(()=>emit('interaction.start',{commandId:'local',profileRevision:1,userText:'again'}),/Duplicate/);
 assert.throws(()=>emit('interaction.start',{commandId:'stale',profileRevision:0,userText:'old'}),/unapplied/);
 emit('decision',{decisionId:'d',commandId:'local',profileRevision:1,actionId:'NOD'});
 emit('action',{decisionId:'d',status:'completed'});
 emit('command.result',{commandId:'local',status:'completed'});
 assert.equal(completedEvolutionTurn(state,'local',ctx,{status:'completed'}).turn.userText,'你好');
 assert.equal(completedEvolutionTurn(state,'local',{...ctx,replyMode:'text'},{status:'completed'}).turn,undefined);
});
import {upgradeRoomPersonality} from '../shared/live-protocol.mjs';
test('persisted rooms upgrade once, preserve custom prompts, and require a fresh acknowledgement',()=>{
 const state=initialRoom('t','t');delete state.personalityVersion;state.profile.prompt='custom JEV';delete state.profile.languagePrompt;state.appliedRevision=1;
 const upgraded=upgradeRoomPersonality(state);
 assert.equal(upgraded.profile.prompt,'custom JEV');assert.ok(upgraded.profile.languagePrompt);
 assert.equal(upgraded.profile.revision,2);assert.equal(upgraded.appliedRevision,null);
 assert.equal(upgradeRoomPersonality(upgraded),upgraded);
});
import {validateSettings,requestEvolutionEvaluation} from '../src/evolution-session.mjs';
test('local evaluator accepts only its loopback URL; room key never goes to a remote gateway',async()=>{
 assert.doesNotThrow(()=>validateSettings({mode:'auto',interval:5,model:'test',endpoint:'http://127.0.0.1:8768/evaluate'}));
 assert.throws(()=>validateSettings({mode:'auto',interval:5,model:'test',endpoint:'http://evil.invalid/evaluate'}));
 const payload={requestId:'r',sessionId:'s',generation:0};let sent;
 const fetcher=async(_url,options)=>{sent=options;return {ok:true,json:async()=>payload};};
 await requestEvolutionEvaluation('http://127.0.0.1:8768/evaluate',payload,{fetcher,localKey:'private'});
 assert.equal(sent.headers.Authorization,'Bearer private');
 await requestEvolutionEvaluation('https://gateway.example/evaluate',payload,{fetcher,localKey:'private'});
 assert.equal(sent.headers.Authorization,undefined);
});
