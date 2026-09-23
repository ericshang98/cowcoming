import { useEffect, useRef, useState } from "react";
import { forms } from "../evolution.mjs";
import { ACTION_CATALOG } from "../../shared/action-catalog.mjs";
import { useLanguage } from "../i18n/Language";

export default function GuestPreview({ formId, onSelect, ready, controller }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setBusy(false);
    setStatus("");
    return () => {
      generation.current += 1;
      controller.responsePlayer?.stop();
    };
  }, [formId, controller]);
  async function play(actionId) {
    const gen = generation.current;
    const player = controller.responsePlayer;
    if (!player || controller.responseForm !== formId) {
      setStatus(zh ? "这个形态还在加载" : "This form is still loading");
      return;
    }
    setBusy(true);
    setStatus(zh ? "正在演示" : "Playing");
    const result = await player.play({ formId, actionId, eventId: crypto.randomUUID() });
    if (generation.current !== gen) return;
    setBusy(false);
    setStatus(result.status === "completed"
      ? (zh ? "演示结束" : "Preview finished")
      : result.status === "interrupted"
        ? (zh ? "已停止" : "Stopped")
        : (zh ? "这个动作暂时放不出来" : "This action is unavailable"));
  }
  return (
    <div className="guest-preview">
      <h2>{zh ? "预览进化" : "Preview evolution"}</h2>
      <p>{zh
        ? "没绑定也能看六种形态，再点一个动作看它怎么动。只在网页上演示，不记入进化，也不带动机械臂。"
        : "Look through all six forms and play a reaction without binding. This stays in the browser: it is not recorded and does not move hardware."}</p>
      <div className="guest-forms" role="group" aria-label={zh ? "预览形态" : "Preview forms"}>
        {Object.values(forms).map((item) => (
          <button key={item.id} type="button" aria-pressed={item.id === formId} onClick={() => onSelect(item.id)}>
            <img src={item.thumbnail} alt="" width="512" height="512" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="guest-actions" role="group" aria-label={zh ? "预览动作" : "Preview actions"}>
        {Object.entries(ACTION_CATALOG).map(([id, action]) => (
          <button key={id} type="button" data-motion={id} disabled={!ready || busy} onClick={() => play(id)}>
            {zh ? action.label : action.en}
          </button>
        ))}
      </div>
      <small role="status">{status}</small>
    </div>
  );
}
