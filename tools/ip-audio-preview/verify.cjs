const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) { const a = new NativeAudio(...args); window.__auditionAudio = a; return a; };
    window.Audio.prototype = NativeAudio.prototype;
  });
  try {
    await page.goto(process.env.AUDIO_PREVIEW_URL || 'http://127.0.0.1:42849/');
    await page.waitForSelector('.character');
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
    for (const c of manifest.characters) {
      await page.locator(`[data-id="${c.id}"]`).click();
      for (const track of c.tracks) {
        await page.locator(track.input === 'tap' ? '#tap' : '#signature').click();
        await page.waitForFunction(id => window.__auditionAudio?.currentSrc.endsWith(`/audio/${id}.mp3`) && !window.__auditionAudio.paused && window.__auditionAudio.currentTime > .07, track.id);
        const duration = await page.evaluate(() => window.__auditionAudio.duration);
        assert.ok(Math.abs(duration - track.duration) < .1, `${track.id} duration`);
        await page.locator('#stop').click();
        assert.equal(await page.evaluate(() => window.__auditionAudio.paused), true);
        checks.push(`${track.id}: actual MP3 playback and stop`);
      }
    }
    await page.locator('[data-id="spiderman"]').click();
    await page.keyboard.press('l');
    await page.waitForFunction(() => !window.__auditionAudio.paused && window.__auditionAudio.currentSrc.endsWith('spiderman-signature.mp3'));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__auditionAudio.paused), true);
    checks.push('L plays signature; Escape stops');
    await page.locator('#tap').click();
    await page.locator('#signature').click();
    await page.locator('#tap').click();
    await page.waitForFunction(() => !window.__auditionAudio.paused && window.__auditionAudio.currentSrc.endsWith('spiderman-tap.mp3'));
    checks.push('rapid actions replace the previous source');
    await page.locator('[data-id="nailong"]').click();
    assert.equal(await page.evaluate(() => window.__auditionAudio.paused), true);
    checks.push('character switch stops previous sound');
    await page.locator('#tap').click();
    await page.locator('#mute').click();
    assert.deepEqual(await page.evaluate(() => [window.__auditionAudio.muted, window.__auditionAudio.paused]), [true, true]);
    await page.locator('#mute').click();
    await page.locator('#tap').click();
    await page.waitForFunction(() => window.__auditionAudio.currentTime > .07);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(() => window.__auditionAudio.paused), true);
    checks.push('mute and pagehide stop playback');
    await page.locator('[data-id="fengge"]').click();
    await page.locator('#tap').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('播放完成'));
    checks.push('completed clip returns to an ended state');
    await page.locator('[data-id="spiderman"]').click();
    await page.locator('#signature').click();
    await page.waitForFunction(() => window.__auditionAudio.currentTime > .8);
    await page.screenshot({ path: path.join(__dirname, 'preview-desktop.png'), fullPage: true });
    await page.locator('#stop').click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(__dirname, 'preview-mobile.png'), fullPage: true });
    checks.push('desktop and mobile render without horizontal overflow');
    // A new page has no decoded-audio cache; routing disables the HTTP cache.
    const failure = await context.newPage();
    await failure.route('**/audio/spiderman-tap.mp3', route => route.abort());
    await failure.goto(process.env.AUDIO_PREVIEW_URL || 'http://127.0.0.1:42849/');
    await failure.locator('#tap').click();
    await failure.waitForFunction(() => /无法播放|未能载入/.test(document.querySelector('#status').textContent));
    await failure.unroute('**/audio/spiderman-tap.mp3');
    await failure.locator('#tap').click();
    await failure.waitForFunction(() => document.querySelector('#status').textContent.startsWith('正在播放'));
    await failure.close();
    checks.push('failed sound displays error and can be retried');
    assert.deepEqual(errors, []);
    const result = { passed: checks.length, checks, pageErrors: errors, humanListeningVerified: false, modelSyncVerified: false };
    fs.writeFileSync(path.join(__dirname, 'browser-validation.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
