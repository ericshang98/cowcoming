import { Localized } from "../i18n/Language";
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Box, LockKeyhole, X } from 'lucide-react';
import { ancestry, evolutionEdges, forms, isFormRevealed, revealedForms } from '../evolution.mjs';

const connections = {
  normal: 'M400 134V166',
  playful: 'M400 300V316H200V332',
  tough: 'M400 300V316H600V332',
  celestial: 'M200 466V498',
  dark: 'M600 466V498',
};
const stages = ['ORIGIN', 'SHARED FORM', 'BRANCH', 'NEXT FORM'];

export default function EvolutionTree({ selected, onSelect, onClose, revealed = revealedForms }) {
  const dialogRef = useRef(null);
  const path = ancestry(selected.id);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <Localized><dialog
      id="evolution-atlas"
      className="evolution-atlas"
      ref={dialogRef}
      aria-labelledby="evolution-atlas-title"
      aria-describedby="evolution-atlas-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClose={onClose}
      onKeyDown={event => event.stopPropagation()}
    >
      <header className="atlas-header">
        <div>
          <span className="eyebrow">牛来 / EVOLUTION ATLAS</span>
          <h1 id="evolution-atlas-title">Choose your next form.</h1>
          <p id="evolution-atlas-description">Select any form to switch to manual evolution.</p>
        </div>
        <button className="atlas-close glass" aria-label="Close evolution tree" onClick={onClose} autoFocus><X size={20} /></button>
      </header>
      <div className="atlas-scroll">
        <div className="atlas-tree" role="group" aria-label="Evolution paths">
          <svg className="atlas-connections" viewBox="0 0 800 632" preserveAspectRatio="none" aria-hidden="true">
            {evolutionEdges.map(edge => <path key={edge.to} d={connections[edge.to]} className={!isFormRevealed(edge.to, revealed) ? 'undiscovered' : path.includes(edge.to) ? 'on-path' : ''} />)}
          </svg>
          {Object.values(forms).map(form => !isFormRevealed(form.id, revealed) ? (
            <div key={form.id} className="atlas-node glass atlas-undiscovered" aria-hidden="true"
              style={{ gridRow: form.depth + 1, gridColumn: form.branch === 'celestial' ? '1' : '2' }}>
              <span className="atlas-model-slot"><Box size={29} strokeWidth={1} /></span>
              <strong>?</strong><span className="atlas-model-label">Undiscovered</span>
            </div>
          ) : (
            <button
              key={form.id}
              className={`atlas-node glass ${path.includes(form.id) ? 'on-path' : ''}`}
              style={{ gridRow: form.depth + 1, gridColumn: form.branch ? form.branch === 'celestial' ? '1' : '2' : '1 / -1' }}
              aria-label={`${form.name}`}
              aria-pressed={selected.id === form.id}
              onClick={() => onSelect(form.id)}
            >
              <span className="atlas-node-top"><span>{String(form.depth + 1).padStart(2, '0')}</span><span>{stages[form.depth]}</span></span>
              <span className="atlas-model-slot" aria-hidden="true">
                {form.thumbnail ? <img src={form.thumbnail} alt="" /> : <Box size={29} strokeWidth={1} />}
              </span>
              <strong>{form.name}</strong>
              <span className="atlas-model-label">{form.model ? 'Model available' : 'Model pending'}</span>
            </button>
          ))}
          {Object.values(forms).filter(form => form.depth >= 2).every(form => !isFormRevealed(form.id, revealed)) && <div className="atlas-mist">
            <div><LockKeyhole size={22} strokeWidth={1.2} /><h2>Still undiscovered</h2><p>Your story is still unfolding.</p></div>
          </div>}
        </div>
      </div>
      <footer className="atlas-footer">
        <div className="atlas-selection" aria-live="polite">
          <span className="eyebrow">SELECTED FORM</span>
          <strong>{selected.name}</strong>
          <p>{path.map(id => forms[id].name).join(' → ')}</p>
        </div>
        <div className="atlas-footer-actions">
          <span>{selected.model ? 'Ready to preview' : 'Model placeholder · Asset to come'}</span>
          <button className="atlas-preview glass" onClick={onClose}>Return to stage <ArrowUpRight size={15} /></button>
        </div>
      </footer>
    </dialog></Localized>,
    document.body,
  );
}
