import * as THREE from 'three';
import { ACTION_CATALOG } from '../../shared/action-catalog.mjs';

/** Plays only a registered, loaded clip and resolves after its actual finish + recovery. */
export function createResponsePlayer({mixer, actions, manifest, bones, onStart=()=>{}}) {
  const seen=new Map(); let current=null, recovery=null, disposed=false;
  function idle(){ const a=actions.idle; a?.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();return a; }
  function settle(status){
    if(!current)return;
    const done=current;current=null;recovery=null;
    done.resolve({status,clip:done.clip,eventId:done.eventId,formId:manifest.formId});
  }
  function recover(status){
    const incoming=idle();
    if(incoming)incoming.crossFadeFrom(current.action,.35,false);
    else current.action.fadeOut(.35);
    recovery={remaining:.35,status};
  }
  const finished=e=>{if(current && e.action===current.action && !recovery)recover('completed');};
  mixer.addEventListener('finished',finished);
  return {
    get busy(){return Boolean(current)},
    get clip(){return current?.clip||null},
    play(request){
      if(disposed || request.formId!==manifest.formId)return Promise.resolve({status:'unavailable',reason:'form-not-loaded'});
      if(!request.eventId)return Promise.resolve({status:'invalid'});
      if(seen.has(request.eventId))return Promise.resolve({status:'duplicate'});
      seen.set(request.eventId,true);
      if(seen.size>1000)seen.delete(seen.keys().next().value);
      if(request.actionId==='WAIT')return Promise.resolve({status:'completed',clip:'idle',eventId:request.eventId,formId:manifest.formId});
      const spec=ACTION_CATALOG[request.actionId];
      const variant=manifest.variants.find(v=>v.logicalId===spec?.suffix);
      if(!variant||!actions[variant.clip]||variant.requiredBones.some(b=>!bones.has(b)))
        return Promise.resolve({status:'unavailable',reason:'animation-not-loaded'});
      if(current)return Promise.resolve({status:'unavailable',reason:'animation-busy'});
      onStart();mixer.stopAllAction();const incoming=idle();const action=actions[variant.clip];
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(THREE.LoopOnce,1);
      action.clampWhenFinished=true;action.play();if(incoming)action.crossFadeFrom(incoming,.18,false);
      return new Promise(resolve=>{current={action,resolve,clip:variant.clip,eventId:request.eventId};});
    },
    update(dt){if(recovery){recovery.remaining-=dt;if(recovery.remaining<=0){const status=recovery.status;current.action.stop();settle(status);}}},
    stop(){if(current){current.action.stop();idle();settle('interrupted');}},
    dispose(){disposed=true;this.stop();mixer.removeEventListener('finished',finished);},
  };
}
