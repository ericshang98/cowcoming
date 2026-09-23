"""Copy verified runtime data from Eric's ZIP, without executing its scripts."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import zipfile

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('--three', type=Path, default=ROOT.parents[1] / 'node_modules/three')
args = parser.parse_args()
with zipfile.ZipFile(args.archive) as archive:
    info = archive.getinfo('fengge-web-rig/fengge-web.glb')
    if info.file_size != 5599520:
        raise ValueError('Unexpected model size: inspect the new version first.')
    data = archive.read(info)
sha = hashlib.sha256(data).hexdigest()
if sha != '0b028be4f3e4f7437206fed1b46f0fa7abb1ac583a53c8111461e30000f85c30':
    raise ValueError('Unexpected model hash: inspect the new version first.')
magic, version, size, json_size, chunk = struct.unpack_from('<5I', data)
assert magic == 0x46546c67 and version == 2 and size == len(data) and chunk == 0x4e4f534a
gltf = json.loads(data[20:20+json_size])
assert all('uri' not in x for x in gltf.get('buffers', []) + gltf.get('images', []))
assert {'idle', 'nod', 'reflect'} <= {a['name'] for a in gltf['animations']}
model_dir = ROOT / 'models/fengge/v1'
model_dir.mkdir(parents=True, exist_ok=True)
(model_dir / 'model.glb').write_bytes(data)
package = json.loads((args.three / 'package.json').read_text())
assert package['version'] == '0.183.0', 'Use the pinned project Three.js version.'
for name in ['build/three.module.js', 'build/three.core.js', 'examples/jsm/loaders/GLTFLoader.js',
             'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/utils/SkeletonUtils.js', 'LICENSE']:
    target = ROOT / 'vendor/three' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.three / name, target)
print(json.dumps({'modelSha256': sha, 'bytes': size, 'three': package['version'],
                  'animations': [a['name'] for a in gltf['animations']]}, indent=2))
