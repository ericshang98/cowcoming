import { Localized, useLanguage, translateText } from "../i18n/Language";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Stars, useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import {
  X,
  ArrowUpRight,
  Settings2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context";
import { STARS, PICKUP_RADIUS } from "../world-collection.mjs";
import "./world-collection.css";
import { NIULAI_ASSET, prepareMouth, updateMouth } from "./niulai.mjs";
const height = (x, z) =>
  Math.sin(x * 0.075) * 1.7 +
  Math.cos(z * 0.085) * 1.3 +
  Math.sin(x * 0.16 + z * 0.07) * 0.45;
function Grass({ quality, player, frozen }) {
  const ref = useRef(),
    count = quality === "HIGH" ? 360000 : quality === "MEDIUM" ? 180000 : 75000;
  const { geometry, material } = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.038, 1.05, 1, 5);
    g.translate(0, 0.525, 0);
    const ps = g.attributes.position;
    for (let i = 0; i < ps.count; i++) {
      const t = ps.getY(i) / 1.05;
      ps.setX(i, ps.getX(i) * (1 - t * 0.95));
      ps.setZ(i, t * t * 0.4);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshPhongMaterial({
      color: "#77c5c5",
      side: THREE.DoubleSide,
      shininess: 85,
      specular: "#9ed2d0",
    });
    m.userData.wind = { value: 0 };
    m.userData.player = { value: new THREE.Vector3() };
    m.userData.origin = { value: new THREE.Vector3() };
    m.onBeforeCompile = (s) => {
      s.uniforms.windTime = m.userData.wind;
      s.uniforms.playerPosition = m.userData.player;
      s.uniforms.grassOrigin = m.userData.origin;
      s.vertexShader = s.vertexShader.replace(
        "#include <common>",
        "#include <common>\nuniform float windTime; uniform vec3 playerPosition; uniform vec3 grassOrigin;",
      );
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vec3 anchor = instanceMatrix[3].xyz + grassOrigin;
transformed.y += sin(anchor.x*.075)*1.7+cos(anchor.z*.085)*1.3+sin(anchor.x*.16+anchor.z*.07)*.45-.04-instanceMatrix[3].y;
float tip = pow(clamp(position.y / 1.05, 0., 1.), 1.5);
float wave = sin(anchor.x*.43+anchor.z*.31+windTime*1.7);
transformed.x += tip*(wave*.22 + sin(windTime+anchor.z*.12)*.1);
vec2 away = anchor.xz-playerPosition.xz;
float influence=1.-smoothstep(.2,1.4,length(away));
transformed.xz += normalize(away+vec2(.001))*influence*tip*.9;
transformed.y -= influence*tip*.23;`,
      );
    };
    return { geometry: g, material: m };
  }, []);
  useEffect(() => {
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    let seed = 127;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 80,
        z = (rand() - 0.5) * 80;
      dummy.position.set(x, height(x, z) - 0.04, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(0.5 + rand(), 0.35 + rand() * 0.9, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.49 + rand() * 0.025, 0.55, 0.17 + rand() * 0.15);
      ref.current.setColorAt(i, color);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.frustumCulled = false;
  }, [count]);
  useFrame(({ clock }) => {
    if (!frozen) material.userData.wind.value = clock.elapsedTime;
    material.userData.player.value.copy(player.position);
    const x = Math.round(player.position.x / 20) * 20,
      z = Math.round(player.position.z / 20) * 20;
    ref.current.position.set(x, 0, z);
    material.userData.origin.value.set(x, 0, z);
  });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <instancedMesh ref={ref} args={[geometry, material, count]} />;
}
function Terrain() {
  const g = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 160, 160);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, height(p.getX(i), p.getZ(i)) - 0.12);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={g}>
      <meshBasicMaterial color="#011b1d" />
    </mesh>
  );
}
function Explorer({
  player,
  active,
  onCollect,
  quality,
  controller,
  showcase,
  reducedMotion,
}) {
  const { language } = useLanguage();
  const { camera, gl } = useThree(),
    asset = useGLTF(NIULAI_ASSET),
    root = useRef(),
    keys = useRef({}),
    model = useMemo(() => clone(asset.scene), [asset]),
    mouths = useMemo(() => prepareMouth(model), [model]),
    mixer = useMemo(() => new THREE.AnimationMixer(model), [model]),
    actions = useMemo(
      () =>
        Object.fromEntries(
          asset.animations.map((c) => [c.name, mixer.clipAction(c)]),
        ),
      [asset, mixer],
    ),
    state = useRef({
      speed: 0,
      yaw: Math.PI,
      last: "idle",
      scan: 0,
      orbit: 0,
      pitch: 0.25,
    });
  const metrics = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model),
      size = box.getSize(new THREE.Vector3());
    return { s: 1.7 / size.y, y: (-box.min.y * 1.7) / size.y };
  }, [model]);
  useEffect(() => {
    const down = (e) => {
        if (
          !active ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey ||
          e.target.isContentEditable ||
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
        )
          return;
        keys.current[e.code] = true;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
        )
          e.preventDefault();
      },
      up = (e) => (keys.current[e.code] = false),
      blur = () => (keys.current = {});
    let drag = false,
      x = 0,
      y = 0;
    const start = (e) => {
        if (!active || e.target !== gl.domElement) return;
        drag = true;
        x = e.clientX;
        y = e.clientY;
      },
      move = (e) => {
        if (drag) {
          state.current.orbit -= (e.clientX - x) * 0.005;
          state.current.pitch = THREE.MathUtils.clamp(
            state.current.pitch + (e.clientY - y) * 0.003,
            -0.1,
            0.65,
          );
          x = e.clientX;
          y = e.clientY;
        }
      },
      stop = () => (drag = false);
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    gl.domElement.tabIndex = 0;
    gl.domElement.setAttribute(
      "aria-label",
      translateText("星光世界，使用方向键或 WASD 移动", language),
    );
    gl.domElement.addEventListener("pointerdown", start);
    addEventListener("pointermove", move);
    addEventListener("pointerup", stop);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", blur);
      gl.domElement.removeEventListener("pointerdown", start);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", stop);
    };
  }, [actions, gl, mixer, active, language]);
  useEffect(() => {
    keys.current = {};
    player.touch = null;
  }, [active, player]);
  useEffect(() => {
    actions.idle?.play();
    return () => mixer.stopAllAction();
  }, [actions, mixer]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05),
      s = state.current,
      k = keys.current;
    let dx = 0,
      dz = 0;
    if (active && !document.hidden) {
      dx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      dz = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
      if (player.touch) {
        dx += player.touch.x;
        dz += player.touch.y;
      }
    }
    const moving = !!(dx || dz),
      targetSpeed = moving ? (k.ShiftLeft || k.ShiftRight ? 7 : 3.2) : 0;
    s.speed = THREE.MathUtils.damp(s.speed, targetSpeed, moving ? 4 : 12, dt);
    if (moving) {
      const a = Math.atan2(dx, dz) + s.orbit;
      s.yaw = THREE.MathUtils.damp(s.yaw, a, 8, dt);
      player.position.x += Math.sin(a) * s.speed * dt;
      player.position.z += Math.cos(a) * s.speed * dt;
      player.distance += s.speed * dt;
      player.position.x = THREE.MathUtils.clamp(player.position.x, -100, 100);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -100, 100);
    }
    player.position.y = height(player.position.x, player.position.z);
    root.current.position.copy(player.position);
    if (showcase) s.yaw = THREE.MathUtils.damp(s.yaw, s.orbit, 5, dt);
    root.current.rotation.y = s.yaw;
    // Niulai provides a walk cycle, but no separate running clip. Keep
    // its feet animated while sprinting by matching cadence to travel speed.
    const clip = moving ? "walking" : "idle";
    actions.walking?.setEffectiveTimeScale(Math.max(1, s.speed / 3.2));
    if (clip !== s.last) {
      actions[s.last]?.fadeOut(0.25);
      actions[clip]?.reset().fadeIn(0.25).play();
      s.last = clip;
    }
    if (!controller.paused && !document.hidden) mixer.update(dt);
    updateMouth(
      mouths,
      controller.mouthPose,
      dt,
      controller.voiceActive ? controller.voiceLevel : null,
    );
    const angle = s.orbit,
      dist = showcase ? 5 : 8.3,
      cameraTarget = new THREE.Vector3(
        player.position.x + Math.sin(angle) * dist,
        player.position.y + 2.5 + s.pitch * 4,
        player.position.z + Math.cos(angle) * dist,
      );
    camera.position.lerp(cameraTarget, 1 - Math.exp(-5 * dt));
    camera.lookAt(
      player.position.x,
      player.position.y + 1.05,
      player.position.z,
    );
    player.heading = angle;
    s.scan += dt;
    if (s.scan > 0.08) {
      s.scan = 0;
      if (active && !document.hidden)
        STARS.forEach((star) => {
          if (
            Math.hypot(
              player.position.x - star.x,
              player.position.z - star.z,
            ) <= PICKUP_RADIUS
          )
            onCollect(star.id, player.position, true);
        });
    }
  });
  return (
    <>
      <group ref={root}>
        <group scale={metrics.s} position={[0, metrics.y, 0]}>
          <primitive object={model} />
        </group>
      </group>
      <Terrain />
      <Grass
        quality={quality}
        player={player}
        frozen={controller.paused || document.hidden || reducedMotion}
      />
    </>
  );
}
function Beacon({
  star,
  collected,
  justCollected,
  player,
  frozen,
  reducedMotion,
  targeted,
}) {
  const orb = useRef(),
    beam = useRef(),
    burst = useRef(),
    timer = useRef(2);
  const ground = height(star.x, star.z);
  useEffect(() => {
    if (justCollected && collected) timer.current = 0;
  }, [justCollected, collected]);
  useFrame(({ clock }, raw) => {
    if (frozen) return;
    timer.current = Math.min(2, timer.current + Math.min(raw, 0.05));
    const t = timer.current,
      absorbing = collected && justCollected && t < 0.8 && !reducedMotion;
    orb.current.visible = !collected || absorbing;
    if (absorbing) {
      const progress = t / 0.8,
        ease = progress * progress;
      orb.current.position.set(
        (player.position.x - star.x) * ease,
        THREE.MathUtils.lerp(1.2, player.position.y - ground + 1.1, ease) +
          Math.sin(progress * Math.PI) * 0.8,
        (player.position.z - star.z) * ease,
      );
      orb.current.scale.setScalar(1 - progress * 0.8);
    } else if (!collected) {
      orb.current.position.set(
        0,
        1.2 +
          (reducedMotion
            ? 0
            : Math.sin(clock.elapsedTime * 1.3 + star.number) * 0.12),
        0,
      );
      orb.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.6;
    }
    beam.current.visible = !collected;
    burst.current.visible =
      collected && justCollected && t < 1.4 && !reducedMotion;
    if (burst.current.visible) {
      burst.current.children.forEach((particle, i) => {
        const angle = (i * Math.PI) / 5;
        particle.position.set(
          Math.cos(angle) * t * 1.6,
          0.8 + Math.sin(t * 2) * 0.6,
          Math.sin(angle) * t * 1.6,
        );
        particle.scale.setScalar(Math.max(0, 1 - t / 1.4));
      });
    }
  });
  return (
    <group position={[star.x, ground, star.z]}>
      <group ref={orb} position={[0, 1.2, 0]} visible={!collected}>
        <mesh>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial color="#b8fff2" />
        </mesh>
        <mesh scale={1.65}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial
            color="#79ffdf"
            transparent
            opacity={0.15}
            wireframe
          />
        </mesh>
      </group>
      <group ref={beam} visible={!collected}>
        <mesh position={[0, 12, 0]}>
          <cylinderGeometry args={[0.027, 0.038, 26, 6]} />
          <meshBasicMaterial
            color={targeted ? "#ffe6a3" : "#a8ffed"}
            transparent
            opacity={targeted ? 0.95 : 0.6}
            depthWrite={false}
          />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry
          args={[collected ? 0.64 : 0.42, collected ? 0.85 : 0.5, 32]}
        />
        <meshBasicMaterial
          color={collected ? "#ffd588" : targeted ? "#ffe6a3" : "#72b9ae"}
          transparent
          opacity={collected || targeted ? 0.95 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      {collected && (
        <mesh position={[0, 1.05, 0]}>
          <octahedronGeometry args={[0.13]} />
          <meshBasicMaterial color="#ffd588" />
        </mesh>
      )}
      <group ref={burst} visible={false}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshBasicMaterial color="#ffe4a2" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function World({ entered, setEntered }) {
  const {
    mobile,
    controller,
    collection,
    worldBlocked,
    muted,
    setMuted,
    paused,
    setPaused,
    callMama,
    stopVoice,
    voiceState,
    interactionNotice,
  } = useApp();
  const [quality, setQuality] = useState(mobile ? "LOW" : "HIGH");
  const [map, setMap] = useState(false),
    [target, setTarget] = useState(null);
  const [visible, setVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [telemetry, setTelemetry] = useState({ x: 0, z: 0, meters: 0 });
  const [toast, setToast] = useState("");
  const celebrationRef = useRef();
  const celebratedRef = useRef(false);
  const mapRef = useRef(),
    mapButton = useRef(),
    worldRef = useRef();
  const player = useMemo(
    () => ({
      position: new THREE.Vector3(),
      distance: 0,
      heading: 0,
      touch: null,
    }),
    [],
  );
  const {
    collected,
    unlocked,
    persistent,
    lastPickup,
    celebrating,
    dismissCelebration,
    collect,
  } = collection;
  const collectedSet = useMemo(() => new Set(collected), [collected]);
  const busy =
    voiceState.status === "playing" || voiceState.status === "loading";
  const active =
    entered &&
    !map &&
    !paused &&
    !worldBlocked &&
    !celebrating &&
    !(busy && !voiceState.loop) &&
    visible;
  const targetStar = STARS.find(
    (star) => star.id === target && !collectedSet.has(star.id),
  );
  const focusScene = () =>
    worldRef.current?.querySelector("canvas")?.focus({ preventScroll: true });
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", updateMotion);
    return () => {
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", updateMotion);
    };
  }, []);
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(
      () =>
        setTelemetry({
          x: player.position.x,
          z: player.position.z,
          meters: Math.floor(player.distance),
        }),
      250,
    );
    return () => clearInterval(id);
  }, [entered, player]);
  useEffect(() => {
    if (!lastPickup) {
      setToast("");
      return;
    }
    setToast(`星光 +1 · 已点亮 ${lastPickup.count} / ${STARS.length}`);
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [lastPickup]);
  useEffect(() => {
    if (celebrating)
      celebrationRef.current
        ?.querySelector("button")
        ?.focus({ preventScroll: true });
  }, [celebrating]);
  useEffect(() => {
    if (map) {
      stopVoice();
      mapRef.current?.focus();
    }
  }, [map, stopVoice]);
  useEffect(() => {
    const key = (e) => {
      if (
        !entered ||
        worldBlocked ||
        e.target.isContentEditable ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      if (e.key === "Escape" && map) {
        e.preventDefault();
        setMap(false);
        mapButton.current?.focus();
      }
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setMap((v) => !v);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [entered, map, worldBlocked]);
  useEffect(() => () => stopVoice(), [stopVoice]);
  useEffect(() => {
    if (!celebrating) { celebratedRef.current = false; return; }
    if (!entered || !unlocked || celebratedRef.current || muted || paused || worldBlocked || map || !visible) return;
    celebratedRef.current = true;
    callMama({ loop: true });
  }, [celebrating, entered, unlocked, muted, paused, worldBlocked, map, visible, callMama]);
  const reward = (
    <div className="world-reward" data-complete={unlocked}>
      <span className="eyebrow">
        {unlocked ? "FIRST WORD · 已解锁" : "FIRST WORD · 待解锁"}
      </span>
      <strong>{unlocked ? "妈妈，妈妈，妈妈……" : "集齐星光，它就一直叫妈妈"}</strong>
      {unlocked && (
        <button
          className="world-reward-play"
          disabled={muted || paused || (map && entered)}
          onClick={() => (busy ? stopVoice() : callMama({ loop: true }))}
        >
          {busy
            ? "好啦，歇一会儿"
            : voiceState.status === "error"
              ? "再试一次 · 叫妈妈"
              : "继续叫妈妈"}{" "}
          <Volume2 size={15} />
        </button>
      )}
      {unlocked && (
        <div className="world-easter-egg">
          <p>谢谢你，无聊到陪我收集了整个世界。</p>
          <a href="mailto:shangyiyong@outlook.com" translate="no">shangyiyong@outlook.com</a>
        </div>
      )}
      {muted && (
        <button onClick={() => setMuted(false)}>声音已关闭 · 开启声音</button>
      )}
      {paused && (
        <button onClick={() => setPaused(false)}>已暂停 · 继续探索</button>
      )}
      <p role="status" aria-live="polite">
        {unlocked
          ? voiceState.error ||
            interactionNotice ||
            (busy || voiceState.status === "ended"
              ? voiceState.track?.text || "正在准备声音…"
              : "想听的时候，我还会接着叫。")
          : `还差 ${STARS.length - collected.length} 颗星光`}
      </p>
    </div>
  );
  return (
    <Localized><section
      ref={worldRef}
      className="world-page world-collection"
      data-pwc-critical="world"
      data-collected={collected.length}
    >
      <Canvas
        camera={{ position: [0, 4, 6], fov: 55, near: 0.1, far: 220 }}
        dpr={[1, quality === "HIGH" ? 1.5 : 1]}
        gl={{
          antialias: true,
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <color attach="background" args={["#010607"]} />
        <fog attach="fog" args={["#010c0d", 18, 105]} />
        <ambientLight intensity={0.8} color="#5fe6d8" />
        <directionalLight
          position={[-10, 25, 5]}
          intensity={2.6}
          color="#a8ffef"
        />
        <Stars
          radius={100}
          depth={40}
          count={1300}
          factor={2}
          saturation={0}
          fade
          speed={paused || reducedMotion ? 0 : 0.25}
        />
        <Suspense fallback={null}>
          <Environment
            files="/env/studio_fuch.hdr"
            environmentIntensity={0.4}
          />
          <Explorer
            player={player}
            active={active}
            controller={controller}
            quality={quality}
            onCollect={collect}
            showcase={celebrating || (busy && !voiceState.loop)}
            reducedMotion={reducedMotion}
          />
          {STARS.map((star) => (
            <Beacon
              key={star.id}
              star={star}
              collected={collectedSet.has(star.id)}
              justCollected={lastPickup?.id === star.id}
              player={player}
              frozen={paused || !visible || map || worldBlocked}
              reducedMotion={reducedMotion}
              targeted={target === star.id}
            />
          ))}
        </Suspense>
      </Canvas>
      {!entered && (
        <div className="world-intro-backdrop">
          <section className="world-intro">
            <div className="idea-logo">
              WOR<span>LD</span>
              <i />
            </div>
            <span className="eyebrow">LITTLE LIGHTS. FIRST WORDS.</span>
            <p>
              陪牛来，把这个世界一点点点亮。
              <br />
              集齐 27 颗星光，它就一直叫妈妈。
            </p>
            <div className="world-intro-columns">
              <div>
                <h3>去收集星光</h3>
                <p>
                  {mobile ? (
                    "用屏幕方向键移动"
                  ) : (
                    <>
                      <kbd>W A S D</kbd> / 方向键移动
                    </>
                  )}
                </p>
                <p>
                  {mobile ? (
                    "拖动画面，看看四周"
                  ) : (
                    <>
                      <kbd>SHIFT</kbd> 奔跑 · 拖动画面转向
                    </>
                  )}
                </p>
                <p>走近星光，就会自动收集</p>
              </div>
              <div>
                <h3>点亮第一句话</h3>
                <p>每一颗只收集一次，地图帮你指路。</p>
                <p>
                  {collected.length
                    ? `已点亮 ${collected.length} / 27 颗星光`
                    : "从第一颗星光开始。"}
                </p>
                <p>
                  {persistent
                    ? "进度保存在当前浏览器，下次可以接着走。"
                    : "暂时无法保存，刷新后进度会丢失。"}
                </p>
              </div>
            </div>
            <button
              className="enter-world"
              onClick={() => {
                setEntered(true);
                focusScene();
              }}
            >
              {collected.length ? "继续探索 WORLD" : "进入 WORLD"}{" "}
              <ArrowUpRight size={16} />
            </button>
            <small>27 颗星光 · 妈妈，妈妈……</small>
          </section>
        </div>
      )}
      {entered && (
        <>
          <aside className="world-progress">
            <label>
              <Settings2 size={11} />
              画质
              <select
                aria-label="World quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {["LOW", "MEDIUM", "HIGH"].map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </label>
            <div>
              <span>已点亮</span>
              <strong aria-label={`已收集 ${collected.length} / 27 颗星光`}>
                {collected.length}
                <span> / 27</span>
              </strong>
            </div>
            <div className="collection-dots" aria-hidden="true">
              {STARS.map((star) => (
                <i
                  key={star.id}
                  className={collectedSet.has(star.id) ? "lit" : ""}
                />
              ))}
            </div>
            <footer>
              {telemetry.meters} M · 一起走过
              <span>{unlocked ? "已解锁妈妈" : "星光收集中"}</span>
            </footer>
            {!persistent && (
              <p className="collection-storage" role="status">
                暂时无法保存，刷新后进度会丢失。
              </p>
            )}
          </aside>
          <div className="world-collection-controls">
            <button
              aria-label={muted ? "开启声音" : "关闭声音"}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              aria-label={paused ? "继续探索" : "暂停探索"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>
          <div className="world-help">
            {mobile ? (
              "靠近星光 · 自动收集"
            ) : (
              <>
                <kbd>W A S D</kbd> 移动 <kbd>SHIFT</kbd> 奔跑{" "}
                <span>靠近星光 · 自动收集</span>
              </>
            )}
          </div>
          <div className="collection-status" role="status" aria-live="polite">
            {toast ||
              (targetStar
                ? `前往星光 ${String(targetStar.number).padStart(2, "0")} · ${Math.round(Math.hypot(telemetry.x - targetStar.x, telemetry.z - targetStar.z))} 米`
                : paused
                  ? "探索已暂停"
                  : "")}
          </div>
          <button
            ref={mapButton}
            className="radar"
            aria-label="打开星光地图"
            onClick={() => setMap(true)}
          >
            <div>
              <i />
              {STARS.map((star) => (
                <b
                  key={star.id}
                  className={collectedSet.has(star.id) ? "collected" : "live"}
                  style={{
                    left: `${50 + star.x * 0.62}%`,
                    top: `${50 + star.z * 0.62}%`,
                  }}
                />
              ))}
              <em
                style={{
                  left: `${50 + telemetry.x * 0.62}%`,
                  top: `${50 + telemetry.z * 0.62}%`,
                }}
              />
            </div>
            <span>地图 · 星光指路</span>
          </button>
          {!celebrating && !map && (
            <div className="world-reward-dock">{reward}</div>
          )}
          {mobile && (
            <div className="world-touch" aria-label="移动方向">
              {[
                ["↑", 0, -1],
                ["←", -1, 0],
                ["↓", 0, 1],
                ["→", 1, 0],
              ].map(([label, x, y]) => (
                <button
                  key={label}
                  disabled={!active}
                  aria-label={`向${{ "↑": "前", "←": "左", "↓": "后", "→": "右" }[label]}移动`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    player.touch = { x, y };
                  }}
                  onPointerUp={() => {
                    player.touch = null;
                  }}
                  onPointerCancel={() => {
                    player.touch = null;
                  }}
                  onLostPointerCapture={() => {
                    player.touch = null;
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {entered && map && (
        <div className="world-map-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="星光地图"
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const buttons = [...e.currentTarget.querySelectorAll("button")];
                const first = buttons[0],
                  last = buttons.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              ref={mapRef}
              className="close-corner"
              aria-label="关闭星光地图"
              onClick={() => {
                setMap(false);
                focusScene();
              }}
            >
              <X />
            </button>
            <span className="eyebrow">WORLD / STAR MAP</span>
            <h2>下一颗星光，在哪儿？</h2>
            <p>选择星光设为目标，走过去点亮它。金色是你已经走过的地方。</p>
            <div className="collection-map">
              <span className="map-north">北 N</span>
              {STARS.map((star) => (
                <button
                  key={star.id}
                  className={`map-star ${collectedSet.has(star.id) ? "lit" : ""} ${target === star.id ? "targeted" : ""}`}
                  style={{
                    left: `${50 + star.x * 0.62}%`,
                    top: `${50 + star.z * 0.62}%`,
                  }}
                  aria-label={`星光 ${star.number}${collectedSet.has(star.id) ? "，已点亮" : "，设为目标"}`}
                  onClick={() => {
                    setTarget(star.id);
                    setMap(false);
                    focusScene();
                  }}
                >
                  {String(star.number).padStart(2, "0")}
                </button>
              ))}
              <span
                className="map-player"
                style={{
                  left: `${50 + telemetry.x * 0.62}%`,
                  top: `${50 + telemetry.z * 0.62}%`,
                }}
              >
                牛来
              </span>
            </div>
            <footer>
              已点亮 {collected.length} / 27 · 地图只指路，星光要亲自去收集。
            </footer>
          </section>
        </div>
      )}
      {entered && celebrating && !map && (
        <div
          className="collection-celebration"
          ref={celebrationRef}
          role="dialog"
          aria-label="全部星光已点亮"
        >
          <Sparkles size={25} />
          <span className="eyebrow">ALL LIGHTS FOUND</span>
          <h2>全部点亮！</h2>
          {reward}
          <button
            className="celebration-dismiss"
            onClick={() => {
              dismissCelebration();
              focusScene();
            }}
          >
            继续在世界里走走 <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </section></Localized>
  );
}
