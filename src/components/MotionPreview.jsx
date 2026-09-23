import { useEffect, useRef, useState } from 'react';
import { ACTION_CATALOG } from '../../shared/action-catalog.mjs';
import { useLanguage } from '../i18n/Language';
export default function MotionPreview({controller,formId,ready,connected}) {
  const {language}=useLanguage(),zh=language==='zh';
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);const generation=useRef(0);
  useEffect(()=>{generation.current++;setStatus('');setBusy(false);return()=>{generation.current++;controller.responsePlayer?.stop();};},[formId,controller]);
  async function play(actionId){
    const gen=generation.current,player=controller.responsePlayer;
    if(!player||controller.responseForm!==formId){setStatus(zh?'当前形态动画未就绪':'This form’s animation is unavailable.');return;}
    setBusy(true);setStatus(zh?'正在播放':'Playing');
    const result=await player.play({formId,actionId,eventId:crypto.randomUUID()});
    if(generation.current!==gen)return;
    setBusy(false);setStatus(result.status==='completed'?(zh?'软件演示完成':'Software preview complete'):result.status==='interrupted'?(zh?'已停止':'Stopped'):(zh?'动画暂不可用':'Animation unavailable'));
  }
  return <details className="motion-preview"><summary>{zh?'动作预览 · 仅软件':'Motion preview · software only'}</summary>
    <div className="motion-preview-actions">{Object.entries(ACTION_CATALOG).map(([id,a])=><button key={id} data-motion={id} disabled={!ready||busy} onClick={()=>play(id)}>{zh?a.label:a.en}</button>)}</div>
    <button disabled={!busy} onClick={()=>controller.responsePlayer?.stop()}>{zh?'停止预览':'Stop preview'}</button>
    <small role="status">{status||(!ready?(zh?'模型或动作资源未就绪':'Model or animations not ready'):(zh?'不控制机械臂，不记录进化。':'No hardware control or evolution record.'))}</small>
  </details>;
}
