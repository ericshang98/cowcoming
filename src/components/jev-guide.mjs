// Fixed educational content. This guide does not call a model or control devices.
export const jevTopics = [
  {
    id: "jev",
    question: "JEV 在牛来中做什么？",
    matches:
      /^(jev|你好|hello|hi)[?？!！。\s]*$|jev\s*(是什么|是啥|做什么|有什么用)|什么是\s*jev|介绍.*jev|what\s+is\s+jev|\babout\b/i,
    answer:
      "在牛来的方案里，JEV 负责行为决策：根据当前事件、角色状态和可用能力，选择下一步回应。\n\n例如收到打招呼事件后，可以从已经准备好的点头、声音回应或等待中选择。感知负责提供信息，本机控制程序负责执行，JEV 负责在允许的选项里做决定。\n\n这个窗口用固定问答讲解方案，没有连接 JEV 服务。",
  },
  {
    id: "decision",
    question: "我们怎么用 JEV 做快速决策？",
    matches: /决策|快速|速度|延迟|响应|多快|\b(fast|speed|latency|decision)\b/i,
    answer:
      "我们的思路是先把场景和可选行为整理好，再让 JEV 选择下一步。\n\n① 整理输入：发生了什么、角色处于什么状态、设备是否就绪。\n② 收窄选项：只提供当前已解锁、设备支持、已经准备并验证的行为。\n③ 输出选择：选择一个行为，由本机检查后交给执行器。\n④ 等待回执：根据实际完成、失败或停止的结果更新状态。\n\n这样能减少每次临时生成完整动作方案的步骤。持续跟随和电机轨迹留在本机处理，不逐帧请求 JEV。实际响应速度仍需在接入后测量，这里没有延迟实测数据。",
  },
  {
    id: "example",
    question: "举个牛来做决策的例子",
    matches: /例子|举例|示例|演示|打招呼|招手|\b(example|demo|greet)\b/i,
    answer:
      "固定示例 · 有人向牛来打招呼\n\n事件：感知模块报告「有人打招呼」。\n状态：假设牛来处于空闲状态，设备就绪，现场用户已开始本轮控制。\n候选行为：点头、播放问候音频、等待；这些行为需事先准备并验证。\nJEV 选择：假设本次选择「点头」。\n本机执行：检查权限、设备能力和限位，再调用预设动作。\n结果回传：收到动作完成回执后，才记录这次互动完成。\n\n如果设备未就绪，就不执行动作并显示原因。上面是预设讲解，不是实时推理或真实硬件执行记录。",
  },
  {
    id: "hardware",
    question: "怎么把 JEV 用到硬件中？",
    matches:
      /硬件|机械臂|设备|接入|接到|接线|传感器|摄像头|\b(hardware|robot|device|sensor|sdk)\b/i,
    answer:
      "接入思路：感知 → JEV 决策 → 本机控制程序 → 硬件 → 执行回执。\n\n1. 为具体设备准备适配器，通过它实际支持的 USB、串口、蓝牙或厂商 SDK 读取状态、调用动作。\n2. 把已验证的动作整理成行为库，注明每个动作需要的设备能力和执行条件。\n3. 将感知事件、当前状态和允许的行为交给 JEV，获得行为选择。\n4. 本机检查权限和设备状态后执行；用硬件回执更新页面，不能把「已发送」当作「已完成」。\n\n首步是确认设备型号与协议，再验证一个动作的完整闭环。这里展示的是接入方案；本窗口不会连接或驱动真实设备。",
  },
  {
    id: "control",
    question: "JEV 和本机控制程序怎么分工？",
    matches:
      /分工|边界|电机|轨迹|限位|停止|安全|断线|掉线|超时|白名单|直接控制|\b(motor|safety|stop|timeout|offline)\b/i,
    answer:
      "JEV 选择「做什么」，本机控制程序负责「具体怎么执行」。\n\nJEV：根据事件和状态，从当前允许的行为集合里选择。\n本机：处理持续视觉跟随、电机轨迹、动作冲突、限位和停止；检查设备是否就绪、控制权限是否有效。模型输出不能扩大能力白名单。\n\n真正可执行的行为，需要同时满足：已解锁、硬件支持、行为已部署验证、当前就绪且已授权。\n\n遇到停止、断线或无效选择时，不继续下发动作；物理停止方式需要按具体设备验证。停止不需要等待 JEV 批准，重新连接也不自动重放旧动作。",
  },
  {
    id: "status",
    question: "这个窗口现在能做什么？",
    matches:
      /进度|上线|能做什么|固定问答|预设回答|真.*ai|实时.*(回答|推理)|联网|什么模型|调用.*模型|连接.*模型|\b(status|live|connected)\b/i,
    answer:
      "这个窗口现在是 JEV 固定问答导览：点击问题，或输入相关关键词，就能查看预先写好的说明。\n\n可查看：JEV 的定位、快速决策流程、打招呼示例、硬件接入步骤，以及本机控制的分工。\n\n这里没有调用 JEV 或其他 AI 模型，不会根据对话临时生成答案，也不会执行硬件指令。示例不代表实测速度、设备已连接或接入已完成。",
  },
];

const help =
  "可以问我：JEV 在牛来中做什么、如何快速决策、一个决策示例、如何接入硬件、控制程序怎么分工。\n\n快捷指令：/jev /decision /example /hardware /control /status /help。输入 /clear 清空对话。";

export function answerJevQuestion(raw) {
  const query = raw.trim().normalize("NFKC");
  if (
    query.toLowerCase() === "/help" ||
    /^(帮助|help)[?？!！\s]*$/i.test(query)
  )
    return help;
  if (query.startsWith("/")) {
    const topic = jevTopics.find(
      (item) => `/${item.id}` === query.toLowerCase(),
    );
    return topic?.answer ?? `还没有这个指令。\n\n${help}`;
  }
  const exact = jevTopics.find(
    (item) =>
      item.question.normalize("NFKC").toLowerCase() === query.toLowerCase(),
  );
  if (exact) return exact.answer;
  // Specific intents take priority over broad terms such as “hardware” and “JEV”.
  const order = ["control", "example", "status", "hardware", "decision", "jev"];
  const topic = order
    .map((id) => jevTopics.find((item) => item.id === id))
    .find((item) => item.matches.test(query));
  return (
    topic?.answer ??
    `这个问题暂时没有收录。我目前只提供 JEV 的固定讲解，不能自由生成回答。\n\n${help}`
  );
}
