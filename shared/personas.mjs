import catalog from './niulai-personas.json' with { type: 'json' };

export const PERSONA_VERSION = catalog.prompt_version;
export function personaProfile(formId) {
  const form = catalog.forms[formId];
  if (!form) throw new Error('Unknown persona form');
  return { formId, personaVersion: PERSONA_VERSION, prompt: form.jev_prompt,
    languagePrompt: `${catalog.identity}\n${form.speaking_style}`,
    replyMode: form.allow_silence ? 'silent' : 'text' };
}
