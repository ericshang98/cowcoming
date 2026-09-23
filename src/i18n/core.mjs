import {messages} from './messages.mjs';
import {guideMessages} from './guide.mjs';
export const LANGUAGE_KEY='niulai-language-v1';
export const normalizeLanguage = value => value === 'en' ? 'en' : 'zh';
const normalizeText = value => value.trim().replace(/\s+/g,' ');
const dictionary = new Map();
for(const [zh,sourceEnglish] of [...messages,...guideMessages]) {
  const en=sourceEnglish.replaceAll("普通牛来", "Standard Niulai").replaceAll("暗黑牛", "Dark Niulai").replaceAll("仙牛", "Celestial Niulai").replaceAll("骚牛", "Playful Niulai").replaceAll("硬牛", "Tough Niulai").replaceAll("小牛", "Calf").replaceAll("牛来", "Niulai");
  const pair={zh,en}; dictionary.set(normalizeText(zh),pair); dictionary.set(normalizeText(sourceEnglish),pair); dictionary.set(normalizeText(en),pair);
}
export function readLanguage(storage) {
  try {return normalizeLanguage(storage.getItem(LANGUAGE_KEY));} catch {return 'zh';}
}
export function saveLanguage(storage,language) {
  try {storage.setItem(LANGUAGE_KEY,normalizeLanguage(language));return true;} catch{return false;}
}
export function translateText(value, language='zh') {
  if(typeof value!=='string' || !value.trim()) return value;
  const locale=normalizeLanguage(language), text=value.trim();
  const pair=dictionary.get(normalizeText(text));
  if(!pair && text.includes(' → ')) return text.split(' → ').map(part=>translateText(part,locale)).join(' → ');
  let translated=pair?.[locale];
  if(!pair && text.startsWith('Preview ') && dictionary.has(text.slice(8))) return `${locale==='zh'?'预览':'Preview'} ${translateText(text.slice(8),locale)}`;
  if(!translated) {
    const patterns = [
      [/^选择模型 · 当前(.+)$/,m=>`Choose a model · Current: ${translateText(m[1],'en')}`],
      [/^正在加载(.+)，当前仍显示(.+)。$/,m=>`Loading ${translateText(m[1],'en')}. Still showing ${translateText(m[2],'en')}.`],
      [/^(.+)加载失败，仍显示(.+)。请重试。$/,m=>`Could not load ${translateText(m[1],'en')}. Still showing ${translateText(m[2],'en')}. Try again.`],
      [/^(.+)暂不支持口型$/,m=>`${translateText(m[1],'en')} does not support mouth poses yet`],
      [/^星光 \+1 · 已点亮 (\d+) \/ (\d+)$/, (m)=>`Star +1 · Collected ${m[1]} / ${m[2]}`],
      [/^已点亮 (\d+) \/ (\d+) 颗星光$/,m=>`${m[1]} / ${m[2]} stars collected`],
      [/^已收集 (\d+) \/ (\d+) 颗星光$/,m=>`${m[1]} of ${m[2]} stars collected`],
      [/^还差 (\d+) 颗星光$/,m=>`${m[1]} ${m[1]==='1'?'star':'stars'} to go`],
      [/^前往星光 (\d+) · (\d+) 米$/,m=>`Star ${m[1]} · ${m[2]} m away`],
      [/^星光 (\d+)，已点亮$/,m=>`Star ${m[1]}, collected`],
      [/^星光 (\d+)，设为目标$/,m=>`Star ${m[1]}, set as destination`],
      [/^WORLD 星光 (\d+)\/27 · 集齐解锁$/,m=>`WORLD ${m[1]}/27 stars · Collect all to unlock`],
      [/^(播放|停止)：(.+)$/,m=>`${m[1]==='播放'?'Play':'Stop'}: ${translateText(m[2],'en')}`],
      [/^(.+) · (\d+(?:\.\d+)?) 秒$/,m=>`${translateText(m[1],'en')} · ${m[2]} sec`],
      [/^(牛来|Cowcoming) — (.+)$/,m=>`${m[1]==='牛来'?'Niulai':m[1]} — ${translateText(m[2],'en')}`],
    ];
    if(locale==='en') for(const [pattern,render] of patterns) {const m=text.match(pattern);if(m){translated=render(m);break;}}
  }
  if(!translated && locale==='zh') {
    const patterns=[
      [/^(Play|Stop): (.+)$/,m=>`${m[1]==='Play'?'播放':'停止'}：${translateText(m[2],'zh')}`],
      [/^(.+) · (\d+(?:\.\d+)?) sec$/,m=>`${translateText(m[1],'zh')} · ${m[2]} 秒`],
      [/^WORLD stars (\d+)\/27 · Collect all to unlock$/,m=>`WORLD 星光 ${m[1]}/27 · 集齐解锁`],
    ];
    for(const [pattern,render] of patterns){const match=text.match(pattern);if(match){translated=render(match);break;}}
  }
  if(!translated) return value;
  return value.match(/^\s*/)[0]+translated+value.match(/\s*$/)[0];
}
