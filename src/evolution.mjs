import { NIULAI_ASSET } from './scene/niulai.mjs';

// Eric's evolution tree. Supplied final forms use their own rigs; the other
// forms keep the explicitly labelled reference until their assets are provided.
export const forms = {
  calf: { id: 'calf', name: '小牛', parent: null, depth: 0, branch: null, description: 'Where every evolution begins.', model: null },
  normal: { id: 'normal', name: '普通牛来', parent: 'calf', depth: 1, branch: null, description: 'The next step. The rest is yet to be discovered.', model: null },
  playful: { id: 'playful', name: '骚牛', parent: 'normal', depth: 2, branch: 'celestial', description: 'The left branch, leading to 仙牛.', model: null },
  tough: { id: 'tough', name: '硬牛', parent: 'normal', depth: 2, branch: 'dark', description: 'The right branch, leading to 暗黑牛.', model: null },
  celestial: { id: 'celestial', name: '仙牛', parent: 'playful', depth: 3, branch: 'celestial', description: 'The next evolution of 骚牛.', model: '/models/work/xianniu-web.glb' },
  dark: { id: 'dark', name: '暗黑牛', parent: 'tough', depth: 3, branch: 'dark', description: 'The next evolution of 硬牛.', model: '/models/work/dark-niulai-web.glb' },
};

export const evolutionRoutes = [
  { id: 'celestial', name: '仙牛 path', nodes: ['calf', 'normal', 'playful', 'celestial'] },
  { id: 'dark', name: '暗黑牛 path', nodes: ['calf', 'normal', 'tough', 'dark'] },
];

export const evolutionEdges = Object.values(forms)
  .filter(form => form.parent)
  .map(form => ({ from: form.parent, to: form.id }));

// Revealed forms are separate from preview selection and model availability.
// Real progression can supply this list later; browsing never unlocks a form.
export const revealedForms = ['calf', 'normal'];
export function isFormRevealed(formId, revealed = revealedForms) {
  return Boolean(forms[formId]) && revealed.includes(formId);
}

export function ancestry(formId) {
  const path = [];
  for (let form = forms[formId]; form; form = forms[form.parent]) path.unshift(form.id);
  return path;
}

export function selectEvolutionForm(routeId, formId, revealed = revealedForms) {
  const form = isFormRevealed(formId, revealed) ? forms[formId] : forms.calf;
  const route = evolutionRoutes.find(item => item.id === routeId && item.nodes.includes(form.id))
    || evolutionRoutes.find(item => item.nodes.includes(form.id));
  return { route: route.id, form: form.id };
}

export function resolvePreview(routeId, formId, revealed = revealedForms) {
  const route = evolutionRoutes.find(item => item.id === routeId) || evolutionRoutes[0];
  const form = forms[route.nodes.includes(formId) && isFormRevealed(formId, revealed) ? formId : 'calf'];
  return { route, form, model: form.model || NIULAI_ASSET, placeholder: !form.model };
}
