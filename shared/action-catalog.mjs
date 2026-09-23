// Response semantics are shared by the website, relay and exported device kit.
export const ACTION_CONTRACT_VERSION = 2;
export const ACTION_CATALOG = {
  NOD: { label: '确认点头', en: 'Confirm nod', animation: 'nod-soft', suffix: 'nod_confirm' },
  SHAKE: { label: '摇头', en: 'Shake head', animation: 'head-shake', suffix: 'head_shake' },
  NOD_DOUBLE: { label: '得意双点头', en: 'Proud double nod', animation: 'nod-double', suffix: 'nod_proud' },
  TILT_LEFT: { label: '左侧好奇歪头', en: 'Curious tilt left', animation: 'tilt-left', suffix: 'tilt_curious_left' },
  TILT_RIGHT: { label: '右侧好奇歪头', en: 'Curious tilt right', animation: 'tilt-right', suffix: 'tilt_curious_right' },
};
export const ACTION_IDS = [...Object.keys(ACTION_CATALOG), 'WAIT'];
export const DEFAULT_MAP = Object.fromEntries([...Object.entries(ACTION_CATALOG).map(([id, a]) => [id, [a.animation]]), ['WAIT', ['idle']]]);
export const ANIMATIONS = Object.values(DEFAULT_MAP).flat();
export function animationMatches(action, clip) { return DEFAULT_MAP[action]?.includes(clip) === true; }
export function availableDeviceActions(state) {
  if (state.profile.actionContractVersion !== ACTION_CONTRACT_VERSION || state.device.actionContractVersion !== ACTION_CONTRACT_VERSION) return [];
  const supported = state.device.supportedActions || [];
  return state.profile.allowedActions.filter(a => a === 'WAIT' || (state.profile.formId !== 'playful' && state.device.hardware === 'ready' && supported.includes(a)));
}
