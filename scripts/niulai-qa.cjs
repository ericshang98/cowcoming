const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const check = (name) => {
    checks.push(name);
    console.log("PASS", name);
  };
  const shot = (name) =>
    page.screenshot({ path: `.pwc/evidence/niulai-${name}.png` });
  try {
    await page.goto(process.env.QA_BASE_URL || "http://127.0.0.1:4178/");
    await page.waitForFunction(() => window.__replica?.getState().bootDone);
    await page.waitForFunction(
      () => window.__replica?.controller.rig?.animation === "idle",
    );
    const rig = await page.evaluate(() => window.__replica.controller.rig);
    assert.equal(rig.asset, "/models/niulai-mouth.glb");
    assert.deepEqual(rig.animations.sort(), ["bow", "idle", "walking", "wave"]);
    check("supplied Niulai model loads with all four animations");
    await shot("home");
    for (const [name, trigger] of [
      ["wave", () => page.keyboard.press("l")],
      ["bow", () => page.mouse.click(720, 450)],
      [
        "walking",
        () =>
          page.evaluate(() => window.__replica.controller.gesture("walking")),
      ],
    ]) {
      await trigger();
      await page.waitForFunction(
        (name) => window.__replica.controller.rig.animation === name,
        name,
      );
      await page.waitForTimeout(350);
      await shot(name);
      await page.waitForFunction(
        () => window.__replica.controller.rig.animation === "idle",
      );
      check(`${name} plays and returns to idle`);
    }
    await page.mouse.move(70, 400);
    await page.waitForFunction(
      () => window.__replica.controller.bodyYaw < -0.5,
    );
    await shot("left");
    await page.mouse.move(1370, 400);
    await page.waitForFunction(() => window.__replica.controller.bodyYaw > 0.5);
    await shot("right");
    check("Niulai looks left and right");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.mouse.move(195, 150);
    await page.waitForTimeout(1500);
    await shot("mobile");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    check("narrow layout renders without overflow");
    assert.deepEqual(errors, []);
    check("no runtime errors or failed requests");
  } catch (error) {
    errors.push(error.stack);
    await shot("failure");
    throw error;
  } finally {
    fs.writeFileSync(
      ".pwc/niulai-verification.json",
      JSON.stringify(
        { timestamp: new Date().toISOString(), checks, errors },
        null,
        2,
      ),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
