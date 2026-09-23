export const PROCEDURAL_CLIPS = [
  "nod-soft",
  "nod-double",
  "head-shake",
  "tilt-left",
  "tilt-right",
];
export function proceduralPose(name, elapsed) {
  const rest = { yaw: 0, pitch: 0, roll: 0 };
  if (elapsed <= 0 || elapsed >= 1.8) return rest;
  const t = elapsed / 1.8,
    envelope = Math.sin(Math.PI * t) ** 2;
  if (name === "nod-soft") rest.pitch = 0.32 * envelope;
  if (name === "nod-double") rest.pitch = 0.3 * Math.sin(2 * Math.PI * t) ** 2;
  if (name === "head-shake") rest.yaw = .32 * Math.sin(4*Math.PI*t) * envelope;
  if (name === "tilt-left") rest.roll = -0.25 * envelope;
  if (name === "tilt-right") rest.roll = 0.25 * envelope;
  return rest;
}
