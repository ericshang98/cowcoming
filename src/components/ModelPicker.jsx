import { useEffect, useId, useRef, useState } from "react";
import { Box, Check, LoaderCircle } from "lucide-react";
import { useApp } from "../context";
import { HOME_MODELS } from "../scene/home-models.mjs";

export default function ModelPicker() {
  const {
    mode,
    homeModel,
    pendingModel,
    modelError,
    chooseHomeModel,
    cancelHomeModel,
  } = useApp();
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    trigger = useRef(null);
  const id = useId();
  const enabled = mode === "home";
  useEffect(() => {
    setOpen(false);
  }, [mode]);
  useEffect(() => {
    setOpen(false);
  }, [homeModel.id]);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector('[aria-pressed="true"]')?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="model-picker"
      title={!enabled ? "仅 HOME 可切换模型" : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
        // Keep the site's Space/L gesture shortcuts out of the picker.
        if (event.key === " " || event.key.toLowerCase() === "l")
          event.stopPropagation();
      }}
      ref={root}
    >
      <button
        ref={trigger}
        className="model-trigger"
        disabled={!enabled}
        aria-label={enabled ? "选择首页模型" : "模型选择（仅 HOME 可用）"}
        aria-haspopup="dialog"
        aria-expanded={enabled && open}
        aria-controls={id}
        aria-busy={!!pendingModel}
        title={
          enabled ? `选择模型 · 当前${homeModel.name}` : "仅 HOME 可切换模型"
        }
        onClick={() => setOpen((value) => !value)}
      >
        {pendingModel ? (
          <LoaderCircle size={15} className="model-spinner" />
        ) : (
          <Box size={15} />
        )}
      </button>
      {enabled && open && (
        <div
          id={id}
          className="model-menu glass"
          role="dialog"
          aria-label="选择首页模型"
        >
          <div className="model-menu-heading">
            选择模型 <small>仅 HOME</small>
          </div>
          <div className="model-options" role="group" aria-label="首页角色">
            {HOME_MODELS.map((model) => (
              <button
                key={model.id}
                className="model-option"
                aria-pressed={homeModel.id === model.id}
                onClick={() => {
                  chooseHomeModel(model.id);
                  trigger.current?.focus();
                  if (model.id === homeModel.id) setOpen(false);
                }}
              >
                <span
                  className="model-swatch"
                  style={{ background: model.color }}
                />
                <span>{model.name}</span>
                {pendingModel?.id === model.id ? (
                  <LoaderCircle size={14} className="model-spinner" />
                ) : homeModel.id === model.id ? (
                  <Check size={14} />
                ) : null}
              </button>
            ))}
          </div>
          {!pendingModel && !modelError && (
            <p className="model-menu-hint">
              只更换首页角色，其他页面保持原样。
            </p>
          )}
        </div>
      )}
      {enabled && (pendingModel || modelError) && (
        <div
          className={`model-feedback glass ${open ? "with-menu" : ""}`}
          style={{ "--model-count": HOME_MODELS.length }}
        >
          {pendingModel ? (
            <>
              <p role="status">
                正在加载{pendingModel.name}，当前仍显示{homeModel.name}。
              </p>
              <button className="model-cancel" onClick={cancelHomeModel}>
                取消
              </button>
            </>
          ) : (
            <p role="alert">{modelError}</p>
          )}
        </div>
      )}
    </div>
  );
}
