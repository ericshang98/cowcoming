import { Link2, LockKeyhole } from 'lucide-react';
import { Localized, useLanguage } from '../i18n/Language';
import { PageLead } from '../pages/Portfolio';
import ConnectionBar from './ConnectionBar';
import GuestPreview from './GuestPreview';
import GevCloudPreview from './GevCloudPreview';

export default function BindingGate({ live, onOpenAtlas, onOpenSettings, settingsNeedsSetup, formId, onSelectForm, controller, ready }) {
  const { language } = useLanguage();
  const t = (zh, en) => language === 'zh' ? zh : en;
  const waiting = live.status === 'connected' && live.snapshot;
  const reconnecting = live.status === 'reconnecting';
  return <Localized><section className="work-page evolution-page page binding-page" data-pwc-critical="work">
    <PageLead number="02" title="EVOLUTION">{t('先连接你的牛来，再一起进化。', 'Connect your Niulai to begin growing together.')}</PageLead>
    <aside className="career binding-summary">
      <LockKeyhole size={20} strokeWidth={1.3} />
      <h2>{t('进化从连接开始', 'Evolution starts with a connection')}</h2>
      <p>{t('绑定并连接电脑后，进化形态、相机画面与回应都会属于同一只牛来。', 'Once your computer is bound and online, evolution, camera and responses belong to the same Niulai.')}</p>
      <button className="binding-atlas-link" onClick={onOpenAtlas} aria-haspopup="dialog">{t('先看看全部形态 ↗', 'Explore all forms ↗')}</button>
      <small>{t('中间这只是当前预览 · 绑定后才会计入进化', 'The character shown is a preview · binding is what records evolution')}</small>
    </aside>
    <aside className="work-list evolution-technology binding-panel" aria-label={t('绑定设备', 'Device binding')}>
      <div className="glass binding-card">
        <GuestPreview formId={formId} onSelect={onSelectForm} onOpenSettings={onOpenSettings} settingsNeedsSetup={settingsNeedsSetup} />
        <GevCloudPreview formId={formId} controller={controller} ready={ready} />
        <span className="eyebrow"><Link2 size={14} />{t('设备连接', 'DEVICE CONNECTION')}</span>
        <h1>{waiting ? t('已绑定，等待电脑上线', 'Bound. Waiting for your computer.') : reconnecting ? t('连接已中断，正在重连', 'Connection lost. Reconnecting.') : t('先绑定你的牛来', 'Bind your Niulai first')}</h1>
        <p role="status">{waiting ? t('网页密钥已验证。请在连接机械臂的电脑上，用配套设备密钥启动程序。电脑上线后，这里会自动打开。', 'Your browser key is verified. Start the local program with the matching device key on the arm’s computer. This page opens automatically when it comes online.') : reconnecting ? t('进化和实时交互已暂停。请检查电脑程序与网络；恢复连接后继续，旧动作不会重放。', 'Evolution and live interactions are paused. Check the local program and network. Previous actions will not replay after reconnection.') : t('输入网页连接密钥，并让对应电脑上线，才能使用进化、摄像头和语言交互。', 'Enter your browser connection key and bring its computer online to use evolution, camera and language interactions.')}</p>
        <ConnectionBar live={live} binding />
        <ol className="binding-steps">
          <li><span>01</span><div><strong>{t('网页输入 Browser Key', 'Enter the Browser Key here')}</strong><p>{t('向项目负责人索取网页密钥，密钥不在公开 GitHub 中。', 'Get a browser key from the project owner. Keys are not in the public GitHub repository.')}</p></div></li>
          <li><span>02</span><div><strong>{t('电脑程序使用 Device Key', 'Use the Device Key in the local program')}</strong><p>{t('朋友运行本机程序，并接入 JEV、机械臂和摄像头。两把密钥必须属于同一设备房间。', 'Run the local program with JEV, the arm and camera. Both keys must belong to the same device room.')}</p></div></li>
          <li><span>03</span><div><strong>{t('连接成功，开放整页', 'Go online to unlock this page')}</strong><p>{t('左右两侧共用这次连接。视频仍需你手动开启。', 'Both sides share this connection. Video starts only when you choose to start it.')}</p></div></li>
        </ol>
        <div className="live-kit-links"><a href="/downloads/cowcoming-device.tar.gz" download>{t('下载电脑端开发套件', 'Download the device kit')}</a><a href="https://github.com/ericshang98/cowcoming/blob/main/docs/hardware-handoff.md" target="_blank" rel="noreferrer">{t('给开发朋友的接入说明 ↗', 'Developer handoff ↗')}</a></div>
      </div>
    </aside>
  </section></Localized>;
}
