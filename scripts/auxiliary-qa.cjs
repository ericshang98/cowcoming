const { chromium } = require("playwright"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" }),
    p = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    checks = [],
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const pass = (name, details = true) => {
    checks.push({ name, details });
    console.log("PASS", name);
  };
  try {
    await p.goto("http://127.0.0.1:4178");
    await p.waitForFunction(() => window.__replica?.getState().bootDone);
    pass("final production boot succeeds");
    await p.getByRole("button", { name: /special-kudos/ }).click();
    assert.equal(
      await p.getByRole("dialog", { name: "Awards & Recognition" }).count(),
      1,
    );
    await p.getByRole("button", { name: "Close awards" }).click();
    pass("awards opens and closes");
    await p.keyboard.press("Meta+k");
    await p
      .getByPlaceholder("Search projects, ideas, experiences…")
      .fill("ZeroEk");
    await p.locator(".search-results button").first().click();
    assert.match(
      await p.locator(".project-detail-header h1").innerText(),
      /ZeroEk/,
    );
    await p.getByRole("button", { name: "Enlarge project image" }).click();
    await p.keyboard.press("Escape");
    assert.equal(await p.locator(".lightbox").count(), 0);
    assert.equal(await p.locator(".detail-layer").count(), 1);
    pass("Escape dismisses image before its parent detail");
    await p.getByRole("button", { name: "Next project", exact: true }).click();
    assert.match(
      await p.locator(".project-detail-header h1").innerText(),
      /UAE PASS/,
    );
    await p.goBack();
    assert.match(
      await p.locator(".project-detail-header h1").innerText(),
      /ZeroEk/,
    );
    await p.getByRole("button", { name: "Close project", exact: true }).click();
    pass("search, next project and browser back preserve route state");
    await p
      .getByRole("button", { name: "Ask Fuch", exact: true })
      .filter({ visible: true })
      .click();
    await p.getByRole("button", { name: /wordle/ }).click();
    const beforeGameLikes = await p.evaluate(
      () => window.__replica.getState().likes,
    );
    await p.keyboard.type("BUILD");
    await p.keyboard.press("Enter");
    assert.equal(
      await p.locator(".wordle-grid>div").first().locator("[class]").count(),
      5,
    );
    assert.equal(
      await p.evaluate(() => window.__replica.getState().likes),
      beforeGameLikes,
    );
    assert.match(
      await p.locator(".wordle-grid>div").first().innerText(),
      /B[\s\S]*U[\s\S]*I[\s\S]*L[\s\S]*D/,
    );
    await p.keyboard.press("Escape");
    assert.equal(await p.locator(".wordle-overlay").count(), 0);
    assert.equal(await p.locator(".terminal").count(), 1);
    await p.getByRole("button", { name: "Close terminal" }).click();
    pass("word game accepts keyboard guesses and closes");
    const pdf = await p.request.get("http://127.0.0.1:4178/resume.pdf");
    assert.equal(pdf.status(), 200);
    assert.equal((await pdf.body()).subarray(0, 4).toString(), "%PDF");
    pass("downloadable résumé is a valid local PDF");
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "IDEA52", exact: true })
      .click();
    await p.getByRole("button", { name: /ENTER IDEA52/ }).click();
    await p.waitForTimeout(1500);
    const timing = await p.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0,
            start = performance.now();
          function tick(now) {
            frames++;
            if (now - start >= 1500)
              resolve({
                frames,
                milliseconds: Math.round(now - start),
                fps: Math.round((frames * 1000) / (now - start)),
              });
            else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
    );
    pass(
      "world frame timing sampled (not a performance acceptance threshold)",
      timing,
    );
    await p.getByRole("button", { name: "Open world map" }).click();
    await p.locator(".world-map-grid button").nth(26).click();
    await p.waitForTimeout(500);
    await p.locator(".near-idea").click();
    assert.match(await p.locator(".idea-detail h1").innerText(), /Papertrail/i);
    pass("far map location remains reachable with recentered grass");
    assert.deepEqual(errors, []);
    const broken = await browser.newPage();
    await broken.route("**/models/mascot-anim.glb", (route) => route.abort());
    await broken.goto("http://127.0.0.1:4178");
    await broken
      .getByRole("button", { name: "Try again" })
      .waitFor({ timeout: 12000 });
    assert.match(
      await broken.locator(".boot-error").innerText(),
      /could not load/,
    );
    await broken.screenshot({ path: ".pwc/evidence/boot-error.png" });
    pass(
      "blocked model shows recoverable load error instead of false readiness",
    );
    await broken.close();
  } catch (e) {
    errors.push(e.stack);
    console.error(e);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      ".pwc/auxiliary-verification.json",
      JSON.stringify(
        { timestamp: new Date().toISOString(), checks, errors },
        null,
        2,
      ),
    );
    await browser.close();
  }
})();
