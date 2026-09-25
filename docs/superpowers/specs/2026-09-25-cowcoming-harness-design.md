# Cowcoming Harness：模型、能力与真实设备解耦设计

> **2026-09-25 实施修订**：下文保留最初架构意图；本版本准确接口、运行范围与证据边界以 [harness/docs/protocol.md](../../../harness/docs/protocol.md) 和 [harness/README.md](../../../harness/README.md) 为准。已实现独立网页实验室、本地模型服务、GLB 导入与原进程 BenBen 扩展。v0.1 只执行单步 express；track/speak 拒绝，不承诺连续控制或语音。JEV/Laya 共用 typed decision 适配器，BenBen executor 需注入 send/stop/getState 三项。AI 权重和 3D 角色资源独立可选，Apache-2.0 仅覆盖本包原创代码。硬件尚未现场验收。


日期：2026-09-25
状态：已批准进入实现

## 背景与目标

Cowcoming 的网站负责角色展示和交互；BenBen 私有仓库负责本机控制器、相机、模型、桥接和机械臂。当前原型中的五个基础动作来自现有机械臂能力，但开源后的使用者可能拥有完全不同的机器人和动作集合。

本设计把模型表达、机器人能力和设备执行拆成独立模块：

```text
观察状态 → 模型适配器 → 结构化意图 → 能力规划器 → 安全仲裁 → 执行器 → 真实回执
```

同一条链支持四种运行模式：

- `model-sandbox`：运行模型，不连接设备，只展示意图、候选能力和拒绝原因。
- `simulator`：运行模型和能力规划器，由虚拟设备执行并生成可验证的模拟回执。
- `hardware`：运行模型和能力规划器，由 BenBen 或其他真实设备执行。
- `fixture`：固定输入、固定模型输出和模拟执行器，用于测试、CI 和无 API Key 演示。

成功标准：没有模型权重和硬件也能运行完整演示；替换模型后不修改设备代码；替换机器人 profile 后不修改模型代码；不支持的能力不会被伪报成功；模拟和实机使用同一种协议与状态机。

## 设计原则

1. 模型只表达意图，不生成舵机角度、串口命令或未知动作名。
2. 机器人通过能力 profile 声明能做什么、参数范围和安全约束。
3. 能力规划器把意图映射为当前 profile 中允许的执行计划，可以替代、降级或拒绝。
4. 安全仲裁器拥有最终权限，模型和规划器不能越过限位、停止、温度、超时和设备状态检查。
5. `accepted`、`running`、`completed` 和物理验证是不同状态；断线时进入 `unknown`，不把请求接收当作完成。
6. 网站动画、声音和设备动作绑定语义意图与能力，而不是绑定某个厂商的关节编号。
7. 设备适配器必须可由模拟器替换，所有上层模块都在无硬件环境下测试。

## 核心对象

### Intent

模型或固定策略输出的结构化意图。它描述语义、目标、强度和置信度，不描述设备细节。

```ts
{
  requestId: string,
  type: "express" | "track" | "speak" | "stop",
  semantic: string,
  params: Record<string, unknown>,
  target?: string,
  confidence?: number,
  expiresAt?: number
}
```

### CapabilityProfile

设备或模拟器声明的能力集合。每项能力包含语义标签、参数约束和可打断性。profile 可以描述 BenBen 的 `nod`、`nod_double`、`shake_head`、`tilt_left`、`tilt_right`，也可以描述另一台机器人的 `wave_hand` 或 `dance`。

### ActionPlan

规划器在 profile 中选出的、经过参数归一化的执行计划。计划只允许引用 profile 已声明的 capability，并带有过期时间、来源意图和幂等 ID。

### ExecutionEvent

执行器发出的状态证据：`planned`、`accepted`、`running`、`completed`、`rejected`、`unsupported`、`stopped`、`fault`、`unknown`。事件同时标记 `simulated` 和 `sensorVerified`，界面可以据此准确表达“模拟完成”“指令播放完成”和“传感器确认完成”的差异。

## 模块边界

### ModelAdapter

输入为归一化观察状态、当前形态和允许的语义问题；输出为 `Intent` 或模型错误。它不能访问设备驱动，也不能扩大能力白名单。

首发实现：

- `MockModelAdapter`：确定性 fixture。
- `OpenAICompatibleModelAdapter`：只依赖外部 endpoint 和环境变量。
- `OllamaModelAdapter`：本地模型可选下载。
- `LayaModelAdapter`：保留结构化决策模型接入口，不把权重放入 Git。

### CapabilityPlanner

输入为意图和当前 profile；输出为 ActionPlan、候选替代或明确拒绝。规划策略按顺序执行：精确语义匹配、参数约束归一化、可接受替代、不可执行拒绝。规划器不直接调用串口或网络。

