export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const damp = (from, to, speed, dt) =>
  from + (to - from) * (1 - Math.exp(-speed * Math.max(0, dt)));
export function gazeTargets(mouse, head, bodyYaw, human = false) {
  const yaw = 1.45 * Math.tanh((mouse.x - head.x) * 2.6);
  const body = clamp(
    Math.sign(yaw) *
      Math.max(0, Math.abs(yaw) - (human ? 0.16 : 0.42)) *
      (human ? 0.9 : 1),
    human ? -0.8 : -1.05,
    human ? 0.8 : 1.05,
  );
  return {
    body,
    yaw: clamp(yaw - bodyYaw, -0.62, 0.62),
    pitch: -0.4 * Math.tanh((mouse.y - head.y) * 2.4),
  };
}
export const reactionPriority = { ambient: 0, conversation: 1, user: 2 };
export class ReactionQueue {
  constructor() {
    this.pending = null;
    this.active = null;
    this.last = new Map();
  }
  request(name, priority = "user", now = performance.now()) {
    if (
      priority === "ambient" &&
      now - (this.last.get(name) || -Infinity) < 30000
    )
      return false;
    const next = { name, priority, at: now };
    if (
      this.pending &&
      reactionPriority[this.pending.priority] > reactionPriority[priority]
    )
      return false;
    this.pending = next;
    this.last.set(name, now);
    return true;
  }
  take(blocked = false) {
    if (blocked) return null;
    const r = this.pending;
    this.pending = null;
    return r;
  }
  clear() {
    this.pending = null;
    this.active = null;
  }
}
export function makeController() {
  return {
    ready: false,
    entranceProgress: 0,
    mouthPose: "closed",
    mouthPreview: false,
    mouse: { x: 0, y: 0, active: false },
    gaze: null,
    tracking: true,
    paused: false,
    dragging: false,
    dragYaw: 0,
    bodyYaw: 0,
    headYaw: 0,
    headPitch: 0,
    tilt: { x: 0, y: 0 },
    queue: new ReactionQueue(),
    gesture(name, priority = "user") {
      return this.queue.request(name, priority);
    },
    mood: "idle",
    error: null,
  };
}
