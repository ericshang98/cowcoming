import { useEffect, useRef, useState } from "react";
import { evolutionAssets } from "../evolution-assets.mjs";
import {
  browserTuningStorage,
  DEFAULT_TUNING,
  TUNING_LIMITS,
  loadTuning,
  saveTuning,
  parseTuningDocument,
} from "../live/motion-tuning.mjs";
import { ACTION_CATALOG } from "../../shared/action-catalog.mjs";
import { useLanguage } from "../i18n/Language";
export default function MotionPreview({ controller, formId, ready, defaultOpen = false }) {
  const { language } = useLanguage(),
    zh = language === "zh";
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("NOD");
  const [initial] = useState(() => loadTuning(browserTuningStorage()));
  const [document, setDocument] = useState(
    () => controller.motionTuning || initial.document,
  );
  const [saved, setSaved] = useState(!initial.error);
  const [fileStatus, setFileStatus] = useState("");
  const importInput = useRef(null);
  const tuning = document.forms[formId]?.actions[selected] || DEFAULT_TUNING;
  const generation = useRef(0);
  useEffect(() => {
    if (
      Object.keys(document.forms).length !== Object.keys(evolutionAssets).length
    ) {
      try {
        commit(parseTuningDocument(JSON.stringify(document)));
      } catch {
        setSaved(false);
      }
    }
  }, [document]);
  useEffect(() => {
    controller.motionTuning = document;
  }, [controller, document]);
  useEffect(() => {
    const sync = () => {
      const latest = loadTuning(browserTuningStorage());
      if (!latest.error) { controller.motionTuning = latest.document; setDocument(latest.document); setSaved(true); }
    };
    window.addEventListener('cowcoming-motion-tuning-updated', sync);
    return () => window.removeEventListener('cowcoming-motion-tuning-updated', sync);
  }, [controller]);
  function commit(next) {
    controller.motionTuning = next;
    setDocument(next);
    const persisted = saveTuning(browserTuningStorage(), next);
    setSaved(persisted);
    if (persisted) window.dispatchEvent(new Event('cowcoming-motion-tuning-updated'));
  }
  function update(value) {
    if (!document.forms[formId]) return;
    const next = structuredClone(document);
    next.forms[formId].actions[selected] = value;
    setFileStatus("");
    commit(next);
  }
  function exportFile() {
    const blob = new Blob([JSON.stringify(document, null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = window.document.createElement("a");
    a.href = url;
    a.download = "cowcoming-motion-tuning.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFileStatus(zh ? "已导出全部形态的参数" : "Exported all forms");
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 32768) throw Error("File too large");
      const next = parseTuningDocument(await file.text());
      commit(next);
      setFileStatus(
        zh
          ? "已导入全部参数，下次播放生效"
          : "Imported; applies to the next playback",
      );
    } catch {
      setFileStatus(
        zh
          ? "导入失败：文件格式、模型版本或参数范围不匹配，原设置已保留。"
          : "Import failed: incompatible format, model or range. Settings unchanged.",
      );
    }
  }
  useEffect(() => {
    generation.current++;
    setStatus("");
    setBusy(false);
    return () => {
      generation.current++;
      controller.responsePlayer?.stop();
    };
  }, [formId, controller]);
  async function play(actionId) {
    setSelected(actionId);
    const gen = generation.current,
      player = controller.responsePlayer;
    if (!player || controller.responseForm !== formId) {
      setStatus(
        zh ? "当前形态动画未就绪" : "This form’s animation is unavailable.",
      );
      return;
    }
    setBusy(true);
    setStatus(zh ? "正在播放" : "Playing");
    const result = await player.play({
      formId,
      actionId,
      eventId: crypto.randomUUID(),
    });
    if (generation.current !== gen) return;
    setBusy(false);
    setStatus(
      result.status === "completed"
        ? zh
          ? "软件演示完成"
          : "Software preview complete"
        : result.status === "interrupted"
          ? zh
            ? "已停止"
            : "Stopped"
          : zh
            ? "动画暂不可用"
            : "Animation unavailable",
    );
  }
  return (
    <details
      className="motion-preview"
      open={
        defaultOpen || new URLSearchParams(window.location.search).get("motionLab") === "1"
          ? true
          : undefined
      }
    >
      <summary>
        {zh ? "动作调试 · 仅软件" : "Motion tuning · software only"}
      </summary>
      <div className="motion-preview-actions">
        {Object.entries(ACTION_CATALOG).map(([id, a]) => (
          <button
            key={id}
            data-motion={id}
            aria-pressed={selected === id}
            disabled={!ready || busy}
            onClick={() => play(id)}
          >
            {zh ? a.label : a.en}
          </button>
        ))}
      </div>
      <fieldset className="motion-tuning" disabled={!ready || busy}>
        <legend>
          {zh
            ? `${evolutionAssets[formId]?.formLabel || ""} · ${ACTION_CATALOG[selected].label}`
            : `${formId} · ${ACTION_CATALOG[selected].en}`}
        </legend>
        <p>
          {zh
            ? "点上面的动作试播；修改参数后点同一动作重播。"
            : "Select an action to play; select it again after adjusting."}
        </p>
        {Object.entries(TUNING_LIMITS).map(([key, [min, max]]) => (
          <label key={key}>
            <span>
              {key === "speed"
                ? zh
                  ? "速度"
                  : "Speed"
                : zh
                  ? "幅度"
                  : "Amplitude"}
            </span>
            <output>
              {key === "speed"
                ? `${tuning[key].toFixed(2)}×`
                : `${Math.round(tuning[key] * 100)}%`}
            </output>
            <input
              type="range"
              data-tuning={key}
              aria-label={
                key === "speed"
                  ? zh
                    ? "动作速度"
                    : "Motion speed"
                  : zh
                    ? "动作幅度"
                    : "Motion amplitude"
              }
              min={min}
              max={max}
              step="0.05"
              value={tuning[key]}
              onChange={(e) =>
                update({ ...tuning, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <button onClick={() => update({ ...DEFAULT_TUNING })}>
          {zh ? "恢复当前动作默认值" : "Reset this action"}
        </button>
      </fieldset>
      <button
        data-motion-stop
        disabled={!busy}
        onClick={() => controller.responsePlayer?.stop()}
      >
        {zh ? "停止预览" : "Stop preview"}
      </button>
      <small className="motion-play-status" role="status">
        {status ||
          (!ready
            ? zh
              ? "模型或动作资源未就绪"
              : "Model or animations not ready"
            : zh
              ? "不控制机械臂，不记录进化。"
              : "No hardware control or evolution record.")}
      </small>
      <div className="motion-tuning-files">
        <button onClick={exportFile}>
          {zh ? "导出全部参数" : "Export all settings"}
        </button>
        <button disabled={busy} onClick={() => importInput.current?.click()}>
          {zh ? "导入参数" : "Import settings"}
        </button>
        <input
          ref={importInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={importFile}
        />
      </div>
      <p className="motion-tuning-note" role="status">
        {fileStatus ? `${fileStatus} ` : ""}
        {!saved
          ? zh
            ? "浏览器未能保存或旧参数不兼容，请导出备份。"
            : "Storage unavailable or old settings incompatible. Export a backup."
          : !fileStatus
            ? zh
              ? "自动保存在本机浏览器；导出文件可带到另一台电脑。"
              : "Saved in this browser. Export to move to another computer."
            : ""}
      </p>
      <p className="motion-tuning-note">
        {zh
          ? "左右以牛自身为准。参数只调整网页动画；模拟回执不代表硬件完成，实机角度由朋友另行标定。"
          : "Left/right are the cow’s own. These settings affect software only. Hardware travel requires separate calibration."}
      </p>
    </details>
  );
}
