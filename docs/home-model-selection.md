# HOME 模型选择

统一使用 [首页 IP 切换](ip-characters.md) 中的角色目录、声音和加载实现。导航第二个图标仅 HOME 可打开；WORK、World、About 和支持页面禁用。保留最新主分支的五款角色、声音和刷新持久化，不维护重复选择器或重复 GLB。

仙牛与暗黑牛属于 WORK 的 celestial / dark 形态，详见 [WORK 资产](../assets/work-route-cows/README.md)。WORK 沿用设备绑定与在线条件，不绕过门禁。

`npm run qa:models` 检查首页角色与声音，`npm run qa:work-models` 用独立本地测试设备检查 WORK 资源和隔离。
