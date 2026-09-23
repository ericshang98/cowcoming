# 五形态动作源文件

动作合同 2：NOD / SHAKE / NOD_DOUBLE / TILT_LEFT / TILT_RIGHT。WAIT 为等待控制。
源 GLB、曲线和 Blender 验证报告按形态保存。网站使用 public/models/evolution 的哈希版本导出文件。

使用 Blender 5.2.2，逐形态重建（将 calf 替换成其他目录名）：

```sh
NIULAI_FORM=calf NIULAI_SOURCE="$PWD/assets/evolution-source/calf/source.glb" NIULAI_OUTPUT="$PWD/tmp/evolution/calf" /Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/evolution-source/scripts/build_actions.py
NIULAI_OUTPUT="$PWD/tmp/evolution/calf" /Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/evolution-source/scripts/verify_actions.py
```

五形态输出到 `tmp/evolution/{form}` 后，运行 `node scripts/prepare-evolution-assets.mjs` 更新网页资源与 manifest。

verify_legacy.py 需同样提供 NIULAI_SOURCE 和 NIULAI_OUTPUT，对比原有动画。新动作 120 Hz 采样，回到中立姿态，脚底不漂移。网站播放器单独等待动画结束和恢复过渡；硬件回执独立。

## 模型权属

这些模型资产不属于可任意开源的接口代码。小牛、硬牛来自 Eric 提供并在“为模型添加网格和嘴部动画”任务中绑定的 GLB；普通牛来来自仓库现有模型，仙牛与暗黑牛来自本任务此前绑定资产。
硬牛原始 3MF 元数据：Designer「八云恋在找钓鱼竿」，License「BY-NC-SA」。转换和增加动画不改变模型许可。其他模型未在本交付中获得新的开源许可。公开网站展示与后续商用需继续遵守原模型授权；不能将接口代码许可扩展到模型。

本目录只收录重建动作必要的绑定模型、作者脚本、曲线与验证报告；未收录旧六动作预览或“郑重批准”。
