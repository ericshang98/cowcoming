import { forms } from "../evolution.mjs";
import { useLanguage } from "../i18n/Language";
import { Settings } from "lucide-react";

export default function GuestPreview({ formId, onSelect, onOpenSettings, settingsNeedsSetup = false }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  return (
    <div className="guest-preview">
      <div className="guest-preview-heading">
        <h2>{zh ? "预览进化" : "Preview evolution"}</h2>
        {onOpenSettings && <button
          type="button"
          className="guest-preview-settings"
          aria-label={zh ? "打开进化设置" : "Open evolution settings"}
          title={zh ? "进化设置" : "Evolution settings"}
          onClick={onOpenSettings}
        >
          <Settings size={16} strokeWidth={1.7} />
          <i className={settingsNeedsSetup ? "needs-setup" : ""} />
        </button>}
      </div>
      <p>{zh
        ? "没绑定也能看六种真实形态。正常对话时由模型从桌面宠物动作目录决定回应；动作目录和参数只在调试模式里手动试播。"
        : "Look through all six real forms without binding. During a normal conversation the model chooses from the desktop-pet behavior catalog; manual catalog playback belongs in Debug mode."}</p>
      <div className="guest-forms" role="group" aria-label={zh ? "预览形态" : "Preview forms"}>
        {Object.values(forms).map((item) => (
          <button key={item.id} type="button" aria-pressed={item.id === formId} onClick={() => onSelect(item.id)}>
            <img src={item.thumbnail} alt="" width="512" height="512" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <small>{zh ? "动作调试：打开左下角的“调试模式”。" : "Action debugging: open Debug mode at the lower left."}</small>
    </div>
  );
}
