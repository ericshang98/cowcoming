# Cowcoming 进化运行合同

> 2026-09-24 更新：benben 的真实本地控制器已提供直接连接桥，不再要求队友编写占位 adapter。运行步骤与当前行为以 [完整交接](benben-handoff.md) 为准。

**接入前置条件（Eric 最新修正）：**WORK 必须先用 Browser Key 绑定房间，并等待配套 Device Key 的电脑程序上线。此前只显示绑定/等待步骤，不开放形态、进化设置/重置、摄像头或语言面板，也不播放观察示例。连接后两侧共用同一房间；视频仍需手动开启。断线立即关闭操作与视频、暂停计轮并取消在途评估，迟到结果不生效；恢复同一房间保留已完成培养记录，换房间开启独立培养。设备进程在线不代表机械臂、JEV 或摄像头均已就绪，各组件仍分别标示。


产品真源：飞书 §5.2.3。当前实现是电脑端状态机和界面；网页发起的实时交互已按 commandId 接到新增设备接口；本机评估网关及阶段化回复入口现由 benben 提供，见最新交接；真实 API 和设备仍需现场配置验收。预设观察案例不接入轮数。

## 状态和操作

`src/evolution-session.mjs` 是可独立测试的纯状态机，`src/useEvolutionSession.js` 管理异步评估。初始为小牛，自动模式默认每 5 轮评估；设置只保存到当前浏览器，刷新或重置创建新培养会话。

左侧路线按钮只切换列表，节点按钮直接选形态并进入手动模式，允许跨分支。保存设置重新计轮但保留完整历史。自动进化只能沿直接后继走一步；终点不再评估。重置回小牛，清空培养数据、取消评估；保留模式、周期、模型、网关和其他网页偏好，不清空 World 收藏。

无独立模型时仍可切换逻辑形态，但界面显示参考模型标记。切换状态不代表真实机械动作已执行。

## 完整对话接入

连接适配器通过共享场景 controller 的接口使用状态机，不通过鼠标点击、计时器或示例生成轮数：

```js
// 在接收用户输入时锁定上下文，而不是等回复完成后再读取。
const context = controller.evolution.context();
// 等待这一回应全部必需输出完成后：
controller.evolution.recordTurn({
  ...context,
  id: responseId,       // 同一输入和回应重试时保持相同 ID
  source: 'live',
  status: 'completed',
  userText: transcript,
  replyText: completedReply,
  actionCompleted: false, // 无声动作回复须以真实完成回执置 true
});
```

语音转写失败、取消、流式分片、空输入和不完整回应不提交。需要动作的复合回应由适配器等齐回执，状态机不把文字完成当成机械成功。旧 sessionId、generation 或 formId 的回应拒收。未来适配器也必须在执行动作前校验版本；这里没有接管真实设备。

## 评估网关

用户填写的 API 必须实现本项目合同，不能直接使用任意厂商的聊天 API。支持 HTTPS URL、站内路径，或随交接提供的固定同机 `http://127.0.0.1:8768/evaluate`（localhost 同端口亦可）；跨域网关须配置 CORS。密钥、认证、提供商适配、模型许可和服务端幂等由网关承担，密钥不进入 `VITE_*` 或浏览器存储。

```json
{
  "requestId": "unique-evaluation-id",
  "sessionId": "current-cultivation-id",
  "generation": 0,
  "currentForm": "calf",
  "turnCount": 5,
  "model": "configured-model-id",
  "allowedNextForms": ["normal"],
  "turns": [
    {"id":"turn-1","formId":"calf","userText":"你好","replyText":"哞？","actionCompleted":false}
  ]
}
```

示例省略其余四轮；真实请求的 `turns.length === turnCount`，包含本次培养所有已完成对话。网关应按 requestId 去重，并使用飞书 §5.2.3 的评估系统提示词：评估是否适合保持或向合法直接后继进化，不因为轮数已满强制升级；用户对话作为材料而非系统指令。普通牛来的两分支结合完整会话里的互动偏好判断。不得自行扩张合法候选，不得静默截断历史；上下文超限返回明确错误。

```json
{
  "requestId": "unique-evaluation-id",
  "sessionId": "current-cultivation-id",
  "generation": 0,
  "decision": "evolve",
  "targetForm": "normal",
  "reason": "开始形成稳定的双向表达。"
}
```

`stay` 必须返回当前形态，`evolve` 必须返回合法直接后继。简短结论只在设置中展示。三项关联标识必须原样返回；不正确或过期结果不能应用。

30 秒超时、网络失败、非 JSON 或非法形态都保留会话和当前形态，暂停自动重试，用户从设置里重试。保持后推进快照检查点，继续计 N 轮；进化后新形态从零计轮，完整历史保留。手动切换、改设置、重置均使在途请求失效。请求期间新回合不修改已发送的快照。

## 验证

- `npm test`：包括有效轮去重、5／10 轮阈值、保持与下一次完整历史、合法路径、终点、失败重试、重置与过期输出。
- `npm run build`。
- 启动本地实时服务（提供 `TEST_RELAY_URL` / `TEST_RELAY_ADMIN`，或使用本机私密 `.pwc/live-admin.json`）与 `npm run dev -- --port 5187` 后运行 `node scripts/evolution-controls-qa.cjs`。使用已安装 Chrome；桌面／手机、设置／手动切换／重置／双语／焦点，以及隔离 React hook + 模拟网关验证。不发送真实模型请求。


## 与实时设备接口合流

主分支新增的 `useLiveDevice` 保留相机、密钥连接和流式文本。当前网页发起的 `interact` 在发送时捕获培养上下文；设备套件为 `language.start` 增加可选 `commandId`，云端消息保留该关联。动作合同 2 下，只有非 simulation、同 profileRevision 的交互同时具有已完成的设备动作回执、网页实际动画完成（含恢复过渡）、完整关联回复和 command.result completed，才进入培养。任一端未完成、停止或资源不可用均不计轮。旧套件没有关联 ID 的消息仍可展示，但不推断配对、不计轮；设备自发输入可用前述 recordTurn 合同另接。

`useEvolutionDeviceSync` 按期望版本同步选中的形态，恢复已有形态配置；初次连接采用房间当前形态。设备实验室或其他窗口的形态变更接管为手动。一个配置同步在途时，新选择等待上一版本回执；失败不无限重试，界面保留设备当前配置与错误提示。重置即使仍为小牛也推送新配置版本，在线时请求停止；不将停止请求说成停止已完成。云端形态历史区分 manual／automatic／reset 来源。旧设备语言历史留作观察记录，培养历史在重置时清空。
