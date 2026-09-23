const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4186/";
const output = ".pwc/model-picker";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (name) => {
    checks.push(name);
    console.log("PASS", name);
  };
  const state = () => page.evaluate(() => window.__replica.getState());
  const asset = (name) =>
    page.waitForFunction(
      (name) => window.__replica.controller.rig?.asset.includes(name),
      name,
    );
  const open = async () => {
    if (!(await page.getByRole("dialog", { name: "选择首页模型" }).isVisible()))
      await page
        .getByRole("button", { name: "选择首页模型", exact: true })
        .click();
  };
  const choose = async (name) => {
    await open();
    await page
      .getByRole("group", { name: "首页角色" })
      .getByRole("button", { name, exact: true })
      .click();
  };
  async function boot() {
    await page.goto(base);
    await page.waitForFunction(() => window.__replica?.getState().bootDone);
    await asset("niulai-mouth");
  }
  try {
    await boot();
    await open();
    await page.screenshot({ path: `${output}/menu-desktop.png` });
    assert.equal(
      await page
        .getByRole("button", { name: "牛来", exact: true, pressed: true })
        .count(),
      1,
    );
    // A failed file must not remove or replace the visible character.
    await page.route("**/models/nailong-web.glb", (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    await choose("奶龙");
    await page.getByRole("alert").filter({ hasText: "奶龙加载失败" }).waitFor();
    assert.equal((await state()).homeModel, "niulai");
    await asset("niulai-mouth");
    check("Failed load preserves the current model and shows retry feedback");
    await page.unroute("**/models/nailong-web.glb");
    await choose("奶龙");
    await asset("nailong-web");
    assert.equal((await state()).homeModel, "nailong");
    await page.getByText("奶龙暂不支持口型", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/nailong-home.png` });
    check(
      "Retry switches HOME to Nailong and accurately marks missing mouth support",
    );
    await page.getByRole("button", { name: "WORK", exact: true }).click();
    await asset("niulai-mouth");
    assert.ok(
      await page
        .getByRole("button", { name: "模型选择（仅 HOME 可用）" })
        .isDisabled(),
    );
    assert.equal(
      await page.getByRole("dialog", { name: "选择首页模型" }).count(),
      0,
    );
    await page.screenshot({ path: `${output}/work-unchanged.png` });
    await page.getByRole("button", { name: "CONTACT", exact: true }).click();
    await asset("niulai-mouth");
    assert.ok(
      await page
        .getByRole("button", { name: "模型选择（仅 HOME 可用）" })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "ABOUT", exact: true }).click();
    await asset("fuch-human-spin");
    await page.getByRole("button", { name: "HOME", exact: true }).click();
    await asset("nailong-web");
    check(
      "WORK and CONTACT keep Niulai, ABOUT keeps its avatar, returning HOME restores Nailong",
    );
    await choose("蜘蛛侠");
    await asset("spiderman-web");
    await page.screenshot({ path: `${output}/spiderman-home.png` });
    await choose("牛来");
    await asset("niulai-mouth");
    await page.getByText("试口型", { exact: true }).waitFor();
    check("All three models switch; Niulai mouth controls return");
    // Fresh page cache: leave HOME while a custom file is still in flight.
    let release;
    await page.route("**/models/nailong-web.glb", async (r) => {
      await new Promise((resolve) => {
        release = resolve;
      });
      await r.continue();
    });
    await boot();
    await choose("奶龙");
    await page
      .getByRole("status")
      .filter({ hasText: "正在加载奶龙" })
      .waitFor();
    assert.equal((await state()).homeModel, "niulai");
    await asset("niulai-mouth");
    await page.getByRole("button", { name: "WORK", exact: true }).click();
    while (!release) await page.waitForTimeout(20);
    release();
    await page.waitForTimeout(500);
    assert.equal((await state()).homeModel, "niulai");
    assert.equal((await state()).pendingModel, null);
    await page.getByRole("button", { name: "HOME", exact: true }).click();
    await asset("niulai-mouth");
    check(
      "Leaving HOME cancels an in-flight switch; late completion cannot change the model",
    );
    await page.unroute("**/models/nailong-web.glb");
    // A newer choice wins, even if the earlier request resolves last.
    let releaseSpider;
    await page.route("**/models/spiderman-web.glb", async (r) => {
      await new Promise((resolve) => {
        releaseSpider = resolve;
      });
      await r.continue();
    });
    await choose("蜘蛛侠");
    await page
      .getByRole("status")
      .filter({ hasText: "正在加载蜘蛛侠" })
      .waitFor();
    await choose("奶龙");
    await asset("nailong-web");
    while (!releaseSpider) await page.waitForTimeout(20);
    releaseSpider();
    await page.waitForTimeout(500);
    assert.equal((await state()).homeModel, "nailong");
    await asset("nailong-web");
    check("Rapid selection ignores an older response that resolves last");
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await page.screenshot({ path: `${output}/menu-mobile.png` });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    const menu = await page
      .getByRole("dialog", { name: "选择首页模型" })
      .boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= 390);
    await page.keyboard.press("Escape");
    assert.equal(
      await page.getByRole("dialog", { name: "选择首页模型" }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "选择首页模型", exact: true })
      .press("Enter");
    await page
      .getByRole("group", { name: "首页角色" })
      .getByRole("button", { name: "牛来", exact: true })
      .press("Enter");
    await asset("niulai-mouth");
    check(
      "Mobile picker stays in bounds and supports keyboard selection/Escape",
    );
    assert.deepEqual(errors, []);
    check("No browser runtime errors");
  } catch (error) {
    errors.push(error.stack);
    await page.screenshot({ path: `${output}/failure.png` });
    throw error;
  } finally {
    fs.writeFileSync(
      `${output}/report.json`,
      JSON.stringify({ checks, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
