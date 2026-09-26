import { Localized, useLanguage, translateText } from "../i18n/Language";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, X } from "lucide-react";
import { ancestry, evolutionEdges, forms } from "../evolution.mjs";
import EvolutionModelPreview from "../components/EvolutionModelPreview";
import MotionPreview from "../components/MotionPreview";
import { browserTuningStorage, loadTuning } from "../live/motion-tuning.mjs";
import { softwareVariantCount } from "../live/motion-variants.mjs";

const connections = {
  normal: "M400 134V166",
  playful: "M400 300V316H200V332",
  tough: "M400 300V316H600V332",
  celestial: "M200 466V498",
  dark: "M600 466V498",
};
const stages = ["ORIGIN", "SHARED FORM", "BRANCH", "NEXT FORM"];

export default function EvolutionTree({
  selected,
  onSelect,
  onClose,
  initialView = "tree",
  canSelect = false,
  returnFocus,
}) {
  const dialogRef = useRef(null);
  const { language } = useLanguage();
  const zh = language === "zh";
  const [view, setView] = useState(initialView);
  const [previewId, setPreviewId] = useState(selected.id);
  const [modelStatus, setModelStatus] = useState("loading");
  // This controller is intentionally independent of the live device and growth session.
  const controller = useMemo(
    () => ({ motionTuning: loadTuning(browserTuningStorage()).document }),
    [],
  );
  const form = forms[previewId];
  const path = ancestry(previewId);
  function preview(id) {
    if (id !== previewId) setModelStatus("loading");
    setPreviewId(id);
    setView("model");
  }
  function back() {
    controller.responsePlayer?.stop();
    setView("tree");
  }
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = returnFocus || document.activeElement;
    dialog.showModal();
    return () => {
      controller.responsePlayer?.stop();
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [controller, returnFocus]);

  return createPortal(
    <Localized>
      <dialog
        id="evolution-atlas"
        className={`evolution-atlas ${view === "model" ? "atlas-debug-mode" : ""}`}
        ref={dialogRef}
        aria-labelledby="evolution-atlas-title"
        aria-describedby="evolution-atlas-description"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClose={onClose}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <header className="atlas-header">
          <div>
            <span className="eyebrow">
              {view === "model"
                ? zh
                  ? "牛来 / 调试模式"
                  : "NIULAI / DEBUG MODE"
                : "牛来 / EVOLUTION ATLAS"}
            </span>
            <h1 id="evolution-atlas-title">
              {view === "model"
                ? form.name
                : zh
                  ? "牛来进化图鉴"
                  : "Niulai evolution atlas"}
            </h1>
            <p id="evolution-atlas-description">
              {zh
                ? "所有形态均可预览，无需先完成进化。调试不改变成长进度，也不驱动硬件。"
                : "Preview every form before evolving. Debugging does not change growth or control hardware."}
            </p>
          </div>
          <button
            className="atlas-close glass"
            aria-label={zh ? "关闭图鉴与调试" : "Close atlas and debug mode"}
            onClick={onClose}
            autoFocus
          >
            <X size={20} />
          </button>
        </header>
        {view === "tree" ? (
          <div className="atlas-scroll">
            <div
              className="atlas-tree"
              role="group"
              aria-label="Evolution paths"
            >
              <svg
                className="atlas-connections"
                viewBox="0 0 800 632"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {evolutionEdges.map((edge) => (
                  <path
                    key={edge.to}
                    d={connections[edge.to]}
                    className={path.includes(edge.to) ? "on-path" : ""}
                  />
                ))}
              </svg>
              {Object.values(forms).map((item) => (
                <button
                  key={item.id}
                  className={`atlas-node glass ${!item.branch ? "atlas-shared" : ""} ${path.includes(item.id) ? "on-path" : ""}`}
                  style={{
                    gridRow: item.depth + 1,
                    gridColumn: item.branch
                      ? item.branch === "celestial"
                        ? "1"
                        : "2"
                      : "1 / -1",
                  }}
                  aria-label={zh ? `预览${item.name}` : `Preview ${item.id}`}
                  aria-pressed={previewId === item.id}
                  onClick={() => preview(item.id)}
                >
                  <span className="atlas-node-top">
                    <span>{String(item.depth + 1).padStart(2, "0")}</span>
                    <span>{stages[item.depth]}</span>
                  </span>
                  <span className="atlas-model-slot">
                    <img src={item.thumbnail} alt="" width="512" height="512" />
                  </span>
                  <strong>{item.name}</strong>
                  <span className="atlas-model-label">
                    {zh ? "查看 3D ↗" : "View in 3D ↗"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="atlas-debug-layout">
            <aside className="atlas-debug-tools">
              <button className="atlas-back" onClick={back}>
                <ArrowLeft size={14} />
                {zh ? "进化图鉴" : "Evolution atlas"}
              </button>
              <label className="motion-form-select">
                {zh ? "选择预览形态" : "Choose a preview form"}
                <select
                  aria-label={zh ? "选择预览形态" : "Choose a preview form"}
                  value={previewId}
                  onChange={(event) => preview(event.target.value)}
                >
                  {Object.values(forms).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="atlas-form-strip"
                role="group"
                aria-label={zh ? "形态缩略图" : "Form thumbnails"}
              >
                {Object.values(forms).map((item) => (
                  <button
                    key={item.id}
                    aria-label={zh ? `预览${item.name}` : `Preview ${item.id}`}
                    aria-pressed={previewId === item.id}
                    onClick={() => preview(item.id)}
                    title={item.name}
                  >
                    <img src={item.thumbnail} alt="" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
              <p className="atlas-debug-note">
                {zh
                  ? `动作目录只用于调试试播；${softwareVariantCount(previewId)} 个软件表现变体会在正常对话中按身体部位、形态和事件自动选择。实机能力由设备声明。`
                  : `The behavior catalog is for debug preview; normal conversation can choose from ${softwareVariantCount(previewId)} software accents for this form, while hardware declares its own capabilities.`}
              </p>
              <MotionPreview
                controller={controller}
                formId={previewId}
                ready={modelStatus === "ready"}
                defaultOpen
              />
            </aside>
            <EvolutionModelPreview
              key={previewId}
              formId={previewId}
              controller={controller}
              onStatus={setModelStatus}
            />
          </div>
        )}
        <footer className="atlas-footer">
          <div className="atlas-selection" aria-live="polite">
            <span className="eyebrow">{zh ? "当前预览" : "PREVIEWING"}</span>
            <strong>{form.name}</strong>
            <p>{path.map((id) => forms[id].name).join(" → ")}</p>
          </div>
          <div className="atlas-footer-actions">
            <span>
              {zh
                ? `实际形态：${selected.name}`
                : `Active form: ${translateText(selected.name, language)}`}
            </span>
            {view === "tree" ? (
              <button
                className="atlas-preview glass"
                onClick={() => preview(previewId)}
              >
                {zh ? "打开调试模式" : "Open debug mode"}
                <ArrowUpRight size={15} />
              </button>
            ) : canSelect && selected.id !== previewId ? (
              <button
                className="atlas-preview glass"
                onClick={() => {
                  onSelect(previewId);
                  onClose();
                }}
              >
                {zh ? "设为当前形态" : "Use this form"}
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <button className="atlas-preview glass" onClick={onClose}>
                {zh ? "退出调试" : "Exit debug mode"}
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </footer>
      </dialog>
    </Localized>,
    document.body,
  );
}
