import formProfilesDefaults from "./form-profiles.json" with { type: "json" };
export const FORM_IDS = [
  "calf",
  "normal",
  "playful",
  "tough",
  "celestial",
  "dark",
];
import { ACTION_CONTRACT_VERSION, ACTION_IDS, ANIMATIONS, DEFAULT_MAP, animationMatches, availableDeviceActions } from './action-catalog.mjs';
export { ACTION_CONTRACT_VERSION, ACTION_IDS, ANIMATIONS, DEFAULT_MAP, availableDeviceActions };
export function check(ok, message) {
  if (!ok) throw new Error(message);
}
export function text(value, max = 2000, empty = false) {
  check(
    typeof value === "string" &&
      value.length <= max &&
      (empty || value.trim().length > 0),
    "Invalid text",
  );
  return value;
}
export function id(value) {
  check(
    typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value),
    "Invalid identifier",
  );
  return value;
}
export function parseKey(key) {
  const match =
    /^cw1\.(browser|device)\.([a-zA-Z0-9_-]{1,64})\.([a-f0-9]{64})$/.exec(
      key || "",
    );
  check(match, "Invalid connection key");
  return { role: match[1], roomId: match[2], secret: match[3] };
}
export function initialRoom(roomId, label) {
  return {
    roomId,
    label,
    version: 1,
    evolutionMode: "manual",
    personalityVersion: 1,
    profile: {
      revision: 1,
      actionContractVersion: ACTION_CONTRACT_VERSION,
      formId: "calf",
      ...structuredClone(formProfilesDefaults.calf),
      allowedActions: [...ACTION_IDS],
      animationMap: structuredClone(DEFAULT_MAP),
    },
    appliedRevision: null,
    revealed: ["calf", "normal"],
    history: [],
    device: {
      name: "",
      hardware: "unknown",
      camera: "offline",
      jev: "offline",
      language: "offline",
      simulation: false,
      actionContractVersion: null, supportedActions: [],
    },
    events: [],
    messages: [],
    seen: [],
    commands: [],
    updatedAt: Date.now(),
  };
}
export function updateProfile(state, patch) {
  check(
    patch && patch.expectedRevision === state.profile.revision,
    "Profile revision conflict; refresh first",
  );
  check(state.profile.actionContractVersion === ACTION_CONTRACT_VERSION || patch.migrateActions === true,
    'Action contract upgrade required; confirm migration in Device lab');
  const source = patch.source || "manual";
  check(["manual", "automatic", "reset"].includes(source), "Invalid profile source");
  const formProfiles = {
    ...(state.formProfiles || {}),
    [state.profile.formId]: structuredClone(state.profile),
  };
  const p = structuredClone(
    patch.formId &&
      patch.formId !== state.profile.formId &&
      formProfiles[patch.formId]
      ? formProfiles[patch.formId]
      : state.profile,
  );
  if (patch.migrateActions === true || p.actionContractVersion !== ACTION_CONTRACT_VERSION) {
    p.actionContractVersion = ACTION_CONTRACT_VERSION;
    p.allowedActions = [...ACTION_IDS];
    p.animationMap = structuredClone(DEFAULT_MAP);
  }
  if (patch.formId && patch.formId !== state.profile.formId && !formProfiles[patch.formId]) {
    check(FORM_IDS.includes(patch.formId), "Unknown form");
    Object.assign(p, structuredClone(formProfilesDefaults[patch.formId]));
  }
  if (patch.formId !== undefined) {
    check(FORM_IDS.includes(patch.formId), "Unknown form");
    p.formId = patch.formId;
  }
  if (patch.prompt !== undefined) p.prompt = text(patch.prompt, 8000);
  if (patch.languagePrompt !== undefined) p.languagePrompt = text(patch.languagePrompt, 8000);
  if (patch.allowedActions !== undefined) {
    check(
      Array.isArray(patch.allowedActions) &&
        patch.allowedActions.length > 0 &&
        patch.allowedActions.length <= ACTION_IDS.length &&
        patch.allowedActions.every((a) => ACTION_IDS.includes(a)),
      "Invalid allowed actions",
    );
    p.allowedActions = [...new Set(patch.allowedActions)];
  }
  if (patch.animationMap !== undefined) {
    check(
      patch.animationMap &&
        typeof patch.animationMap === "object" &&
        !Array.isArray(patch.animationMap),
      "Invalid animation map",
    );
    for (const [action, clips] of Object.entries(patch.animationMap)) {
      check(
        ACTION_IDS.includes(action) &&
          Array.isArray(clips) &&
          clips.length > 0 &&
          clips.length <= 8 &&
          clips.every((c) => animationMatches(action,c)),
        "Invalid animation mapping",
      );
      p.animationMap[action] = [...new Set(clips)];
    }
  }
  check(p.allowedActions.every(a => ACTION_IDS.includes(a) && p.animationMap[a]?.length && p.animationMap[a].every(c=>animationMatches(a,c))), 'Action and animation semantics must match');
  p.revision = state.profile.revision + 1;
  formProfiles[p.formId] = structuredClone(p);
  const now = Date.now();
  return {
    ...state,
    version: state.version + 1,
    profile: p,
    formProfiles,
    appliedRevision: null,
    updatedAt: now,
    revealed: [...new Set([...state.revealed, p.formId])],
    history:
      p.formId === state.profile.formId
        ? state.history
        : [
            ...state.history,
            { formId: p.formId, at: now, source },
          ].slice(-50),
  };
}
export function applyDeviceEvent(state, raw) {
  check(raw && typeof raw === "object", "Invalid event");
  const eventId = id(raw.eventId);
  if (state.seen.includes(eventId)) return state;
  const e = { type: raw.type, eventId, at: Date.now() };
  let device = state.device,
    appliedRevision = state.appliedRevision,
    messages = state.messages,
    commands = state.commands;
  switch (raw.type) {
    case "device.status": {
      device = { ...device };
      if (raw.name !== undefined) device.name = text(raw.name, 100);
      for (const key of ["hardware", "camera", "jev", "language"])
        if (raw[key] !== undefined) {
          check(
            ["ready", "offline", "error", "unknown"].includes(raw[key]),
            "Invalid component status",
          );
          device[key] = raw[key];
        }
      if (raw.simulation !== undefined) {
        check(typeof raw.simulation === "boolean", "Invalid simulation flag");
        device.simulation = raw.simulation;
      }
      if (raw.actionContractVersion !== undefined) {
        check(raw.actionContractVersion === ACTION_CONTRACT_VERSION, 'Unsupported action contract');
        device.actionContractVersion = raw.actionContractVersion;
      }
      if (raw.supportedActions !== undefined) {
        check(Array.isArray(raw.supportedActions) && raw.supportedActions.length <= ACTION_IDS.length && raw.supportedActions.every(a=>ACTION_IDS.includes(a)), 'Invalid device action capabilities');
        device.supportedActions = [...new Set(raw.supportedActions)];
      }
      Object.assign(e, device);
      break;
    }
    case "profile.applied":
      check(
        raw.revision === state.profile.revision && state.profile.actionContractVersion === ACTION_CONTRACT_VERSION && state.device.actionContractVersion === ACTION_CONTRACT_VERSION,
        "Stale profile acknowledgement",
      );
      appliedRevision = raw.revision;
      e.revision = raw.revision;
      break;
    case "interaction.start":
      check(raw.profileRevision === state.profile.revision && appliedRevision === raw.profileRevision, "Interaction uses an unapplied profile");
      e.commandId = id(raw.commandId);
      check(!commands.some(c => c.commandId === e.commandId), "Duplicate interaction ID");
      e.profileRevision = raw.profileRevision;
      e.formId = state.profile.formId;
      e.userText = text(raw.userText || "", 2000, true);
      e.replyMode = raw.replyMode === "silent" ? "silent" : "text";
      commands = [...commands, {commandId: e.commandId, origin: "device", expiresAt: e.at + 120000}].slice(-200);
      break;
    case "decision":
      check(
        raw.profileRevision === state.profile.revision &&
          appliedRevision === raw.profileRevision,
        "Decision uses an unapplied profile",
      );
      check(
        availableDeviceActions(state).includes(raw.actionId),
        "Action not allowed",
      );
      check(!state.events.some(x=>x.type==='decision' && x.decisionId===raw.decisionId), 'Duplicate decision ID');
      e.formId = state.profile.formId;
      e.decisionId = id(raw.decisionId);
      e.actionId = raw.actionId;
      e.summary = text(raw.summary || "", 2000, true);
      e.profileRevision = raw.profileRevision;
      if (raw.commandId) e.commandId = id(raw.commandId);
      break;
    case "action":
      e.decisionId = id(raw.decisionId);
      check(
        state.events.some(
          (x) => x.type === "decision" && x.decisionId === e.decisionId,
        ),
        "Unknown decision",
      );
      check(
        [
          "accepted",
          "started",
          "completed",
          "interrupted",
          "failed",
          "unknown",
          "sent",
        ].includes(raw.status),
        "Invalid action status",
      );
      check(
        !state.events.some(
          (x) =>
            x.type === "action" &&
            x.decisionId === e.decisionId &&
            ["completed", "failed", "interrupted"].includes(x.status),
        ),
        "Action already has a terminal result",
      );
      e.status = raw.status;
      e.detail = text(raw.detail || "", 2000, true);
      break;
    case "observation":
    case "log":
      e.text = text(raw.text, 4000);
      break;
    case "command.result":
      e.commandId = id(raw.commandId);
      check(
        state.commands.some((c) => c.commandId === e.commandId),
        "Unknown command",
      );
      check(
        [
          "accepted",
          "completed",
          "stopped",
          "failed",
          "interrupted",
          "unknown",
        ].includes(raw.status),
        "Invalid command result",
      );
      e.status = raw.status;
      e.detail = text(raw.detail || "", 2000, true);
      break;
    case "language.start":
      e.messageId = id(raw.messageId);
      check(
        !messages.some((m) => m.id === e.messageId),
        "Message already exists",
      );
      check(
        ["user", "assistant", "system"].includes(raw.role),
        "Invalid message role",
      );
      messages = [
        ...messages,
        {
          id: e.messageId,
          role: raw.role,
          ...(raw.commandId ? { commandId: id(raw.commandId) } : {}),
          text: text(raw.text || "", 16000, true),
          status: "streaming",
          at: e.at,
        },
      ].slice(-30);
      break;
    case "language.delta":
    case "language.end": {
      e.messageId = id(raw.messageId);
      const current = messages.find((m) => m.id === e.messageId);
      check(current?.status === "streaming", "Message is not streaming");
      const value =
        raw.type === "language.delta"
          ? current.text + text(raw.text, 4000, true)
          : current.text;
      check(value.length <= 24000, "Message too long");
      const endStatus = raw.status || "complete";
      check(
        ["complete", "interrupted", "failed"].includes(endStatus),
        "Invalid message end status",
      );
      messages = messages.map((m) =>
        m === current
          ? {
              ...m,
              text: value,
              status: raw.type === "language.end" ? endStatus : "streaming",
            }
          : m,
      );
      break;
    }
    default:
      throw new Error("Unsupported event; video and CV frames must use WebRTC");
  }
  return {
    ...state,
    device,
    appliedRevision,
    messages,
    commands,
    version: state.version + 1,
    updatedAt: e.at,
    events: raw.type.startsWith("language.")
      ? state.events
      : [...state.events, e].slice(-60),
    seen: [...state.seen, eventId].slice(-500),
  };
}
export function makeCommand(state, raw, online, now = Date.now()) {
  check(online, "Device offline; commands are not queued");
  check(
    ["interact", "action", "stop"].includes(raw.command),
    "Unknown command",
  );
  if (raw.command !== "stop")
    check(
      state.appliedRevision === state.profile.revision && state.profile.actionContractVersion === ACTION_CONTRACT_VERSION && state.device.actionContractVersion === ACTION_CONTRACT_VERSION,
      "Device must apply the current profile first",
    );
  const c = {
    type: "command",
    commandId: raw.commandId ? id(raw.commandId) : crypto.randomUUID(),
    command: raw.command,
    profileRevision: state.profile.revision,
    expiresAt: now + 5000,
  };
  if (raw.command === "action") {
    check(
      availableDeviceActions(state).includes(raw.actionId),
      "Action not allowed",
    );
    c.actionId = raw.actionId;
  }
  if (raw.command === "interact") {
    check(state.device.jev === 'ready', 'JEV is not ready');
    c.input = text(raw.input, 2000);
    c.allowedActions = availableDeviceActions(state);
    check(c.allowedActions.length > 0, 'No supported actions');
  }
  return c;
}
export function chooseAnimation(action, map, random = Math.random) {
  const u = random();
  const clips = map?.[action]?.filter((c) => animationMatches(action,c));
  return clips?.length
    ? clips[Math.min(clips.length - 1, Math.max(0,Math.floor((Number.isFinite(u) ? u : 0) * clips.length)))]
    : null;
}
export function validateSignal(raw) {
  check(
    ["offer", "answer", "ice", "close"].includes(raw.kind),
    "Invalid signal kind",
  );
  const s = { type: "signal", kind: raw.kind, peerId: id(raw.peerId) };
  if (["offer", "answer"].includes(raw.kind)) s.sdp = text(raw.sdp, 60000);
  if (raw.kind === "ice") {
    check(
      raw.candidate && typeof raw.candidate === "object",
      "Invalid ICE candidate",
    );
    s.candidate = {
      candidate: text(raw.candidate.candidate, 2000, true),
      sdpMid:
        raw.candidate.sdpMid == null
          ? null
          : text(raw.candidate.sdpMid, 32, true),
      sdpMLineIndex: raw.candidate.sdpMLineIndex,
    };
    check(
      s.candidate.sdpMLineIndex == null ||
        Number.isInteger(s.candidate.sdpMLineIndex),
      "Invalid ICE index",
    );
  }
  return s;
}

// One-time additive upgrade of persisted rooms. Preserve user-authored JEV prompts.
export function upgradeRoomPersonality(state) {
  if (!state?.profile || state.personalityVersion === 1) return state;
  const oldDefault = "你是牛来。根据现场输入，在允许的动作中选择合适的回应。提示词只影响行为选择，不改变机械臂的运动限制。";
  function upgrade(profile) {
    const defaults = formProfilesDefaults[profile.formId];
    return {...defaults, ...profile, languagePrompt: profile.languagePrompt || defaults.languagePrompt,
      replyMode: defaults.replyMode, prompt: !profile.prompt || profile.prompt === oldDefault ? defaults.prompt : profile.prompt};
  }
  return {...state, personalityVersion: 1, version: state.version + 1,
    profile: {...upgrade(state.profile), revision: state.profile.revision + 1}, appliedRevision: null,
    formProfiles: Object.fromEntries(Object.entries(state.formProfiles || {}).map(([id,p])=>[id,upgrade(p)]))};
}