### SafetyArbiter

执行前检查设备在线、控制租约、停止状态、参数范围、计划过期和互斥资源。它是唯一可以拒绝计划的安全边界；模型和网页请求不能绕过它。

### Executor

接受合法 ActionPlan，发出 ExecutionEvent。首发实现：

- `SimulatorExecutor`：使用虚拟时钟和 profile 生成确定性事件。
- `BenBenExecutor`：只定义协议和 adapter 边界，真实串口、温度和舵机实现留在私有 BenBen 仓库或经过清理后单独发布。

### Runtime

编排上述模块，维护 request/plan/event 关联、超时、取消、幂等和当前设备状态。网站和日志只消费 Runtime 的事件，不读取执行器内部变量。

## 运行数据流

```text
Observation
  → ModelAdapter
  → IntentValidator
  → CapabilityPlanner
  → SafetyArbiter
  → Executor
  → ExecutionEvent
  → Web renderer / audio / audit log
```

模型后端和执行后端是两个独立配置：

```json
{
  "modelBackend": "mock",
  "executionBackend": "simulator",
  "profile": "benben-five-servo"
}
```

有效组合包括真实模型 + 模拟器、固定 fixture + BenBen，以及真实模型 + BenBen。测试默认使用 fixture + simulator，避免网络、设备和模型下载成为必要条件。

## 网站接入

网站渲染器消费 `Intent` 和 `ExecutionEvent`：

- 意图决定语义表达和候选软件动画。
- 计划决定当前 profile 是否有对应基础能力。
- 执行事件决定显示“已规划”“模拟运行”“设备执行中”“完成”“未知”或“不可用”。
- 资源缺失只显示参考模型或资源不可用，不显示动作完成。

软件动画可以声明 `semantic` 和 `requiresCapabilities`。同一 `approval` 意图可以在 BenBen 上映射为点头，在另一台设备上映射为挥手，网页动画可以使用对应角色自己的变体。

## 错误与恢复

- 模型返回非法 JSON：记录 `model.invalid_output`，进入待机或安全回退，不执行未知动作。
- 能力不存在：生成 `unsupported`，附带可用语义列表，不伪造完成。
- 参数越界：规划器归一化到 profile 范围；无法安全归一化则拒绝。
- 计划过期：拒绝执行，不在恢复连接后重放。
- 执行器断线：停止可停止任务并发出 `unknown` 或 `fault`；恢复连接后需要新请求。
- 用户停止：SafetyArbiter 优先处理，所有后续模型输出失效。
- 真实执行没有传感器确认：可以报告指令播放结束，但 `sensorVerified=false`。

## 仓库边界与开源策略

当前仓库继续承载网站，并新增独立的 `harness/` Node 包。以后可以把 `harness/` 无改动抽成 `cowcoming-harness` 独立仓库。

```text
cowcoming/
  src/                         # 现有网站
  harness/
    src/                      # 协议、profile、规划、runtime、adapter、executor
    profiles/                 # JSON profile
    tests/                    # 无硬件测试
    examples/                 # 本地演示
  docs/open-source/            # 开源边界与模型 manifest 说明
```

公开代码使用 Apache-2.0。角色 GLB、Blender、音频和模型权重单独记录来源、SHA-256、大小和授权；第三方权重只提供下载说明或 adapter，不把它们隐式纳入代码许可证。大型二进制文件使用 Release、Git LFS 或模型仓库，不进入普通源代码历史。

公开前必须清除 API key、Device Key、录音、现场日志、设备标识、私有部署地址和供应商二进制 SDK。README 必须明确：模拟器和协议是公开稳定面，真实硬件 adapter 需要用户自行验证安全条件。

## 实现顺序

1. 建立纯 Node 的协议和 profile 类型。
2. 实现确定性的意图校验、能力规划和安全仲裁。
3. 实现 simulator、mock model 和 fixture 示例。
4. 为 Ollama/OpenAI-compatible/Laya 留出 adapter 接口。
5. 增加 BenBen adapter 边界和五动作 profile，不复制私有设备代码。
6. 增加网站接入文档与状态映射。
7. 加入测试、开源 README、模型 manifest 模板和许可证说明。

## 验收

- `npm test` 和 harness 自己的测试在无网络、无模型、无设备环境通过。
- fixture 模式能完成意图、规划、执行和回执闭环。
- model-sandbox 能显示模型意图和 unsupported 原因。
- simulator 和 BenBen adapter 使用同一 ActionPlan/ExecutionEvent 协议。
- profile 替换不会修改模型 adapter。
- 过期、停止、越界、断线和未知完成状态都有测试。
- `npm run build` 继续通过，现有网站行为不被破坏。
