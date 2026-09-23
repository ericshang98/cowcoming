"""Package a clean checkout plus explicitly supplied editable models; never copy local credentials.
Run after npm run build and Blender authoring:
  python3 scripts/package-team-handoff.py output/team-handoff/editable-models
"""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import zipfile

root = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)
if git('status', '--porcelain').strip():
    raise SystemExit('Commit source changes before packaging.')
commit = git('rev-parse', 'HEAD').decode().strip()
name = 'Cowcoming-Team-' + commit[:12]
out = root / 'output' / 'team-handoff'
stage = out / name
if stage.exists():
    raise SystemExit('Package directory already exists; preserve it or choose a new commit.')
source = stage / 'source'
source.mkdir(parents=True)
with tarfile.open(fileobj=io.BytesIO(git('archive', 'HEAD'))) as archive:
    archive.extractall(source, filter='data')
version = {'commit': commit, 'branch': git('branch', '--show-current').decode().strip(),
           'repository': 'https://github.com/ericshang98/cowcoming',
           'pullRequest': 'https://github.com/ericshang98/cowcoming/pull/23',
           'releaseStatus': 'local-preview-not-deployed', 'productSnapshotRevision': 212,
           'actionContractVersion': 2, 'formCount': 6, 'actionCount': 30,
           'configuration': 'defaults-only; Eric final tuning JSON not included',
           'hardware': 'simulator-only; real adapter pending'}
for target in [stage/'VERSION.json', source/'SOURCE_VERSION.json']:
    target.write_text(json.dumps(version, ensure_ascii=False, indent=2)+'\n')
(stage/'configuration').mkdir()
shutil.copy2(root/'public/downloads/motion-tuning-defaults.json', stage/'configuration/motion-tuning-defaults.json')
(stage/'hardware').mkdir()
shutil.copy2(root/'public/downloads/cowcoming-device.tar.gz', stage/'hardware/cowcoming-device.tar.gz')
models = Path(sys.argv[1]).resolve()
for form in ['calf', 'normal', 'playful', 'tough', 'celestial', 'dark']:
    dest=stage/'editable-models'/form
    dest.mkdir(parents=True)
    shutil.copy2(models/form/f'niulai-{form}-actions.blend', dest/f'niulai-{form}-actions.blend')
(stage/'START-HERE.md').write_text('''# 牛来团队交接包

先读 [团队交接说明](source/docs/team-handoff.md)。固定版本见 VERSION.json。

- `source/`：网站、模型 GLB、制作脚本、设备代码和验证报告。
- `editable-models/`：六形态 Blender 工程；对应来源与许可在 source/assets/evolution-source/。
- `configuration/`：六形态默认调参；Eric 最终参数须另行导出补充。
- `hardware/`：设备开发套件，当前只有模拟适配器与实机接口骨架。
- `SHA256SUMS`：文件完整性校验（macOS 可运行 shasum -a 256 -c SHA256SUMS）。

准备 Node 24、Python 3，进入 source 后按交接说明安装依赖并运行 npm run motion:lab。
交付为本地调试版本，未上线、未装机、未完成真实硬件验收。
''')
files=sorted(p for p in stage.rglob('*') if p.is_file())
(stage/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(stage).as_posix()+'\n' for p in files))
archive_path=out/(name+'.zip')
with zipfile.ZipFile(archive_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for p in sorted(stage.rglob('*')):
        if p.is_file(): archive.write(p,p.relative_to(out))
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
print(json.dumps({'archive':str(archive_path),'bytes':archive_path.stat().st_size,
                  'sha256':hashlib.sha256(archive_path.read_bytes()).hexdigest(),
                  'files':len(files)+1},indent=2))
