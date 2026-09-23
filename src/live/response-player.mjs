import * as THREE from "three";
import { DEFAULT_TUNING, validateTuning } from "./motion-tuning.mjs";
import { tuneClip } from "./tuned-clip.mjs";
import { ACTION_CATALOG } from "../../shared/action-catalog.mjs";

/** Plays only a registered, loaded clip and resolves after its actual finish + recovery. */
export function createResponsePlayer({
  mixer,
  actions,
  manifest,
  bones,
  onStart = () => {},
  getTuning = () => DEFAULT_TUNING,
}) {
  const seen = new Map();
  const queue = [];
  let current = null,
    recovery = null,
    disposed = false;
  function idle() {
    const a = actions.idle;
    a?.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    return a;
  }
  function settle(status) {
    if (!current) return;
    const done = current;
    current = null;
    recovery = null;
    if (done.tunedClip) mixer.uncacheClip(done.tunedClip);
    done.resolve({
      status,
      tuning: done.tuning,
      clip: done.clip,
      eventId: done.eventId,
      formId: manifest.formId,
    });
  }
  function recover(status) {
    const incoming = idle();
    if (incoming) incoming.crossFadeFrom(current.action, 0.35, false);
    else current.action.fadeOut(0.35);
    recovery = { remaining: 0.35, status };
  }
  function drain() {
    if (current || disposed) return;
    const job = queue.shift();
    if (!job) return;
    const { request, variant, tuning, resolve } = job;
    if (request.actionId === "WAIT") {
      resolve({status: "completed", clip: "idle", eventId: request.eventId, formId: manifest.formId});
      drain();
      return;
    }
    onStart();
    mixer.stopAllAction();
    const incoming = idle();
    const tunedClip = tuning.amplitude === 1 ? null : tuneClip(actions[variant.clip].getClip(), tuning.amplitude);
    const action = tunedClip ? mixer.clipAction(tunedClip) : actions[variant.clip];
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(tuning.speed).setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    if (incoming) action.crossFadeFrom(incoming, 0.18, false);
    current = { action, tunedClip, tuning, resolve, clip: variant.clip, eventId: request.eventId };
  }
  const finished = (e) => {
    if (current && e.action === current.action && !recovery)
      recover("completed");
  };
  mixer.addEventListener("finished", finished);
  return {
    get busy() {
      return Boolean(current);
    },
    get clip() {
      return current?.clip || null;
    },
    play(request) {
      if (disposed || request.formId !== manifest.formId)
        return Promise.resolve({
          status: "unavailable",
          reason: "form-not-loaded",
        });
      if (!request.eventId) return Promise.resolve({ status: "invalid" });
      if (seen.has(request.eventId))
        return Promise.resolve({ status: "duplicate" });
      const spec = ACTION_CATALOG[request.actionId];
      const variant = manifest.variants.find(
        (v) => v.logicalId === spec?.suffix,
      );
      if (
        request.actionId !== "WAIT" && (!variant ||
        !actions[variant.clip] ||
        variant.requiredBones.some((b) => !bones.has(b)))
      )
        return Promise.resolve({
          status: "unavailable",
          reason: "animation-not-loaded",
        });
      let tuning = DEFAULT_TUNING;
      if (request.actionId !== "WAIT") {
        try { tuning = validateTuning(getTuning(request.actionId)); }
        catch { return Promise.resolve({status: "unavailable", reason: "invalid-tuning"}); }
      }
      if (queue.length >= 32)
        return Promise.resolve({status: "unavailable", reason: "animation-queue-full"});
      seen.set(request.eventId, true);
      if (seen.size > 1000) seen.delete(seen.keys().next().value);
      return new Promise(resolve => {
        queue.push({request, variant, tuning, resolve});
        drain();
      });
    },
    update(dt) {
      if (recovery) {
        recovery.remaining -= dt;
        if (recovery.remaining <= 0) {
          const status = recovery.status;
          current.action.stop();
          settle(status);
          drain();
        }
      }
    },
    stop() {
      for (const job of queue.splice(0)) job.resolve({status: "interrupted", eventId: job.request.eventId, formId: manifest.formId});
      if (current) {
        current.action.stop();
        idle();
        settle("interrupted");
      }
    },
    dispose() {
      disposed = true;
      this.stop();
      mixer.removeEventListener("finished", finished);
    },
  };
}
