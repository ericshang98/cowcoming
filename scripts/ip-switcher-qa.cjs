const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('output/ip-switcher-qa'); fs.mkdirSync(out, { recursive: true });
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:42910/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(), errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(() => window.__replica.getState());
  const open = () => page.locator('.navigation button[aria-controls=ip-switcher]').click();
  const waitIp = id => page.waitForFunction(id => window.__replica?.getState().activeIp === id && window.__replica.controller.rig?.characterId === id, id);
  const idle = () => page.waitForFunction(() => window.__replica.controller.rig.animation === 'idle');
  async function gesture(clip, src) {
    await page.waitForFunction(({clip,src}) => { const c = window.__replica.controller; return c.rig.animation === clip && c.rig.animationTime > .03 && c.ipPlayback?.audio.currentTime > .03 && c.ipPlayback.audio.currentSrc.endsWith(src); }, {clip,src}, {timeout:2500});
    const s = await page.evaluate(() => {const c = window.__replica.controller; return {audio: c.ipPlayback.audio.currentTime, clip: c.rig.animationTime, playing: !c.ipPlayback.audio.paused, mouth: c.rig.mouth.length};});
    assert.ok(s.playing); assert.equal(s.mouth, 0);
  }
  try {
    await page.goto(base);
    await page.waitForFunction(() => window.__replica?.getState().bootDone, null, {timeout: 45000});
    assert.equal(await page.locator('[aria-label="Open living CV"],[aria-label="打开简历"]').count(), 0);
    assert.equal(await page.locator('.navigation > button').nth(1).getAttribute('aria-controls'), 'ip-switcher');
    await open(); assert.equal(await page.locator('dialog[open] [data-ip]').count(), 5);
    const picker = await page.locator('#ip-switcher').boundingBox();
    const trigger = await page.locator('.navigation button[aria-controls=ip-switcher]').boundingBox();
    assert.ok(picker.width <= 310 && picker.height < 110);
    assert.ok(picker.y > trigger.y + trigger.height && picker.y < trigger.y + trigger.height + 20);
    await page.waitForFunction(() => [...document.querySelectorAll('.ip-avatar img')].every(i => i.complete && i.naturalWidth > 0));
    assert.equal(await page.locator('.ip-avatar img').count(), 5);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.ip), 'fengge');
    await page.screenshot({path: path.join(out,'desktop-picker.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-controls')), 'ip-switcher');
    checks.push('second header icon replaces CV with five-IP dialog; Escape restores focus');

    // Hold the actual GLB response: the old model must stay visible and selected.
    let release;
    await page.route('**/characters/fengge/v1/model.glb', async route => { await new Promise(r => { release=r; }); await route.continue(); });
    await open(); await page.locator('[data-ip=fengge]').click();
    await page.waitForFunction(() => window.__replica.getState().pendingIp === 'fengge');
    assert.equal((await state()).activeIp, 'niulai');
    assert.equal(await page.evaluate(() => window.__replica.controller.rig.characterId), 'niulai');
    while (!release) await page.waitForTimeout(20);
    release(); await waitIp('fengge'); await page.unroute('**/characters/fengge/v1/model.glb');
    checks.push('loading keeps Niulai visible; complete model/audio load commits Fengge');

    for (const [id, tap, signature] of [['fengge','nod','reflect'],['nailong','tilt','wave'],['toothless','tilt','wing_flap'],['spiderman','wave','bow']]) {
      if ((await state()).activeIp !== id) {await open(); await page.locator(`[data-ip=${id}]`).click(); await waitIp(id);}
      await page.waitForFunction(scale => Math.abs(window.__replica.controller.rig.scale-scale) < .01, id === 'fengge' ? 1.6 : 1.25);
      await page.mouse.move(10,500); await page.waitForTimeout(300);
      // Click real rendered mesh; sculptural holes can make the exact center miss.
      let hit = false;
      for (const [x,y] of [[720,550],[700,620],[730,470],[650,600],[780,550]]) {
        await page.mouse.click(x,y);
        try { await gesture(tap,`/characters/${id}/v1/tap.mp3`); hit=true;break; } catch { /* Try another visible mesh point. */ }
      }
      assert.ok(hit,`${id} actual model click`);
      await page.keyboard.press('l'); await gesture(signature,`/characters/${id}/v1/signature.mp3`);
      await page.keyboard.press('Escape'); await idle();
      await page.screenshot({path:path.join(out,`${id}-desktop.png`)});
      checks.push(`${id}: actual GLB, mesh click + tap voice, L + signature voice, interruption and Escape`);
    }
    await page.keyboard.press('l'); await gesture('bow','/characters/spiderman/v1/signature.mp3');
    await open(); assert.equal((await state()).ipVoice.status, 'idle');
    await page.locator('[data-ip=nailong]').click(); await waitIp('nailong');
    await page.reload(); await waitIp('niulai');
    await page.waitForFunction(() => window.__replica.getState().bootDone);
    checks.push('opening switcher stops prior voice; reload starts as Niulai');
    await open(); await page.locator('[data-ip=nailong]').click(); await waitIp('nailong');

    await page.locator('.scene-controls button').nth(1).click();
    await page.keyboard.press('l'); await gesture('wave','/characters/nailong/v1/signature.mp3');
    assert.equal(await page.evaluate(() => window.__replica.controller.ipPlayback.audio.muted), true);
    await page.locator('.scene-controls button').nth(2).click();
    await page.waitForFunction(() => window.__replica.getState().ipVoice.status === 'idle');
    assert.equal((await state()).ipVoice.status, 'idle');
    await page.locator('.scene-controls button').nth(2).click();
    await page.locator('.scene-controls button').nth(1).click();
    checks.push('muted interactions still animate; pause stops audio');

    const evolution = await page.evaluate(() => window.__replica.controller.evolution.context());
    await open(); await page.locator('[data-ip=niulai]').click(); await waitIp('niulai');
    assert.deepEqual(await page.evaluate(() => window.__replica.controller.evolution.context()), evolution);
    await page.locator('.navigation button').filter({hasText:/进化|WORK/}).click();
    await page.waitForSelector('.binding-page');
    assert.equal(await page.locator('.evolution-node').count(), 0);
    assert.equal(await page.evaluate(() => window.__replica.controller.rig.characterId), 'niulai');
    assert.ok(await page.locator('.navigation button[aria-controls=ip-switcher]').isDisabled());
    await page.locator('.navigation button').filter({hasText:/首页|HOME/}).click();
    await open(); await page.locator('[data-ip=toothless]').click(); await waitIp('toothless');
    assert.equal((await state()).mode, 'home');
    assert.deepEqual(await page.evaluate(() => window.__replica.controller.evolution.context()), evolution);
    checks.push('switching preserves evolution session; Work disables the selector; returning Home enables it');

    await page.locator('.navigation .language-toggle').click(); await open();
    assert.equal(await page.locator('#ip-switcher').getAttribute('aria-label'),'Switch IP');
    await page.screenshot({path:path.join(out,'english-picker.png')});
    await page.mouse.click(200,150); assert.equal(await page.locator('dialog[open]').count(),0);
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-actions button[aria-controls=ip-switcher]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:path.join(out,'mobile-picker.png')});
    await page.locator('[data-ip=nailong]').click(); await waitIp('nailong');
    await page.screenshot({path:path.join(out,'mobile-nailong.png')});
    checks.push('English, outside dismissal, mobile IP switch and layout');

    // Test a fresh browser cache with a real failed model request, then retry.
    const fail = await browser.newPage({viewport:{width:1440,height:1000}});
    await fail.route('**/characters/fengge/v1/model.glb', route=>route.abort());
    await fail.goto(base); await fail.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:45000});
    await fail.locator('.navigation button[aria-controls=ip-switcher]').click();
    await fail.locator('[data-ip=fengge]').click();
    await fail.waitForSelector('.ip-load-error');
    assert.equal(await fail.evaluate(()=>window.__replica.getState().activeIp),'niulai');
    await fail.unroute('**/characters/fengge/v1/model.glb');
    await fail.locator('.ip-load-error button').click();
    await fail.waitForFunction(()=>window.__replica.controller.rig.characterId==='fengge');
    await fail.close();checks.push('failed GLB preserves previous IP; retry loads and switches');
    assert.deepEqual(errors,[]);
    const report={passed:checks.length,checks,pageErrors:errors,baseUrl:base};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
