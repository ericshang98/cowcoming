import { useState } from "react";
import { useLanguage } from "../i18n/Language";
import { LiveDialog } from "./ConnectionBar";
import { forms } from "../evolution.mjs";
import { ACTION_IDS } from "../../shared/live-protocol.mjs";
export default function DeviceDebug({ live, onClose }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const profile = live.snapshot.profile;
  const [draft, setDraft] = useState(() => ({
    ...profile,
    animationMap: JSON.stringify(profile.animationMap, null, 2),
  }));
  const [error, setError] = useState("");
  const [sentRevision, setSentRevision] = useState(null);
  function save(e) {
    e.preventDefault();
    setError("");
    try {
      const map = JSON.parse(draft.animationMap);
      live.updateProfile({
        expectedRevision: draft.revision,
        formId: draft.formId,
        prompt: draft.prompt,
        allowedActions: draft.allowedActions,
        animationMap: map,
      });
      setSentRevision(draft.revision + 1);
    } catch {
      setError(
        t("动画映射需要有效 JSON。", "Animation mapping must be valid JSON."),
      );
    }
  }
  return (
    <LiveDialog title={t("设备调试", "Device lab")} onClose={onClose}>
      <p>
        {t(
          "进化节奏在左下角设置。这里修改形态、提示词和动作配置；手动切换会接管当前形态。",
          "Set evolution cadence at the lower left. Edit forms, prompts and actions here; manually changing a form takes control of evolution.",
        )}
      </p>
      <form onSubmit={save}>
        <label>
          {t("调试形态", "Debug form")}
          <select
            value={draft.formId}
            onChange={(e) => {
              const saved = live.snapshot.formProfiles?.[e.target.value];
              setDraft(
                saved
                  ? {
                      ...saved,
                      revision: draft.revision,
                      animationMap: JSON.stringify(saved.animationMap, null, 2),
                    }
                  : { ...draft, formId: e.target.value },
              );
            }}
          >
            {Object.values(forms).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("给本机 JEV 的形态提示词", "Form prompt for local JEV")}
          <textarea
            rows={5}
            value={draft.prompt}
            maxLength={8000}
            required
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
        </label>
        <fieldset>
          <legend>{t("允许选择的动作", "Allowed actions")}</legend>
          <div className="live-action-options">
            {ACTION_IDS.map((action) => (
              <label key={action} className="live-checkbox">
                <input
                  type="checkbox"
                  checked={draft.allowedActions.includes(action)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      allowedActions: e.target.checked
                        ? [...draft.allowedActions, action]
                        : draft.allowedActions.filter((a) => a !== action),
                    })
                  }
                />
                {action}
              </label>
            ))}
          </div>
        </fieldset>
        <details>
          <summary>
            {t("动作 → 随机动画映射", "Action → random animation mapping")}
          </summary>
          <p>
            {t(
              "可选：nod-soft、nod-double、look-left、look-right、tilt-left、tilt-right、wave、idle。",
              "Available: nod-soft, nod-double, look-left, look-right, tilt-left, tilt-right, wave, idle.",
            )}
          </p>
          <textarea
            aria-label="Animation mapping JSON"
            rows={9}
            value={draft.animationMap}
            onChange={(e) =>
              setDraft({ ...draft, animationMap: e.target.value })
            }
            spellCheck="false"
          />
        </details>
        {(error || live.error) && (
          <p className="live-error" role="alert">
            {error || live.error}
          </p>
        )}
        {profile.revision !== draft.revision &&
          profile.revision !== sentRevision && (
            <p className="live-error">
              {t(
                "配置已在其他窗口改变，请重新载入再编辑。",
                "Configuration changed elsewhere. Reload before editing.",
              )}
            </p>
          )}
        {sentRevision === profile.revision && (
          <p role="status">
            {live.snapshot.appliedRevision === sentRevision
              ? t("电脑端已应用。", "Applied by the local process.")
              : t(
                  "云端已保存，等待电脑端应用。",
                  "Saved in the cloud; waiting for the local process.",
                )}
          </p>
        )}
        <footer>
          <button
            type="button"
            onClick={() => {
              setDraft({
                ...profile,
                animationMap: JSON.stringify(profile.animationMap, null, 2),
              });
              setSentRevision(null);
            }}
          >
            {t("载入最新配置", "Reload current")}
          </button>
          <button
            type="submit"
            className="live-primary"
            disabled={
              live.status !== "connected" ||
              draft.allowedActions.length === 0 ||
              sentRevision === profile.revision
            }
          >
            {t("保存并同步", "Save & sync")}
          </button>
        </footer>
      </form>
      <section className="live-debug-actions">
        <h3>{t("动作测试", "Test an action")}</h3>
        <div>
          {profile.allowedActions.map((action) => (
            <button
              key={action}
              disabled={
                !live.online ||
                live.snapshot.appliedRevision !== profile.revision
              }
              onClick={() =>
                live.command({ command: "action", actionId: action })
              }
            >
              {action}
            </button>
          ))}
        </div>
        <button
          className="live-stop"
          disabled={!live.online}
          onClick={() => live.command({ command: "stop" })}
        >
          {t("请求停止", "Request stop")}
        </button>
        <p>
          {t(
            "提示词不直接生成电机指令；运动限位与停止由本机程序处理。",
            "Prompts do not become motor commands. Limits and stopping remain in the local program.",
          )}
        </p>
      </section>
      <div className="live-kit-links">
        <a href="/downloads/cowcoming-device.tar.gz" download>
          {t("下载 Python 接入示例", "Download Python device kit")}
        </a>
        <a
          href="/downloads/device-protocol.md"
          target="_blank"
          rel="noreferrer"
        >
          {t("查看接口文档", "Read the API guide")}
        </a>
      </div>
      <details>
        <summary>{t("最近事件", "Recent events")}</summary>
        <pre>{JSON.stringify(live.snapshot.events.slice(-12), null, 2)}</pre>
      </details>
    </LiveDialog>
  );
}
