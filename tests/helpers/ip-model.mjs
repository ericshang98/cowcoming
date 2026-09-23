import fs from 'node:fs';
import * as THREE from 'three';
// Decode the actual uncompressed GLB geometry for deformation tests, without
// loading textures or replacing the supplied skeleton with a synthetic one.
export function loadIpModel(id) {
  const b=fs.readFileSync(new URL(`../../public/characters/${id}/v1/model.glb`,import.meta.url));
  const length=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+length)),binary=b.subarray(28+length);
  const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const types={5126:[Float32Array,'readFloatLE',4],5123:[Uint16Array,'readUInt16LE',2],5121:[Uint8Array,'readUInt8',1],5125:[Uint32Array,'readUInt32LE',4]};
  function attribute(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],n=components[a.type],[Type,read,size]=types[a.componentType],array=new Type(a.count*n);
    for(let i=0;i<a.count;i++)for(let j=0;j<n;j++)array[i*n+j]=binary[read]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*n)+j*size);
    return new THREE.BufferAttribute(array,n,a.normalized||false);
  }
  const joints=new Set(doc.skins.flatMap(s=>s.joints));
  const nodes=doc.nodes.map((n,i)=>{const o=joints.has(i)?new THREE.Bone():new THREE.Group();o.name=THREE.PropertyBinding.sanitizeNodeName(n.name||'');
    if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
  doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const model=new THREE.Group();nodes.filter(n=>!n.parent).forEach(n=>model.add(n));model.updateMatrixWorld(true);
  doc.nodes.forEach((n,i)=>{if(n.mesh===undefined||n.skin===undefined)return;const skin=doc.skins[n.skin],matrices=attribute(skin.inverseBindMatrices).array;
    const skeleton=new THREE.Skeleton(skin.joints.map(j=>nodes[j]),skin.joints.map((_,k)=>new THREE.Matrix4().fromArray(matrices,k*16)));
    for(const primitive of doc.meshes[n.mesh].primitives){const g=new THREE.BufferGeometry();
      for(const [name,key] of [['position','POSITION'],['skinIndex','JOINTS_0'],['skinWeight','WEIGHTS_0']])g.setAttribute(name,attribute(primitive.attributes[key]));
      const mesh=new THREE.SkinnedMesh(g,new THREE.MeshBasicMaterial());mesh.bind(skeleton,new THREE.Matrix4());nodes[i].add(mesh);
    }
  });model.updateMatrixWorld(true);return model;
}
