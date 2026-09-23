import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Camera, Check, Clock3, Cpu, MessageSquare, Pause, Play, RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/Language';
import { observationExamples } from './observation-examples.mjs';
import './observation-panel.css';

export default function ObservationPanel() {
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const copy = values => values[language === 'zh' ? 0 : 1];
  const [tab, setTab] = useState('vision');
  const [demo, setDemo] = useState(false);
  const [exampleId, setExampleId] = useState('greeting');
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabs = useRef([]);
  const messages = useRef(null);
  const followReply = useRef(true);
  const example = observationExamples.find(item => item.id === exampleId);
  const finished = elapsed >= 6000;
  const decided = elapsed >= 1200;
  const acknowledged = elapsed >= 3300;
  const reply = copy(example.reply);
  const visibleReply = reply.slice(0, Math.floor(reply.length * Math.min(1, Math.max(0, (elapsed - 700) / 4400))));

  useEffect(() => {
    if (!demo || paused || finished) return;
    // Deliberately scripted playback; switching tabs never restarts this clock.
    const timer = window.setInterval(() => setElapsed(value => Math.min(6000, value + 100)), 100);
    return () => window.clearInterval(timer);
  }, [demo, paused, finished]);

  useEffect(() => {
    if (tab === 'language' && messages.current && followReply.current) {
      messages.current.scrollTop = messages.current.scrollHeight;
    }
  }, [visibleReply, tab]);

  function replay(id = exampleId) {
    setExampleId(id);
    setElapsed(0);
    setPaused(false);
    followReply.current = true;
  }
  function changeSource() {
    setDemo(!demo);
    replay();
  }
  function onTabKey(event, index) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index : null;
    if (next === null) return;
    event.preventDefault();
    setTab(next ? 'language' : 'vision');
    tabs.current[next]?.focus();
  }

  return <aside className={`work-list evolution-technology observation-panel ${demo ? 'is-example' : ''}`} aria-label={t('感知、对话与决策', 'Perception, conversation and decisions')}>
    <div className="observer-heading"><span>TECHNOLOGY</span><span className="observer-source"><i className={demo ? 'example' : ''} />{demo ? t('示例模式', 'EXAMPLE MODE') : t('等待连接', 'NOT CONNECTED')}</span></div>
    <div className="observer-tabs" role="tablist" aria-label={t('切换观察内容', 'Observation view')}>
      {[['vision', 'Vision / Action', Camera], ['language', 'Large Language Model', MessageSquare]].map(([id, label, Icon], index) => <button key={id} ref={el => { tabs.current[index] = el; }} id={`observer-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`observer-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => onTabKey(event, index)}><Icon size={14} /><span>{label}</span></button>)}
    </div>
    <div className="observer-toolbar"><span>{demo ? t('预设案例 · 不控制硬件', 'Scripted example · no hardware control') : t('观察牛来的感知、表达与选择', 'A window into perception, words and choices')}</span><button onClick={changeSource}>{demo ? t('返回实时', 'Back to live') : t('查看示例', 'View examples')}<ArrowUpRight size={12} /></button></div>
    {demo && <div className="observer-examples" role="group" aria-label={t('选择示例', 'Choose an example')}>
      {observationExamples.map(item => <button key={item.id} aria-pressed={exampleId === item.id} onClick={() => replay(item.id)}>{copy(item.label)}</button>)}
      <div className="observer-playback"><button aria-label={finished ? t('重播示例', 'Replay example') : paused ? t('继续示例', 'Resume example') : t('暂停示例', 'Pause example')} onClick={() => finished ? replay() : setPaused(!paused)}>{finished ? <RotateCcw size={13} /> : paused ? <Play size={13} /> : <Pause size={13} />}</button><span>{finished ? '06 / 06' : `${String(Math.floor(elapsed / 1000)).padStart(2, '0')} / 06`}</span></div>
    </div>}
    <div className="work-scroll observer-scroll">
      <section id="observer-vision" role="tabpanel" aria-labelledby="observer-tab-vision" tabIndex={0} hidden={tab !== 'vision'} className="glass observer-view">
        <div className="observer-card-heading"><span>01 / VISION</span><span className="observer-status">{t('相机未连接', 'CAMERA OFFLINE')}</span></div>
        <div className="vision-placeholder observer-camera"><div className="vision-focus"><Camera size={25} strokeWidth={1.2} /></div><span>{t('等待摄像头画面', 'Waiting for a camera')}</span><small>{demo ? t('示例仅模拟文本与状态，不含实时画面', 'Examples simulate text and state, without a camera feed') : t('连接后，在这里查看牛来的视角', 'Its view of the world will appear here once connected')}</small></div>
        <div className="observer-vision-foot"><div><h2>{t('它看见的世界', 'Through its eyes')}</h2><p>{t('感知提供信息，JEV 选择动作。', 'Perception informs. JEV chooses the action.')}</p></div><span>CAMERA → JEV</span></div>
        <div className="observer-action"><span>{t('动作回执', 'ACTION FEEDBACK')}</span><p>{demo ? acknowledged ? copy(example.receipt) : t('示例：等待执行状态…', 'Example: awaiting execution status…') : t('暂无设备回执', 'No device feedback yet')}</p></div>
      </section>

      <section id="observer-language" role="tabpanel" aria-labelledby="observer-tab-language" tabIndex={0} hidden={tab !== 'language'} className="glass observer-view observer-conversation">
        <div className="observer-card-heading"><span>01 / LANGUAGE</span><span className={`observer-status ${demo ? 'example' : ''}`}>{demo ? paused ? t('示例已暂停', 'EXAMPLE PAUSED') : finished ? t('示例结束', 'EXAMPLE COMPLETE') : t('示例输出中', 'EXAMPLE PLAYBACK') : t('未连接', 'NOT CONNECTED')}</span></div>
        <div className="observer-language-title"><h2>{t('听见它想说的话', 'A little window into its words.')}</h2><p>{t('语言表达，与动作决策各自运行。', 'Conversation runs independently of action decisions.')}</p></div>
        {demo ? <div className="observer-messages" ref={messages} onScroll={event => { const el = event.currentTarget; followReply.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}>
          <div className="observer-message"><span className="observer-avatar">YOU</span><div><span className="observer-message-label">{t('输入', 'INPUT')}<small>{t('预设文本', 'SCRIPTED')}</small></span><p>{copy(example.input)}</p></div></div>
          <div className="observer-message observer-reply"><span className="observer-avatar">LLM</span><div><span className="observer-message-label">{t('牛来', 'NIULAI')}<small>{t('示例回复', 'EXAMPLE REPLY')}</small></span><p aria-hidden="true">{visibleReply || '…'}{!finished && !paused && <span className="observer-caret" />}</p><span className="observer-sr" role="status">{finished ? reply : t('示例回复播放中', 'Example reply playing')}</span></div></div>
        </div> : <div className="observer-empty"><MessageSquare size={24} strokeWidth={1.2} /><strong>{t('等待对话接入', 'Waiting for a conversation')}</strong><p>{t('接入模型文本流后，这里显示输入和回复。', 'Input and replies will appear here once a model stream is connected.')}</p><button onClick={() => { setDemo(true); replay(); }}>{t('播放一段示例对话', 'Play an example conversation')}<Play size={12} /></button></div>}
        <div className="observer-language-foot"><span><i />{demo ? t('预设文本流', 'SCRIPTED TEXT STREAM') : t('文本流尚未接入', 'TEXT STREAM NOT CONNECTED')}</span><span>{t('只读观察', 'READ ONLY')}</span></div>
      </section>

      <section className="glass observer-jev" aria-label={t('JEV 决策', 'JEV decisions')}>
        <div className="observer-jev-heading"><div className="observer-jev-icon"><Cpu size={19} strokeWidth={1.3} /></div><div><h2>JEV <span>{t('决策', 'DECISION')}</span></h2><p>{t('决定下一步动作', 'Choosing the next move')}</p></div><span className={`observer-status ${demo ? 'example' : ''}`}>{demo ? t('示例', 'EXAMPLE') : t('未连接', 'NOT CONNECTED')}</span></div>
        {demo ? <>
          <div className="observer-perception"><span>{t('感知摘要', 'OBSERVATION')}</span><p>{copy(example.observation)}</p></div>
          <div className="observer-choice"><div><span>{t('选择的动作', 'SELECTED ACTION')}</span><strong>{decided ? copy(example.actionLabel) : t('正在选择…', 'Choosing…')}</strong></div><code>{decided ? example.action : '···'}</code></div>
          <p className="observer-reason">{decided ? copy(example.summary) : t('示例：读取事件和可用行为。', 'Example: reading the event and available behaviors.')}</p>
          <div className={`observer-receipt ${exampleId === 'offline' ? 'waiting' : ''}`}>{acknowledged && exampleId !== 'offline' ? <Check size={12} /> : <Clock3 size={12} />}<span>{acknowledged ? copy(example.receipt) : t('示例：尚无执行回执', 'Example: no execution receipt yet')}</span></div>
        </> : <div className="observer-jev-empty"><p>{t('等待感知事件与决策状态', 'Waiting for perception and decisions')}</p><span>{t('连接后显示：感知摘要 → 动作选择 → 执行回执', 'Once connected: observation → action choice → device feedback')}</span></div>}
        <div className="observer-jev-foot"><span>JEV → {t('本机控制', 'LOCAL CONTROL')} → {t('回执', 'FEEDBACK')}</span><span>{t('独立于 LLM', 'INDEPENDENT OF LLM')}</span></div>
      </section>
      <p className="observer-note">{demo ? t('以上是预设演示，非模型实时推理或真实执行记录。', 'Authored demonstration, not live inference or actual device activity.') : t('相机、LLM、JEV 的连接状态分别显示。', 'Camera, LLM and JEV report their connection states separately.')}</p>
    </div>
  </aside>;
}
