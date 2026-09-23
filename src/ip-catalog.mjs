import { NIULAI_ASSET } from './scene/niulai.mjs';

// Same-origin assets work in both local builds and the existing Pages site.
const fengge = '/characters/fengge/v1';
export const ipCatalog = [
  { id: 'niulai', name: '牛来', nameEn: 'Niulai', available: true, model: NIULAI_ASSET, clips: ['idle'], thumbnail: '/characters/avatars/niulai.png', initial: '牛', description: ['陪你成长的桌面伙伴', 'Your evolving desktop companion'] },
  { id: 'fengge', name: '峰哥', nameEn: 'Fengge', available: true, model: `${fengge}/model.glb`, thumbnail: '/characters/avatars/fengge.png', clips: ['idle', 'nod', 'reflect'], initial: '峰', description: ['点头回应，想一想再接话', 'A nod, a thought, a quick reply'], hint: ['左键点头回应 · L 摊手接话', 'Click to nod · L to explain'], actionLabel: ['峰哥接话 · L', 'Think with Fengge · L'],
    actions: {
      tap: { clip: 'nod', src: `${fengge}/tap.mp3`, duration: 1.25, text: '毫无疑问。', textEn: 'Without a doubt.' },
      signature: { clip: 'reflect', src: `${fengge}/signature.mp3`, duration: 3.38, text: '你觉得他算是个成功的网红吗？毫无疑问。', textEn: 'Would you call him a successful influencer? Without a doubt.' },
    } },
  { id: 'spiderman', name: '蜘蛛侠', nameEn: 'Spider-Man', available: true, initial: '蛛', model: '/characters/spiderman/v1/model.glb', thumbnail: '/characters/avatars/spiderman.png', clips: ['idle', 'wave', 'bow'], description: ['蹲姿招呼，蓄势回应', 'A crouched greeting, ready for action'], hint: ['左键伸腕射丝 · L 蓄力跃起', 'Click to shoot a web · L to spring'], actionLabel: ['蜘蛛侠跃起 · L', 'Spider-Man · L'],
    actions: { tap: { clip: 'wave', src: '/characters/spiderman/v1/tap.mp3', duration: 1.32, text: '伸腕射丝', textEn: 'Web shot' }, signature: { clip: 'bow', src: '/characters/spiderman/v1/signature.mp3', duration: 3.82, text: '蓄力跃起', textEn: 'Spring into action' } } },
  { id: 'nailong', name: '奶龙', nameEn: 'Nailong', available: true, initial: '奶', model: '/characters/nailong/v1/model.glb', thumbnail: '/characters/avatars/nailong.png', clips: ['idle', 'tilt', 'wave'], description: ['歪头看看你，开心打招呼', 'A curious tilt and a happy hello'], hint: ['左键歪头回应 · L 开心摆手', 'Click for curiosity · L for a happy dance'], actionLabel: ['奶龙开心舞 · L', 'Nailong says hello · L'],
    actions: { tap: { clip: 'tilt', src: '/characters/nailong/v1/tap.mp3', duration: 1.9, text: '歪头看看你', textEn: 'A curious look' }, signature: { clip: 'wave', src: '/characters/nailong/v1/signature.mp3', duration: 3.25, text: '开心摆手', textEn: 'A happy dance' } } },
  { id: 'toothless', name: '小黑龙', nameEn: 'Little Dragon', available: true, initial: '龙', model: '/characters/toothless/v1/model.glb', thumbnail: '/characters/avatars/toothless.png', clips: ['idle', 'tilt', 'wing_flap'], description: ['好奇歪头，展开翅膀，扑动两下', 'Curious looks and little wing flaps'], hint: ['左键好奇短鸣 · L 扇动翅膀', 'Click for a chirp · L to flap wings'], actionLabel: ['小黑龙展开翅膀 · L', 'Flap little wings · L'],
    actions: { tap: { clip: 'tilt', src: '/characters/toothless/v1/tap.mp3', duration: 2.08, text: '好奇地咕噜一声', textEn: 'A curious chirp' }, signature: { clip: 'wing_flap', src: '/characters/toothless/v1/signature.mp3', duration: 3.85, text: '展开翅膀，扑动两下', textEn: 'Spread and flap' } } },
];
export const getIp = id => ipCatalog.find(ip => ip.id === id);
export function savedIp(storage) {
  try { const id = storage?.getItem('cowcoming-ip'); return getIp(id)?.available ? id : 'niulai'; }
  catch { return 'niulai'; }
}
