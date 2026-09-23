import { jevTopics, answerJevQuestion } from "../components/jev-guide.mjs";

// Keyed by topic ID so reordering questions cannot mix up their translations.
const englishTopics = {
  jev: {
    question: "What does JEV do for Niulai?",
    answer:
      "JEV is the structured decision layer in our design: it reads the current situation and explicit questions, then returns judgments that software can use.\n\nChoice: select from candidates, such as whom to respond to or which behavior to use.\nScore: evaluate a predefined ordered scale, such as interaction intensity.\nNoul: estimate the probability that a proposition is true, such as whether this is a good moment to initiate contact.\n\nChoice and Score provide probability distributions and confidence; Noul returns a proposition probability. Software uses these results to select prepared behaviors, while local control executes them. This window shows fixed explanations and does not call JEV.",
  },
  decision: {
    question: "How do we use JEV for fast decisions?",
    answer:
      "We organize the situation into one state, turn the next step into explicit questions, let JEV choose, and run a prepared behavior.\n\n1. Gather context: the full user message, recent conversation, current form, participant and device state.\n2. Limit candidates: only character-appropriate dialogue and motion combinations that are available and verified.\n3. Evaluate: whether to respond, to whom, with which behavior and at what intensity. Independent questions can share a request; dependent questions are handled in steps.\n4. Check and execute: local scheduling checks conditions, runs the behavior and updates state from execution feedback.\n\nThis is how the first version selects its expressions. Continuous visual tracking and motor trajectories stay local, without waiting for JEV on each frame. Uncertain or timed-out decisions use a prepared fallback. Speed must be measured across the full event-to-action path; this guide contains no latency measurements.",
  },
  example: {
    question: "Show me a Niulai decision example",
    answer:
      "Fixed example · Someone greets Niulai\n\nEvent: perception reports a greeting.\nState: assume Niulai is idle, the device is ready and the local user has started the session.\nOptions: nod, play a greeting, or wait. Each behavior must be prepared and verified beforehand.\nJEV selection: suppose it chooses a nod.\nLocal execution: check permissions, device capabilities and limits, then run the prepared motion.\nFeedback: record the interaction as complete only after receiving a completion receipt.\n\nIf the device is not ready, do not move; explain why. This is a prepared example, not live reasoning or a hardware execution log.",
  },
  hardware: {
    question: "How does JEV connect to hardware?",
    answer:
      "Integration flow: perception → JEV decision → local control → hardware → execution feedback.\n\n1. Prepare an adapter for the device using its supported USB, serial, Bluetooth or vendor SDK interface to read state and request actions.\n2. Organize verified motions into a behavior library, with the capabilities and conditions required by each action.\n3. Give JEV the perception event, current state and permitted behaviors to obtain a selection.\n4. Local control checks permissions and device state before executing. Update the page from hardware feedback; “sent” does not mean “completed”.\n\nFirst confirm the device model and protocol, then verify one complete action cycle. This is an integration plan. This window does not connect to or operate physical devices.",
  },
  control: {
    question: "How do JEV and local control work together?",
    answer:
      "JEV chooses what to do; local control determines how it is executed.\n\nJEV: select from the currently permitted behaviors using events and state.\nLocal control: handle continuous visual tracking, motor trajectories, conflicting actions, limits and stopping; check device readiness and valid control permission. Model output cannot expand the capability allowlist.\n\nAn action can run only when it is unlocked, supported by the hardware, deployed and verified, ready and authorized.\n\nOn a stop request, disconnection or invalid selection, stop issuing actions. The physical stopping method must be verified for the device. Stopping does not wait for JEV approval, and reconnecting does not replay old actions.",
  },
  status: {
    question: "What can this window do today?",
    answer:
      "This window is a fixed Q&A guide to the project and JEV. Choose a question or enter related keywords to read a prepared explanation.\n\nExplore the core idea, JEV decisions, natural interaction, branching growth, hardware integration and local control responsibilities.\n\nThis window does not call an AI model, generate new answers or issue hardware commands. The open interaction and growth described here are product plans; actual capabilities depend on integration and validation.",
  },
  vision: {
    question: "What are we really trying to build?",
    answer:
      "We want to build a hardware and software system that lets different characters sense their surroundings, respond in the moment, and grow through interaction. Niulai is the first showcase character.\n\nThe shared system handles perception, decisions, behavior execution and growth state. Each character brings its own personality, models, movements, sounds and evolution paths. JEV connects the situation to a suitable behavior, helping the character decide when to pay attention and how to respond.\n\nWe are exploring this flow with a robotic-arm desktop companion prototype. The aim is to support more characters with the same foundation; each new hardware carrier still needs its own integration and validation.",
  },
  interaction: {
    question: "How can prepared behaviors feel natural?",
    answer:
      "Our interaction design lets people speak naturally while the character chooses a suitable response from expressions prepared in advance.\n\nThere are no special phrases to memorize. JEV considers the full message, recent conversation, current form and personality, recently used content and execution state. It selects dialogue and motion that fit the context while reducing repetition. A response can also be a silent gesture.\n\nFor example, “You are pretty impressive” could invite a proud response. If you then clarify, “I meant I was impressive,” the next response should take that correction into account instead of reacting proudly to the word “impressive” again.\n\nThe system can also initiate an invitation based on the situation or respond when you speak. This fixed Q&A explains the design. Open-ended input for the physical companion still requires model integration and real conversation testing; it does not imply the ability to answer every question.",
  },
  growth: {
    question: "How does interaction shape a character’s growth?",
    answer:
      "We want meaningful interactions to inform a character’s growth, with different interactions leading toward different evolution branches.\n\nEach character defines its own evolution tree. Every form links to its visual model and interaction content. JEV evaluates permitted branches using the current state and interaction evidence; software then checks conditions, resources and execution results before committing a transition.\n\nA new form needs matching visuals, sounds and behavior settings. Branches can express different personalities and responses. Sibling forms have no automatic ranking, and every session need not reach the same ending.\n\nThe actual branches depend on configured and validated versions. Previewing a model or playing an evolution effect does not prove real growth or online model learning. Growth cannot create new physical hardware capabilities.",
  },
};

const help =
  "Ask about the core idea, JEV decisions, natural interaction, branching growth, hardware integration or local control.\n\nCommands: /vision /jev /decision /example /hardware /control /interaction /growth /status /help. Use /clear to clear the conversation.";
export const guideMessages = [
  ["JEV 决策指南", "JEV DECISION GUIDE"],
  ...jevTopics.flatMap((topic) => [
    [topic.question, englishTopics[topic.id].question],
    [topic.answer, englishTopics[topic.id].answer],
  ]),
  [
    "让不同 IP 感知环境、及时回应，并在互动中成长。",
    "Let different characters sense their surroundings, respond in the moment, and grow through interaction.",
  ],
  [answerJevQuestion("/help"), help],
  [answerJevQuestion("/unknown"), "Unknown command.\n\n" + help],
  [
    answerJevQuestion("unmatched question"),
    "This topic is not in the guide yet. I provide fixed explanations about JEV and cannot generate open-ended answers.\n\n" +
      help,
  ],
];
