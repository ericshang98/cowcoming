import { Localized, useLanguage } from "../i18n/Language";
import { useState } from 'react';
import ObservationPanel from '../components/ObservationPanel';
import { Controls } from '../components/Chrome';
import { PageLead } from './Portfolio';
import { evolutionRoutes, forms, isFormRevealed } from '../evolution.mjs';
import EvolutionTree from './EvolutionTree';

export default function Evolution({ live, preview, onSelectRoute, onSelectForm, modelStatus }) {
  const { route, form, placeholder } = preview;
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const revealed = live?.snapshot?.revealed;
  const known = id => isFormRevealed(id, revealed);
  const currentForm = live?.snapshot?.profile.formId;
  const [treeOpen, setTreeOpen] = useState(false);
  return (
    <Localized><>
    <section className="work-page evolution-page page" data-pwc-critical="work">
      <PageLead number="02" title="EVOLUTION">
        Every interaction is a step toward <strong>evolution</strong>.
      </PageLead>

      <aside className="career evolution-timeline" aria-label="Evolution paths">
        <div className="small-heading"><span>EVOLUTION PATH</span><button className="open-atlas" onClick={() => setTreeOpen(true)} aria-haspopup="dialog">VIEW TREE ↗</button></div>
        {evolutionRoutes.some(item => item.nodes.slice(2).some(id => known(id))) && <div className="evolution-routes" role="group" aria-label="Switch evolution paths">
          {evolutionRoutes.map((item, index) => (
            <button key={item.id} aria-pressed={route.id === item.id} onClick={() => onSelectRoute(item.id)}>{known(item.nodes.at(-1)) ? item.name : `Path ${index + 1}`}</button>
          ))}
        </div>}
        {live?.snapshot && <div className="live-profile-note"><strong>{t("云端形态", "Cloud form")}: {live.snapshot.profile.formId === form.id ? form.name : t("正在预览其他形态", "Previewing another form")}</strong><span>{live.online && live.snapshot.appliedRevision === live.snapshot.profile.revision ? t("提示词已在电脑端应用", "Prompt applied on the local computer") : t("等待电脑端应用提示词", "Waiting for the local process to apply the prompt")} · v{live.snapshot.profile.revision}</span><br /><span>{t("手动调试 · 自动进化尚未启用", "Manual lab · automatic evolution is off")}</span>{form.id !== currentForm && <button onClick={() => onSelectForm(currentForm)}>{t("返回当前形态", "Back to current form")}</button>}</div>}
        <p className="evolution-hint">Your path unfolds as you grow.</p>
        <ol>
          {route.nodes.map((id, index) => (
            <li key={id} className={form.id === id ? 'current' : ''}>
              <button className="evolution-node" disabled={!known(id)} aria-pressed={form.id === id} onClick={() => onSelectForm(id)}>
                <span>{String(index + 1).padStart(2, '0')} / {!known(id) ? 'UNKNOWN' : id === 'calf' ? 'ORIGIN' : 'NEXT FORM'}</span>
                <strong>{known(id) ? forms[id].name : 'Undiscovered'}</strong>
                <small>{!known(id) ? 'Not yet revealed' : forms[id].model ? 'Preview form' : 'Model pending'}</small>
              </button>
            </li>
          ))}
        </ol>
        <div className="evolution-selection" aria-live="polite">
          <span className="eyebrow">PREVIEW · {form.name}</span>
          <p>{form.description}</p>
          <small>{modelStatus === 'error' ? 'Model unavailable. Return to 小牛.' : modelStatus === 'loading' ? 'Loading form…' : placeholder ? 'Model pending. Showing a reference 牛来.' : 'Showing this form’s model.'}</small>
        </div>
        {form.id !== 'calf' && <button className="evolution-reset" onClick={() => onSelectForm('calf')}>Back to 小牛 ↗</button>}
      </aside>

      <ObservationPanel live={live} />
      <footer className="evolution-footer"><Controls music={false} onExpand={() => setTreeOpen(true)} /><span>{live?.snapshot ? t("形态模型待补齐 · 当前使用参考模型", "Form assets pending · reference model on stage") : "Preview only · Hardware state is unchanged"}</span></footer>
    </section>
    {treeOpen && <EvolutionTree revealed={revealed} selected={form} onSelect={onSelectForm} onClose={() => setTreeOpen(false)} />}
    </></Localized>
  );
}
