import { Localized, useLanguage } from "../i18n/Language";
import { useState } from 'react';
import ObservationPanel from '../components/ObservationPanel';
import { Controls } from '../components/Chrome';
import { PageLead } from './Portfolio';
import { evolutionRoutes, forms } from '../evolution.mjs';
import EvolutionTree from './EvolutionTree';
import MotionPreview from '../components/MotionPreview';
import EvolutionSettings from '../components/EvolutionSettings';
import { SlidersHorizontal } from 'lucide-react';
import { evolutionStatus } from '../evolution-session.mjs';

export default function Evolution({ controller, live, preview, onSelectRoute, onSelectForm, modelStatus, session, browseRoute }) {
  const { form, placeholder } = preview;
  const route = evolutionRoutes.find(item => item.id === browseRoute) || preview.route;
  const [treeOpen, setTreeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const status = evolutionStatus(session.state);
  return (
    <Localized><>
    <section className="work-page evolution-page page" data-pwc-critical="work">
      <PageLead number="02" title="EVOLUTION">
        Every interaction is a step toward <strong>evolution</strong>.
      </PageLead>

      <aside className="career evolution-timeline" aria-label="Evolution paths">
        <div className="small-heading"><span>EVOLUTION PATH</span><button className="open-atlas" onClick={() => setTreeOpen(true)} aria-haspopup="dialog">VIEW TREE ↗</button></div>
        <div className="evolution-routes" role="group" aria-label="Switch evolution paths">
          {evolutionRoutes.map(item => (
            <button key={item.id} aria-pressed={route.id === item.id} onClick={() => onSelectRoute(item.id)}>{item.name}</button>
          ))}
        </div>
        {live?.snapshot && <div className="live-profile-note"><strong>{t('设备形态', 'Device form')}: {forms[live.snapshot.profile.formId]?.name}</strong><span>{live.snapshot.profile.formId === form.id && live.online && live.snapshot.appliedRevision === live.snapshot.profile.revision ? t('提示词已在电脑端应用', 'Prompt applied on the local computer') : t('等待电脑端同步；当前设备配置尚未确认', 'Waiting for local sync; device configuration is not confirmed')} · v{live.snapshot.profile.revision}</span></div>}
        <p className="evolution-hint">{t('点击形态，亲自决定它现在是谁。', 'Select a form to take control of its evolution.')}</p>
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
        <div className="evolution-selection" aria-live="polite">
          <span className="eyebrow">{t('当前形态', 'CURRENT FORM')} · {form.name}</span>
          <p>{form.description}</p>
          <small>{modelStatus === 'error' ? 'Model unavailable. Return to 小牛.' : modelStatus === 'loading' ? 'Loading form…' : placeholder ? 'Model pending. Showing a reference 牛来.' : 'Showing this form’s model.'}</small>
        </div>
        <MotionPreview controller={controller} formId={form.id} ready={modelStatus==='ready'&&!placeholder} connected={live?.online} />
      </aside>

      <ObservationPanel live={live} />
      <footer className="evolution-footer"><Controls music={false} onExpand={() => setTreeOpen(true)} onReset={session.reset} /><button className="evolution-settings-trigger" aria-label={t('进化设置', 'Evolution settings')} title={t('进化设置', 'Evolution settings')} aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={15} /><i className={status === 'error' || status === 'unconfigured' ? 'needs-setup' : ''} /></button><span role="status">{status === 'manual' ? t('手动形态', 'Manual form') : status === 'terminal' ? t('已到终点 · 重置可返璞归真', 'Final form · reset to begin again') : status === 'unconfigured' ? t('自动进化待配置', 'Automatic evolution needs setup') : status === 'error' ? t('评估未完成 · 在设置中重试', 'Evaluation failed · retry in settings') : t('自动进化', 'Automatic evolution')}</span></footer>
    </section>
    {treeOpen && <EvolutionTree revealed={Object.keys(forms)} selected={form} onSelect={onSelectForm} onClose={() => setTreeOpen(false)} />}
    {settingsOpen && <EvolutionSettings session={session} onClose={() => setSettingsOpen(false)} />}
    </></Localized>
  );
}
