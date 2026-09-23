const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
  });
  const errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (name) => {
    checks.push(name);
    console.log("PASS", name);
  };
  const base = process.env.QA_BASE_URL || "http://127.0.0.1:4227/";
  const enter = async () => {
    await page
      .getByRole("button", { name: /进入 WORLD|继续探索 WORLD/ })
      .click();
    await page.getByLabel(/World quality|画面质量/).selectOption("LOW");
    await page.getByLabel("星光世界，使用方向键或 WASD 移动").waitFor();
    await page.locator("canvas[aria-label]").focus();
  };
  const count = () =>
    page.locator(".world-collection").getAttribute("data-collected");
  try {
    await page.goto(base + "?section=blog");
    await enter();
    assert.equal(await count(), "0");
    await page.keyboard.down("w");
    await page.waitForFunction(
      () =>
        document.querySelector(".world-collection")?.dataset.collected === "1",
      null,
      { timeout: 20000 },
    );
    await page.keyboard.up("w");
    check("real movement collects the first star");
    await page
      .getByRole("button", { name: "打开星光地图", exact: true })
      .click();
    // Opening the map freezes movement; let the throttled HUD publish the
    // final distance before checking that selecting a target cannot move it.
    await page.waitForTimeout(600);
    const before = await page.locator(".world-progress footer").innerText();
    await page
      .getByRole("button", { name: "星光 2，设为目标", exact: true })
      .click();
    assert.equal(await count(), "1");
    assert.equal(
      await page.locator(".world-progress footer").innerText(),
      before,
    );
    check("map targeting neither teleports nor collects");
    await page.reload();
    await enter();
    assert.equal(await count(), "1");
    check("refresh preserves collection");
    // Seed a test-only save: the first star is still required to earn the reward.
    await page.evaluate(() =>
      localStorage.setItem(
        "niulai-world-stars-v1",
        JSON.stringify(
          Array.from(
            { length: 26 },
            (_, i) => `star-${String(i + 2).padStart(2, "0")}`,
          ),
        ),
      ),
    );
    await page.reload();
    await enter();
    assert.equal(await count(), "26");
    await page.keyboard.down("w");
    await page
      .getByRole("heading", { name: "全部点亮！", exact: true })
      .waitFor({ timeout: 20000 });
    await page.keyboard.up("w");
    assert.equal(await count(), "27");
    await page.getByRole("button", { name: "好啦，歇一会儿", exact: true }).waitFor();
    check("last pickup unlocks and starts the looping mama recording");
    await page.getByRole("button", { name: "暂停探索", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "继续叫妈妈", exact: true })
        .isDisabled(),
      true,
    );
    check("pause stops voice and blocks further input");
    await page
      .getByRole("button", { name: "已暂停 · 继续探索", exact: true })
      .click();
    await page
      .getByRole("button", { name: "继续在世界里走走", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    fs.mkdirSync(".pwc/evidence", { recursive: true });
    await page.screenshot({
      path: ".pwc/evidence/world-collection-mobile.png",
    });
    await page.reload();
    await enter();
    assert.equal(await count(), "27");
    assert.equal(
      await page
        .getByRole("heading", { name: "全部点亮！", exact: true })
        .count(),
      0,
    );
    check("completed save stays unlocked without repeating celebration");
    assert.deepEqual(errors, []);
    check("no runtime errors");
  } finally {
    fs.mkdirSync(".pwc", { recursive: true });
    fs.writeFileSync(
      ".pwc/world-collection-verification.json",
      JSON.stringify({ base, checks, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
