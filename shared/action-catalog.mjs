// The public behavior vocabulary describes what a desktop pet can express.
// A device advertises a verified subset of this catalog; the catalog itself is
// deliberately larger than any one robot (including the original BenBen arm).
export const ACTION_CONTRACT_VERSION = 2;
export const BEHAVIOR_CATALOG_VERSION = 1;

const define = (label, en, group, region, animation, options = {}) => ({
  label,
  en,
  group,
  region,
  animation,
  softwareClips: options.softwareClips || [animation],
  suffix: options.suffix || null,
  hardwareAliases: options.hardwareAliases || [],
  composite: Boolean(options.composite),
  deprecated: Boolean(options.deprecated),
});

export const ACTION_GROUPS = Object.freeze([
  { id: "head", label: "头部与视线", en: "Head & gaze" },
  { id: "body", label: "躯干与身体", en: "Body & torso" },
  { id: "paws", label: "脚与前肢", en: "Paws & forelegs" },
  { id: "belly", label: "肚子与呼吸", en: "Belly & breathing" },
  { id: "tail", label: "尾巴与姿态", en: "Tail & posture" },
  { id: "play", label: "组合表达", en: "Composed expressions" },
]);

export const ACTION_CATALOG = Object.freeze({
  // These stable IDs remain available to existing BenBen adapters. They are
  // only one hardware profile, not the complete public action vocabulary.
  NOD: define("确认点头", "Confirm nod", "head", "head", "nod-soft", { suffix: "nod_confirm", hardwareAliases: ["NOD"] }),
  SHAKE: define("摇头", "Shake head", "head", "head", "head-shake", { suffix: "head_shake", hardwareAliases: ["SHAKE"] }),
  // Kept for old BenBen rooms and adapters, but hidden from the desktop-pet
  // picker because it is a variation of NOD rather than a new body capability.
  NOD_DOUBLE: define("得意双点头", "Proud double nod", "head", "head", "nod-double", { suffix: "nod_proud", hardwareAliases: ["NOD_DOUBLE"], deprecated: true }),
  TILT_LEFT: define("左侧好奇歪头", "Curious tilt left", "head", "head", "tilt-left", { suffix: "tilt_curious_left", hardwareAliases: ["TILT_LEFT"] }),
  TILT_RIGHT: define("右侧好奇歪头", "Curious tilt right", "head", "head", "tilt-right", { suffix: "tilt_curious_right", hardwareAliases: ["TILT_RIGHT"] }),
  LOOK_LEFT: define("看向左侧", "Look left", "head", "head", "look-left"),
  LOOK_RIGHT: define("看向右侧", "Look right", "head", "head", "look-right"),
  LOOK_UP: define("抬头观察", "Look up", "head", "head", "look-up"),
  LOOK_DOWN: define("低头观察", "Look down", "head", "head", "look-down"),

  BOW: define("礼貌低头", "Polite bow", "body", "torso", "bow", { softwareClips: ["bow"], deprecated: true }),
  STRETCH: define("伸展身体", "Full body stretch", "body", "torso", "stretch"),
  BREATHE: define("身体起伏呼吸", "Body breathing", "body", "torso", "breathe"),
  SHIMMY: define("轻轻抖一抖", "Playful shimmy", "body", "torso", "shimmy"),
  TURN_LEFT: define("身体转向左侧", "Turn body left", "body", "torso", "turn-left"),
  TURN_RIGHT: define("身体转向右侧", "Turn body right", "body", "torso", "turn-right"),

  PAW_TAP_LEFT: define("左脚轻点", "Tap left paw", "paws", "foreleg", "paw-tap-left"),
  PAW_TAP_RIGHT: define("右脚轻点", "Tap right paw", "paws", "foreleg", "paw-tap-right"),
  PAW_WAVE: define("前肢挥手", "Wave a paw", "paws", "foreleg", "paw-wave"),
  PAW_REACH: define("伸出前肢", "Reach a paw", "paws", "foreleg", "paw-reach"),
  PAW_CROSS: define("交叉前肢", "Cross forelegs", "paws", "foreleg", "paw-cross"),

  BELLY_BREATHE: define("肚子呼吸", "Belly breathing", "belly", "belly", "belly-breathe", { softwareClips: ["belly-breathe"], deprecated: true }),
  BELLY_RUB: define("摸摸肚子", "Rub belly", "belly", "belly", "belly-rub"),
  BELLY_LAUGH: define("捂肚子笑", "Hold belly and laugh", "belly", "belly", "belly-laugh", { composite: true }),

  TAIL_WAG: define("摇尾巴", "Wag tail", "tail", "tail", "tail-wag"),
  SIT: define("坐下", "Sit down", "tail", "posture", "sit"),
  STAND: define("站起来", "Stand up", "tail", "posture", "stand"),
  REST: define("安静休息", "Rest", "tail", "posture", "rest"),
  WAKE: define("醒来伸懒腰", "Wake and stretch", "tail", "posture", "wake", { composite: true }),

  PLAY_BOUNCE: define("开心蹦一下", "Happy bounce", "play", "whole-body", "play-bounce", { composite: true }),
  CELEBRATE: define("庆祝摆动", "Celebrate", "play", "whole-body", "celebrate", { composite: true }),
  SHY_HIDE: define("害羞躲一下", "Shy hide", "play", "whole-body", "shy-hide", { composite: true }),
  COMFORT: define("靠近安慰", "Comfort", "play", "whole-body", "comfort", { composite: true }),
});

