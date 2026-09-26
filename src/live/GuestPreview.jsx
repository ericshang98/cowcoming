import { forms } from "../evolution.mjs";
import { useLanguage } from "../i18n/Language";

export default function GuestPreview({ formId, onSelect }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  return (
    <div className="guest-preview">
      <h2>{zh ? "预览进化" : "Preview evolution"}</h2>
      <p>{zh
        ? "没绑定也能看六种真实形态。正常对话时由模型决定动作；基础动作和参数只在调试模式里手动试播。"
        : "Look through all six real forms without binding. During a normal conversation the model chooses the response; manual base-action playback belongs in Debug mode."}</p>
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
