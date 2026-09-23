from pathlib import Path
import re,base64,os
ROOT=Path(os.environ.get('COW_RIG_OUTPUT',Path(__file__).resolve().parent.parent))
WORK=ROOT
js=(WORK/'preview.bundle.js').read_text()
template=(Path(__file__).parent/'preview-template.html').read_text().replace('{{NAME}}','奶龙')
for slug,label in [('xianniu','仙牛'),('dark-niulai','暗黑牛')]:
 s=template.replace('奶龙',label).replace('本地文件 · 无需联网 · Blender 骨骼模型','WORK · '+('仙牛路线' if slug=='xianniu' else '暗黑牛路线')+' · 本地骨骼预览 · 无口型及行走动画')
 s=s.replace('{{ASSET}}',base64.b64encode((ROOT/slug/(slug+'-web.glb')).read_bytes()).decode()).replace('{{SCRIPT}}',js)
 (ROOT/slug/'preview.html').write_text(s)
