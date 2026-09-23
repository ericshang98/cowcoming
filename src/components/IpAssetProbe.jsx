import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';

export class IpLoadBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

// Uses the same useGLTF cache as the main stage. The old stage remains mounted
// while both GLB parsing and audio decoding finish for the pending selection.
export default function IpAssetProbe({ ip, onReady, onError }) {
  const gltf = useGLTF(ip.model);
  useEffect(() => {
    const abort = new AbortController(); let disposed = false, decoder;
    (async () => {
      const names = gltf.animations.map(clip => clip.name);
      if (!ip.clips.every(name => names.includes(name))) throw new Error('Missing animation');
      if (ip.actions) {
        decoder = new AudioContext();
        await Promise.all(Object.values(ip.actions).map(async track => {
          const response = await fetch(track.src, { signal: abort.signal });
          if (!response.ok) throw new Error('Audio unavailable');
          const decoded = await decoder.decodeAudioData(await response.arrayBuffer());
          if (Math.abs(decoded.duration - track.duration) > .15) throw new Error('Audio version mismatch');
        }));
      }
      if (!disposed) onReady();
    })().catch(() => { if (!disposed) onError(); }).finally(() => { decoder?.close().catch(() => {}); });
    return () => { disposed = true; abort.abort(); };
  }, [ip, gltf, onReady, onError]);
  return null;
}
