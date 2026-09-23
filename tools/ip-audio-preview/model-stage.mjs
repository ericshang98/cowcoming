import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// One renderer/model per audition page. Media time is the interaction clock.
export function createModelStage(host, onTap, onState) {
  const canvas = host.querySelector('canvas');
  const label = host.querySelector('[role="status"]');
  const retry = host.querySelector('button');
  let renderer, scene, camera, model, mixer, idle, active, media, activeTrack, config;
  let ready = false, loading = false, visible = false, previous = 0, raf;
  const actions = new Map(), raycaster = new THREE.Raycaster();
  let pointerDown;

  function state(value, message) {
    host.dataset.state = value;
    label.textContent = message;
    retry.hidden = value !== 'error';
    onState(value);
  }
  function stop() {
    active?.stop(); active = null; media = null; activeTrack = null;
    if (idle) { idle.reset().setEffectiveWeight(1).play(); mixer.update(0); }
    host.dataset.action = 'idle';
  }
  function render(now) {
    const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
    if (!visible || document.hidden) { raf = null; return; }
    if (ready) {
      if (active && media) {
        // Scale the body gesture to the recording; never stretch speech.
        active.time = Math.min(active.getClip().duration - .001,
          media.currentTime / activeTrack.duration * active.getClip().duration);
        const edge = Math.min(1, media.currentTime / .12,
          Math.max(0, activeTrack.duration - media.currentTime) / .16);
        active.setEffectiveWeight(edge); idle.setEffectiveWeight(1 - edge);
        mixer.update(0);
      } else mixer.update(dt);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(render);
  }
  function wake() { if (visible && !document.hidden && !raf) { previous = performance.now(); raf = requestAnimationFrame(render); } }
  function resize() {
    if (!renderer || !visible) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the full figure visible on narrow screens.
    camera.position.set(0, 1.05, Math.max(3.8, 2.4 / camera.aspect));
    camera.lookAt(0, 1.02, 0); camera.updateProjectionMatrix();
  }
  async function load() {
    if (loading || ready) return;
    loading = true; state('loading', '正在载入峰哥模型…');
    try {
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
        scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, .1, 30);
        scene.add(new THREE.HemisphereLight(0xe8f1ff, 0x7b7564, 2.8));
        const key = new THREE.DirectionalLight(0xfff4e0, 3.5); key.position.set(2, 4, 4); scene.add(key);
        const rim = new THREE.DirectionalLight(0xa9c0e0, 2); rim.position.set(-3, 2, -2); scene.add(rim);
        const floor = new THREE.Mesh(new THREE.CircleGeometry(.65, 64), new THREE.MeshBasicMaterial({ color: 0x2d362a, transparent: true, opacity: .8 }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -.005; scene.add(floor);
      }
      const response = await fetch('fengge.model.json');
      if (!response.ok) throw new Error('Model manifest unavailable');
      config = await response.json();
      const gltf = await new GLTFLoader().loadAsync(config.model.src);
      model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3()), scale = 2 / size.y;
      model.scale.multiplyScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => actions.set(clip.name, mixer.clipAction(clip)));
      if (![config.idleClip, config.actions.tap.clip, config.actions.signature.clip].every(name => actions.has(name))) throw new Error('Required clips absent');
      idle = actions.get(config.idleClip); scene.add(model); ready = true; stop(); resize();
      state('ready', '点击峰哥 · 点头回应　/　按 L · 思考接话'); wake();
    } catch (error) {
      ready = false; state('error', '峰哥模型载入失败，请重试。');
      console.warn('Fengge preview unavailable:', error.message);
    } finally { loading = false; }
  }
  retry.onclick = load;
  canvas.addEventListener('pointerdown', e => { if (e.button === 0) pointerDown = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  canvas.addEventListener('pointercancel', () => { pointerDown = null; });
  canvas.addEventListener('pointerleave', () => { pointerDown = null; });
  canvas.addEventListener('pointerup', e => {
    const start = pointerDown; pointerDown = null;
    if (!ready || !start || start.id !== e.pointerId || Math.hypot(start.x - e.clientX, start.y - e.clientY) > 7) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    if (raycaster.intersectObject(model, true).length) onTap();
  });
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else wake(); });
  return {
    show(value) { visible = value; host.hidden = !value; stop(); if (value) { if (!ready) load(); resize(); wake(); } },
    play(track, audio) {
      if (!ready) return;
      const action = config.actions[track.input];
      if (!action || track.src !== action.audio || Math.abs(track.duration - action.duration) > .01) throw new Error('Model/audio version mismatch');
      stop(); activeTrack = track; media = audio;
      active = actions.get(action.clip);
      active.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).play();
      active.clampWhenFinished = true; idle.setEffectiveWeight(0);
      host.dataset.action = active.getClip().name; wake();
    },
    stop,
    get ready() { return ready; },
    inspect() { return { ready, visible, action: active?.getClip().name || 'idle',
      clipTime: active?.time, clipDuration: active?.getClip().duration, audioTime: media?.currentTime,
      audioDuration: activeTrack?.duration, head: model?.getObjectByName('Head')?.quaternion.toArray(),
      clips: [...actions.keys()], triangles: renderer?.info.render.triangles }; },
  };
}
