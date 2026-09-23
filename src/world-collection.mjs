export const COLLECTION_KEY = "niulai-world-stars-v1";
export const PICKUP_RADIUS = 1.6;
export const STARS = Array.from({ length: 27 }, (_, i) => {
  const radius = i === 0 ? 8 : 15 + Math.sqrt(i) * 9,
    angle = i * 2.39996;
  return {
    id: `star-${String(i + 1).padStart(2, "0")}`,
    number: i + 1,
    x: Math.sin(angle) * radius,
    z: -Math.cos(angle) * radius,
  };
});
const ids = new Set(STARS.map((star) => star.id));
export function normalizeCollected(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => ids.has(id)))]
    : [];
}
export function mamaUnlocked(collected) {
  return normalizeCollected(collected).length === STARS.length;
}
export function canPlayTrack(id, collected, mode) {
  return mode === "home" || id !== "mama" || mamaUnlocked(collected);
}
export function collectStar(collected, id, position, active) {
  const star = STARS.find((s) => s.id === id);
  if (
    !active ||
    !star ||
    collected.includes(id) ||
    !position ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.z) ||
    Math.hypot(position.x - star.x, position.z - star.z) > PICKUP_RADIUS
  )
    return collected;
  return [...collected, id];
}
export function readCollection(storage) {
  let raw;
  try {
    raw = storage.getItem(COLLECTION_KEY);
  } catch {
    return { ids: [], persistent: false };
  }
  try {
    return { ids: normalizeCollected(JSON.parse(raw)), persistent: true };
  } catch {
    return { ids: [], persistent: true };
  }
}
export function writeCollection(storage, collected) {
  try {
    storage.setItem(
      COLLECTION_KEY,
      JSON.stringify(normalizeCollected(collected)),
    );
    return true;
  } catch {
    return false;
  }
}
