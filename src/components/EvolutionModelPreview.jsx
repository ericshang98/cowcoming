import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { AnimationMixer, Box3, Vector3 } from "three";
import { evolutionAssets } from "../evolution-assets.mjs";
import { createResponsePlayer } from "../live/response-player.mjs";
import { DEFAULT_TUNING } from "../live/motion-tuning.mjs";
import { selectSoftwareVariant } from "../live/motion-variants.mjs";
import { useLanguage } from "../i18n/Language";

class PreviewBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

function PreviewRig({ asset, controller, onReady }) {
  const gltf = useGLTF(asset.model, "/draco/");
  const { camera, size } = useThree();
  const model = useMemo(() => {
    const result = clone(gltf.scene);
    result.rotation.y += asset.viewYawRadians || 0;
    result.updateMatrixWorld(true);
    return result;
  }, [gltf, asset]);
  const bounds = useMemo(() => {
    const box = new Box3().setFromObject(model);
    const dimensions = box.getSize(new Vector3());
    const scale =
      2.6 / Math.max(dimensions.x, dimensions.y, dimensions.z, 0.001);
    return {
      scale,
      center: box.getCenter(new Vector3()).multiplyScalar(-scale),
      dimensions: dimensions.multiplyScalar(scale),
    };
  }, [model]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const player = useRef(null);
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const halfHeight = Math.max(
      bounds.dimensions.y / 2,
      bounds.dimensions.x / (2 * aspect),
    );
    const distance =
      (halfHeight / Math.tan((camera.fov * Math.PI) / 360)) * 1.35 +
      bounds.dimensions.z / 2;
    camera.position.set(0, 0.08, Math.max(distance, 3.4));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [bounds, camera, size.width, size.height]);
  useEffect(() => {
    const actions = Object.fromEntries(
      gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    const names = new Set();
    model.traverse((object) => {
      if (object.isBone) {
        names.add(object.name);
        if (object.userData.name) names.add(object.userData.name);
      }
    });
    const instance = createResponsePlayer({
      mixer,
      actions,
      manifest: asset,
      bones: names,
      getSoftwareVariant: (request, _variant, context) => selectSoftwareVariant(asset.formId, request.actionId, request.eventId, context),
      getTuning: (id) =>
        controller.motionTuning?.forms[asset.formId]?.actions[id] ||
        DEFAULT_TUNING,
    });
    player.current = instance;
    controller.responsePlayer = instance;
    controller.responseForm = asset.formId;
    actions.idle?.play();
    onReady("ready");
    return () => {
      instance.dispose();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      if (controller.responsePlayer === instance) {
        delete controller.responsePlayer;
        delete controller.responseForm;
      }
      player.current = null;
      // Geometry/materials belong to the shared GLTF cache. Only cloned bones are private.
      model.traverse((object) => {
        if (object.isSkinnedMesh) object.skeleton.dispose();
      });
    };
  }, [gltf, model, mixer, asset, controller, onReady]);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    mixer.update(step);
    player.current?.update(step);
  });
  return (
    <group position={bounds.center} scale={bounds.scale}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

export default function EvolutionModelPreview({
  formId,
  controller,
  onStatus,
}) {
  const asset = evolutionAssets[formId];
  const { language } = useLanguage();
  const zh = language === "zh";
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const updateStatus = useMemo(
    () => (value) => {
      setStatus(value);
      onStatus(value);
    },
    [onStatus],
  );
  const retry = () => {
    useGLTF.clear(asset.model);
    updateStatus("loading");
    setAttempt((value) => value + 1);
  };
  return (
    <div
      className="atlas-model-view"
      data-preview-form={formId}
      data-preview-status={status}
    >
      <PreviewBoundary
        key={`${asset.model}-${attempt}`}
        onError={() => updateStatus("error")}
        fallback={
          <div className="atlas-load-state" role="alert">
            <p>{zh ? "模型暂时未能加载" : "The model could not load"}</p>
            <button className="atlas-preview" onClick={retry}>
              {zh ? "重新加载" : "Try again"}
            </button>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0.08, 5.2], fov: 38 }}
          dpr={[1, 1.5]}
          aria-label={
            zh ? `${asset.formLabel} 3D 预览` : `${formId} 3D preview`
          }
          gl={{ antialias: true }}
          fallback={
            <div className="atlas-load-state">
              {zh
                ? "此浏览器无法显示 3D，请使用支持 WebGL 的浏览器。"
                : "Please use a browser with WebGL support."}
            </div>
          }
        >
          <ambientLight intensity={1.6} />
          <hemisphereLight args={["#fff3dd", "#809ca6", 1.8]} />
          <directionalLight position={[3, 4, 5]} intensity={2.3} />
          <directionalLight position={[-3, 2, 1]} intensity={1} />
          <Suspense fallback={null}>
            <PreviewRig
              asset={asset}
              controller={controller}
              onReady={updateStatus}
            />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={2.7}
            maxDistance={12}
            minPolarAngle={0.5}
            maxPolarAngle={2.3}
          />
        </Canvas>
      </PreviewBoundary>
      {status === "loading" && (
        <span className="atlas-load-note" role="status">
          {zh ? "正在加载模型…" : "Loading model…"}
        </span>
      )}
      {status === "ready" && (
        <span className="atlas-orbit-hint">
          {zh
            ? "拖动旋转 · 滚轮 / 双指缩放"
            : "Drag to rotate · Scroll / pinch to zoom"}
        </span>
      )}
    </div>
  );
}
