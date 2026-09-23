import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Stars, useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { X, ArrowUpRight, Map, Settings2, MoveUpRight } from "lucide-react";
import { useApp } from "../context";
import { NIULAI_ASSET, prepareMouth, updateMouth } from "./niulai.mjs";
const height = (x, z) =>
  Math.sin(x * 0.075) * 1.7 +
  Math.cos(z * 0.085) * 1.3 +
  Math.sin(x * 0.16 + z * 0.07) * 0.45;
const locations = Array.from({ length: 52 }, (_, i) => {
  const r = i === 0 ? 8 : 15 + Math.sqrt(i) * 9,
    a = i * 2.39996;
  return [Math.sin(a) * r, -Math.cos(a) * r];
});
function Grass({ quality, player }) {
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
    material.userData.wind.value = clock.elapsedTime;
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
function Explorer({ player, active, onNear, quality, controller }) {
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
    actions.idle?.play();
    const down = (e) => {
        if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
        keys.current[e.code] = true;
        if (
          ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            e.code,
          )
        )
          e.preventDefault();
      },
      up = (e) => (keys.current[e.code] = false),
      blur = () => (keys.current = {});
    let drag = false,
      x = 0,
      y = 0;
    const start = (e) => {
        if (e.target !== gl.domElement) return;
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
    gl.domElement.addEventListener("pointerdown", start);
    addEventListener("pointermove", move);
    addEventListener("pointerup", stop);
    return () => {
      mixer.stopAllAction();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", blur);
      gl.domElement.removeEventListener("pointerdown", start);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", stop);
    };
  }, [actions, gl, mixer]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05),
      s = state.current,
      k = keys.current;
    let dx = 0,
      dz = 0;
    if (active) {
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
    mixer.update(dt);
    updateMouth(mouths, controller.mouthPose, dt);
    const angle = s.orbit,
      dist = 8.3,
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
    if (s.scan > 0.15) {
      s.scan = 0;
      let near = -1,
        min = 4;
      locations.forEach(([x, z], i) => {
        const d = Math.hypot(player.position.x - x, player.position.z - z);
        if (d < min) {
          min = d;
          near = i;
        }
      });
      onNear(near);
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
      <Grass quality={quality} player={player} />
    </>
  );
}
function Beacon({ position, available, index }) {
  const r = useRef();
  useFrame(({ clock }) => {
    if (r.current) {
      r.current.rotation.y = clock.elapsedTime * 0.6;
      r.current.position.y =
        0.9 + Math.sin(clock.elapsedTime * 1.3 + index) * 0.12;
    }
  });
  const [x, z] = position;
  return (
    <group position={[x, height(x, z), z]}>
      <group ref={r}>
        <mesh>
          <icosahedronGeometry args={[available ? 0.17 : 0.11, 0]} />
          <meshBasicMaterial
            color={available ? "#a8ffff" : "#768b8e"}
            wireframe={!available}
          />
        </mesh>
      </group>
      {available && (
        <>
          <mesh position={[0, 12, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 30, 6]} />
            <meshBasicMaterial
              color="#ffdbad"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 12, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 30, 6]} />
            <meshBasicMaterial
              color="#ffa452"
              transparent
              opacity={0.13}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
export default function World({ entered, setEntered, ideaId }) {
  const { ideas, mobile, openIdea, closeDetail, controller } = useApp(),
    [quality, setQuality] = useState(mobile ? "LOW" : "HIGH"),
    [near, setNear] = useState(-1),
    [map, setMap] = useState(false),
    [discovered, setDiscovered] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("fuch-replica-discovered")) || []
        );
      } catch {
        return [];
      }
    }),
    [meters, setMeters] = useState(0),
    [elapsed, setElapsed] = useState(0);
  const player = useMemo(
    () => ({
      position: new THREE.Vector3(0, 0, 0),
      distance: 0,
      heading: 0,
      touch: null,
    }),
    [],
  );
  const current = ideas.find((x) => x.id === ideaId),
    start = useRef(Date.now());
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setMeters(Math.floor(player.distance));
      setElapsed(Math.floor((Date.now() - start.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [entered, player]);
  useEffect(() => {
    if (near < 0 || !ideas[near]?.available || !entered) return;
    setDiscovered((old) => (old.includes(near) ? old : [...old, near]));
  }, [near, entered, ideas]);
  useEffect(() => {
    localStorage.setItem("fuch-replica-discovered", JSON.stringify(discovered));
  }, [discovered]);
  useEffect(() => {
    const key = (e) => {
      if (
        e.key.toLowerCase() === "m" &&
        !/INPUT|TEXTAREA/.test(e.target.tagName)
      )
        setMap((v) => !v);
      if (e.code === "Space" && near >= 0 && entered && !current) {
        e.preventDefault();
        if (ideas[near].available) openIdea(ideas[near].id);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [near, entered, current]);
  const travel = (i) => {
    const [x, z] = locations[i];
    player.position.set(x, 0, z + 2.7);
    setNear(i);
    setMap(false);
    setEntered(true);
  };
  return (
    <section className="world-page" data-pwc-critical="idea52">
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
          speed={0.25}
        />
        <Suspense fallback={null}>
          <Environment
            files="/env/studio_fuch.hdr"
            environmentIntensity={0.4}
          />
          <Explorer
            player={player}
            controller={controller}
            quality={quality}
            active={entered && !map && !current}
            onNear={setNear}
          />
          {locations.map((p, i) => (
            <Beacon
              key={i}
              position={p}
              index={i}
              available={ideas[i]?.available}
            />
          ))}
        </Suspense>
      </Canvas>
      {!entered && !current && (
        <div className="world-intro-backdrop">
          <section className="world-intro">
            <div className="idea-logo">
              IDEA<span>52</span>
              <i />
            </div>
            <span className="eyebrow">
              ONE YEAR. FIFTY-TWO IDEAS. NO PERMISSION NEEDED.
            </span>
            <p>
              A living landscape of experiments.
              <br />
              Every light is an idea. Walk toward one.
            </p>
            <div className="world-intro-columns">
              <div>
                <h3>HOW TO EXPLORE</h3>
                <p>
                  <kbd>W A S D</kbd> / arrow keys to move
                </p>
                <p>
                  <kbd>SHIFT</kbd> to run · drag to look
                </p>
                <p>
                  <kbd>SPACE</kbd> to open an idea
                </p>
              </div>
              <div>
                <h3>FOLLOW YOUR CURIOSITY</h3>
                <p>Discover the ideas scattered across this world.</p>
                <p>Use the map to travel instantly.</p>
                <p>27 ideas live. More on the horizon.</p>
              </div>
            </div>
            <button
              className="enter-world"
              onClick={() => {
                setEntered(true);
                start.current = Date.now();
              }}
            >
              ENTER IDEA52 <ArrowUpRight size={16} />
            </button>
            <small>BUILT BY SAYANDEEP BOSE · EXPLORATION ENCOURAGED</small>
          </section>
        </div>
      )}
      {entered && !current && (
        <>
          <aside className="world-progress">
            <label>
              <Settings2 size={11} />
              QUALITY
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
              DISCOVERED{" "}
              <strong>
                {discovered.length} <span>/ 27</span>
              </strong>
            </div>
            <div className="discovery-dots">
              {ideas.map((a, i) => (
                <button
                  key={a.id}
                  className={`${a.available ? "available" : ""} ${discovered.includes(i) ? "visited" : ""}`}
                  aria-label={`Travel to ${a.label}: ${a.title}`}
                  onClick={() => travel(i)}
                />
              ))}
            </div>
            <footer>
              {meters} M WALKED{" "}
              <span>
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </span>
            </footer>
          </aside>
          <div className="world-help">
            <kbd>W A S D</kbd> MOVE <kbd>SHIFT</kbd> RUN{" "}
            <span>DRAG TO LOOK</span>
          </div>
          <button
            className="radar"
            aria-label="Open world map"
            onClick={() => setMap(true)}
          >
            <div>
              <i />
              {locations.map(([x, z], i) => (
                <b
                  key={i}
                  className={ideas[i]?.available ? "live" : ""}
                  style={{ left: `${50 + x * 0.5}%`, top: `${50 + z * 0.5}%` }}
                />
              ))}
              <em
                style={{
                  left: `${50 + player.position.x * 0.5}%`,
                  top: `${50 + player.position.z * 0.5}%`,
                }}
              />
            </div>
            <span>MAP · FAST TRAVEL</span>
          </button>
          {near >= 0 && (
            <button
              className="near-idea"
              onClick={() => ideas[near].available && openIdea(ideas[near].id)}
              disabled={!ideas[near].available}
            >
              <span>
                {ideas[near].label} · {ideas[near].category || "COMING SOON"}
              </span>
              <strong>{ideas[near].title}</strong>
              <small>
                {ideas[near].available
                  ? "SPACE TO EXPLORE ↗"
                  : "THIS IDEA IS STILL TAKING SHAPE"}
              </small>
            </button>
          )}
          {mobile && (
            <div className="world-touch">
              {[
                ["↑", 0, -1],
                ["←", -1, 0],
                ["↓", 0, 1],
                ["→", 1, 0],
              ].map(([label, x, y]) => (
                <button
                  key={label}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    player.touch = { x, y };
                  }}
                  onPointerUp={() => (player.touch = null)}
                  onPointerCancel={() => (player.touch = null)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {map && (
        <div className="world-map-overlay">
          <section>
            <button
              className="close-corner"
              aria-label="Close world map"
              onClick={() => setMap(false)}
            >
              <X />
            </button>
            <span className="eyebrow">IDEA52 / FAST TRAVEL</span>
            <h2>Follow a thought.</h2>
            <div className="world-map-grid">
              {ideas.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => travel(i)}
                  className={a.available ? "available" : ""}
                >
                  <span>{String(a.week).padStart(2, "0")}</span>
                  <strong>{a.title}</strong>
                  <small>
                    {discovered.includes(i)
                      ? "DISCOVERED"
                      : a.available
                        ? "EXPLORE ↗"
                        : "ON THE HORIZON"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {current && (
        <article className="idea-detail">
          <header>
            <button
              onClick={() => {
                closeDetail();
                setEntered(true);
              }}
            >
              ← BACK TO WORLD
            </button>
            <span>{current.label} / IDEA52</span>
            <button
              aria-label="Close idea"
              onClick={() => {
                closeDetail();
                setEntered(true);
              }}
            >
              <X />
            </button>
          </header>
          <div className="idea-detail-scroll">
            <span className="eyebrow">
              {current.category} · {current.date}
            </span>
            <h1>{current.title}</h1>
            <p className="idea-tagline">{current.tagline}</p>
            {current.image && <img src={current.image} alt={current.title} />}
            <p className="idea-description">
              {current.description ||
                "This idea is still taking shape. Come back to explore it when it launches."}
            </p>
            {current.link && (
              <a
                className="outline-button"
                href={current.link}
                target="_blank"
                rel="noreferrer"
              >
                EXPLORE PROJECT ↗
              </a>
            )}
            <button
              className="idea-next"
              onClick={() =>
                openIdea(
                  ideas.filter((x) => x.available)[
                    (ideas
                      .filter((x) => x.available)
                      .findIndex((x) => x.id === current.id) +
                      1) %
                      ideas.filter((x) => x.available).length
                  ].id,
                )
              }
            >
              NEXT IDEA →
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
