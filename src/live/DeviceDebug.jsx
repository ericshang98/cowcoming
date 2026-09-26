import { personaProfile } from '../../shared/personas.mjs';
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/Language";
import { LiveDialog } from "./ConnectionBar";
import { forms } from "../evolution.mjs";
import { ACTION_CATALOG, ACTION_CONTRACT_VERSION, actionsByGroup, availableDeviceActions } from "../../shared/action-catalog.mjs";
export default function DeviceDebug({ live, onClose }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const profile = live.snapshot.profile;
  const legacy=profile.actionContractVersion!==ACTION_CONTRACT_VERSION;
  const available=availableDeviceActions(live.snapshot);
  const [draft, setDraft] = useState(() => ({
    ...profile,
    animationMap: JSON.stringify(profile.animationMap, null, 2),
  }));
  const [error, setError] = useState("");
  const [sentRevision, setSentRevision] = useState(null);
  useEffect(() => { setDraft({...profile, animationMap:JSON.stringify(profile.animationMap,null,2)}); setSentRevision(null); }, [profile.revision]);
  function save(e) {
    e.preventDefault();
    setError("");
    try {
      const map = JSON.parse(draft.animationMap);
      live.updateProfile({
        expectedRevision: draft.revision,
        formId: draft.formId,
        prompt: draft.prompt,
        languagePrompt: draft.languagePrompt,
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
      {legacy && <div role="status"><p>{t('当前房间使用旧动作协议，需要升级后由设备重新确认。','This room uses the old action contract. Upgrade and wait for device acknowledgement.')}</p><button onClick={()=>live.updateProfile({migrateActions:true})}>{t('升级动作目录','Upgrade behavior catalog')}</button></div>}
      {!legacy && live.snapshot.device.actionContractVersion!==ACTION_CONTRACT_VERSION && <p role="status">{t('请让设备运行新版接入套件，并声明已验证的动作能力。','Update the device kit and report its verified action capabilities.')}</p>}
      <form onSubmit={save}>
      <fieldset disabled={legacy} style={{border:0,padding:0}}>
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
                  : { ...draft, ...personaProfile(e.target.value) },
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
        <label>
          {t("给独立语言模型的人格提示词", "Personality prompt for the language model")}
          <textarea rows={5} readOnly={Boolean(draft.personaVersion)} value={draft.languagePrompt || ""} maxLength={8000}
            onChange={e=>setDraft({...draft, languagePrompt:e.target.value})}/>
        </label>
        {draft.personaVersion && <p>{t('语言人格按版本与本地配置同步，此处只预览；形态提示词供 JEV 使用。','Language persona is versioned with the local configuration; this field is a preview. The form prompt is for JEV.')}</p>}
        <fieldset>
          <legend>{t("允许选择的动作", "Allowed behaviors")}</legend>
          <p>{t("动作目录按身体部位组织；设备只会执行它在能力声明中支持的动作。", "The catalog is grouped by body region; hardware runs only actions it advertises as supported.")}</p>
          <div className="live-action-groups">
            {actionsByGroup().map((group) => <div key={group.id}>
              <strong>{t(group.label, group.en)}</strong>
              <div className="live-action-options">
                {group.actions.map((action) => (
                  <label key={action.id} className="live-checkbox">
                    <input type="checkbox" checked={draft.allowedActions.includes(action.id)} onChange={(e) => setDraft({...draft, allowedActions: e.target.checked ? [...draft.allowedActions, action.id] : draft.allowedActions.filter((a) => a !== action.id)})} />
                    {t(action.label, action.en)}
                  </label>
                ))}
              </div>
            </div>)}
            <label className="live-checkbox"><input type="checkbox" checked={draft.allowedActions.includes("WAIT")} onChange={(e) => setDraft({...draft, allowedActions: e.target.checked ? [...draft.allowedActions, "WAIT"] : draft.allowedActions.filter((a) => a !== "WAIT")})} />{t("等待", "Wait")}</label>
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
      </fieldset></form>
      <section className="live-debug-actions">
        <h3>{t("动作测试", "Test an action")}</h3>
        <div>
          {profile.allowedActions.map((action) => (
            <button
              key={action}
              disabled={
                !live.online || !available.includes(action) ||
                live.snapshot.appliedRevision !== profile.revision
              }
              onClick={() =>
                live.command({ command: "action", actionId: action })
              }
            >
              {ACTION_CATALOG[action] ? t(ACTION_CATALOG[action].label,ACTION_CATALOG[action].en) : action}
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
