import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ACTION_CATALOG } from '../../shared/action-catalog.mjs';
import { forms } from '../evolution.mjs';
import { useLanguage } from '../i18n/Language';
import { GEV_PREVIEW_MODEL, requestGevDecision, resolveGevPreviewEndpoint } from '../gev-preview.mjs';

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function GevCloudPreview({ formId, controller, ready }) {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [decision, setDecision] = useState(null);
  const [llmOpen, setLlmOpen] = useState(false);
  const [llmEndpoint, setLlmEndpoint] = useState(() => String(import.meta.env.VITE_LLM_PREVIEW_URL || '').trim());
  const [llmKey, setLlmKey] = useState('');
  const [llmModel, setLlmModel] = useState(() => String(import.meta.env.VITE_LLM_PREVIEW_MODEL || '').trim());
  const [llmText, setLlmText] = useState('');
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmStatus, setLlmStatus] = useState('');
  const [llmOutput, setLlmOutput] = useState('');
  const generation = useRef(0);
  const endpoint = resolveGevPreviewEndpoint();
  const form = forms[formId];
  const localLlm = /^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?\//.test(llmEndpoint.trim());

  useEffect(() => {
    generation.current += 1;
    setBusy(false);
    setStatus('');
    setDecision(null);
    return () => {
      generation.current += 1;
      controller.responsePlayer?.stop();
    };
  }, [formId, controller]);

  async function decide() {
    const prompt = text.trim();
    if (!prompt) {
      setStatus(zh ? '先输入一句话，再让 GEV 做决定' : 'Enter a sentence before asking GEV to decide');
      return;
    }
    if (!endpoint) {
      setStatus(zh ? '云端试玩还没有配置 endpoint' : 'The cloud preview endpoint is not configured');
      return;
    }
    const requestId = createRequestId();
    const gen = generation.current;
    setBusy(true);
    setDecision(null);
    setStatus(zh ? 'GEV 正在选择动作…' : 'GEV is choosing a motion…');
    try {
      const result = await requestGevDecision(endpoint, {
        requestId,
        model: GEV_PREVIEW_MODEL,
        formId,
        text: prompt,
        allowedActions: Object.keys(ACTION_CATALOG).concat('WAIT'),
      });
      if (generation.current !== gen) return;
      setDecision(result);
      if (result.actionId === 'WAIT') {
        setStatus(zh ? 'GEV 选择了等待，牛来保持当前状态' : 'GEV chose to wait; Niulai stays still');
      } else {
        const player = controller.responsePlayer;
        if (!ready || !player || controller.responseForm !== formId) {
          setStatus(zh ? '动作已返回，模型还在加载' : 'The action arrived while the model is loading');
        } else {
          const playback = await player.play({ formId, actionId: result.actionId, eventId: requestId });
          if (generation.current !== gen) return;
          setStatus(playback.status === 'completed'
            ? (zh ? '网页模型已完成演示' : 'The browser model finished the preview')
            : (zh ? '网页模型没有完成这个动作' : 'The browser model could not finish this motion'));
        }
      }
    } catch (error) {
      if (generation.current === gen) setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation.current === gen) setBusy(false);
    }
  }

  async function askOwnLanguageModel() {
    const prompt = llmText.trim() || text.trim();
    if (!llmEndpoint.trim() || (!llmKey.trim() && !localLlm) || !prompt) {
      setLlmStatus(zh ? (localLlm ? '请填写 endpoint 和输入内容' : '请填写 endpoint、API Key 和输入内容') : (localLlm ? 'Add an endpoint and input text' : 'Add an endpoint, API key and input text'));
      return;
    }
    setLlmBusy(true);
    setLlmStatus(zh ? '浏览器正在直连你填写的 endpoint…' : 'The browser is calling your endpoint directly…');
    setLlmOutput('');
    try {
      const response = await fetch(llmEndpoint.trim(), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...(llmKey.trim() ? { authorization: `Bearer ${llmKey.trim()}` } : {}) },
        body: JSON.stringify({
          model: llmModel.trim() || undefined,
          messages: [{ role: 'user', content: `你是${form?.name || '牛来'}的陪伴助手。请回应：${prompt}` }],
        }),
      });
      if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
      const value = await response.json();
      const output = value?.choices?.[0]?.message?.content || value?.output || value?.text;
      if (typeof output !== 'string' || !output.trim()) throw new Error('LLM returned no text');
      setLlmOutput(output.trim().slice(0, 1200));
      setLlmStatus(zh ? (localLlm ? '完成。本地语言模型网关已返回文字。' : '完成。密钥只存在当前浏览器内，没有发送给牛来服务。') : (localLlm ? 'Done. The local language-model gateway returned text.' : 'Done. The key stayed in this browser and was not sent to Cowcoming.'));
    } catch (error) {
      setLlmStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLlmBusy(false);
    }
  }

  return <section className="gev-preview" aria-labelledby="gev-preview-title">
    <div className="gev-preview-heading">
      <div>
        <span className="eyebrow"><Sparkles size={13} /> GEV CLOUD PREVIEW</span>
        <h2 id="gev-preview-title">{zh ? '让 GEV 决定牛来怎么回应' : 'Let GEV choose Niulai’s response'}</h2>
      </div>
      <span className={`gev-endpoint-state ${endpoint ? 'is-ready' : ''}`}>{endpoint ? (zh ? '已配置' : 'READY') : (zh ? '待配置' : 'NOT CONFIGURED')}</span>
    </div>
      <p>{zh
      ? 'GEV 只选择一个已有动作；下面播放仓库里的真实牛来模型。语言模型只生成文字，不参与动作决策，也不会触发机械臂。'
      : 'GEV only selects an existing motion. The real Niulai model from this repository renders it in the browser; the language model only writes text and never controls motion or hardware.'}</p>
    <label className="gev-input-label" htmlFor="gev-preview-input">{zh ? '输入一句话' : 'Say something'}</label>
    <textarea id="gev-preview-input" value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={500} placeholder={zh ? '例如：我今天有点累，陪我安静一会儿。' : 'For example: I am tired today. Stay with me quietly.'} />
    <div className="gev-preview-actions">
      <button type="button" className="gev-primary" disabled={busy} onClick={decide}>{busy ? (zh ? '决策中…' : 'Choosing…') : (zh ? '让 GEV 选择动作' : 'Ask GEV to choose')}</button>
      <span>{form?.name || formId}</span>
    </div>
    <div className="gev-result" role="status" aria-live="polite">
      {decision && <><strong>{decision.actionId === 'WAIT' ? (zh ? '等待' : 'WAIT') : (zh ? ACTION_CATALOG[decision.actionId]?.label : ACTION_CATALOG[decision.actionId]?.en)}</strong><span>{decision.summary || (zh ? '动作由 GEV 返回，网页用原有动作播放器完成演示。' : 'GEV returned the motion and the browser used the existing action player.')}</span></>}
      {status && <small>{status}</small>}
    </div>
    <details className="gev-language-option" open={llmOpen} onToggle={(event) => setLlmOpen(event.currentTarget.open)}>
      <summary>{localLlm ? (zh ? '本地语言模型试玩' : 'Local language-model preview') : (zh ? '可选：在浏览器直连你自己的语言模型' : 'Optional: call your own language model in this browser')}</summary>
      <p>{zh ? '本地测试 endpoint 不需要 Key；填写外部服务时，请只使用你自己的 Key。请求直接从浏览器发到 endpoint，只生成文字，不参与 GEV 动作决策。' : 'The local test endpoint needs no key. For an external service, use your own key; the browser calls it directly and the result never controls GEV motions.'}</p>
      <label htmlFor="gev-llm-endpoint">Endpoint</label>
      <input id="gev-llm-endpoint" value={llmEndpoint} onChange={(event) => setLlmEndpoint(event.target.value)} autoComplete="off" placeholder="https://your-provider.example/v1/chat/completions" />
      <label htmlFor="gev-llm-key">API Key / SDK</label>
      <input id="gev-llm-key" type="password" value={llmKey} onChange={(event) => setLlmKey(event.target.value)} autoComplete="off" placeholder={zh ? '只在当前页面内使用' : 'Used only in this page'} />
      <label htmlFor="gev-llm-model">Model（可选）</label>
      <input id="gev-llm-model" value={llmModel} onChange={(event) => setLlmModel(event.target.value)} autoComplete="off" placeholder="your-model" />
      <textarea value={llmText} onChange={(event) => setLlmText(event.target.value)} rows={2} maxLength={500} placeholder={zh ? '留空则使用上面的输入' : 'Leave blank to reuse the input above'} />
      <button type="button" disabled={llmBusy} onClick={askOwnLanguageModel}>{llmBusy ? (zh ? '请求中…' : 'Calling…') : (zh ? '生成一段文字' : 'Generate text')}</button>
      {llmStatus && <small role="status">{llmStatus}</small>}
      {llmOutput && <blockquote>{llmOutput}</blockquote>}
    </details>
  </section>;
}
