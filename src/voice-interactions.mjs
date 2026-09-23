const longLines = new Set(['growing', 'tomorrow', 'same-different']);

export function pickWaveVoice(voices, previousId, random = Math.random) {
  const pool = voices.filter(v => longLines.has(v.id) && v.id !== previousId);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function isWaveShortcut(event) {
  return event.key.toLowerCase() === 'l' && !event.repeat &&
    !event.ctrlKey && !event.metaKey && !event.altKey &&
    !event.target.isContentEditable &&
    !event.target.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}
