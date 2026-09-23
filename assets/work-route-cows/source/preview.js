import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const host=document.querySelector('#stage'),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);host.append(renderer.domElement);
renderer.toneMapping=THREE.AgXToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(0,.2,4.8);
scene.add(new THREE.AmbientLight(0xffffff,1.5),new THREE.HemisphereLight(0xfff4d8,0x8baba4,2));
for(const [pos,intensity] of [[[3,4,5],3],[[-3,2,1],1.2]]){const light=new THREE.DirectionalLight(0xffffff,intensity);light.position.set(...pos);scene.add(light)}
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enablePan=false;orbit.minDistance=2.5;orbit.maxDistance=7;orbit.target.set(0,0,0);orbit.enableDamping=true;
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}).observe(host);
let mixer,model,active='idle',actions={};
const clock=new THREE.Clock();
const data=Uint8Array.from(atob(document.querySelector('#asset').textContent.trim()),c=>c.charCodeAt(0));
function play(name){
 const next=actions[name];if(!next)return;
 for(const action of Object.values(actions))action.stop();
 active=name;next.reset().setLoop(name==='idle'?THREE.LoopRepeat:THREE.LoopOnce,name==='idle'?Infinity:1);next.clampWhenFinished=name!=='idle';next.play();
 document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.action===name));
}
new GLTFLoader().parse(data.buffer,'',gltf=>{
 model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),s=2.6/Math.max(size.x,size.y,size.z);
 model.scale.setScalar(s);model.position.copy(center.multiplyScalar(-s));scene.add(model);
 mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
 mixer.addEventListener('finished',event=>{document.body.dataset.completed=event.action.getClip().name;play('idle');status.textContent='动作完成 · 已回到待机';});
 play('idle');for(const button of document.querySelectorAll('button'))button.disabled=false;
 status.textContent='已加载 · 拖动旋转，滚轮缩放';document.body.dataset.ready='true';
 window.assetPreview={model,mixer,actions,get active(){return active},head:model.getObjectByName('Head')};
},e=>{status.textContent='模型加载失败：'+e.message;document.body.dataset.error='true'});
document.querySelectorAll('button').forEach(button=>button.onclick=()=>{play(button.dataset.action==='stop'?'idle':button.dataset.action);status.textContent=button.dataset.action==='stop'?'已回到待机':button.textContent+'…';});
renderer.setAnimationLoop(()=>{const dt=clock.getDelta();mixer?.update(Math.min(dt,.05));orbit.update();renderer.render(scene,camera)});
