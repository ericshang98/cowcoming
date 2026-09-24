import { localCameraUrl } from "./camera-config.mjs";

const key = "cowcoming.camera.session.v1";
// One explicitly remembered preview connection per tab; never localStorage.
export function readCameraSession(room, url) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return room &&
      saved?.room === room &&
      saved.url === localCameraUrl(url) &&
      typeof saved.token === "string"
      ? saved.token
      : "";
  } catch {
    return "";
  }
}
export function writeCameraSession(room, url, token, remember) {
  try {
    sessionStorage.removeItem(key);
    if (remember && room && token.trim())
      sessionStorage.setItem(
        key,
        JSON.stringify({ room, url: localCameraUrl(url), token: token.trim() }),
      );
  } catch {
    // Storage may be disabled. The in-memory connection still works.
  }
}
