// Fixed educational content. This guide does not call a model or control devices.
export const jevTopics = [
  {
    id: "vision",
    question: "我们真正想做的是什么？",
    matches:
      /核心|思想|理念|愿景|想法|定位|想做|为什么做|不同.*ip|其他.*ip|通用系统|trying to build|\b(vision|purpose|building|ip|idea)\b/i,
    answer:
      "我们想做一套让不同 IP 感知环境、及时回应，并在互动中成长的软硬件系统。牛来是首个展示角色。\n\n共同的系统负责感知、决策、行为执行和成长状态；每个 IP 带来自己的人设、模型、动作、声音和进化路线。JEV 把现场状态连接到合适的行为，让角色知道何时关注你、怎样回应你。\n\n当前以机械臂桌面宠物原型验证这条链路。我们希望同一套能力能承载更多角色；更换硬件仍需完成对应的适配与验证。",
  },
  {
    id: "jev",
    question: "JEV 在牛来中做什么？",
    matches:
      /^(jev|你好|hello|hi)[?？!！。\s]*$|jev\s*(是什么|是啥|做什么|有什么用)|什么是\s*jev|介绍.*jev|what\s+is\s+jev|\b(about|choice|score|noul)\b/i,
    answer:
      "JEV 在方案中是结构化决策层：读取现场状态与明确的问题，给出可以被程序使用的判断结果。\n\nChoice：从候选项中选择，例如回应谁、使用哪个行为。\nScore：按事先定义的有序尺度评分，例如互动强度。\nNoul：评估一个命题为真的概率，例如「此刻适合主动邀约」。\n\nChoice 和 Score 提供概率分布及置信度；Noul 返回命题概率。程序根据判断结果调用预设行为，本机负责实际执行。这个窗口展示的是固定说明，没有调用 JEV。",
  },
  {
    id: "decision",
    question: "我们怎么用 JEV 做快速决策？",
    matches: /决策|快速|速度|延迟|响应|多快|\b(fast|speed|latency|decision)\b/i,
    answer:
      "把现场情况整理成一份状态，把下一步拆成明确的问题，让 JEV 做选择，再调用准备好的行为。\n\n① 汇集输入：用户完整话语、最近的对话、当前形态、参与者与设备状态。\n② 限定候选：只提供符合角色、当前可用且已验证的台词与动作组合。\n③ 结构化判断：是否回应、选择谁、用哪个行为、采用哪个强度档位。独立问题可以合并请求；依赖前一问的问题分步处理。\n④ 检查并执行：本机调度器检查条件，调用行为，再用实际回执更新状态。\n\n第一版用这套方式选择表达。持续视觉跟随和电机轨迹在本机处理，不逐帧等待 JEV；判断不确定或超时时使用预设回退。实际速度需测量从事件到动作的完整链路，这里没有延迟实测数据。",
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
    id: "interaction",
    question: "为什么预设动作也能自然互动？",
    matches:
      /自然|开放输入|自由.*(交流|表达|说话)|上下文|口令|台词|预设动作|关键词|主动|被动|\b(conversation|context|natural|interaction)\b/i,
    answer:
      "我们的交互设计是：用户自然表达，角色从事先准备好的表达中选择合适的回应。\n\n用户无需记住口令。JEV 参考完整话语、最近几轮对话、当前形态与人设、刚用过的内容和执行状态，选择接得上话的台词与动作，并减少重复。也可以只做动作、不说话。\n\n例如你说「你还挺厉害」，它可以得意地回应；你接着纠正「我说的是我厉害」，下一轮应结合上下文收敛，而不是再次因为「厉害」而昂首。\n\n系统也可以根据现场情况主动邀约，或在你说话后回应。这里的固定问答用于介绍方案；真实宠物的开放输入需要模型接入和实际试聊验证，不代表能回答所有问题。",
  },
  {
    id: "growth",
    question: "互动怎样影响角色的成长？",
    matches:
      /成长|进化|分支|形态|培养|解锁|\b(growth|evolution|evolve|branch|form)\b/i,
    answer:
      "我们希望每次有效互动都能成为角色成长的依据，让不同的互动走向不同的进化分支。\n\n每个 IP 定义自己的进化树，每种形态绑定相应的角色模型与互动内容。JEV 结合当前状态和互动证据评估允许的分支；程序再检查条件、素材与执行结果，完成形态转换。\n\n进入新形态时，视觉模型、声音与行为配置需要一起对应。分支可以呈现不同性格和表达，兄弟形态不默认有高低关系，也不要求每轮都走向同一个终点。\n\n具体分支以完成配置并验证的版本为准。预览模型或播放进化效果不等于真实成长，也不代表模型发生了在线学习；成长不会凭空增加硬件能力。",
  },
  {
    id: "status",
    question: "这个窗口现在能做什么？",
    matches:
      /进度|上线|能做什么|固定问答|预设回答|真.*ai|实时.*(回答|推理)|联网|什么模型|调用.*模型|连接.*模型|\b(status|live|connected)\b/i,
    answer:
      "这个窗口是项目与 JEV 的固定问答导览：点击问题，或输入相关关键词，查看预先写好的说明。\n\n可查看：项目核心想法、JEV 决策、自然互动、分支成长、硬件接入及控制分工。\n\n本窗口没有调用 AI 模型，不会临时生成答案或执行硬件指令。文中介绍的开放互动与成长是产品方案，具体能力以实际接入和验证结果为准。",
  },
];

const help =
  "可以问我：项目核心想法、JEV 如何决策、自然互动、分支成长、硬件接入或控制分工。\n\n快捷指令：/vision /jev /decision /example /hardware /control /interaction /growth /status /help。输入 /clear 清空对话。";

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
  const order = [
    "vision",
    "growth",
    "interaction",
    "control",
    "example",
    "status",
    "hardware",
    "decision",
    "jev",
  ];
  const topic = order
    .map((id) => jevTopics.find((item) => item.id === id))
    .find((item) => item.matches.test(query));
  return (
    topic?.answer ??
    `这个问题暂时没有收录。我目前只提供 JEV 的固定讲解，不能自由生成回答。\n\n${help}`
  );
}
