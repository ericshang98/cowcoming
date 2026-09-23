import { Quaternion } from "three";
/** Each authored response starts and ends in the neutral pose. Scale relative
 * rotation from its first sample; never change position, scale or the source. */
export function tuneClip(source, amplitude) {
  const clip = source.clone();
  clip.name = source.name + "-tuned";
  const neutral = new Quaternion(),
    sample = new Quaternion(),
    result = new Quaternion();
  for (const track of clip.tracks) {
    if (track.ValueTypeName !== "quaternion") continue;
    neutral.fromArray(track.values, 0).normalize();
    for (let offset = 0; offset < track.values.length; offset += 4) {
      sample.fromArray(track.values, offset).normalize();
      result
        .copy(neutral)
        .slerp(sample, amplitude)
        .normalize()
        .toArray(track.values, offset);
    }
  }
  return clip;
}
