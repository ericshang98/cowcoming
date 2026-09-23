const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,...(process.env.QA_PROXY ? {proxy:{server:process.env.QA_PROXY}} : {})});
  const results = [];
  try {
    for (const scenario of ['slow-model', 'unavailable-about-model', 'normal-load', 'skip']) {
      const page = await browser.newPage({viewport:{width:667,height:649}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (scenario === 'slow-model') await page.route('**/models/niulai-mouth.glb', async route => {
        await new Promise(resolve => setTimeout(resolve, 6000));
        await route.continue();
      });
      if (scenario === 'unavailable-about-model') await page.route('**/models/fuch-human-spin.glb', route => route.abort());
      try {
        await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:4178/', {waitUntil:'domcontentloaded'});
        await page.waitForFunction(() => window.__replica?.controller.rig?.animation === 'walking', null, {timeout:20000});
        await page.waitForTimeout(450);
        const initial = await page.evaluate(() => ({boot:window.__replica.getState().bootDone,rig:window.__replica.controller.rig,opacity:getComputedStyle(document.querySelector('.character-stage')).opacity,mask:getComputedStyle(document.querySelector('.character-stage')).maskImage}));
        await page.screenshot({path:`.pwc/evidence/boot-${scenario}-start.png`});
        if (scenario === 'skip') {
          await page.keyboard.press('Space');
          await page.waitForFunction(() => window.__replica.getState().bootDone, null, {timeout:3500});
        } else {
          await page.waitForTimeout(1700);
          const middle = await page.evaluate(() => ({boot:window.__replica.getState().bootDone,rig:window.__replica.controller.rig}));
          await page.screenshot({path:`.pwc/evidence/boot-${scenario}-middle.png`});
          assert.equal(initial.boot, false, 'intro must remain visible when the model first appears');
          assert.equal(initial.mask, 'none', 'walk-in must show the legs rather than using the homepage fade mask');
          assert.ok(Number(initial.opacity) > 0, 'character must be visible during loading');
          assert.equal(middle.boot, false, 'slow download must not consume the walk-in time');
          assert.equal(middle.rig.animation, 'walking', 'walk cycle must continue throughout approach');
          assert.ok(middle.rig.scale > initial.rig.scale + 0.08, 'character approaches while walking');
          await page.waitForFunction(() => window.__replica.getState().bootDone, null, {timeout:12000});
        }
        await page.waitForFunction(() => window.__replica.controller.rig.animation === 'idle', null, {timeout:10000});
        assert.deepEqual(errors, []);
        console.log('PASS', scenario);
        results.push({scenario,pass:true});
      } catch (error) {
        console.log('FAIL', scenario, error.message);
        results.push({scenario,pass:false,error:error.message});
      } finally {await page.close();}
    }
    fs.writeFileSync('.pwc/boot-verification.json',JSON.stringify({baseURL:process.env.QA_BASE_URL || 'http://127.0.0.1:4178/',results},null,2));
    assert.ok(results.every(r=>r.pass), 'boot regressions failed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
