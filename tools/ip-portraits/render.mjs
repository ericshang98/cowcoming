import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
export async function renderPortrait(url) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setSize(256,256); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
  const {scene:model} = await loader.loadAsync(url);
  model.traverse(o=>{ if(o.morphTargetInfluences)o.morphTargetInfluences.fill(0); });
  model.updateMatrixWorld(true);
  const head = new THREE.Box3(), vertex = new THREE.Vector3();
  model.traverse(o=>{
    if(!o.isSkinnedMesh)return;
    o.skeleton.update();
    const indices=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight;
    const joints=new Set(o.skeleton.bones.map((b,i)=>/^head$/i.test(b.name)?i:-1));
    for(let i=0;i<indices.count;i++){
      let weight=0;for(let j=0;j<4;j++)if(joints.has(indices.getComponent(i,j)))weight+=weights.getComponent(i,j);
      if(weight>.45){o.getVertexPosition(i,vertex);head.expandByPoint(vertex.applyMatrix4(o.matrixWorld));}
    }
  });
  if(head.isEmpty()) throw Error('No head skin weights');
  const size=head.getSize(new THREE.Vector3()), center=head.getCenter(new THREE.Vector3());
  const half=Math.max(size.x,size.y)*.62;
  const camera=new THREE.OrthographicCamera(-half,half,half,-half,.001,100);
  camera.position.set(center.x,center.y+.015,center.z+Math.max(3,size.z*4));camera.lookAt(center);
  const scene=new THREE.Scene();scene.add(model);
  scene.add(new THREE.HemisphereLight(0xf0f8ff,0x9c8b70,2.2));
  const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(2,4,5);scene.add(light);
  const fill=new THREE.DirectionalLight(0xdaeeff,1.1);fill.position.set(-4,1,2);scene.add(fill);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png');renderer.dispose();loader.dracoLoader.dispose();
  return {png,head:head.min.toArray().concat(head.max.toArray())};
}
