import { useEffect, useRef } from 'react';
import { Check, X, LoaderCircle, UsersRound } from 'lucide-react';
import { useLanguage } from '../i18n/Language';
import { ipCatalog } from '../ip-catalog.mjs';
import './ip-switcher.css';

export default function IpSwitcher({ selection, onClose }) {
  const ref = useRef(), { language } = useLanguage(), english = language === 'en';
  const opener = useRef(document.activeElement);
  const t = (zh, en) => english ? en : zh;
  useEffect(() => { const d = ref.current; d.showModal(); return () => { d.close(); queueMicrotask(() => { if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }); }; }, []);
  return <dialog ref={ref} id="ip-switcher" className="ip-switcher" aria-labelledby="ip-switcher-title"
    onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="ip-switcher-heading"><div><span><UsersRound size={14} /> COWCOMING</span><h2 id="ip-switcher-title">{t('今天，和谁玩？', 'Who’s here today?')}</h2></div><button autoFocus onClick={onClose} aria-label={t('关闭 IP 切换', 'Close IP switcher')}><X size={18} /></button></div>
    <p className="ip-switcher-intro">{t('选择角色，进入互动。', 'Choose a character and start playing.')}</p>
    <div className="ip-options">
      {ipCatalog.map(ip => { const current = selection.active === ip.id, loading = selection.pending?.ip.id === ip.id;
        return <button key={ip.id} className={`ip-option ${current ? 'is-current' : ''}`} data-ip={ip.id}
          disabled={!ip.available} aria-pressed={current} onClick={() => selection.select(ip.id)}>
          <span className={`ip-avatar ip-avatar-${ip.id}`}>{ip.thumbnail ? <img src={ip.thumbnail} alt="" /> : ip.initial}</span>
          <span className="ip-option-copy"><strong>{english ? ip.nameEn : ip.name}</strong><small>{!ip.available ? t('模型待接入', 'Coming soon') : loading ? t('正在准备…', 'Getting ready…') : t(...ip.description)}</small></span>
          {loading ? <LoaderCircle className="ip-loading" size={17} /> : current ? <Check size={17} aria-label={t('当前角色', 'Current character')} /> : ip.available ? <span aria-hidden="true">↗</span> : null}
        </button>;
      })}
    </div>
    {selection.error && <p className="ip-load-error" role="alert">{t('暂时没能加载，已保留当前角色。', 'Couldn’t load this character. Your current one is still here.')} <button onClick={() => selection.select(selection.error)}>{t('重试', 'Retry')}</button></p>}
    <p className="ip-switcher-note" role="status">{selection.pending ? t('准备好后会自动切换，你也可以先关闭。', 'We’ll switch when ready. You can close to cancel.') : t('切换 IP 不会重置牛来的成长。', 'Switching IPs keeps Niulai’s progress.')}</p>
  </dialog>;
}
