const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
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
  const check = (name, details = true) => {
    checks.push({ name, details });
    console.log("PASS", name);
  };
  const shot = (name) => page.screenshot({ path: `.pwc/evidence/${name}.png` });
  const nav = (name) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  try {
    await page.goto("http://127.0.0.1:4178/");
    await page.waitForTimeout(800);
    await shot("boot");
    await page.waitForFunction(() => window.__replica?.getState().bootDone);
    await page.waitForTimeout(3300);
    assert.equal(await page.locator(".scene-error").count(), 0);
    check("boot reaches ready with a rendered model");
    await shot("home");
    await page.mouse.move(80, 400);
    await page.waitForTimeout(1800);
    const left = await page.evaluate(() => window.__replica.controller.bodyYaw);
    await page.mouse.move(1370, 400);
    await page.waitForTimeout(1800);
    const right = await page.evaluate(
      () => window.__replica.controller.bodyYaw,
    );
    assert.ok(left < -0.3 && right > 0.3);
    check("mouse gaze follows left and right with bounded body rotation", {
      left,
      right,
    });
    await page.mouse.move(750, 450);
    await page.mouse.down();
    await page.mouse.move(1000, 450, { steps: 12 });
    assert.equal(
      await page.evaluate(() => window.__replica.controller.dragging),
      true,
    );
    await page.mouse.up();
    assert.equal(
      await page.evaluate(() => window.__replica.controller.dragging),
      false,
    );
    check("drag rotates and release clears drag state");
    await page
      .getByRole("button", { name: "Turn off cursor tracking" })
      .click();
    assert.equal(
      await page.evaluate(() => window.__replica.getState().tracking),
      false,
    );
    await page.getByRole("button", { name: "Turn on cursor tracking" }).click();
    await page.getByRole("button", { name: "Pause animations" }).click();
    assert.equal(
      await page.evaluate(() => window.__replica.getState().paused),
      true,
    );
    await page.getByRole("button", { name: "Resume animations" }).click();
    check("tracking and pause toggles update scene state");
    const likes = await page.evaluate(() => window.__replica.getState().likes);
    await page.keyboard.press("l");
    assert.equal(
      await page.evaluate(() => window.__replica.getState().likes),
      likes + 1,
    );
    check("keyboard like increments persistent count and requests reaction");
    await nav("WORK");
    await page.waitForTimeout(2200);
    await shot("work");
    assert.equal(await page.locator(".project-card").count(), 8);
    await page.locator(".project-card").first().click();
    await page.waitForTimeout(500);
    await shot("project-detail");
    assert.ok(await page.locator(".project-story").innerText());
    await page.getByRole("button", { name: "Enlarge project image" }).click();
    assert.equal(await page.locator(".lightbox").count(), 1);
    await page.getByRole("button", { name: "Close enlarged image" }).click();
    await page
      .getByRole("button", { name: "Close project", exact: true })
      .click();
    check("work opens full project, image lightbox, and closes back to work");
    await nav("ABOUT");
    await page.waitForTimeout(3300);
    await shot("about");
    assert.equal(await page.getByLabel("Interactive 3D avatar").count(), 1);
    check("About morphs robot into human avatar");
    await page
      .getByRole("button", { name: "Open living CV", exact: true })
      .filter({ visible: true })
      .click();
    await page.waitForTimeout(500);
    await shot("resume");
    await page.getByRole("button", { name: "Minimize resume" }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByRole("button", { name: "LIVE RESUME" }).click();
    await page.getByRole("button", { name: "Maximize resume" }).click();
    assert.equal(await page.locator(".floating-window.maximized").count(), 1);
    await page.getByRole("button", { name: "Close resume" }).click();
    check("resume open, minimize, restore, maximize and close");
    await page
      .getByRole("button", { name: "Ask Fuch", exact: true })
      .filter({ visible: true })
      .click();
    await page.waitForTimeout(250);
    await shot("terminal");
    const terminalInput = page.locator(".terminal-input input");
    await terminalInput.fill("Tell me about UAE PASS");
    await terminalInput.press("Enter");
    await page.waitForTimeout(750);
    assert.match(
      await page.locator(".terminal-answer").last().innerText(),
      /UAE|national/i,
    );
    await terminalInput.fill("/work");
    await terminalInput.press("Enter");
    await page.waitForTimeout(300);
    assert.equal(
      await page.evaluate(() => window.__replica.getState().mode),
      "work",
    );
    check("terminal archive answers and slash navigation work");
    await nav("CONTACT");
    await page.waitForTimeout(1800);
    await shot("contact");
    await page.getByRole("button", { name: /Just say hello/ }).click();
    await page
      .getByRole("textbox", { name: "Your name" })
      .fill("Local verification");
    await page.getByRole("button", { name: "Continue conversation" }).click();
    await page
      .getByRole("textbox", { name: "Your message" })
      .fill("This is a local test and must not be delivered.");
    await page.getByRole("button", { name: "Continue conversation" }).click();
    await page.getByRole("textbox", { name: "Reply email" }).fill("invalid");
    await page.getByRole("button", { name: "Continue conversation" }).click();
    assert.match(await page.getByRole("alert").innerText(), /valid email/);
    await page.getByRole("button", { name: "Skip this question" }).click();
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    assert.match(await page.getByRole("alert").innerText(), /not sent/);
    await shot("contact-delivery-unconfigured");
    check(
      "contact branch validates email, reviews replies, and never fakes delivery",
    );
    await nav("IDEA52");
    await page.waitForTimeout(2500);
    await shot("idea52-intro");
    await page.getByRole("button", { name: /ENTER IDEA52/ }).click();
    await page.waitForTimeout(1800);
    await page.keyboard.down("w");
    await page.waitForTimeout(1800);
    await page.keyboard.up("w");
    await page.waitForTimeout(1200);
    assert.match(
      await page.locator(".world-progress footer").innerText(),
      /[1-9]\d* M WALKED/,
    );
    await shot("world");
    await page.getByRole("button", { name: "Open world map" }).click();
    await page.locator(".world-map-grid button").nth(1).click();
    await page.waitForTimeout(700);
    await page.locator(".near-idea").click();
    assert.match(
      await page.locator(".idea-detail h1").innerText(),
      /DreamLens/,
    );
    await shot("idea-detail");
    await page.getByRole("button", { name: "Close idea" }).click();
    check("IDEA52 enters, moves, fast-travels, discovers and opens an idea");
    await page.goto("http://127.0.0.1:4178/?section=blog");
    await page.waitForTimeout(1200);
    assert.equal(
      await page
        .locator(".interface-chrome")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    check("direct IDEA52 URL has visible navigation");
    await page.setViewportSize({ width: 390, height: 844 });
    await nav("HOME");
    await page.waitForTimeout(4000);
    await shot("mobile-home");
    assert.ok(await page.getByRole("navigation").isVisible());
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await nav("WORK");
    await page.waitForTimeout(1500);
    await shot("mobile-work");
    await page.locator(".project-card").first().click();
    await page.waitForTimeout(500);
    await shot("mobile-project");
    await page
      .getByRole("button", { name: "Close project", exact: true })
      .click();
    await nav("CONTACT");
    await page.waitForTimeout(600);
    await shot("mobile-contact");
    assert.ok(
      await page.getByRole("button", { name: /Discuss a role/ }).isVisible(),
    );
    check(
      "390px mobile navigation, scrolling, project details and contact fit viewport",
    );
    assert.deepEqual(errors, []);
    check("no browser runtime errors or failed requests");
  } catch (error) {
    console.error(error);
    errors.push(error.stack);
    process.exitCode = 1;
    await shot("failure").catch(() => {});
  } finally {
    fs.writeFileSync(
      ".pwc/browser-verification.json",
      JSON.stringify(
        { timestamp: new Date().toISOString(), checks, errors },
        null,
        2,
      ),
    );
    await browser.close();
  }
})();
