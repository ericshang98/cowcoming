import { forms } from './evolution.mjs';

export const EVOLUTION_SETTINGS_KEY = 'cowcoming-evolution-settings-v1';
export const defaultEvolutionSettings = { mode: 'auto', interval: 5, endpoint: '', model: '' };
export const successors = id => Object.values(forms).filter(form => form.parent === id).map(form => form.id);
export function validateSettings(settings) {
  if (!['auto', 'manual'].includes(settings.mode) || !Number.isInteger(settings.interval) || settings.interval < 1 || settings.interval > 100) throw new Error('invalid_settings');
  if (typeof settings.model !== 'string' || settings.model.length > 200 || typeof settings.endpoint !== 'string') throw new Error('invalid_settings');
  if (settings.endpoint) {
    const relative = /^\/(?!\/)[^\\\s?#]*$/.test(settings.endpoint);
    let remote = false;
    try { const url = new URL(settings.endpoint); remote = (url.protocol === 'https:' || isLocalEvolutionGateway(settings.endpoint)) && !url.username && !url.password && !url.search && !url.hash; } catch { /* Relative gateway. */ }
    if (!relative && !remote) throw new Error('invalid_endpoint');
  }
  return { mode: settings.mode, interval: settings.interval, endpoint: settings.endpoint.trim(), model: settings.model.trim() };
}
export function readEvolutionSettings(storage) {
  try { return validateSettings({ ...defaultEvolutionSettings, ...JSON.parse(storage.getItem(EVOLUTION_SETTINGS_KEY)) }); }
  catch { return { ...defaultEvolutionSettings }; }
}
export function createEvolutionSession(sessionId, settings = defaultEvolutionSettings) {
  return { sessionId, generation: 0, form: 'calf', settings: validateSettings(settings), turns: [], checkpoint: 0, pending: null, status: 'idle', reason: '', path: ['calf'] };
}
export function evolutionStatus(state) {
  if (state.settings.mode === 'manual') return 'manual';
  if (!successors(state.form).length) return 'terminal';
  if (!state.settings.endpoint || !state.settings.model) return 'unconfigured';
  return state.status;
}
export function evaluationDue(state) {
  return evolutionStatus(state) === 'idle' && state.turns.length - state.checkpoint >= state.settings.interval;
}
function invalidate(state, changes = {}) {
  return { ...state, generation: state.generation + 1, checkpoint: state.turns.length, pending: null, status: 'idle', reason: '', ...changes };
}
export function evolutionReducer(state, event) {
  switch (event.type) {
    case 'settings': return invalidate(state, { settings: validateSettings(event.settings) });
    case 'select':
      if (!forms[event.form]) return state;
      return invalidate(state, { form: event.form, path: [...state.path, event.form], settings: { ...state.settings, mode: 'manual' } });
    case 'reset': return { ...createEvolutionSession(event.sessionId, state.settings), roomId: state.roomId, generation: state.generation + 1 };
    case 'bind':
      if (!forms[event.form] || !event.roomId) return state;
      return { ...createEvolutionSession(event.sessionId, state.settings), roomId: event.roomId, form: event.form, path: [event.form], generation: state.generation + 1 };
    case 'suspend': return { ...state, generation: state.generation + 1, pending: null, status: state.pending ? 'error' : state.status, reason: state.pending ? 'device_disconnected' : state.reason };
    case 'turn': {
      const turn = event.turn;
      if (!turn || turn.sessionId !== state.sessionId || turn.generation !== state.generation || turn.formId !== state.form || turn.source !== 'live' || turn.status !== 'completed' || typeof turn.id !== 'string' || !turn.id || state.turns.some(item => item.id === turn.id) || typeof turn.userText !== 'string' || !turn.userText.trim() || !(typeof turn.replyText === 'string' && turn.replyText.trim() || turn.actionCompleted === true)) return state;
      return { ...state, turns: [...state.turns, { id: turn.id, formId: turn.formId, userText: turn.userText, replyText: typeof turn.replyText === 'string' ? turn.replyText : '', actionCompleted: turn.actionCompleted === true }] };
    }
    case 'evaluate':
      if (!evaluationDue(state)) return state;
      return { ...state, status: 'evaluating', pending: { requestId: event.requestId, sessionId: state.sessionId, generation: state.generation, currentForm: state.form, turnCount: state.turns.length } };
    case 'result': {
      const pending = state.pending, result = event.result;
      if (!pending || !result || result.requestId !== pending.requestId || result.sessionId !== state.sessionId || result.generation !== state.generation) return state;
      if (!['stay', 'evolve'].includes(result.decision) || typeof result.reason !== 'string' || result.reason.length > 1000 || (result.decision === 'evolve' ? !successors(state.form).includes(result.targetForm) : result.targetForm !== state.form)) return { ...state, pending: null, status: 'error', reason: 'invalid_response' };
      const evolved = result.decision === 'evolve';
      return { ...state, form: result.targetForm, generation: state.generation + (evolved ? 1 : 0), checkpoint: evolved ? state.turns.length : pending.turnCount, pending: null, status: 'idle', reason: result.reason, path: evolved ? [...state.path, result.targetForm] : state.path };
    }
    case 'error':
      return state.pending?.requestId === event.requestId ? { ...state, pending: null, status: 'error', reason: event.error } : state;
    case 'retry': return state.status === 'error' ? { ...state, status: 'idle', reason: '' } : state;
    default: return state;
  }
}
export function evaluationRequest(state) {
  if (!state.pending) throw new Error('no_pending_evaluation');
  return { ...state.pending, model: state.settings.model, allowedNextForms: successors(state.form), turns: state.turns.slice(0, state.pending.turnCount) };
}
export const isLocalEvolutionGateway = endpoint => ['http://127.0.0.1:8768/evaluate', 'http://localhost:8768/evaluate'].includes(endpoint);

// A configured gateway owns provider credentials and maps this contract to its LLM.
// Never truncate the conversation or silently replace evaluation with a timer.
export async function requestEvolutionEvaluation(endpoint, payload, { signal, fetcher = fetch, localKey } = {}) {
  const response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(isLocalEvolutionGateway(endpoint) && localKey ? {Authorization: 'Bearer ' + localKey} : {}) }, credentials: 'same-origin', signal, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const result = await response.json();
  if (result.requestId !== payload.requestId || result.sessionId !== payload.sessionId || result.generation !== payload.generation) throw new Error('invalid_response');
  return result;
}
