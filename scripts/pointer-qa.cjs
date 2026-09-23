const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 667, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("http://127.0.0.1:4178/");
    await page.waitForFunction(() => window.__replica?.getState().bootDone);
    await page.waitForTimeout(4000);
    async function follows(width, height) {
      await page.setViewportSize({ width, height });
      await page.mouse.move(20, height * 0.4);
      await page.waitForFunction(
        () => window.__replica.controller.bodyYaw < -0.3,
        null,
        { timeout: 5000 },
      );
      const left = await page.evaluate(
        () => window.__replica.controller.bodyYaw,
      );
      if (width === 667)
        await page.screenshot({ path: ".pwc/evidence/pointer-left.png" });
      await page.mouse.move(width - 20, height * 0.4);
      await page.waitForFunction(
        () => window.__replica.controller.bodyYaw > 0.3,
        null,
        { timeout: 5000 },
      );
      console.log(`PASS mouse follows at ${width}px`, {
        left,
        right: await page.evaluate(() => window.__replica.controller.bodyYaw),
      });
    }
    await follows(667, 720);
    await page.screenshot({ path: ".pwc/evidence/pointer-right.png" });
    await page.mouse.move(330, 85);
    await page.waitForFunction(
      () => window.__replica.controller.headPitch < -0.08,
    );
    await page.mouse.move(330, 580);
    await page.waitForFunction(
      () => window.__replica.controller.headPitch > 0.08,
    );
    console.log("PASS narrow-layout vertical gaze");
    await page.mouse.move(330, 240);
    await page.mouse.down();
    await page.mouse.move(430, 240, { steps: 8 });
    assert.equal(
      await page.evaluate(() => window.__replica.controller.dragging),
      true,
    );
    await page.mouse.up();
    assert.equal(
      await page.evaluate(() => window.__replica.controller.dragging),
      false,
    );
    await follows(667, 720);
    console.log("PASS gaze resumes after dragging");
    await page.dispatchEvent("canvas", "pointerover", {
      pointerType: "touch",
      bubbles: true,
    });
    await page.dispatchEvent("canvas", "pointermove", {
      pointerType: "touch",
      clientX: 20,
      clientY: 200,
      bubbles: true,
    });
    assert.equal(
      await page.evaluate(() => window.__replica.controller.mouse.active),
      false,
    );
    await page.waitForFunction(
      () => Math.abs(window.__replica.controller.bodyYaw) < 0.05,
    );
    console.log("PASS touch scrolling does not activate cursor gaze");
    await follows(667, 720);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(
      await page.evaluate(() => window.__replica.controller.mouse.active),
      false,
    );
    await page.waitForFunction(
      () => Math.abs(window.__replica.controller.bodyYaw) < 0.05,
    );
    console.log("PASS blur clears stale gaze");
    await follows(390, 844);
    await follows(1440, 1000);
    await page
      .getByRole("button", { name: "Turn off cursor tracking" })
      .click();
    await page.mouse.move(20, 400);
    await page.waitForFunction(
      () => Math.abs(window.__replica.controller.bodyYaw) < 0.05,
    );
    await page.getByRole("button", { name: "Turn on cursor tracking" }).click();
    await follows(1440, 1000);
    console.log("PASS tracking toggle restores gaze");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "ABOUT", exact: true })
      .click();
    await page.getByLabel("Interactive 3D avatar").waitFor();
    await page.waitForTimeout(3000);
    await follows(667, 720);
    console.log("PASS human avatar follows in narrow layout");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
