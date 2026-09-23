import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { Box3, Vector3 } from "three";
import { prepareMouth, updateMouth } from "../scene/niulai.mjs";

class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? (
      <div className="lab-model-error">
        模型未能载入，请恢复默认模型或选择其他 GLB。
      </div>
    ) : (
      this.props.children
    );
  }
}
function Rig({ url, running, onReady }) {
  const { scene } = useGLTF(url, "/draco/");
  const root = useRef();
  const model = useMemo(() => clone(scene), [scene]);
  const mouth = useMemo(() => prepareMouth(model), [model]);
  const info = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model),
      size = box.getSize(new Vector3()),
      center = box.getCenter(new Vector3());
    const scale = 2.6 / Math.max(size.x, size.y, size.z, 0.001);
    let head;
    model.traverse((o) => {
      if (o.name === "Head") head = o;
    });
    return {
      scale,
      position: center.multiplyScalar(-scale).toArray(),
      head,
      rotation: head?.rotation.clone(),
    };
  }, [model]);
  const began = useRef({ id: null, time: 0 });
  useEffect(() => {
    onReady();
  }, [model, onReady]);
  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime;
    if (began.current.id !== running?.id)
      began.current = { id: running?.id, time };
    const progress = running
      ? Math.min(
          1,
          ((time - began.current.time) * 1000) / running.action.durationMs,
        )
      : 0;
    const pulse = Math.sin(progress * Math.PI),
      beat = Math.sin(progress * Math.PI * 4) * pulse;
    const kind = running?.action.motion;
    let x = 0,
      y = 0,
      z = 0;
    if (kind === "look") y = pulse * 0.28;
    if (kind === "bow") x = pulse * 0.28;
    if (kind === "nod") x = beat * 0.2;
    if (kind === "tilt") z = pulse * 0.22;
    if (kind === "reflect") {
      z = pulse * 0.14;
      x = beat * 0.13;
    }
    if (info.head) {
      info.head.rotation.set(
        info.rotation.x + x,
        info.rotation.y + y,
        info.rotation.z + z,
      );
    } else if (root.current) root.current.rotation.set(x, y, z);
    updateMouth(
      mouth,
      running && progress > 0.25 && progress < 0.7 ? "open" : "closed",
      dt,
    );
  });
  return (
    <group ref={root}>
      <primitive object={model} scale={info.scale} position={info.position} />
    </group>
  );
}
export default function ModelPreview({ url, running, onReady, onError }) {
  return (
    <ModelBoundary key={url} onError={onError}>
      <Canvas
        camera={{ position: [0, 0.2, 4.8], fov: 38 }}
        dpr={[1, 1.5]}
        aria-label="牛来本地模型预览"
      >
        <ambientLight intensity={1.5} />
        <hemisphereLight args={["#fff4d8", "#8baba4", 2]} />
        <directionalLight position={[3, 4, 5]} intensity={3} />
        <directionalLight position={[-3, 2, 1]} intensity={1.2} />
        <Suspense
          fallback={
            <Html center>
              <span className="lab-loading">正在读取模型…</span>
            </Html>
          }
        >
          <Rig url={url} running={running} onReady={onReady} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.7}
          maxPolarAngle={2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </ModelBoundary>
  );
}
