import { NIULAI_ASSET } from './scene/niulai.mjs';

// Same-origin assets work in both local builds and the existing Pages site.
const fengge = '/characters/fengge/v1';
export const ipCatalog = [
  { id: 'niulai', name: '牛来', nameEn: 'Niulai', available: true, model: NIULAI_ASSET, clips: ['idle'], initial: '牛', description: ['陪你成长的桌面伙伴', 'Your evolving desktop companion'] },
  { id: 'fengge', name: '峰哥', nameEn: 'Fengge', available: true, model: `${fengge}/model.glb`, thumbnail: `${fengge}/preview.png`, clips: ['idle', 'nod', 'reflect'], initial: '峰', description: ['点头回应，想一想再接话', 'A nod, a thought, a quick reply'], hint: ['左键点头回应 · L 思考接话', 'Click to nod · L to reflect'], actionLabel: ['峰哥想一想 · L', 'Think with Fengge · L'],
    actions: {
      tap: { clip: 'nod', src: `${fengge}/tap.mp3`, duration: 1.25, text: '毫无疑问。', textEn: 'Without a doubt.' },
      signature: { clip: 'reflect', src: `${fengge}/signature.mp3`, duration: 3.38, text: '你觉得他算是个成功的网红吗？毫无疑问。', textEn: 'Would you call him a successful influencer? Without a doubt.' },
    } },
  { id: 'spiderman', name: '蜘蛛侠', nameEn: 'Spider-Man', available: true, initial: '蛛', model: '/characters/spiderman/v1/model.glb', thumbnail: '/characters/spiderman/v1/preview.png', clips: ['idle', 'wave', 'bow'], description: ['蹲姿招呼，蓄势回应', 'A crouched greeting, ready for action'], hint: ['左键抬手招呼 · L 蓄势回应', 'Click to greet · L to brace'], actionLabel: ['蜘蛛侠蓄势 · L', 'Spider-Man · L'],
    actions: { tap: { clip: 'wave', src: '/characters/spiderman/v1/tap.mp3', duration: 1.32, text: '抬手招呼', textEn: 'A quick greeting' }, signature: { clip: 'bow', src: '/characters/spiderman/v1/signature.mp3', duration: 3.82, text: '蓄势回应', textEn: 'Ready for action' } } },
  { id: 'nailong', name: '奶龙', nameEn: 'Nailong', available: true, initial: '奶', model: '/characters/nailong/v1/model.glb', thumbnail: '/characters/nailong/v1/preview.png', clips: ['idle', 'tilt', 'wave'], description: ['歪头看看你，开心打招呼', 'A curious tilt and a happy hello'], hint: ['左键歪头回应 · L 开心招呼', 'Click for curiosity · L for a happy hello'], actionLabel: ['奶龙打招呼 · L', 'Nailong says hello · L'],
    actions: { tap: { clip: 'tilt', src: '/characters/nailong/v1/tap.mp3', duration: 1.9, text: '歪头看看你', textEn: 'A curious look' }, signature: { clip: 'wave', src: '/characters/nailong/v1/signature.mp3', duration: 3.25, text: '开心打招呼', textEn: 'A happy hello' } } },
  { id: 'toothless', name: '小黑龙', nameEn: 'Little Dragon', available: true, initial: '龙', model: '/characters/toothless/v1/model.glb', thumbnail: '/characters/toothless/v1/preview.png', clips: ['idle', 'tilt', 'wing_flap'], description: ['好奇歪头，轻轻扇动翅膀', 'Curious looks and little wing flaps'], hint: ['左键好奇短鸣 · L 扇动翅膀', 'Click for a chirp · L to flap wings'], actionLabel: ['小黑龙扇扇翅膀 · L', 'Flap little wings · L'],
    actions: { tap: { clip: 'tilt', src: '/characters/toothless/v1/tap.mp3', duration: 2.08, text: '好奇地咕噜一声', textEn: 'A curious chirp' }, signature: { clip: 'wing_flap', src: '/characters/toothless/v1/signature.mp3', duration: 3.85, text: '轻轻扇动翅膀', textEn: 'Little wing flaps' } } },
];
export const getIp = id => ipCatalog.find(ip => ip.id === id);
export function savedIp(storage) {
  try { const id = storage?.getItem('cowcoming-ip'); return getIp(id)?.available ? id : 'niulai'; }
  catch { return 'niulai'; }
}
