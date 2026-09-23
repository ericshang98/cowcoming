# 六形态人格同步（统一集成版本，2026-09-24）

依据用户提供文档 §5.2.2 / §5.2.4。shared/niulai-personas.json 与 Benben 的 config/characters/niulai.json 为相同内容；personaProfile(formId) 提供对应的 JEV 偏好及 personaVersion。语言人格在本机按同一形态载入，不把 JEV prompt 当作 LLM prompt。

新房间默认小牛配置。首次选择某形态加载其自身提示词；已保存的同版本形态设置可恢复。旧通用配置在更新时迁移。只有设备回传匹配 revision、formId、personaVersion，才确认已应用；示例适配器仅模拟。设备套件 apply_profile 需返回实际载入的人格版本，不能简单照抄请求声称成功。

切换令旧文本流 interrupted，带旧 profileRevision 的迟到语言事件被拒绝。当前 Benben 桥接在实时互动仍开启时会等待用户先结束本地互动，再应用新形态；未实现无缝收音热切换。没有修改摄像头、动作角度或停止策略。playful 人格可用，动画缺失仍限制双端动作。

验证：91 项网页测试、生产构建、11 项 Python 设备套件测试，以及独立临时 Worker 的协议回归通过。真实 Qwen 六形态各两轮的试聊在 Benben 独立副本完成；语言风格稳定性仍需校准。这些不是网站发布或真实机械臂验收。

发布时网页 Worker、设备套件及 Benben 六形态配置应一起升级；只发布新版网页会使旧设备因缺少人格版本回执保持未应用。统一集成的发布与现场切换状态见 [统一发布说明](combined-release.md)。
