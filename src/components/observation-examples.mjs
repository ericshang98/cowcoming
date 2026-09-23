// Authored UI demonstrations, never model output or hardware telemetry.
export const observationExamples = [
  {
    id: 'greeting', label: ['打招呼', 'Say hello'],
    input: ['牛来，下午好！', 'Hey Niulai, good afternoon!'],
    reply: ['下午好呀！看到你真开心。今天过得怎么样？我在这里陪你。', 'Good afternoon! It’s lovely to see you. How has your day been? I’m right here with you.'],
    observation: ['听到问候，当前空闲。', 'A greeting is heard. Currently idle.'],
    action: 'NOD', actionLabel: ['轻轻点头', 'A gentle nod'],
    summary: ['选择已准备好的点头动作回应问候；对话由 LLM 独立生成。', 'Choose a prepared nod to acknowledge the greeting. The LLM produces its reply independently.'],
    receipt: ['示例回执：点头完成', 'Example receipt: nod completed'],
  },
  {
    id: 'curiosity', label: ['新事物', 'Something new'],
    input: ['看，这是我新买的小植物。', 'Look, this is my new little plant.'],
    reply: ['这片小叶子好可爱。你给它起名字了吗？以后可以把它放在旁边，和我们一起晒太阳。', 'What a lovely little leaf. Have you given it a name? It could sit beside us and enjoy the sunshine.'],
    observation: ['出现新物体，互动对象仍在画面中。', 'A new object appears; the person remains in view.'],
    action: 'LOOK', actionLabel: ['转向观察', 'Turn to observe'],
    summary: ['在可用动作中选择转向观察，让本机执行预设动作。', 'Select an available observation gesture and let local control execute the prepared motion.'],
    receipt: ['示例回执：转向完成', 'Example receipt: turn completed'],
  },
  {
    id: 'offline', label: ['设备离线', 'Device offline'],
    input: ['牛来，可以点点头吗？', 'Niulai, could you give me a nod?'],
    reply: ['我听到啦。不过动作设备现在没有连接，暂时没办法点头。我们可以继续聊天。', 'I hear you! My movement device isn’t connected right now, so I can’t nod yet. We can still keep chatting.'],
    observation: ['收到动作请求，执行设备离线。', 'A motion is requested; the actuator is offline.'],
    action: 'WAIT', actionLabel: ['等待 · 不下发动作', 'Wait · no motion sent'],
    summary: ['设备未就绪，选择等待。语言回复仍可继续，重连后不重放动作。', 'The device is unavailable, so choose to wait. Conversation continues; reconnecting will not replay the motion.'],
    receipt: ['示例状态：未下发 · 等待设备连接', 'Example state: not sent · waiting for the device'],
  },
];
