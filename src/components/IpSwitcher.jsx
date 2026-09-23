import { useEffect, useRef } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { useLanguage } from '../i18n/Language';
import { ipCatalog } from '../ip-catalog.mjs';
import './ip-switcher.css';

export default function IpSwitcher({ selection, onClose }) {
  const ref = useRef(), { language } = useLanguage(), english = language === 'en';
  const opener = useRef(document.activeElement), close = useRef(onClose);
  close.current = onClose;
  const t = (zh, en) => english ? en : zh;
  useEffect(() => {
    const dialog = ref.current, trigger = opener.current;
    const place = () => {
      const anchor = trigger?.getBoundingClientRect();
      const width = dialog.getBoundingClientRect().width;
      const left = Math.max(10, Math.min(innerWidth - width - 10, (anchor?.left || 10) - 16));
      dialog.style.left = `${left}px`;
      dialog.style.top = `${(anchor?.bottom || 60) + 12}px`;
      dialog.style.setProperty('--ip-arrow', `${Math.max(22, Math.min(width - 22, (anchor?.left || 10) + (anchor?.width || 32) / 2 - left))}px`);
    };
    dialog.show(); place();
    dialog.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
    const outside = e => { if (!dialog.contains(e.target) && !trigger?.contains(e.target)) close.current(); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close.current(); }
      if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) {
        const buttons = [...dialog.querySelectorAll('[data-ip]')];
        const i = buttons.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
      }
    };
    const leave = e => { if (!dialog.contains(e.target) && e.target !== trigger) close.current(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', leave);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key, true);
      document.removeEventListener('focusin', leave); window.removeEventListener('resize', place); dialog.close();
      // Don't steal focus from a field the user deliberately clicked outside.
      if (!document.activeElement || document.activeElement === document.body || dialog.contains(document.activeElement))
        queueMicrotask(() => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); });
    };
  }, []);
  return <dialog ref={ref} id="ip-switcher" className="ip-switcher" aria-label={t('切换 IP', 'Switch IP')}>
    <div className="ip-options">
      {ipCatalog.map(ip => {
        const current = selection.active === ip.id, loading = selection.pending?.ip.id === ip.id;
        const name = english ? ip.nameEn : ip.name;
        return <button key={ip.id} className={`ip-option ${current ? 'is-current' : ''}`} data-ip={ip.id}
          aria-label={name} aria-pressed={current} aria-busy={loading} onClick={() => selection.select(ip.id)}>
          <span className={`ip-avatar ip-avatar-${ip.id}`}><img src={ip.thumbnail} alt="" />
            {loading ? <span className="ip-avatar-state"><LoaderCircle className="ip-loading" size={19} /></span> : current ? <span className="ip-selected"><Check size={10} strokeWidth={3}/></span> : null}
          </span>
          <span className="ip-name">{name}</span>
        </button>;
      })}
    </div>
    {selection.pending && <p className="ip-loading-note" role="status">{t('正在准备…', 'Getting ready…')}</p>}
    {selection.error && <p className="ip-load-error" role="alert">{t('加载失败，当前角色未变。', 'Couldn’t load. Your character is unchanged.')} <button onClick={() => selection.select(selection.error)}>{t('重试', 'Retry')}</button></p>}
  </dialog>;
}
