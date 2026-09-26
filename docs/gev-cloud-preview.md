# GEV 云端试玩

网站的默认展示仍然是原来的 Cowcoming 页面、六套真实牛来 GLB 和原有动作播放器。云端试玩只增加一个很窄的模型接口：用户输入一句话，GEV 返回一个已有动作 ID，网页在当前真实模型上播放对应动画。它不改变进化树、不计培养轮数、不连接机械臂，也不要求网站接入大语言模型。

## 配置公开 endpoint

在构建网站时设置公开地址：

```sh
VITE_GEV_PREVIEW_URL=https://your-preview-gateway.example/v1/gev/preview
```

`VITE_GEP_PREVIEW_URL` 也可以作为兼容别名。`VITE_*` 会进入浏览器构建产物，所以这里只能放地址，不能放 GEV、LLM、设备或管理员密钥。没有配置地址时，页面明确显示“待配置”，不会伪造一次成功的决策。

接口接收：

```json
{
  "requestId": "browser-generated-id",
  "model": "gev-preview-v1",
  "formId": "normal",
  "text": "我今天有点累，陪我安静一会儿。",
  "allowedActions": ["NOD", "SHAKE", "NOD_DOUBLE", "TILT_LEFT", "TILT_RIGHT", "WAIT"]
}
```

接口返回：

```json
{
  "requestId": "browser-generated-id",
  "actionId": "NOD",
  "summary": "简短可读的动作理由",
  "modelVersion": "your-model-version",
  "latencyMs": 83
}
```

`requestId` 必须原样返回，`actionId` 只能来自请求中的动作目录。网页会再次校验这两个条件，任何自由文本或未知动作都会被拒绝。跨域 endpoint 需要允许网站来源的 `POST`、`content-type` 和 `accept` 请求头，并返回 JSON；如果使用同源 Worker 路径，则不需要额外 CORS。

GEV 服务可以由项目方在云端持有自己的模型凭据，浏览器只看到公开试玩接口。供应商协议、提示词和密钥都放在该网关之后；本仓库不假定某一家模型供应商的请求格式。

## 可选的用户自带语言模型

页面另有一个默认折叠的“浏览器直连自己的语言模型”区域。用户可以临时填写 endpoint、API Key/SDK 和模型名，浏览器直接向该 endpoint 发兼容请求。这个 key 只保存在当前 React 内存，不写入 localStorage、服务端或 Cowcoming Worker；语言结果只作为文字显示，不进入 GEV 决策，也不驱动设备。提供商必须允许浏览器跨域请求，用户应只输入自己愿意直接交给该提供商的 key。

这两个链路故意分开：GEV 负责从已有动作中做快速选择，语言模型（如果用户选择使用）只负责文字。原网站的真实模型资产、人格、动作合同和硬件接入边界都继续由现有文档定义。

## 本地联调

仓库提供一个仅监听 loopback 的本地模型网关，便于先验收页面交互，再接入真实模型：

```sh
npm run models:dev
npm run dev -- --port 4197
```

开发环境的 `.env.local`（已被 Git 忽略）可以指向：

```dotenv
VITE_GEV_PREVIEW_URL=http://127.0.0.1:8768/gev/preview
VITE_LLM_PREVIEW_URL=http://127.0.0.1:8768/v1/chat/completions
VITE_LLM_PREVIEW_MODEL=local-llm-fixture-v1
```

没有配置真实模型 endpoint 时，网关使用明确标注的本地规则测试适配器；它只用于验证请求、动作播放和文字展示，不能当作 GEV 或 LLM 的真实推理结果。接入真实模型时，在网关进程的私有环境中设置 `GEV_MODEL_*`、`LLM_MODEL_*` 和可选的 `EVOLUTION_MODEL_*`，密钥不会进入浏览器。`/health` 会显示当前是 fixture 还是已配置模型。