export const HARDWARE_ACTION_IDS = Object.freeze([
  "NOD",
  "SHAKE",
  "NOD_DOUBLE",
  "TILT_LEFT",
  "TILT_RIGHT",
  "WAIT",
]);
export const ACTION_IDS = Object.freeze([...Object.keys(ACTION_CATALOG), "WAIT"]);
export const SOFTWARE_ACTION_IDS = Object.freeze(Object.keys(ACTION_CATALOG));
// The compatibility catalog keeps legacy IDs valid on existing rooms, while
// the desktop-pet UI and GEV prompt expose only distinct behaviors.
export const PUBLIC_ACTION_IDS = Object.freeze(
  Object.keys(ACTION_CATALOG).filter((id) => !ACTION_CATALOG[id].deprecated),
);
export const DEFAULT_MAP = Object.fromEntries([
  ...Object.entries(ACTION_CATALOG).map(([id, action]) => [id, [...action.softwareClips]]),
  ["WAIT", ["idle"]],
]);
export const ANIMATIONS = [...new Set(Object.values(DEFAULT_MAP).flat())];

export function animationMatches(action, clip) {
  return DEFAULT_MAP[action]?.includes(clip) === true;
}

export function actionLabel(actionId, language = "zh") {
  if (actionId === "WAIT") return language === "zh" ? "等待" : "Wait";
  const action = ACTION_CATALOG[actionId];
  return action ? (language === "zh" ? action.label : action.en) : actionId;
}

export function actionsByGroup() {
  return ACTION_GROUPS.map((group) => ({
    ...group,
    actions: PUBLIC_ACTION_IDS
      .filter((id) => ACTION_CATALOG[id].group === group.id)
      .map((id) => [id, ACTION_CATALOG[id]])
      .map(([id, action]) => ({ id, ...action })),
  }));
}

export function deviceActionIdsForProfile(profile) {
  return (profile?.allowedActions || []).filter((id) => HARDWARE_ACTION_IDS.includes(id));
}

export function availableDeviceActions(state) {
  const profileVersion = state.profile?.actionContractVersion;
  const deviceVersion = state.device?.actionContractVersion;
  if (profileVersion !== ACTION_CONTRACT_VERSION || deviceVersion !== ACTION_CONTRACT_VERSION) return [];
  const supported = state.device.supportedActions || [];
  return state.profile.allowedActions.filter(
    (a) => a === "WAIT" || (state.device.hardware === "ready" && supported.includes(a)),
  );
}
