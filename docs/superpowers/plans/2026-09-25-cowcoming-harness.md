# Cowcoming Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 Cowcoming 网站仓库中加入一个可独立运行的模型—能力—执行器 harness，支持 fixture、模型沙盒、模拟器和 BenBen 适配边界，并以同一协议连接软件动画和未来真实设备。

**Architecture:** `harness/src` 以纯 ESM Node 模块提供合同、profile、意图校验、能力规划、安全仲裁、模型适配器、模拟执行器和 runtime。模型适配器只输出语义意图；planner 只引用 profile 中声明的 capability；executor 是唯一可以产生执行事件的层。网站代码暂不重写现有 Three.js mixer，先通过文档和协议保持可接入边界。

**Tech Stack:** Node 24、纯 JavaScript ESM、Node test runner、JSON profiles、现有 Vite/React 网站、GitHub Actions。

---

### Task 1: 建立 harness 包和协议合同

**Files:**
- Create: `harness/package.json`
- Create: `harness/src/protocol.mjs`
- Create: `harness/src/validation.mjs`
- Create: `harness/src/index.mjs`
- Test: `harness/tests/protocol.test.mjs`

- [ ] **Step 1: 写失败测试**

覆盖：意图必须包含 `requestId/type/semantic`；profile 必须包含 capability ID；plan 必须包含 `planId/intentId/steps`；execution event 必须拒绝未知状态；合法对象通过且不被原地修改。

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntent, validateProfile, validatePlan, validateExecutionEvent} from '../src/validation.mjs';

