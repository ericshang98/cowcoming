const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  await context.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) { const audio = new NativeAudio(...args); window.__modelTestAudio = audio; return audio; };
    window.Audio.prototype = NativeAudio.prototype;
  });
  const page = await context.newPage(), errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = (process.env.AUDIO_PREVIEW_URL || 'http://127.0.0.1:42849/') + '?character=fengge&qa=1';
  const inspect = () => page.evaluate(() => window.__fenggeStage.inspect());
  async function ready() { await page.waitForFunction(() => window.__fenggeStage?.ready); }
  async function assertSynced(expected) {
    await page.waitForFunction(action => {
      const s = window.__fenggeStage.inspect(); return s.action === action && s.audioTime > .25;
    }, expected);
    const s = await inspect();
    assert.equal(s.action, expected);
    assert.ok(Math.abs(s.clipTime / s.clipDuration - s.audioTime / s.audioDuration) < .07, JSON.stringify(s));
    assert.ok(s.head.some((v, i) => Math.abs(v - [0, 0, 0, 1][i]) > .003), 'head pose must change');
  }
  try {
    await page.goto(url); await ready();
    let s = await inspect();
    const idleHead = s.head;
    assert.equal(s.clips.length, 7); assert.ok(s.triangles >= 119990);
    checks.push('actual GLB renders 119990-triangle mesh and seven clips');
    await page.locator('#model-canvas').screenshot({ path: path.join(__dirname, 'fengge-idle.png') });
    // Raycast the actual torso, not the audio button.
    const canvas = page.locator('#model-canvas');
    await canvas.click({ position: { x: (await canvas.boundingBox()).width / 2, y: 210 } });
    await assertSynced('nod');
    checks.push('clicking actual model triggers nod + speech on shared audio clock');
    // Hold an actual media-clock pose for a stable visual capture; screenshots
    // can otherwise take longer than the 1.25-second response on software GL.
    await page.evaluate(() => { window.__modelTestAudio.pause(); window.__modelTestAudio.currentTime = .6; });
    await page.waitForFunction(() => Math.abs(window.__fenggeStage.inspect().clipTime - .6 / 1.25 * window.__fenggeStage.inspect().clipDuration) < .01);
    const nodHead = (await inspect()).head;
    assert.ok(nodHead.some((v, i) => Math.abs(v - idleHead[i]) > .02), 'nod must change actual head pose from idle');
    await page.locator('#model-canvas').screenshot({ path: path.join(__dirname, 'fengge-nod.png') });
    await page.evaluate(() => window.__modelTestAudio.play());
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('播放完成'));
    assert.equal((await inspect()).action, 'idle'); checks.push('completed response returns to idle');
    await page.keyboard.press('l'); await assertSynced('reflect');
    checks.push('L plays reflect with actual changing head pose and synchronized recording');
    await page.evaluate(() => { window.__modelTestAudio.pause(); window.__modelTestAudio.currentTime = 1.7; });
    await page.waitForFunction(() => Math.abs(window.__fenggeStage.inspect().clipTime - 1.7 / 3.38 * window.__fenggeStage.inspect().clipDuration) < .01);
    const reflectHead = (await inspect()).head;
    assert.ok(reflectHead.some((v, i) => Math.abs(v - idleHead[i]) > .02), 'reflect must change actual head pose from idle');
    await page.locator('#model-canvas').screenshot({ path: path.join(__dirname, 'fengge-reflect.png') });
    await page.locator('#tap').click(); await assertSynced('nod');
    await page.keyboard.press('Escape'); assert.equal((await inspect()).action, 'idle');
    checks.push('tap interrupts L; Escape returns to idle');
    await page.locator('#signature').click(); await assertSynced('reflect');
    await page.locator('#mute').click(); assert.equal((await inspect()).action, 'idle');
    await page.locator('#tap').click(); await assertSynced('nod');
    await page.locator('#mute').click();
    checks.push('mute stops current interaction; new interaction still animates silently');
    await page.locator('[data-id=spiderman]').click();
    assert.equal((await inspect()).visible, false); assert.equal((await inspect()).action, 'idle');
    await page.locator('#signature').click();
    assert.equal((await inspect()).action, 'idle');
    await page.locator('[data-id=fengge]').click(); await ready();
    await page.locator('#signature').click(); await assertSynced('reflect');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal((await inspect()).action, 'idle');
    checks.push('character switch and pagehide cancel model action without leaking other voices');
    // Drag across the figure does not count as a click.
    const rect = await canvas.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + 210); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 40, rect.y + 210); await page.mouse.up();
    assert.equal((await inspect()).action, 'idle'); checks.push('drag does not trigger tap');
    await page.screenshot({ path: path.join(__dirname, 'fengge-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(__dirname, 'fengge-mobile.png'), fullPage: true });
    checks.push('desktop and mobile render without horizontal overflow');
    const failure = await context.newPage();
    await failure.route('**/models/fengge/v1/model.glb', route => route.abort());
    await failure.goto(url);
    await failure.waitForSelector('#model-stage[data-state=error]');
    assert.equal(await failure.locator('#tap').isDisabled(), true);
    await failure.unroute('**/models/fengge/v1/model.glb');
    await failure.locator('#retry-model').click();
    await failure.waitForFunction(() => window.__fenggeStage?.ready);
    assert.equal(await failure.locator('#tap').isEnabled(), true);
    await failure.close(); checks.push('model failure disables actions; retry restores actual model');
    assert.deepEqual(errors, []);
    const report = { passed: checks.length, checks, pageErrors: errors, sampledHeadQuaternions: {idle: idleHead, nod: nodHead, reflect: reflectHead},
      audioClockSyncVerified: true, mouthSyncSupported: false, humanListeningVerified: false,
      productionDeployed: false, modelSha256: '0b028be4f3e4f7437206fed1b46f0fa7abb1ac583a53c8111461e30000f85c30' };
    fs.writeFileSync(path.join(__dirname, 'fengge-validation.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
