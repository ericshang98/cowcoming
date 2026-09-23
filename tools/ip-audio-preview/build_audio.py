"""Build local audition drafts. Requires numpy, scipy, imageio-ffmpeg.

Speech stays at its recorded pitch/speed. The Spider-Man foley and dragon
vocalizations are designed effects, not authenticated film recordings.
Downloaded source clips and rendered drafts are deliberately Git-ignored.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parent
SOURCE, OUTPUT = ROOT / 'source', ROOT / 'audio'
SR = 48000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
RNG = np.random.default_rng(23092026)
OUTPUT.mkdir(exist_ok=True)


def read(name):
    result = subprocess.run([FFMPEG, '-v', 'error', '-i', str(SOURCE / name),
                             '-ac', '1', '-ar', str(SR), '-f', 'f32le', 'pipe:1'],
                            check=True, capture_output=True)
    x = np.frombuffer(result.stdout, np.float32).astype(np.float64)
    return x / max(.001, np.max(np.abs(x)))


def band(x, lo=100, hi=10000):
    return sosfilt(butter(3, [lo, hi], fs=SR, btype='bandpass', output='sos'), x)


def fade(x, start=.015, end=.07):
    x = x.copy()
    a, b = min(len(x), round(start * SR)), min(len(x), round(end * SR))
    if a: x[:a] *= (np.sin(np.linspace(0, np.pi / 2, a)) ** 2).reshape((a,) + (1,) * (x.ndim - 1))
    if b: x[-b:] *= (np.cos(np.linspace(0, np.pi / 2, b)) ** 2).reshape((b,) + (1,) * (x.ndim - 1))
    return x


def noise(duration, lo, hi):
    x = band(RNG.normal(size=round(duration * SR)), lo, hi)
    return x / max(.001, np.max(np.abs(x)))


def air(duration=.35, lo=160, hi=3500):
    x = noise(duration, lo, hi)
    t = np.linspace(0, 1, len(x))
    return fade(x * np.sin(np.pi * t) ** 1.8)


def thwip():
    duration = .43
    t = np.arange(round(duration * SR)) / SR
    f = 220 + 2200 * np.exp(-t * 29)
    phase = 2 * np.pi * np.cumsum(f) / SR
    elastic = (np.sin(phase) + .4 * np.sin(phase * 2.03)) * np.exp(-t * 28)
    spray = noise(duration, 1500, 12000) * np.exp(-t * 19)
    click = noise(duration, 1000, 10500) * np.exp(-t * 190)
    return fade(.3 * elastic + .48 * spray + .12 * click, .001, .03)


def thud(duration=.25):
    t = np.arange(round(duration * SR)) / SR
    return fade((.6 * np.sin(2 * np.pi * (70 * t - 28 * t * t)) +
                 noise(duration, 80, 900) * .4) * np.exp(-t * 25), .002, .04)


def creature(duration=.62, start=170, top=245, end=120):
    t = np.arange(round(duration * SR)) / SR
    u = t / duration
    f = np.interp(u, [0, .32, 1], [start, top, end])
    f *= 1 + .02 * np.sin(2 * np.pi * 27 * t) + .008 * np.sin(2 * np.pi * 71 * t)
    p = 2 * np.pi * np.cumsum(f) / SR
    voice = sum(np.sin(p * h + .05 * h) / h ** 1.55 for h in range(1, 10))
    voice = band(voice, 80, 2900)
    rough = 1 + .23 * np.sin(2 * np.pi * 37 * t)
    body = voice * rough + noise(duration, 150, 2500) * .17
    return fade(body * np.sin(np.pi * u) ** .7, .055, .12)


def canvas(duration): return np.zeros((round(duration * SR), 2), dtype=np.float64)


def put(dst, x, at, level=1, pan=0):
    i = round(at * SR)
    n = min(len(x), len(dst) - i)
    if n <= 0: return
    gains = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)])
    dst[i:i+n] += x[:n, None] * gains * level


def clean_voice(x): return fade(band(x, 85, 10000), .01, .045)


def cue(at, label): return {'at': at, 'label': label}


sources = {
    'nailong': {'label': '奶龙人声片段资料', 'url': 'https://github.com/pengyichen2026/NaiLong-Voice-Clone'},
    'laugh': {'label': '奶龙笑声来源', 'url': 'https://github.com/Tomorins/nailong-codex-pet'},
    'fengge': {'label': '峰哥参考音频来源', 'url': 'https://huggingface.co/lllllzh123/feng_voice'},
    'purr': {'label': 'Cat Purring / esperri / CC0', 'url': 'https://freesound.org/people/esperri/sounds/118959/'},
    'wing': {'label': 'Light Wing Flap / TurboFool / CC0', 'url': 'https://freesound.org/people/TurboFool/sounds/561009/'},
}

characters = [
    {'id': 'spiderman', 'name': '蜘蛛侠', 'color': '#e88775', 'tagline': '射丝 / 倒挂', 'tracks': []},
    {'id': 'nailong', 'name': '奶龙', 'color': '#e6cf6e', 'tagline': '疑惑 / 开心', 'tracks': []},
    {'id': 'fengge', 'name': '峰哥', 'color': '#bca38d', 'tagline': '短回应 / 开讲', 'tracks': []},
    {'id': 'toothless', 'name': '无牙仔', 'color': '#93b8ca', 'tagline': '亲近 / 扑翼', 'tracks': []},
]
metrics = []


def export(character, input_name, title, description, x, cues, source_keys, source_note):
    x = fade(x, .006, .065)
    x /= max(1, np.max(np.abs(x)) / .8)
    name = f'{character}-{input_name}'
    path = OUTPUT / f'{name}.mp3'
    with tempfile.TemporaryDirectory(prefix='cowcoming-master-') as temporary:
        raw = Path(temporary) / 'mix.f32'
        raw.write_bytes(x.astype('<f4').tobytes())
        args = [FFMPEG, '-hide_banner', '-nostdin', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw)]
        scan = subprocess.run(args + ['-af', 'loudnorm=I=-19:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, check=True, text=True)
        report = json.JSONDecoder().raw_decode(scan.stderr[scan.stderr.rfind('{'):])[0]
        mastering = ('loudnorm=I=-19:TP=-2:LRA=7:linear=true:'
                     f'measured_I={report["input_i"]}:measured_TP={report["input_tp"]}:'
                     f'measured_LRA={report["input_lra"]}:measured_thresh={report["input_thresh"]}:'
                     f'offset={report["target_offset"]}')
        subprocess.run(args + ['-af', mastering, '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '192k', '-y', str(path)], check=True, capture_output=True)
    decoded = subprocess.run([FFMPEG, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ar', str(SR), '-ac', '2', 'pipe:1'], check=True, capture_output=True)
    samples = np.frombuffer(decoded.stdout, np.float32).reshape(-1, 2)
    duration = len(samples) / SR
    peak = float(np.max(abs(samples)))
    assert np.isfinite(samples).all() and peak < .98 and peak > .01, (name, peak)
    assert .5 < duration < 6, (name, duration)
    item = {'id': name, 'input': input_name, 'title': title, 'description': description,
            'src': f'audio/{name}.mp3', 'duration': round(duration, 3), 'cues': cues,
            'sourceNote': source_note, 'sources': [sources[k] for k in source_keys],
            'status': 'audition-draft', 'modelSyncVerified': False, 'humanListeningVerified': False}
    next(c for c in characters if c['id'] == character)['tracks'].append(item)
    metrics.append({'id': name, 'duration': duration, 'peakDbfs': round(20 * np.log10(peak), 2),
                    'rmsDbfs': round(float(20 * np.log10(np.sqrt(np.mean(samples ** 2)))), 2),
                    'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    print(name, f'{duration:.2f}s', metrics[-1]['peakDbfs'], 'dBFS', flush=True)


# Spider-Man: original web/cloth foley. No synthetic actor impersonation.
x = canvas(1.32)
put(x, air(.14, 300, 5200), .02, .13)
put(x, thwip(), .18, .8, -.07)
put(x, air(.16, 1800, 11000), .30, .24, .1)
put(x, thud(.14), .56, .16, .1)
put(x, air(.23, 250, 4000), .76, .13)
export('spiderman', 'tap', '咻——蛛丝发射', '抬腕、发射、黏住落点，再轻轻收手。', x,
       [cue(.02, '抬腕'), cue(.18, '射丝'), cue(.56, '黏住'), cue(.76, '收手')], [],
       '原创合成拟音：弹性瞬态、空气喷射、细小黏附声；不是电影原声，不含演员台词。')
x = canvas(3.82)
put(x, air(.16), .03, .12)
put(x, thwip(), .24, .74, -.12)
put(x, air(.65, 160, 3400), .64, .30, -.14)
put(x, creature(.22, 150, 215, 145), 1.17, .035)
put(x, air(.38, 200, 2800), 1.61, .15, .14)
put(x, air(.48, 130, 4300), 2.58, .23, .12)
put(x, thud(.30), 3.22, .42)
put(x, air(.23, 250, 3800), 3.33, .09)
export('spiderman', 'signature', '倒挂，向你打个招呼', '射丝拉起 → 倒挂轻摆 → 翻回落地。中间留出挥手的安静时刻。', x,
       [cue(.24, '射丝'), cue(.64, '拉起'), cue(1.61, '倒挂挥手'), cue(2.58, '翻回'), cue(3.22, '落地')], [],
       '原创动作拟音。声音时间点是拟定动作节奏，尚未与蜘蛛侠骨骼联调。')

# Nailong: retain recorded pitch, timing and breath. No random pitch shifting.
voice = clean_voice(read('nailong-record6.wav'))
x = canvas(1.90)
put(x, thud(.14), .015, .035)
put(x, voice, .23, .72)
export('nailong', 'tap', '被戳了一下，疑惑地回头', '短暂一愣，再接一声带疑问语气的录音回应。', x,
       [cue(.015, '被戳'), cue(.23, '疑惑回应'), cue(1.68, '回到待机')], ['nailong'],
       '公开奶龙人声资料的 record6.wav，保留原速原调；具体台词以录音为准，待人工听审。')
laugh = clean_voice(read('nailong-laugh.wav'))
x = canvas(3.25)
put(x, air(.17, 150, 2600), .025, .045)
put(x, laugh, .40, .7)
put(x, thud(.14), 2.88, .045)
export('nailong', 'signature', '扭两下，忍不住笑了', '起势留半拍，接开心笑声；最后收在得意的站姿。', x,
       [cue(.025, '准备'), cue(.40, '开心笑声'), cue(1.40, '摆手扭动'), cue(2.88, '得意收势')], ['laugh'],
       '公开桌宠项目中的奶龙笑声短样，未用普通人声升调替代。此版笑声较外放，仍需人工确认是否符合目标气质。')

# Fengge: two excerpts from one existing public reference recording.
feng = clean_voice(read('fengge-short.wav'))
x = canvas(1.25)
put(x, fade(feng[round(2.00*SR):round(2.99*SR)], .01, .035), .10, .7)
export('fengge', 'tap', '点头，给你一个肯定', '保留原录音的短句语气，配抬头、点头和轻微摊手。', x,
       [cue(.10, '短句回应'), cue(.48, '点头'), cue(1.10, '收势')], ['fengge'],
       '公开峰哥参考录音 merged_000008.wav 的 2.00–2.99 秒；非新生成台词。“这是好事啊”尚未取得合适原声，本版先试听此短回应。')
x = canvas(3.38)
put(x, feng, .10, .7)
export('fengge', 'signature', '认真问一句，再自己接住', '一问一答的原录音节奏，配前倾抬手、停顿，再点头靠回去。', x,
       [cue(.10, '前倾开讲'), cue(1.83, '停半拍'), cue(2.16, '接话点头'), cue(3.10, '恢复淡定')], ['fengge'],
       '同一公开参考录音的完整约三秒短段。按实际录音编排动作，没有拼接新观点或合成新的本人发言。')

# Dragon: designed creature voice, real CC0 animal texture and wing foley.
purr = band(read('purr-cc0.mp3'), 65, 1700)
wing = band(read('wing-cc0.mp3'), 90, 7500)
# Use the measured loudest flap as one complete gesture and retain its tail.
energy = np.convolve(wing**2, np.ones(2400)/2400, mode='same')
peak_at = int(np.argmax(energy)); wing_start = max(0, peak_at - round(.15*SR))
flap = fade(wing[wing_start:min(len(wing), wing_start+round(.65*SR))], .035, .13)
flap = resample_poly(flap, 5, 4)  # a larger, slower wing; foley only
x = canvas(2.08)
put(x, air(.17, 170, 2400), .045, .09)
put(x, air(.20, 250, 3000), .32, .11)
put(x, creature(.63, 165, 250, 130), .66, .18)
put(x, fade(purr[round(.7*SR):round(1.7*SR)], .15, .18), .97, .23)
export('toothless', 'tap', '靠近闻闻，再咕噜一声', '两次轻鼻息、一个短鸣，再落到低低的满足声。', x,
       [cue(.045, '靠近'), cue(.32, '闻一闻'), cue(.66, '好奇短鸣'), cue(.97, '低咕噜')], ['purr'],
       '原创小龙拟声，叠加 CC0 猫呼噜录音的质感；不是《驯龙高手》电影原声，原作相似度尚待听审。')
x = canvas(3.85)
put(x, creature(.42, 105, 145, 100), .08, .18)
put(x, flap, .70, .65, -.14)
put(x, air(.7, 120, 3500), .75, .10, -.10)
put(x, flap, 1.40, .48, .13)
put(x, air(.62, 150, 3900), 1.5, .08, .13)
put(x, thud(.28), 2.59, .21)
put(x, air(.25, 200, 3100), 2.69, .07)
put(x, creature(.52, 130, 190, 105), 2.98, .14)
put(x, fade(purr[round(2.2*SR):round(2.8*SR)], .11, .18), 3.17, .11)
export('toothless', 'signature', '扑两下翅膀，轻轻落地', '低鸣蓄力、两次扑翼、软落地，最后一声满足的短鸣。', x,
       [cue(.08, '蓄力'), cue(.70, '第一次扑翼'), cue(1.40, '第二次扑翼'), cue(2.59, '落地'), cue(2.98, '满足短鸣')], ['purr', 'wing'],
       '原创小龙拟声 + CC0 呼噜与扑翼录音；未使用电影原声。扑翼和落地声音等待真实模型动作对齐。')

manifest = {'version': 1, 'created': '2026-09-23', 'stage': 'local-audition', 'characters': characters}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'validation.json').write_text(json.dumps({'checks': metrics, 'humanListeningVerified': False, 'modelSyncVerified': False}, indent=2) + '\n')
reel = []
for character in characters:
    for track in character['tracks']:
        decoded = subprocess.run([FFMPEG, '-v', 'error', '-i', str(ROOT / track['src']),
                                  '-f', 'f32le', '-ar', str(SR), '-ac', '2', 'pipe:1'],
                                 check=True, capture_output=True)
        reel.append(decoded.stdout)
        reel.append(np.zeros((round(.65 * SR), 2), dtype='<f4').tobytes())
subprocess.run([FFMPEG, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2',
                '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '192k', '-y',
                str(OUTPUT / 'all-characters-preview.mp3')],
               input=b''.join(reel), check=True, capture_output=True)
print('Wrote eight audio drafts, listening reel, manifest and measured validation report.')
