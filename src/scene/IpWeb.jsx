import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function IpWeb({ model, controller }) {
  const root = useRef(), hand = useMemo(() => model.getObjectByName('LeftHand'), [model]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3)), []);
  const material = useMemo(() => new THREE.LineBasicMaterial({color:0x91b2c1,transparent:true,opacity:.85,depthWrite:false}), []);
  const lines = useMemo(() => new THREE.LineSegments(geometry, material), [geometry, material]);
  const point = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry,material]);
  useFrame(() => {
    const playback = controller.ipPlayback, t = playback ? playback.audio.currentTime / playback.duration : 0;
    const visible = playback?.clip === 'wave' && t > .25 && t < .78;
    if (!root.current) return;
    root.current.visible = !!visible;
    if (!visible || !hand) return;
    hand.getWorldPosition(point); root.current.worldToLocal(point);
    const extension = Math.min(1, (t - .25) / .12), attr = geometry.attributes.position;
    for (let i=0;i<3;i++) {
      attr.setXYZ(i*2, point.x,point.y,point.z);
      attr.setXYZ(i*2+1,point.x+(1.3+(i-1)*.07)*extension,point.y+(.32+(i-1)*.045)*extension,point.z+.15);
    }
    attr.needsUpdate = true; geometry.computeBoundingSphere();
    material.opacity = .8*Math.min(1,(.78-t)/.2);
  });
  return <group ref={root} visible={false}><primitive object={lines}/></group>;
}
