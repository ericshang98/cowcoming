#!/usr/bin/env node
/*
 * Local-only model gateway for the browser preview.
 *
 * It has two honest modes:
 *   1. If a model endpoint is configured, forward the request server-side.
 *   2. Otherwise use the small deterministic fixture, labelled as local test
 *      output so it cannot be mistaken for a real model call.
 *
 * No key is ever sent to the browser. Configure secrets in the shell or a
 * private .env.local file, never in VITE_* variables.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.LOCAL_GATEWAY_PORT || 8768);
const host = '127.0.0.1';
const allowedActions = ['NOD', 'SHAKE', 'NOD_DOUBLE', 'TILT_LEFT', 'TILT_RIGHT', 'WAIT'];
const forms = {
  calf: { label: '小牛', next: ['normal'] },
  normal: { label: '普通牛来', next: ['playful', 'tough'] },
  playful: { label: '骚牛', next: ['celestial'] },
  tough: { label: '硬牛', next: ['dark'] },
  celestial: { label: '仙牛', next: [] },
  dark: { label: '暗黑牛', next: [] },
};

function json(res, status, value, origin = '') {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(value));
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function extractText(value) {
  const content = value?.choices?.[0]?.message?.content ?? value?.message?.content ?? value?.output ?? value?.text;
  if (typeof content !== 'string') return '';
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return trimmed;
}

function envFor(prefix) {
  return {
    endpoint: String(process.env[`${prefix}_ENDPOINT`] || '').trim(),
    model: String(process.env[`${prefix}_MODEL_NAME`] || process.env[`${prefix}_MODEL`] || '').trim(),
    provider: String(process.env[`${prefix}_MODEL_PROVIDER`] || process.env[`${prefix}_PROVIDER`] || 'openai-compatible').trim(),
    key: String(process.env[`${prefix}_MODEL_KEY`] || process.env[`${prefix}_KEY`] || '').trim(),
  };
}

async function callConfiguredModel(prefix, messages, fallback) {
  const config = envFor(prefix);
  if (!config.endpoint || !config.model) return fallback();
  const body = config.provider === 'ollama'
    ? { model: config.model, messages, stream: false, format: 'json' }
    : { model: config.model, messages, temperature: 0, response_format: { type: 'json_object' } };
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(config.key ? { authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`configured model HTTP ${response.status}`);
  const value = await response.json();
  const text = extractText(value);
  const parsed = parseJson(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('configured model returned invalid JSON');
  return parsed;
}

function fixtureAction(text = '') {
  if (/安静|休息|别动|停|等待|不要/i.test(text)) return 'WAIT';
  if (/两次|双点|得意|厉害|赞/i.test(text)) return 'NOD_DOUBLE';
  if (/摇头|拒绝|不行|不要/i.test(text)) return 'SHAKE';
  if (/左.*歪|左边|好奇左/i.test(text)) return 'TILT_LEFT';
  if (/右.*歪|右边|好奇右/i.test(text)) return 'TILT_RIGHT';
  if (/点头|同意|可以|好的|谢谢|你好|欢迎/i.test(text)) return 'NOD';
  const hash = [...text].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return allowedActions[hash % (allowedActions.length - 1)];
}

async function gevPreview(input) {
  const requestId = typeof input.requestId === 'string' && input.requestId ? input.requestId : randomUUID();
  const text = typeof input.text === 'string' ? input.text.slice(0, 500) : '';
  const configured = envFor('GEV_MODEL');
  const result = await callConfiguredModel('GEV_MODEL', [
    { role: 'system', content: '你是 GEV 快速动作决策器。只返回 JSON：{"actionId":"NOD|SHAKE|NOD_DOUBLE|TILT_LEFT|TILT_RIGHT|WAIT","summary":"简短中文理由"}。只能选择允许动作，不能生成新动作。' },
    { role: 'user', content: JSON.stringify({ text, formId: input.formId, allowedActions }) },
  ], () => ({ actionId: fixtureAction(text), summary: '本地规则测试适配器根据输入选择已有动作。' }));
  if (configured.endpoint && configured.model && !allowedActions.includes(result.actionId)) throw new Error('configured GEV returned an unsupported action');
  const actionId = allowedActions.includes(result.actionId) ? result.actionId : fixtureAction(text);
  return { requestId, actionId, summary: String(result.summary || '本地 GEV 测试适配器已返回动作。').slice(0, 240), modelVersion: envFor('GEV_MODEL').model || 'local-gev-fixture-v1', latencyMs: 0 };
}

async function evaluation(input) {
  const current = forms[input.currentForm];
  const allowed = Array.isArray(input.allowedNextForms) ? input.allowedNextForms.filter(id => current?.next.includes(id)) : [];
  if (!current || !allowed.length) return { requestId: input.requestId, sessionId: input.sessionId, generation: input.generation, decision: 'stay', targetForm: input.currentForm, reason: '当前形态没有可用的下一节点。' };
  const result = await callConfiguredModel('EVOLUTION_MODEL', [
    { role: 'system', content: '你是牛来进化评估器。只返回 JSON：{"decision":"stay|evolve","targetForm":"合法节点","reason":"简短中文理由"}。只能沿 allowedNextForms 前进，不能因为轮数到了就强制进化。' },
    { role: 'user', content: JSON.stringify({ currentForm: input.currentForm, allowedNextForms: allowed, turns: input.turns }) },
  ], () => ({ decision: 'stay', targetForm: input.currentForm, reason: '本地评估测试适配器默认保持当前形态，方便先检查完整会话链路。' }));
  const evolve = result.decision === 'evolve' && allowed.includes(result.targetForm);
  return { requestId: input.requestId, sessionId: input.sessionId, generation: input.generation, decision: evolve ? 'evolve' : 'stay', targetForm: evolve ? result.targetForm : input.currentForm, reason: String(result.reason || '本地评估完成。').slice(0, 1000) };
}

function localChat(body) {
  const last = [...(body.messages || [])].reverse().find(message => message?.role === 'user');
  const prompt = String(last?.content || '').replace(/^你是.*?。请回应：/s, '').trim();
  const form = /小牛|calf/.test(JSON.stringify(body.messages)) ? '小牛' : '牛来';
  const content = prompt ? `${form}收到：${prompt}。我先用本地测试语言模型陪你回应，等你接入真实模型后再换成正式人格。` : `${form}哞？本地语言模型已经准备好了。`;
  return { id: `local-chat-${randomUUID()}`, object: 'chat.completion', model: body.model || 'local-llm-fixture-v1', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }] };
}

async function chatCompletion(body) {
  const config = envFor('LLM_MODEL');
  if (!config.endpoint || !config.model) return localChat(body);
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(config.key ? { authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify({ ...body, model: config.model, stream: false }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`configured language model HTTP ${response.status}`);
  return response.json();
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 262144) throw new Error('request too large'); chunks.push(chunk); }
  const value = parseJson(Buffer.concat(chunks).toString());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON object required');
  return value;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const headers = { 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }
  const path = new URL(req.url || '/', `http://${host}:${port}`).pathname;
  try {
    if (req.method === 'GET' && path === '/health') { json(res, 200, { ready: true, gev: envFor('GEV_MODEL').model || 'local-gev-fixture-v1', llm: envFor('LLM_MODEL').model || 'local-llm-fixture-v1' }, origin); return; }
    if (req.method !== 'POST') { json(res, 404, { error: 'not found' }, origin); return; }
    const body = await readBody(req);
    const value = path === '/gev/preview' ? await gevPreview(body) : path === '/evaluate' ? await evaluation(body) : path === '/v1/chat/completions' ? await chatCompletion(body) : null;
    if (!value) { json(res, 404, { error: 'not found' }, origin); return; }
    json(res, 200, value, origin);
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : 'local gateway failed' }, origin);
  }
});
server.listen(port, host, () => console.log(`Local model gateway ready at http://${host}:${port} (fixture fallback enabled)`));
