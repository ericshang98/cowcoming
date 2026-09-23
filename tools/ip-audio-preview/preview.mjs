const $ = (id) => document.getElementById(id);
const audio = new Audio();
audio.preload = 'auto';
audio.volume = .65;
let manifest, selected, track, request = 0, raf, peaks = [], playing = false;
const cache = new Map();
let decoder;
let modelStage, stageLoading = false;
function controls() {
  const waiting = selected?.id === 'fengge' && !modelStage?.ready;
  $('tap').disabled = waiting; $('signature').disabled = waiting;
}
async function showModel() {
  if (selected.id !== 'fengge') { modelStage?.show(false); $('model-stage').hidden = true; return; }
  $('model-stage').hidden = false; controls();
  if (modelStage) { modelStage.show(true); return; }
  if (stageLoading) return;
  stageLoading = true;
  try {
    const { createModelStage } = await import('./model-stage.mjs');
    modelStage = createModelStage($('model-stage'), () => play('tap'), controls);
    if (new URLSearchParams(location.search).has('qa')) window.__fenggeStage = modelStage;
    modelStage.show(selected.id === 'fengge');
  } catch {
    $('model-stage').dataset.state = 'error';
    $('model-stage').querySelector('[role="status"]').textContent = '模型播放器未能载入，请重试。';
    $('retry-model').hidden = false; $('retry-model').onclick = showModel;
  } finally { stageLoading = false; }
}
function clock(seconds = 0) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function draw() {
  const canvas = $('waveform'), width = canvas.clientWidth, height = 88, ratio = devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = height * ratio; }
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  const values = peaks.length ? peaks : Array(110).fill(.04);
  values.forEach((v, i) => { const h = Math.max(2, v * 72); ctx.fillStyle = i / values.length < progress ? '#cfeeaa' : '#526247'; ctx.fillRect(i * width / values.length, (height - h) / 2, Math.max(1, width / values.length - 3), h); });
  $('elapsed').textContent = clock(audio.currentTime);
  const cues = track?.cues || [];
  $('cues').querySelectorAll('.cue').forEach((el, i) => el.classList.toggle('active', playing && audio.currentTime >= cues[i].at && audio.currentTime < (cues[i + 1]?.at ?? track.duration)));
}
function stop(message = '已停止。可以重新试听。') {
  request++; playing = false; audio.pause(); audio.currentTime = 0; modelStage?.stop(); cancelAnimationFrame(raf); $('status').textContent = message; draw();
}
async function waveform(item, token) {
  try {
    if (!cache.has(item.id)) {
      decoder ||= new AudioContext();
      const r = await fetch(item.src); if (!r.ok) throw new Error('load');
      const b = await decoder.decodeAudioData(await r.arrayBuffer());
      const data = b.getChannelData(0), block = Math.max(1, Math.floor(data.length / 110));
      const p = Array.from({ length: 110 }, (_, i) => { let sum = 0, n = 0; for (let k = i * block; k < Math.min((i + 1) * block, data.length); k++) { sum += data[k] ** 2; n++; } return Math.sqrt(sum / Math.max(1, n)); });
      const max = Math.max(.001, ...p); cache.set(item.id, p.map(v => v / max));
    }
    if (token === request) { peaks = cache.get(item.id); draw(); }
  } catch { if (token === request) { peaks = []; draw(); } }
}
function showTrack(item) {
  track = item; peaks = cache.get(item.id) || [];
  $('kind').textContent = `${selected.name} / ${item.input === 'tap' ? '左键 · 短回应' : 'L · 招牌表演'}`;
  $('title').textContent = item.title; $('description').textContent = item.description;
  $('duration').textContent = `${item.duration.toFixed(2)} 秒`; $('total').textContent = clock(item.duration);
  $('cues').replaceChildren(...item.cues.map(c => { const el = document.createElement('span'); el.className = 'cue'; el.textContent = `${c.at.toFixed(2)}s ${c.label}`; return el; }));
  draw();
}
function select(id) {
  stop('已选好角色。点击短回应，或按 L 试听。');
  selected = manifest.characters.find(c => c.id === id);
  showModel(); controls();
  document.querySelectorAll('.character').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  showTrack(selected.tracks[0]);
  $('notes').replaceChildren();
  for (const item of selected.tracks) {
    const p = document.createElement('p'); p.textContent = `${item.title}：${item.sourceNote} `;
    for (const source of item.sources) { if (!/^https:\/\//.test(source.url)) continue; const a = document.createElement('a'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = ` ${source.label} ↗`; p.append(a); }
    $('notes').append(p);
  }
}
async function play(input) {
  if (!selected) return;
  if (selected.id === 'fengge' && !modelStage?.ready) { $('status').textContent = '请等待峰哥模型载入；载入失败时可重试。'; return; }
  stop('正在准备声音…');
  const token = request, item = selected.tracks.find(t => t.input === input); showTrack(item);
  audio.src = item.src;
  audio.onended = () => { if (token !== request) return; playing = false; modelStage?.stop(); cancelAnimationFrame(raf); $('status').textContent = '播放完成。再按一次，或换个角色听听。'; draw(); };
  audio.onerror = () => { if (token === request) stop('声音未能载入，请重试。'); };
  waveform(item, token);
  try {
    await audio.play();
    if (token !== request) return;
    if (selected.id === 'fengge') modelStage.play(item, audio);
    playing = true; $('status').textContent = audio.muted || audio.volume === 0 ? '正在播放 · 声音已关闭' : `正在播放 · ${selected.name}`;
    function tick() { if (token !== request || !playing) return; draw(); raf = requestAnimationFrame(tick); } tick();
  } catch { if (token === request) stop('暂时无法播放，请点击按钮重试。'); }
}
$('tap').onclick = () => play('tap'); $('signature').onclick = () => play('signature'); $('stop').onclick = () => stop();
$('volume').oninput = e => { audio.volume = Number(e.target.value); if (playing) $('status').textContent = audio.volume === 0 || audio.muted ? '正在播放 · 声音已关闭' : `正在播放 · ${selected.name}`; };
$('mute').onclick = () => { audio.muted = !audio.muted; $('mute').setAttribute('aria-pressed', String(audio.muted)); $('mute').textContent = audio.muted ? '声音关' : '声音开'; $('mute').setAttribute('aria-label', audio.muted ? '取消静音' : '静音'); if (audio.muted) stop('已静音。再次点击“声音关”可恢复。'); };
document.addEventListener('keydown', e => { if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.isContentEditable || e.target.closest('input,textarea,select')) return; if (e.key.toLowerCase() === 'l') { e.preventDefault(); play('signature'); } if (e.key === 'Escape') stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop('离开页面，播放已停止。'); });
window.addEventListener('pagehide', () => stop()); window.addEventListener('resize', draw);
try {
  const response = await fetch('manifest.json'); if (!response.ok) throw new Error('manifest'); manifest = await response.json();
  const feng = manifest.characters.find(c => c.id === 'fengge');
  feng.tagline = '点头 / 思考接话';
  feng.tracks[0].title = '点点头，毫无疑问';
  feng.tracks[0].description = '左键点击人物，播放真实骨骼点头动作与现有短回应。';
  feng.tracks[0].cues = [{at: 0, label: '点头回应'}, {at: .10, label: '毫无疑问'}, {at: 1.1, label: '收势'}];
  feng.tracks[1].title = '想一想，再接一句';
  feng.tracks[1].description = '按 L，播放原模型的思考动作，配现有问答录音；声音保持原速。';
  feng.tracks[1].cues = [{at: 0, label: '思考动作'}, {at: .10, label: '提问'}, {at: 2.16, label: '接话'}, {at: 3.1, label: '收势'}];
  for (const [index, c] of manifest.characters.entries()) {
    const b = document.createElement('button'); b.className = 'character'; b.dataset.id = c.id; b.style.setProperty('--color', c.color); b.setAttribute('aria-pressed', 'false');
    const n = document.createElement('span'); n.className = 'number'; n.textContent = `0${index + 1}`;
    const dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
    const title = document.createElement('strong'); title.textContent = c.name;
    const small = document.createElement('small'); small.textContent = c.tagline;
    b.append(n, dot, title, small); b.onclick = () => select(c.id); $('characters').append(b);
  }
  const requested = new URLSearchParams(location.search).get('character');
  select(manifest.characters.some(c => c.id === requested) ? requested : manifest.characters[0].id);
} catch { $('status').textContent = '声音清单尚未就绪，请检查本地素材后刷新。'; }
