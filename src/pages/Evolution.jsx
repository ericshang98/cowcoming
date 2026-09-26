import { Localized, useLanguage } from "../i18n/Language";
import { useRef, useState } from 'react';
import ObservationPanel from '../components/ObservationPanel';
import { Controls } from '../components/Chrome';
import { PageLead } from './Portfolio';
import { evolutionRoutes, forms } from '../evolution.mjs';
import EvolutionTree from './EvolutionTree';
import EvolutionSettings from '../components/EvolutionSettings';
import { browserTuningStorage, loadTuning } from '../live/motion-tuning.mjs';
import { SlidersHorizontal } from 'lucide-react';
import BindingGate from '../live/BindingGate';
import { evolutionStatus } from '../evolution-session.mjs';

function growthStepLabel(state, status, t) {
  if (status === 'manual') return t('手动选择形态', 'Manual form selection');
  if (status === 'terminal') return t('当前形态已到终点', 'Current form is a terminal stage');
  if (status === 'evaluating') return t('正在读取完整互动记录', 'Reading the completed interaction record');
  if (status === 'error') return t('本轮评估未完成', 'This evaluation did not complete');
  return t('积累互动，准备下一次评估', 'Collecting interactions for the next evaluation');
}

function growthStepDescription(state, status, t) {
  const completed = Math.max(0, state.turns.length - state.checkpoint);
  const interval = state.settings.interval;
  if (status === 'manual') return t('正常对话仍由 JEV 从桌面宠物动作目录中选择；形态由你在图鉴中明确选择。', 'JEV still chooses from the desktop-pet behavior catalog during normal conversation; you choose the form explicitly in the atlas.');
  if (status === 'terminal') return t('仙牛和暗黑牛没有自动后继；重置后才会从小牛重新开始。', 'Celestial and dark have no automatic successor; reset starts again from calf.');
  if (status === 'evaluating') return t(`已完成 ${completed} 次互动，评估器正在决定保持当前形态还是沿合法分支前进。`, `${completed} interactions are complete. The evaluator is deciding whether to stay or take one legal branch step.`);
  if (status === 'error') return t('对话记录保留，进入设置重试不会重复计轮，也不会伪造进化。', 'The conversation record is kept. Retry in Settings without recounting turns or faking an evolution.');
  if (status === 'unconfigured') return t(`已完成 ${completed} / ${interval} 次完整互动；配置评估网关后才会真正请求模型。`, `${completed} / ${interval} complete interactions; the evaluator is requested only after a gateway is configured.`);
  return t(`已完成 ${completed} / ${interval} 次完整互动；达到周期后评估一次，不保证一定进化。`, `${completed} / ${interval} complete interactions; one evaluation runs at the interval and evolution is not guaranteed.`);
}

