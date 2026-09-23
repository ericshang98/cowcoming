import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  defaultTuningDocument,
  parseTuningDocument,
} from "../src/live/motion-tuning.mjs";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4337";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const errors = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
async function waitReady(form) {
  await page.waitForFunction(
    (id) =>
      window.__replica?.getState().bootDone &&
      window.__replica.controller.responseForm === id,
    form,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => !window.__replica.controller.responsePlayer.busy,
  );
}
async function upload(doc) {
  await page.locator(".motion-tuning-files input").setInputFiles({
    name: "tuning.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  try {
    parseTuningDocument(JSON.stringify(doc));
  } catch {
    return;
  }
  await page.waitForFunction(
    (expected) =>
      JSON.stringify(window.__replica.controller.motionTuning) === expected,
    JSON.stringify(doc),
  );
}
try {
  // Local bootstrap connects a genuine local Worker and Python simulator.
  await page.goto(base + "/__motion-lab/start");
  await page.locator(".motion-form-select select").waitFor({ timeout: 60000 });
  await page.locator(".motion-form-select select").selectOption("calf");
  await waitReady("calf");
  await page.locator('[data-tuning="speed"]').focus();
  await page.keyboard.press("End");
  await page.locator('[data-tuning="amplitude"]').focus();
  await page.keyboard.press("Home");
  assert.equal(await page.locator('[data-tuning="speed"]').inputValue(), "1.5");
  assert.equal(
    await page.locator('[data-tuning="amplitude"]').inputValue(),
    "0.5",
  );
  await page.reload();
  await waitReady("calf");
  assert.equal(
    await page.locator('[data-tuning="amplitude"]').inputValue(),
    "0.5",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部参数", exact: true }).click();
  const downloaded = await downloadPromise;
  const exported = parseTuningDocument(
    await fs.readFile(await downloaded.path(), "utf8"),
  );
  assert.deepEqual(exported.forms.calf.actions.NOD, {
    speed: 1.5,
    amplitude: 0.5,
  });
  await page
    .getByRole("button", { name: "恢复当前动作默认值", exact: true })
    .click();
  assert.equal(await page.locator('[data-tuning="speed"]').inputValue(), "1");
  await upload(exported);
  assert.equal(
    await page.locator('[data-tuning="amplitude"]').inputValue(),
    "0.5",
  );
  const invalid = structuredClone(exported);
  invalid.forms.calf.actions.NOD.speed = 99;
  await upload(invalid);
  await page.getByText(/导入失败：/).waitFor();
  assert.equal(await page.locator('[data-tuning="speed"]').inputValue(), "1.5");
  const all = defaultTuningDocument();
  for (const form of Object.values(all.forms))
    for (const action of Object.values(form.actions)) {
      action.speed = 1.5;
      action.amplitude = 1.25;
    }
  await upload(all);
  for (const formId of Object.keys(all.forms)) {
    await page.locator(".motion-form-select select").selectOption(formId);
    await waitReady(formId);
    for (const actionId of Object.keys(all.forms[formId].actions)) {
      await page.locator(`[data-motion="${actionId}"]`).click();
      await page.waitForFunction(
        () => window.__replica.controller.responsePlayer.busy,
      );
      const clip = await page.evaluate(
        () => window.__replica.controller.responsePlayer.clip,
      );
      await page.waitForFunction(
        () => !window.__replica.controller.responsePlayer.busy,
        null,
        { timeout: 15000 },
      );
      assert.match(
        await page.locator(".motion-play-status").textContent(),
        /完成/,
      );
      results.push({
        formId,
        actionId,
        clip,
        speed: 1.5,
        amplitude: 1.25,
        status: "completed",
      });
    }
    console.log(`${formId}: all five tuned clips complete`);
  }
  await page.locator('[data-motion="NOD"]').click();
  await page.locator("[data-motion-stop]").click();
  assert.equal(
    await page.evaluate(() => window.__replica.controller.responsePlayer.busy),
    false,
  );
  // Common response player must also apply settings to relay-originated actions.
  const evidence = await page.evaluate(async () => {
    const player = window.__replica.controller.responsePlayer,
      original = player.play;
    window.__tunedReceipts = [];
    player.play = function (request) {
      return original.call(this, request).then((result) => {
        window.__tunedReceipts.push(result);
        return result;
      });
    };
    return true;
  });
  assert.equal(evidence, true);
  await page.locator(".live-lab-button").click();
  await page
    .locator(".live-debug-actions")
    .getByRole("button", { name: "确认点头", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__tunedReceipts?.some((r) => r.status === "completed"),
    null,
    { timeout: 15000 },
  );
  const liveResult = await page.evaluate(() =>
    window.__tunedReceipts.find((r) => r.status === "completed"),
  );
  assert.deepEqual(liveResult.tuning, { speed: 1.5, amplitude: 1.25 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /关闭|Close/ })
    .click();
  // Return neutral defaults for screenshot and make the model fully visible after entrance.
  await upload(defaultTuningDocument());
  await page.locator(".motion-form-select select").selectOption("normal");
  await waitReady("normal");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "tmp/motion-integration/tuning-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".motion-form-select select").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "tmp/motion-integration/tuning-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "tmp/motion-integration/tuning-verification.json",
    JSON.stringify(
      {
        results,
        liveResult,
        errors,
        persistence: true,
        importExport: true,
        invalidImportUnchanged: true,
        stop: true,
        mobileNoOverflow: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: 30 tuned GLB clips, relay playback, persistence, import/export, reset, stop and mobile layout",
  );
} finally {
  await browser.close();
}
