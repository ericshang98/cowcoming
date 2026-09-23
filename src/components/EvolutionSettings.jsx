import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../i18n/Language';
import { evolutionStatus, validateSettings } from '../evolution-session.mjs';

export default function EvolutionSettings({ session, onClose }) {
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const { state, dispatch } = session;
  const [draft, setDraft] = useState(state.settings);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current.showModal();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  const status = evolutionStatus(state);
  const statusText = {
    manual: t('手动模式 · 点击左侧选择形态', 'Manual · select a form on the left'),
    terminal: t('已到终点 · 点击重置，返璞归真', 'Final form · reset to begin again'),
    unconfigured: t('评估接口未配置 · 暂不自动进化', 'Evaluator not configured · automatic evolution unavailable'),
    idle: t('等待完整对话', 'Waiting for completed turns'),
    evaluating: t('正在评估本次培养的完整会话…', 'Evaluating the complete session…'),
    error: t('评估未完成 · 形态和会话已保留，可重试', 'Evaluation failed · form and history preserved; retry available'),
  }[status];
  function save(event) {
    event.preventDefault();
    try { const settings = validateSettings(draft); dispatch({ type: 'settings', settings }); onClose(); }
    catch { setError(t('轮数须为 1–100 的整数；接口使用 HTTPS 或站内路径，不包含密钥或查询参数。', 'Use 1–100 whole turns and an HTTPS URL or site-relative path without credentials or query parameters.')); }
  }
  return createPortal(<dialog ref={dialog} className="evolution-settings" aria-labelledby="evolution-settings-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}>
    <header><div><span className="eyebrow">EVOLUTION</span><h2 id="evolution-settings-title">{t('生长节奏', 'Growth at your pace')}</h2></div><button type="button" onClick={onClose} aria-label={t('关闭进化设置', 'Close evolution settings')} autoFocus><X size={20} /></button></header>
    <form onSubmit={save}>
      <p>{t('让它慢慢长大，也可以亲自决定它现在是谁。', 'Let it grow through conversation, or choose who it becomes.')}</p>
      <label>{t('进化方式', 'Evolution mode')}<select value={draft.mode} onChange={event => setDraft({ ...draft, mode: event.target.value })}><option value="auto">{t('自动 · 按对话评估', 'Automatic · evaluate conversations')}</option><option value="manual">{t('手动 · 自由切换形态', 'Manual · choose any form')}</option></select></label>
      <label>{t('每几轮评估一次', 'Evaluate every N turns')}<input type="number" min="1" max="100" step="1" required value={draft.interval} onChange={event => setDraft({ ...draft, interval: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
      <div className="evolution-presets">{[5, 10].map(n => <button type="button" key={n} aria-pressed={draft.interval === n} onClick={() => setDraft({ ...draft, interval: n })}>{n} {t('轮', 'turns')}</button>)}</div>
      <p className="evolution-rule">{t('一轮 = 你说一次 + 牛来完成一次回应（也可以只做动作）。满轮后，评估模型读取从本次重置开始的完整会话，决定保持或沿树前进一步；不保证升级。', 'One turn = your input + one completed response, including an action-only reply. At each interval, the evaluator reads the entire session since reset and decides whether to stay or advance one step.')}</p>
      <label>{t('评估模型', 'Evaluation model')}<input value={draft.model} maxLength={200} placeholder={t('填写网关支持的模型 ID', 'Model ID supported by your gateway')} onChange={event => setDraft({ ...draft, model: event.target.value })} /></label>
      <label>{t('评估 API 地址', 'Evaluation API URL')}<input value={draft.endpoint} placeholder="/api/evolution/evaluate" onChange={event => setDraft({ ...draft, endpoint: event.target.value })} spellCheck={false} /></label>
      <p className="evolution-rule">{t('此地址须实现进化评估接口，并会接收本次完整会话；模型密钥由该网关保管，不填在这里。未配置时仍可手动切换。', 'This gateway must implement the evolution contract and will receive the full session. It owns model credentials; do not enter keys here. Manual selection works without configuration.')}</p>
      <div className="evolution-evaluation-status" role="status"><strong>{statusText}</strong><span>{t('本周期已完成', 'Completed this interval')}: {state.turns.length - state.checkpoint} / {state.settings.interval}</span>{state.reason && <p>{status === 'error' ? t('请检查接口配置和连接后重试。', 'Check the gateway and connection, then retry.') : state.reason}</p>}{status === 'error' && <button type="button" onClick={() => dispatch({ type: 'retry' })}>{t('重试评估', 'Retry evaluation')}</button>}</div>
      <p className="evolution-rule">{t('保存设置会从零重新计轮，完整会话保留。手动选形态会关闭自动进化。终点停留，重置才回到小牛。', 'Saving restarts the interval and keeps the full conversation. Selecting a form switches to manual mode. Final forms remain until you reset.')}</p>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>{t('取消', 'Cancel')}</button><button type="submit">{t('保存设置', 'Save settings')}</button></footer>
    </form>
  </dialog>, document.body);
}
