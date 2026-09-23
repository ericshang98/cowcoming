import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { defaultTuningDocument } from "../src/live/motion-tuning.mjs";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4338";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  poses = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  // Exercise the old five-form config as it exists in a user's browser.
  const old = defaultTuningDocument();
  delete old.forms.playful;
  old.forms.calf.actions.NOD = { speed: 0.65, amplitude: 0.85 };
  await page.addInitScript(
    (doc) =>
      localStorage.setItem("cowcoming-motion-tuning-v1", JSON.stringify(doc)),
    old,
  );
  await page.goto(base + "/__motion-lab/start");
  await page.locator(".motion-form-select select").selectOption("playful");
  await page.waitForFunction(
    () =>
      window.__replica?.getState().bootDone &&
      window.__replica.controller.responseForm === "playful",
  );
  await page.waitForTimeout(1800);
  const preserved = await page.evaluate(
    () => window.__replica.controller.motionTuning.forms.calf.actions.NOD,
  );
  assert.deepEqual(preserved, { speed: 0.65, amplitude: 0.85 });
  await page.screenshot({ path: "tmp/motion-integration/playful-desktop.png" });
  for (const [x, y] of [
    [1, 1],
    [1430, 900],
  ]) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(500);
    const angles = await page.evaluate(() => [
      window.__replica.controller.headYaw,
      window.__replica.controller.headPitch,
    ]);
    assert.ok(angles.every((angle) => Math.abs(angle) < 0.0001));
  }
  const poseValues = {
    open: { MouthOpen: 1 },
    wide: { MouthOpen: 0.55, MouthWide: 1 },
    round: { MouthOpen: 0.8, MouthRound: 1 },
  };
  for (const [pose, values] of Object.entries(poseValues)) {
    await page.evaluate(
      (p) => (window.__replica.controller.mouthPose = p),
      pose,
    );
    await page.waitForTimeout(650);
    const mouths = await page.evaluate(
      () => window.__replica.controller.rig.mouth,
    );
    assert.equal(mouths.length, 3);
    for (const mouth of mouths)
      for (const [name, value] of Object.entries(values))
        assert.ok(Math.abs(mouth.weights[mouth.shapes[name]] - value) < 0.01);
  }
  await page.evaluate(() => (window.__replica.controller.mouthPose = "closed"));
  for (const [id, time] of [
    ["NOD", 1.15],
    ["SHAKE", 1.2],
    ["NOD_DOUBLE", 1.08],
    ["TILT_LEFT", 1.7],
    ["TILT_RIGHT", 1.7],
  ]) {
    await page.evaluate((actionId) => {
      const c = window.__replica.controller;
      c.motionTuning.forms.playful.actions[actionId] = {
        speed: 1,
        amplitude: 1.25,
      };
      window.__playfulResult = c.responsePlayer.play({
        formId: "playful",
        actionId,
        eventId: crypto.randomUUID(),
      });
    }, id);
    await page.waitForTimeout(time * 1000);
    const clip = await page.evaluate(
      () => window.__replica.controller.responsePlayer.clip,
    );
    assert.ok(clip?.startsWith("playful_"));
    await page.screenshot({
      path: `tmp/motion-integration/playful-${id}-125.png`,
    });
    await page.evaluate(() =>
      window.__replica.controller.responsePlayer.stop(),
    );
    assert.equal(
      await page.evaluate(async () => (await window.__playfulResult).status),
      "interrupted",
    );
    poses.push({ id, clip, sampleTime: time, amplitude: 1.25 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "tmp/motion-integration/playful-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "tmp/motion-integration/playful-browser-verification.json",
    JSON.stringify(
      {
        poses,
        errors,
        legacySettingsPreserved: true,
        allThreeMouthMeshes: true,
        headTrackingDisabled: true,
        mobileNoOverflow: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: playful poses at 125%, old settings preserved, three mouth meshes, no head tracking, desktop/mobile",
  );
} finally {
  await browser.close();
}
