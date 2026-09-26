import { ACTION_IDS } from '../shared/action-catalog.mjs';

// The cloud model is deliberately narrow: it chooses one existing Niulai
// response, while the website remains responsible for rendering the real GLB.
export const GEV_PREVIEW_MODEL = 'gev-preview-v1';
export const GEV_ACTION_IDS = Object.freeze([...ACTION_IDS]);

export function resolveGevPreviewEndpoint(env = import.meta.env) {
  return String(env?.VITE_GEV_PREVIEW_URL || env?.VITE_GEP_PREVIEW_URL || '').trim();
}

export function validateGevDecision(value, requestId) {
  if (!value || typeof value !== 'object') throw new Error('GEV returned an invalid response');
  if (String(value.requestId || '') !== String(requestId)) throw new Error('GEV response did not match this request');
  if (!GEV_ACTION_IDS.includes(value.actionId)) throw new Error('GEV returned an unsupported action');
  return {
    requestId: String(value.requestId),
    actionId: value.actionId,
    summary: typeof value.summary === 'string' ? value.summary.slice(0, 240) : '',
    modelVersion: typeof value.modelVersion === 'string' ? value.modelVersion.slice(0, 80) : GEV_PREVIEW_MODEL,
    latencyMs: Number.isFinite(Number(value.latencyMs)) ? Math.max(0, Number(value.latencyMs)) : null,
  };
}

export async function requestGevDecision(endpoint, payload, { fetcher = globalThis.fetch, signal } = {}) {
  if (!endpoint) throw new Error('GEV preview endpoint is not configured');
  if (typeof fetcher !== 'function') throw new Error('Fetch is unavailable in this browser');
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response?.ok) {
    const detail = typeof response?.status === 'number' ? ` (${response.status})` : '';
    throw new Error(`GEV preview request failed${detail}`);
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error('GEV returned invalid JSON');
  }
  return validateGevDecision(value, payload.requestId);
}
