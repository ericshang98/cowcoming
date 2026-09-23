import { useEffect, useState } from 'react';
import { useApp } from '../context';
const poses = [['closed', '闭嘴'], ['open', '张嘴'], ['wide', '咧嘴'], ['round', '圆嘴']];

export default function MouthPreview() {
  const { controller } = useApp();
  const [pose, setPose] = useState('closed');
  useEffect(() => () => {
    controller.mouthPose = 'closed';
    controller.mouthPreview = false;
  }, [controller]);
  return (
    <details className="mouth-preview" onToggle={event => {
      const open = event.currentTarget.open;
      controller.mouthPreview = open;
      if (!open) {
        controller.mouthPose = 'closed';
        setPose('closed');
      }
    }} onKeyDown={event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.currentTarget.open = false;
      }
    }}>
      <summary>试口型</summary>
      <div className="mouth-preview-panel">
        <div role="group" aria-label="口型预览">
          {poses.map(([value, label]) => (
            <button key={value} aria-pressed={pose === value} onClick={() => {
              setPose(value);
              controller.mouthPose = value;
            }}>{label}</button>
          ))}
        </div>
        <small>仅预览嘴部动作，无声音</small>
      </div>
    </details>
  );
}
