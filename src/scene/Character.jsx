import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { PROCEDURAL_CLIPS, proceduralPose } from "../live/animation.mjs";
import { damp, gazeTargets, clamp } from "./motion.mjs";
import { refineIpSkin } from "./ip-skin.mjs";
import { createIpClips } from "./ip-motion.mjs";
import IpWeb from "./IpWeb";
import { NIULAI_ASSET, prepareMouth, updateMouth } from "./niulai.mjs";
const MASCOT = NIULAI_ASSET,
  HUMAN = "/models/fuch-human-spin.glb";
useGLTF.setDecoderPath("/draco/");
useGLTF.preload(MASCOT);
const gestures = {
  greet: "wave",
  wave: "wave",
  perk: "bow",
  nod: "bow",
  cheer: "wave",
  happy: "wave",
  dance: "wave",
  flair: "wave",
  flip: "wave",
  spin: "bow",
  curious: "bow",
};
function Rig({ human, modelAsset = MASCOT, characterId, controller, placement, visible, onReady, entrance, onTap }) {
  const gltf = useGLTF(human ? HUMAN : modelAsset),
    { camera, gl } = useThree(),
    root = useRef(),
    initialScale = useRef(entrance ? 0.7 : placement.scale);
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    m.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.material = Array.isArray(o.material)
          ? o.material.map((x) => x.clone())
          : o.material.clone();
      }
    });
    refineIpSkin(m, characterId);
    return m;
  }, [gltf, characterId]);
  const mouths = useMemo(() => prepareMouth(model), [model]);
  const bones = useMemo(() => {
    let head, neck, hips, armature;
    const toes = [];
    model.traverse((b) => {
      if (b.name === "Head") head = b;
      if (/^neck$/i.test(b.name)) neck = b;
      if (b.name === "Hips") hips = b;
      if (b.name === "Armature") armature = b;
      if (/ToeBase$/.test(b.name)) toes.push(b);
    });
    return {
      head,
      neck,
      hips,
      armature,
      toes,
      hipBase: hips?.position.clone(),
      armBase: armature?.position.clone(),
    };
  }, [model]);
  const metrics = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model),
      size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3()),
      s = 2.4 / size.y;
    return {
      s,
      minY: box.min.y,
      width: size.x,
      pos: [0, -center.y * s + size.y * s * 0.06, -center.z * s],
    };
  }, [model]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const actions = useMemo(
    () =>
      Object.fromEntries(
        [...gltf.animations, ...createIpClips(model, characterId)].map((c) => [c.name, mixer.clipAction(c)]),
      ),
    [gltf, mixer, model, characterId],
  );
  const state = useRef({
    time: 0,
    body: 0,
    head: 0,
    pitch: 0,
    roll: 0,
    liveMotion: null,
    active: null,
    until: 0,
    started: false,
    nextIdle: 18,
    prevVisible: false,
    foot: new THREE.Vector3(),
    headScreen: new THREE.Vector3(),
    parentQ: new THREE.Quaternion(),
    deltaQ: new THREE.Quaternion(),
    conj: new THREE.Quaternion(),
    angles: new THREE.Euler(0, 0, 0, "YXZ"),
    base: new Map(),
  });
  useEffect(() => {
    model.traverse((o) => {
      if (!o.isMesh) return;
      const paint = (m) => {
        // Keep the supplied character's PBR texture and roughness.
        // The previous robot's steel/AO shader does not apply to Niulai.
        m.envMapIntensity = 0.22;
        return m;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(paint)
        : paint(o.material);
    });
    actions.idle?.reset().play();
    gl.compile(model, camera);
    onReady?.();
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.traverse((o) => {
        if (o.userData.ipOwnGeometry) o.geometry.dispose();
        if (o.isMesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
      });
    };
  }, [model, mixer, actions, human, gl, camera]);
  function play(name, time, limit) {
    const action = actions[name];
    if (!action) return false;
    const st = state.current;
    if (st.active) st.active.fadeOut(0.18);
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    const duration = action.getClip().duration;
    action.timeScale = limit ? Math.max(1, duration / limit) : 1;
    action.setEffectiveWeight(1).fadeIn(0.18).play();
    actions.idle?.fadeOut(0.18);
    st.active = action;
    st.until = time + duration / action.timeScale;
    return true;
  }
  useFrame((_, raw) => {
    const st = state.current,
      group = root.current;
    if (!group) return;
    group.visible = visible;
    if (!visible) {
      st.prevVisible = false;
      return;
    }
    const dt = Math.min(raw, 0.05),
      moving = !controller.paused;
    if (!st.prevVisible) {
      st.prevVisible = true;
      if (human) play("spin", st.time, 1.5);
    }
    if (moving) st.time += dt;
    for (const [bone, q] of st.base) bone.quaternion.copy(q);
    st.base.clear();
    if (moving && characterId !== 'niulai') {
      const playback = controller.ipPlayback;
      if (st.ipPlayback !== playback) {
        st.ipBlend = { start: st.time, poses: [] };
        model.traverse(b => { if (b.isBone) st.ipBlend.poses.push([b, b.quaternion.clone(), b.position.clone()]); });
        st.active?.stop(); st.active = null;
        actions.idle?.reset().setEffectiveWeight(1).play();
        st.ipPlayback = playback;
        if (playback && actions[playback.clip]) {
          st.active = actions[playback.clip];
          st.active.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).play();
          st.active.clampWhenFinished = true;
        }
      }
      controller.queue.clear();
      if (st.active && playback) {
        st.active.time = Math.min(st.active.getClip().duration - .001,
          playback.audio.currentTime / playback.duration * st.active.getClip().duration);
        const weight = Math.min(1, playback.audio.currentTime / .12,
          Math.max(0, playback.duration - playback.audio.currentTime) / .16);
        st.active.setEffectiveWeight(weight); actions.idle?.setEffectiveWeight(1 - weight);
        mixer.update(0);
      } else mixer.update(dt);
      if (st.ipBlend) {
        const p = Math.min(1, (st.time - st.ipBlend.start) / .18), ease = p * p * (3 - 2 * p);
        for (const [b, q, pos] of st.ipBlend.poses) {
          b.quaternion.slerp(q, 1 - ease);
          b.position.lerp(pos, 1 - ease);
        }
        if (p === 1) st.ipBlend = null;
      }
    } else if (moving) {
      if (!st.started) {
        st.started = true;
        if (entrance && play(human ? "walk" : "walking", st.time)) {
          // The supplied walk is a 1.5s cycle. Repeat it for the whole
          // approach instead of stopping halfway through the entrance.
          st.active.setLoop(THREE.LoopRepeat, Infinity);
          st.until = 3.6;
        }
      }
      const next = controller.queue.take(
        controller.dragging || (st.time < 3.6 && entrance),
      );
      if (next && PROCEDURAL_CLIPS.includes(next.name)) {
        st.active?.fadeOut(0.18); st.active = null;
        actions.idle?.reset().setEffectiveWeight(1).fadeIn(0.18).play();
        st.liveMotion = { name: next.name, start: st.time };
      } else if (next) {
        st.liveMotion = null;
        play(
          gestures[next.name] || next.name,
          st.time,
          next.priority === "ambient" ? 2.8 : 2.3,
        );
      }
      if (st.liveMotion && st.time - st.liveMotion.start >= 1.8) st.liveMotion = null;
      if (st.active && st.time >= st.until) {
        st.active.fadeOut(0.28);
        actions.idle?.reset().setEffectiveWeight(1).fadeIn(0.28).play();
        st.active = null;
      }
      if (st.time > st.nextIdle && !st.active && !controller.dragging) {
        st.nextIdle = st.time + 18;
        const alternate = actions.idle2 || actions.idle;
        alternate?.reset().fadeIn(0.8).play();
        if (alternate !== actions.idle) actions.idle?.fadeOut(0.8);
      }
      mixer.update(dt);
    }
    updateMouth(mouths, controller.mouthPose, dt, controller.voiceActive ? controller.voiceLevel : null);
    const half =
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z,
      t = entrance ? clamp(st.time / 3.6, 0, 1) : 1,
      fit = characterId === "niulai" ? placement.scale : Math.min(placement.scale, 2 * half * camera.aspect * .88 / (metrics.width * metrics.s * 1.12)),
      size =
        fit * (entrance ? 0.68 + 0.32 * (1 - (1 - t) ** 3) : 1);
    controller.entranceProgress = t;
    group.scale.setScalar(damp(group.scale.x, size, 7, dt));
    group.position.x = damp(
      group.position.x,
      placement.x * 2 * half * camera.aspect,
      7,
      dt,
    );
    if (bones.armature && bones.armBase) {
      bones.armature.position.x = bones.armBase.x;
      bones.armature.position.z = bones.armBase.z;
    }
    if (bones.hips && bones.hipBase) {
      bones.hips.position.x = bones.hipBase.x;
      bones.hips.position.z = bones.hipBase.z;
    }
    const floor = -1.5 - placement.y * 2 * half;
    if (placement.ground !== false && !human) {
      // Niulai has a fixed root and no ToeBase bones. Anchor the bind-pose
      // sole to the floor, preserving the vertical motion in its clips.
      const sole = (metrics.pos[1] + metrics.minY * metrics.s) * group.scale.y;
      group.position.y = damp(group.position.y, floor - sole, 24, dt);
    } else if (placement.ground !== false) {
      group.updateMatrixWorld(true);
      let lowest = Infinity;
      for (const foot of bones.toes) {
        foot.getWorldPosition(st.foot);
        lowest = Math.min(lowest, st.foot.y);
      }
      if (
        Number.isFinite(lowest) &&
        !st.active?.getClip().name.match(/flip|jump/)
      )
        group.position.y += (floor - lowest) * (1 - Math.exp(-24 * dt));
    } else
      group.position.y = damp(group.position.y, -placement.y * 2 * half, 7, dt);
    group.updateMatrixWorld(true);
    let target = { body: 0, yaw: 0, pitch: 0 };
    if (
      controller.tracking &&
      !controller.mouthPreview &&
      (controller.mouse.active || controller.gaze) &&
      bones.head &&
      !controller.dragging &&
      !st.active && !st.liveMotion
    ) {
      bones.head.getWorldPosition(st.headScreen).project(camera);
      target = gazeTargets(
        controller.gaze || controller.mouse,
        st.headScreen,
        st.body,
        human,
      );
    }
    const livePose = st.liveMotion ? proceduralPose(st.liveMotion.name, st.time - st.liveMotion.start) : { yaw: 0, pitch: 0, roll: 0 };
    target.yaw += livePose.yaw; target.pitch += livePose.pitch;
    if (controller.dragging) target.body = controller.dragYaw;
    if (moving) {
      st.body = damp(st.body, target.body, human ? 3.5 : 2.2, dt);
      st.head = damp(st.head, target.yaw + controller.tilt.x * 0.26, 9, dt);
      st.pitch = damp(st.pitch, target.pitch - controller.tilt.y * 0.15, 9, dt);
      st.roll = damp(st.roll, livePose.roll, 9, dt);
    }
    group.rotation.y = st.body;
    group.rotation.z = controller.tilt.x * 0.035;
    for (const [bone, weight] of [
      [bones.neck, 0.4],
      [bones.head, 0.6],
    ]) {
      if (!bone?.parent) continue;
      st.base.set(bone, bone.quaternion.clone());
      bone.parent.getWorldQuaternion(st.parentQ);
      st.angles.set(st.pitch * weight, st.head * weight, st.roll * weight, "YXZ");
      st.deltaQ.setFromEuler(st.angles);
      st.conj
        .copy(st.parentQ)
        .invert()
        .multiply(st.deltaQ)
        .multiply(st.parentQ);
      bone.quaternion.premultiply(st.conj);
    }
    model.updateMatrixWorld(true);
    const joints = {};
    if (characterId !== 'niulai') model.traverse(b => {
      if (b.isBone && /Head|Hand|WingTip|Root/.test(b.name)) {
        const point = b.getWorldPosition(new THREE.Vector3()).project(camera);
        joints[b.name] = [(point.x + 1) * gl.domElement.clientWidth / 2, (1 - point.y) * gl.domElement.clientHeight / 2];
      }
    });
    controller.rig = {
      joints,
      asset: human ? HUMAN : modelAsset,
      characterId,
      animationTime: st.active?.time || 0,
      animation: st.liveMotion?.name || st.active?.getClip().name || "idle",
      animations: Object.keys(actions),
      mouth: mouths.map(mesh => ({
        shapes: mesh.morphTargetDictionary,
        weights: [...mesh.morphTargetInfluences],
      })),
      position: group.position.toArray(),
      scale: group.scale.x,
      metrics,
      head: st.headScreen.toArray(),
      viewport: [gl.domElement.width, gl.domElement.height],
      model: model.position.toArray(),
    };
    controller.bodyYaw = st.body;
    controller.headYaw = st.head;
    controller.headPitch = st.pitch;
  });
  return (
    <group ref={root} scale={initialScale.current}>
      <group scale={metrics.s} position={metrics.pos}>
        <primitive object={model} onClick={event => {
          event.stopPropagation();
          if (visible && event.button === 0 && event.delta < 6 && !controller.lastPointerWasDrag)
            (onTap || controller.onCharacterTap)?.();
        }} />
        {characterId === "spiderman" && <IpWeb model={model} controller={controller} />}
      </group>
    </group>
  );
}
class SceneBoundary extends React.Component {
  state = { error: null, asset: this.props.asset };
  static getDerivedStateFromProps(props, state) {
    return props.asset !== state.asset ? { error: null, asset: props.asset } : null;
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    this.props.onError?.(error);
  }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="alert">
        The 3D scene couldn't load.
        <button onClick={() => location.reload()}>Reload scene</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Character({
  rigKey = "default",
  controller,
  mode,
  mobile,
  ready,
  onReady,
  boot,
  overlay,
  modelAsset = MASCOT,
  onError,
  onTap,
  characterId = 'niulai',
}) {
  // All project pages show Niulai, including About's contained model stage.
  const stageRef = useRef();
  const placement = useMemo(() => {
    // Loading has its own full-body framing. The mobile homepage deliberately
    // crops the legs, which would hide the walking animation during boot.
    if (!boot && mobile) return { scale: 0.95, x: 0, y: -0.18 };
    if (mode === "about") return { scale: mobile ? 1.3 : 1.4, x: 0, y: 0.02 };
    // WORK is Niulai's main stage, including on narrow screens. Supporting
    // content scrolls below it instead of turning the model into a thumbnail.
    if (mode === "work")
      return mobile
        ? { scale: 1.45, x: 0, y: 0.02 }
        : { scale: 1.22, x: -0.12, y: 0.02 };
    if (overlay) return { scale: 0.24, x: 0.37, y: -0.3, ground: false };
    if (mobile && mode === "home" && characterId !== "niulai") return { scale: 1.2, x: 0, y: -.06 };
    if (mobile)
      return mode === "home"
        ? { scale: 1.4, x: 0, y: 0.16 }
        : { scale: 0.38, x: 0.3, y: -0.13, ground: false };
    if (mode === "contact") return { scale: 1.22, x: 0, y: 0.04 };
    return { scale: 1.25, x: 0, y: -0.02 };
  }, [mode, mobile, overlay, boot, characterId]);
  useEffect(() => {
    let drag = null;
    const blocked = mode === "about" && overlay;
    const point = (x, y) => {
      const r = mode === "about" ? stageRef.current.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
      return { x: ((x - r.left) / r.width) * 2 - 1, y: 1 - ((y - r.top) / r.height) * 2 };
    };
    const move = (e) => {
      if (blocked) return;
      controller.mouse = {
        ...point(e.clientX, e.clientY),
        // Layout width does not identify the input device (e.g. a narrow
        // desktop preview). Follow mice and pens, not touch scrolling.
        active: e.pointerType !== "touch",
      };
      if (drag) {
        controller.dragYaw += (e.clientX - drag.last) * 0.009;
        drag.last = e.clientX;
        drag.distance = Math.max(
          drag.distance,
          Math.hypot(e.clientX - drag.x, e.clientY - drag.y),
        );
      }
    };
    const hover = (e) => {
      if (blocked) return;
      if (e.pointerType === "touch") {
        controller.gaze = null;
        controller.mouse.active = false;
        return;
      }
      const el = e.target.closest?.("button,a,[data-gaze]");
      if (el) {
        const r = el.getBoundingClientRect();
        controller.gaze = point(r.x + r.width / 2, r.y + r.height / 2);
      } else controller.gaze = null;
    };
    const down = (e) => {
      if (
        blocked || e.button !== 0 || !e.isPrimary ||
        !e.target.closest?.(".character-stage") ||
        e.target.closest?.("button")
      )
        return;
      controller.lastPointerWasDrag = false;
      drag = {
        x: e.clientX,
        y: e.clientY,
        last: e.clientX,
        time: performance.now(),
        distance: 0,
      };
      controller.dragging = true;
      controller.dragYaw = controller.bodyYaw;
      controller.queue.clear();
    };
    const up = () => {
      controller.lastPointerWasDrag = !drag || drag.distance >= 6 || performance.now() - drag.time >= 500;
      if (!controller.lastPointerWasDrag && !controller.onCharacterTap && !onTap)
        controller.gesture("perk");
      drag = null;
      controller.dragging = false;
    };
    const cancel = () => {
      drag = null;
      controller.dragging = false;
      controller.gaze = null;
      controller.mouse.active = false;
    };
    const leave = (e) => {
      if (e.relatedTarget === null) cancel();
    };
    addEventListener("pointermove", move);
    addEventListener("pointerover", hover);
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", cancel);
    addEventListener("pointerout", leave);
    addEventListener("blur", cancel);
    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerover", hover);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", cancel);
      removeEventListener("pointerout", leave);
      removeEventListener("blur", cancel);
      cancel();
    };
  }, [controller, mode, overlay, !!onTap]);
  return (
    <div
      ref={stageRef}
      data-character={characterId}
      className={`character-stage ${mobile ? "mobile-character" : ""} mode-${mode} ${ready ? "ready" : ""}`}
      aria-label={characterId !== 'niulai' ? `Interactive 3D ${characterId}` : 'Interactive 3D Niulai'}
      aria-disabled={mode === "about" && overlay ? true : undefined}
    >
      <div
        className="ground-shadow"
        style={{
          left: `${50 + placement.x * 100}%`,
          opacity: placement.ground === false ? 0 : 1,
          transform: `translateX(-50%) scale(${placement.scale})`,
        }}
      />
      <SceneBoundary asset={modelAsset} onError={(e) => {
        controller.error = e.message;
        onError?.(e);
      }}>
        <Canvas
          camera={{ position: [0, 0, 6.2], fov: 40 }}
          dpr={[1, 1.5]}
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.AgXToneMapping,
            toneMappingExposure: 0.66,
          }}
        >
          <ambientLight intensity={0.02} />
          <directionalLight position={[-4, 6, 6]} intensity={0.9} />
          <Suspense fallback={null}>
            <Environment
              files="/env/studio_fuch.hdr"
              environmentIntensity={0.3}
            />
            <Rig
              key={`${modelAsset}:${rigKey}`}
              modelAsset={modelAsset}
              characterId={characterId}
              human={false}
              onTap={onTap}
              controller={controller}
              placement={placement}
              visible
              entrance={!boot}
              onReady={() => {
                controller.error = null;
                controller.ready = true;
                onReady();
              }}
            />
          </Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
