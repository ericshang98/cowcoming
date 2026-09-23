import {jevTopics, answerJevQuestion} from '../components/jev-guide.mjs';
const questions = [
'What does JEV do for Niulai?',
'How do we use JEV for fast decisions?',
'Show me a Niulai decision example',
'How does JEV connect to hardware?',
'How do JEV and local control work together?',
'What can this window do today?',
];
const answers = [
`In the Niulai design, JEV selects the next behavior based on the current event, character state and available capabilities.

For a greeting, it can choose among prepared responses such as a nod, an audio reply or waiting. Perception supplies information; local control executes the behavior; JEV chooses from the permitted options.

This window is a fixed Q&A guide. It is not connected to a JEV service.`,
`We prepare the situations and available behaviors first, then let JEV select the next step.

1. Gather context: what happened, the character’s state and device readiness.
2. Limit the options: only behaviors that are unlocked, supported, prepared and verified.
3. Select a behavior: local control checks it before passing it to the actuator.
4. Wait for feedback: update state from actual completion, failure or cancellation.

This reduces the need to generate an entire motion plan for each interaction. Continuous tracking and motor trajectories stay local, without per-frame JEV requests. Actual response times still need measurement after integration; this guide contains no latency measurements.`,
`Fixed example · Someone greets Niulai

Event: perception reports a greeting.
State: assume Niulai is idle, the device is ready and the local user has started the session.
Options: nod, play a greeting, or wait. Each behavior must be prepared and verified beforehand.
JEV selection: suppose it chooses a nod.
Local execution: check permissions, device capabilities and limits, then run the prepared motion.
Feedback: record the interaction as complete only after receiving a completion receipt.

If the device is not ready, do not move; explain why. This is a prepared example, not live reasoning or a hardware execution log.`,
`Integration flow: perception → JEV decision → local control → hardware → execution feedback.

1. Prepare an adapter for the device using its supported USB, serial, Bluetooth or vendor SDK interface to read state and request actions.
2. Organize verified motions into a behavior library, with the capabilities and conditions required by each action.
3. Give JEV the perception event, current state and permitted behaviors to obtain a selection.
4. Local control checks permissions and device state before executing. Update the page from hardware feedback; “sent” does not mean “completed”.

First confirm the device model and protocol, then verify one complete action cycle. This is an integration plan. This window does not connect to or operate physical devices.`,
`JEV chooses what to do; local control determines how it is executed.

JEV: select from the currently permitted behaviors using events and state.
Local control: handle continuous visual tracking, motor trajectories, conflicting actions, limits and stopping; check device readiness and valid control permission. Model output cannot expand the capability allowlist.

An action can run only when it is unlocked, supported by the hardware, deployed and verified, ready and authorized.

On a stop request, disconnection or invalid selection, stop issuing actions. The physical stopping method must be verified for the device. Stopping does not wait for JEV approval, and reconnecting does not replay old actions.`,
`This window is currently a fixed JEV Q&A guide. Choose a question or enter a related keyword to read a prepared explanation.

Topics include JEV’s role, the decision flow, a greeting example, hardware integration and the division of local control responsibilities.

It does not call JEV or another AI model, generate answers from your conversation, or issue hardware commands. Examples do not imply measured speed, connected devices or completed integration.`,
];
const help = 'Ask about JEV’s role in Niulai, fast decisions, a decision example, hardware integration or local control responsibilities.\n\nCommands: /jev /decision /example /hardware /control /status /help. Use /clear to clear the conversation.';
export const guideMessages = [
 ...jevTopics.flatMap((topic,i)=>[[topic.question,questions[i]],[topic.answer,answers[i]]]),
 [answerJevQuestion('/help'),help],
 [answerJevQuestion('/unknown'),'Unknown command.\n\n'+help],
 [answerJevQuestion('unmatched question'),'This topic is not in the guide yet. I provide fixed explanations about JEV and cannot generate open-ended answers.\n\n'+help],
];
