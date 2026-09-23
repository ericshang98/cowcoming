"""Fetch only the five public samples used in the local audition draft.

No login, voice-cloning API, cookies, or third-party code execution is used.
Hashes prevent an upstream replacement from silently changing the audio.
"""
from pathlib import Path
import hashlib
import urllib.request

ROOT = Path(__file__).resolve().parent / 'source'
ROOT.mkdir(exist_ok=True)
SAMPLES = [
    ('nailong-record6.wav', 'https://raw.githubusercontent.com/pengyichen2026/NaiLong-Voice-Clone/main/Datasets/nailong_selected/44.1kHz%2C%2016-bit%2C%20Stereo%20%282-channel%29/record6.wav', 'c8b4d4e96ec1055b2ac0c9ea4aa6f6b2a8b5893e409c8b78f4b1f13323dd8657'),
    ('nailong-laugh.wav', 'https://raw.githubusercontent.com/Tomorins/nailong-codex-pet/main/output/nailong/sound/laugh.wav', '5ad57980a2ae1e40fa765579bcaa4553dc9d44c5d11515d4d0fe555446b86655'),
    ('fengge-short.wav', 'https://huggingface.co/lllllzh123/feng_voice/resolve/main/merged_000008.wav', 'f49b7079aec2e8507b388ec46804e878cc9696ca08f1d0651f4601fd243ad007'),
    ('purr-cc0.mp3', 'https://cdn.freesound.org/previews/118/118959_1990695-hq.mp3', '327cef8abb4c1d3d66452c72d124c6a4a5364a6b5ba9cf4ebe3f00b0a3e6bc10'),
    ('wing-cc0.mp3', 'https://cdn.freesound.org/previews/561/561009_9160390-hq.mp3', '3ab87c80e51315eaab884f02c56eb4b9b31e1ce65be557699fd9d5856c4a3ea3'),
]
for name, url, sha in SAMPLES:
    path = ROOT / name
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == sha:
        print(f'{name}: verified existing sample')
        continue
    with urllib.request.urlopen(url, timeout=30) as response:
        content = response.read(10 * 1024 * 1024)
    if hashlib.sha256(content).hexdigest() != sha:
        raise ValueError(f'Source changed for {name}; inspect it before updating this recipe.')
    path.write_bytes(content)
    print(f'{name}: downloaded and verified')