export default function Evolution({ controller, live, preview, onSelectRoute, onSelectForm, modelStatus, session, browseRoute }) {
  const { form, placeholder } = preview;
  const motionLab = new URLSearchParams(window.location.search).get("motionLab") === "1";
  const route = evolutionRoutes.find(item => item.id === browseRoute) || preview.route;
  const [treeOpen, setTreeOpen] = useState(false);
  const atlasOpener = useRef(null);
  const [atlasView, setAtlasView] = useState('tree');
  const openAtlas = (view = 'tree', opener = document.activeElement) => { atlasOpener.current = opener; setAtlasView(view); setTreeOpen(true); };
  const closeAtlas = () => { setTreeOpen(false); controller.motionTuning = loadTuning(browserTuningStorage()).document; };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const status = evolutionStatus(session.state);
  const atlas = treeOpen && <EvolutionTree selected={form} onSelect={onSelectForm} canSelect={Boolean(live?.online)} initialView={atlasView} returnFocus={atlasOpener.current} onClose={closeAtlas} />;
  const debugButton = <button className="evolution-debug-toggle glass" aria-haspopup="dialog" onClick={event => openAtlas('model', event.currentTarget)}><SlidersHorizontal size={13} />{t('调试模式', 'Debug mode')}</button>;
  if (!live?.online) return <><BindingGate live={live} onOpenAtlas={event => openAtlas('tree', event.currentTarget)} onOpenSettings={() => setSettingsOpen(true)} settingsNeedsSetup={status === 'unconfigured' || status === 'error'} formId={form.id} onSelectForm={onSelectForm} controller={controller} ready={modelStatus === 'ready' && !placeholder} />{debugButton}{atlas}{settingsOpen && <EvolutionSettings session={session} onClose={() => setSettingsOpen(false)} />}</>;
  return (
    <Localized><>
    <section className="work-page evolution-page page" data-pwc-critical="work">
      <PageLead number="02" title="EVOLUTION">
        Every interaction is a step toward <strong>evolution</strong>.
      </PageLead>

      <aside className="career evolution-timeline" aria-label="Evolution paths">
        <div className="small-heading"><span>EVOLUTION PATH</span><button className="open-atlas" onClick={event => openAtlas('tree', event.currentTarget)} aria-haspopup="dialog">VIEW TREE ↗</button></div>
        {!motionLab && <div className="evolution-routes" role="group" aria-label="Switch evolution paths">
          {evolutionRoutes.map(item => (
            <button key={item.id} aria-pressed={route.id === item.id} onClick={() => onSelectRoute(item.id)}>{item.name}</button>
          ))}
        </div>
        }
        {!motionLab && live?.snapshot && <div className="live-profile-note"><strong>{t('设备形态', 'Device form')}: {forms[live.snapshot.profile.formId]?.name}</strong><span>{live.snapshot.profile.formId === form.id && live.online && live.snapshot.appliedRevision === live.snapshot.profile.revision ? t('提示词已在电脑端应用', 'Prompt applied on the local computer') : t('等待电脑端同步；当前设备配置尚未确认', 'Waiting for local sync; device configuration is not confirmed')} · v{live.snapshot.profile.revision}</span></div>}
        {motionLab && <label className="motion-form-select">{t('选择调试形态', 'Choose a form')}
          <select aria-label={t('选择调试形态', 'Choose a form')} value={form.id} onChange={e => onSelectForm(e.target.value)}>
            {Object.values(forms).map(item => <option key={item.id} value={item.id} disabled={!item.model}>{item.name}{!item.model ? t(' · 模型待补充', ' · Model pending') : ''}</option>)}
          </select>
        </label>}
        {!motionLab && <><p className="evolution-hint">{t('点击形态，亲自决定它现在是谁。', 'Select a form to take control of its evolution.')}</p>
        <ol>
          {route.nodes.map((id, index) => (
            <li key={id} className={form.id === id ? 'current' : ''}>
              <button className="evolution-node" aria-pressed={form.id === id} onClick={() => onSelectForm(id)}>
                <span>{String(index + 1).padStart(2, '0')} / {id === 'calf' ? 'ORIGIN' : 'NEXT FORM'}</span>
                <strong>{forms[id].name}</strong>
                <small>{forms[id].model ? t('角色已就绪', 'Form available') : 'Model pending'}</small>
              </button>
            </li>
          ))}
        </ol>
        </>}
        {!motionLab && <div className="evolution-selection" aria-live="polite">
          <span className="eyebrow">{t('当前形态', 'CURRENT FORM')} · {form.name}</span>
          <p>{form.description}</p>
          <small>{modelStatus === 'error' ? 'Model unavailable. Return to 小牛.' : modelStatus === 'loading' ? 'Loading form…' : placeholder ? 'Model pending. Showing a reference 牛来.' : 'Showing this form’s model.'}</small>
        </div>
        }
        <div className="evolution-step" aria-live="polite">
          <span className="eyebrow">{t('当前进化步骤', 'CURRENT GROWTH STEP')}</span>
          <strong>{growthStepLabel(session.state, status, t)}</strong>
          <p>{growthStepDescription(session.state, status, t)}</p>
        </div>
      </aside>

      <ObservationPanel live={live} />
      <footer className="evolution-footer"><Controls music={false} onExpand={event => openAtlas('tree', event.currentTarget)} onReset={session.reset} /><button className="evolution-settings-trigger" aria-label={t('进化设置', 'Evolution settings')} title={t('进化设置', 'Evolution settings')} aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={15} /><i className={status === 'error' || status === 'unconfigured' ? 'needs-setup' : ''} /></button><span role="status">{status === 'manual' ? t('手动形态', 'Manual form') : status === 'terminal' ? t('已到终点 · 重置可返璞归真', 'Final form · reset to begin again') : status === 'unconfigured' ? t('自动进化待配置', 'Automatic evolution needs setup') : status === 'error' ? t('评估未完成 · 在设置中重试', 'Evaluation failed · retry in settings') : t('自动进化', 'Automatic evolution')}</span></footer>
    </section>
    {debugButton}{atlas}
    {settingsOpen && <EvolutionSettings session={session} onClose={() => setSettingsOpen(false)} />}
    </></Localized>
  );
}