test('validates the public protocol objects', () => {
  const intent = validateIntent({requestId: 'r1', type: 'express', semantic: 'approval', params: {}});
  assert.equal(intent.requestId, 'r1');
  assert.throws(() => validateIntent({semantic: 'approval'}), /requestId/);
  assert.throws(() => validateExecutionEvent({status: 'done'}), /status/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test harness/tests/protocol.test.mjs`
Expected: FAIL，因为 harness 源文件尚未存在。

- [ ] **Step 3: 实现合同和浅层校验**

`protocol.mjs` 导出 `INTENT_TYPES`、`EXECUTION_STATUSES` 和 `createId(prefix, now)`；`validation.mjs` 导出四个校验函数。校验函数返回冻结的浅拷贝，拒绝缺字段、错误类型和未知枚举，但保留 `params`、`result` 和 `error` 的扩展字段。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test harness/tests/protocol.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add harness/package.json harness/src harness/tests/protocol.test.mjs
git commit -m "feat: add harness protocol contracts"
```

### Task 2: 实现能力 profile、规划器和安全仲裁

**Files:**
- Create: `harness/src/capabilities.mjs`
- Create: `harness/src/planner.mjs`
- Create: `harness/src/safety.mjs`
- Create: `harness/profiles/simulator.json`
- Create: `harness/profiles/benben-five-servo.json`
- Test: `harness/tests/planner.test.mjs`

- [ ] **Step 1: 写失败测试**

测试精确语义匹配、参数裁剪、替代能力、未知能力、过期计划、停止状态和设备离线拒绝。

```js
test('plans approval through a profile capability and clamps parameters', () => {
  const result = planIntent(intent('approval', {intensity: 4}), benbenProfile);
  assert.equal(result.status, 'ready');
  assert.equal(result.plan.steps[0].capabilityId, 'nod');
  assert.equal(result.plan.steps[0].args.intensity, 1);
});

test('never creates a hardware command for an unsupported semantic', () => {
  assert.equal(planIntent(intent('dance'), benbenProfile).status, 'unsupported');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test harness/tests/planner.test.mjs`
Expected: FAIL，因为 planner/profile 尚未实现。

- [ ] **Step 3: 实现 profile 和规划器**

`capabilities.mjs` 导出 `normalizeProfile(profile)`、`findCapabilities(profile, semantic)` 和 `loadProfile(path)`。每个 capability 至少包含 `id`、`semanticTags`、`parameters`、`interruptible` 和 `maxDurationMs`。

`planner.mjs` 导出 `planIntent(intent, profile, {now})`，返回：

- `{status: 'ready', plan}`；
- `{status: 'unsupported', reason, availableSemantics}`；
- `{status: 'invalid', reason}`；
- `{status: 'stale', reason}`。

规划器只生成 capability ID 和归一化参数，不生成关节角度或供应商命令。

- [ ] **Step 4: 实现安全仲裁器**

`safety.mjs` 导出 `createSafetyArbiter({clock})`，支持 `accept(plan, deviceState)`、`stop(reason)`、`reset()`。设备不在线、已有停止锁、计划过期、超过最大时长时拒绝。成功时返回冻结的安全上下文，不修改 plan。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test harness/tests/planner.test.mjs`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add harness/src/capabilities.mjs harness/src/planner.mjs harness/src/safety.mjs harness/profiles harness/tests/planner.test.mjs
git commit -m "feat: add capability profiles and safe planning"
```

### Task 3: 实现模型适配器、模拟执行器和 runtime

**Files:**
- Create: `harness/src/models.mjs`
- Create: `harness/src/executors.mjs`
- Create: `harness/src/runtime.mjs`
- Test: `harness/tests/runtime.test.mjs`

- [ ] **Step 1: 写失败测试**

验证 fixture、model sandbox、simulator 三种路径使用同一意图和计划；模拟器发出 `accepted → running → completed`；停止和过期计划不会执行；`simulated` 与 `sensorVerified` 字段准确。

```js
test('runs the same plan through a deterministic simulator', async () => {
  const runtime = createRuntime({model: new MockModelAdapter(), executor: new SimulatorExecutor(), profile});
  const events = await runtime.handle({requestId: 'r1', text: '同意'});
  assert.deepEqual(events.map(event => event.status), ['accepted', 'running', 'completed']);
  assert.equal(events.at(-1).simulated, true);
  assert.equal(events.at(-1).sensorVerified, false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test harness/tests/runtime.test.mjs`
Expected: FAIL，因为 model/executor/runtime 尚未实现。

- [ ] **Step 3: 实现模型适配器**

`models.mjs` 导出：

- `MockModelAdapter`：按关键词返回确定性 Intent；
- `FunctionModelAdapter`：接受用户提供的 `decide(observation)` 函数；
- `createHttpModelAdapter({endpoint, fetchImpl})`：只传递标准 JSON，不保存 key，不内置供应商命令。

所有 adapter 都实现 `decide(observation, context)`，输出经 `validateIntent` 校验的 Intent。

- [ ] **Step 4: 实现执行器**

`executors.mjs` 导出 `SimulatorExecutor`、`RecordingExecutor` 和 `createBenBenExecutor(send)`。模拟器按计划 steps 发出标准事件；RecordingExecutor 保存事件供测试断言；BenBen executor 只把合法 ActionPlan交给注入的 `send` 函数，绝不在核心包里打开串口。

- [ ] **Step 5: 实现 Runtime**

`runtime.mjs` 导出 `createRuntime({model, executor, profile, clock})`。`handle(input)` 顺序为：模型决定 → planner → safety → executor；维护 `requestId` 去重；模型失败、unsupported、stale 和 stop 都返回可审计结果。`stop()` 使当前计划失效，并要求下一次请求使用新 request ID。

- [ ] **Step 6: 运行测试确认通过**

Run: `node --test harness/tests/runtime.test.mjs`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add harness/src/models.mjs harness/src/executors.mjs harness/src/runtime.mjs harness/tests/runtime.test.mjs
git commit -m "feat: add model adapters and simulator runtime"
```

### Task 4: 添加可运行示例和 BenBen 接入边界

**Files:**
- Create: `harness/examples/model-sandbox.mjs`
- Create: `harness/examples/simulator-demo.mjs`
- Create: `harness/examples/benben-adapter-contract.mjs`
- Create: `harness/README.md`
- Create: `harness/LICENSE`
- Create: `docs/open-source/harness.md`
- Create: `docs/open-source/model-manifest.example.json`

- [ ] **Step 1: 写 fixture 演示**

`model-sandbox.mjs` 使用 MockModelAdapter + `executionBackend: none`，打印 Intent、规划结果和 unsupported 原因；`simulator-demo.mjs` 使用 MockModelAdapter + SimulatorExecutor，打印每个 ExecutionEvent；`benben-adapter-contract.mjs` 展示注入 `send(plan)` 的接口，不访问真实串口。

- [ ] **Step 2: 运行示例**

Run: `node harness/examples/model-sandbox.mjs`
Expected: 输出结构化意图和 `ready` 或 `unsupported`。

Run: `node harness/examples/simulator-demo.mjs`
Expected: 输出 `accepted`、`running`、`completed`，并标记 `simulated: true`。

- [ ] **Step 3: 写开源说明**

README 必须说明四种运行模式、模型权重不进入 Git、profile 如何描述用户自己的机器人、真实 BenBen adapter 的安全边界、模拟完成不等于物理完成，以及现有网站动作包 `hardwareCommands: false` 的事实。

`model-manifest.example.json` 包含 `id/type/source/license/sizeBytes/sha256/optional/download` 字段，不包含任何真实 key。

- [ ] **Step 4: 提交**

```bash
git add harness/examples harness/README.md harness/LICENSE docs/open-source
git commit -m "docs: publish harness usage and model boundary"
```

### Task 5: 测试接入、根命令和 CI

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Create: `harness/scripts/test.mjs`
- Test: existing `tests/*.test.mjs`

- [ ] **Step 1: 增加根命令**

在根 `package.json` 增加 `test:harness: node --test harness/tests/*.test.mjs` 和 `demo:harness: node harness/examples/simulator-demo.mjs`，不改变现有 `test` 的网站测试语义。

- [ ] **Step 2: 增加 CI job**

CI 在现有网站 test/build 后运行 `npm run test:harness` 和两个无网络示例。不要在 CI 下载模型、访问设备或启动真实服务。

- [ ] **Step 3: 更新根 README**

加入 harness 入口、运行命令、四种模式和当前硬件边界。明确当前仓库仍是网站 + 通用 harness，真实 BenBen 控制器和私有现场配置不随公开代码发布。

- [ ] **Step 4: 运行完整验证**

Run: `npm test`
Expected: existing website tests PASS。

Run: `npm run test:harness`
Expected: harness tests PASS。

Run: `npm run demo:harness`
Expected: deterministic simulator events print successfully without network.

Run: `npm run build`
Expected: Vite build PASS。

- [ ] **Step 5: 提交**

```bash
git add package.json .github/workflows/ci.yml README.md harness/scripts/test.mjs
git commit -m "ci: verify harness alongside website"
```

### Task 6: 发布前审查

**Files:**
- Inspect: `.env.example`, `.gitignore`, `docs/deployment.md`, `git log`
- Modify if needed: `harness/README.md`, `docs/open-source/harness.md`, `.gitignore`

- [ ] **Step 1: 检查敏感信息和重型二进制**

运行 `rg -n "(API_KEY|TOKEN|SECRET|DEVICE_KEY|PRIVATE_KEY|BEGIN .* KEY)" harness docs README.md .env.example`，确认只出现示例字段或说明；运行 `git ls-files` 检查没有把录音、现场日志和密钥加入 harness。

- [ ] **Step 2: 检查许可证和边界文案**

确认代码许可证、第三方声明、模型 manifest 和资产授权相互独立；不能把 GLB、Blender、音频或第三方模型隐含授予代码许可证。

- [ ] **Step 3: 最终回归**

重复 Task 5 的测试和构建，检查 `git status`，只提交本计划产生的文件，不覆盖用户已有的 `docs/product/source.json`、`docs/nailong-model.md` 和 `docs/spiderman-model.md` 修改。
