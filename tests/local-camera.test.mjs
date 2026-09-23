import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCameraConfig,
  cameraConstraints,
  localCameraUrl,
  parseSnapshot,
  mediaLayout,
} from "../src/live/camera-config.mjs";
test("camera preferences are bounded, secret-free and constraints prefer real device negotiation", () => {
  const c = normalizeCameraConfig({
    source: "browser",
    width: 99999,
    height: 0,
    fps: 200,
    zoom: 9,
    token: "secret",
    mirror: true,
    rotation: 91,
  });
  assert.equal(c.width, 7680);
  assert.equal(c.height, 120);
  assert.equal(c.fps, 60);
  assert.equal(c.zoom, 3);
  assert.equal(c.rotation, 0);
  assert.ok(!("token" in c));
  const req = cameraConstraints({
    ...c,
    deviceId: "usb",
    width: 1920,
    height: 1080,
    fps: 30,
  });
  assert.deepEqual(req.video.deviceId, { exact: "usb" });
  assert.deepEqual(req.video.width, { ideal: 1920 });
  assert.equal(req.audio, false);
  assert.equal(
    cameraConstraints(normalizeCameraConfig({ width: 0, height: 0 })).video
      .width,
    undefined,
  );
});
test("local image endpoints only accept explicit loopback without credentials or queries", () => {
  assert.equal(
    localCameraUrl("http://127.0.0.1:8767/snapshot"),
    "http://127.0.0.1:8767/snapshot",
  );
  for (const url of [
    "https://remote.test/snapshot",
    "http://192.168.1.1/a",
    "file:///a",
    "http://a:b@localhost/",
    "http://localhost/?token=x",
    "http://localhost/#a",
  ])
    assert.throws(() => localCameraUrl(url));
});
const jpeg = "/9j/AA==";
test("benben snapshots keep image and bounded CV from the same fresh frame", () => {
  const result = parseSnapshot({
    jpeg,
    processed_frames: 7,
    service_started_at: 123,
    age_ms: 10,
    tracks: [
      {
        id: 1,
        visible: true,
        box: [0.1, 0.2, 0.3, 0.4],
        keypoints: { nose: { x: 0.2, y: 0.3 } },
        face: { box: [0.15, 0.21, 0.1, 0.1] },
      },
      { visible: false, box: [0, 0, 1, 1] },
      { visible: true, box: [NaN, 0, 1, 1] },
    ],
  });
  assert.equal(result.frameId, "123:7");
  assert.equal(result.boxes.length, 2);
  assert.equal(result.points.length, 1);
  assert.throws(() =>
    parseSnapshot({ jpeg, processed_frames: 7, age_ms: 2000 }),
  );
  assert.throws(() => parseSnapshot({ jpeg, processed_frames: 7 }));
  assert.throws(() =>
    parseSnapshot({
      jpeg: "https://tracker.test",
      processed_frames: 7,
      age_ms: 0,
    }),
  );
});
test("generic adapter protocol rejects nonframes and sanitizes CV", () => {
  const d = parseSnapshot({
    version: 1,
    frameId: "x",
    ageMs: 0,
    image: { mime: "image/jpeg", base64: jpeg },
    boxes: [{ id: 1, bbox: [0.8, 0.8, 0.8, 0.8] }],
    width: 1280,
    height: 720,
    fps: 30,
  });
  assert.equal(d.boxes[0].bbox[2], 0.19999999999999996);
  assert.equal(d.width, 1280);
  assert.throws(() =>
    parseSnapshot({
      version: 1,
      ageMs: 0,
      image: { mime: "image/svg+xml", base64: "abc" },
    }),
  );
});
test("rotated contain and cover share exact geometry with image annotations", () => {
  assert.deepEqual(mediaLayout(400, 400, 1600, 900, "contain", 0), {
    width: 400,
    height: 225,
  });
  assert.deepEqual(mediaLayout(400, 400, 1600, 900, "contain", 90), {
    width: 400,
    height: 225,
  });
  const landscape = mediaLayout(400, 200, 1600, 900, "contain", 90);
  assert.equal(landscape.width, 200);
  assert.equal(landscape.height, 112.5);
  assert.equal(mediaLayout(400, 200, 1600, 900, "cover", 90).height, 400);
});
