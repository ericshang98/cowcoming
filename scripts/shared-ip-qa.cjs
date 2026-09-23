const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:42910/';
const out = 'output/shared-ip-qa'; fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(() => window.__replica.getState());
  const waitIp = id => page.waitForFunction(id => window.__replica?.getState().activeIp === id && window.__replica.controller.rig?.characterId === id, id);
  const brand = async () => {
    assert.equal((await page.locator('.identity > button').innerText()).trim(), 'Cowcoming');
    assert.ok((await page.title()).startsWith('Cowcoming — '));
  };
  const nav = async mode => {
    await page.locator('.navigation > button').nth({home:3,work:4,blog:5,contact:6}[mode]).click();
    await page.waitForFunction(mode => window.__replica.getState().mode === mode, mode);
  };
  const select = async id => {
    const mode = (await state()).mode;
    await page.locator('button[aria-controls=ip-switcher]').filter({visible:true}).click();
    await page.locator(`[data-ip=${id}]`).click(); await waitIp(id);
    assert.equal((await state()).mode, mode); await brand();
  };
  const perform = async id => {
    await page.keyboard.press('l');
    await page.waitForFunction(id => {
      const c = window.__replica.controller;
      return c.ipPlayback?.audio.currentSrc.includes(`/characters/${id}/`) && c.ipPlayback.audio.currentTime > .04 && c.rig.animation !== 'idle';
    }, id);
    await page.keyboard.press('Escape');
  };
  try {
    await page.goto(`${base}?section=about`);
    await page.waitForFunction(() => window.__replica?.getState().bootDone, null, {timeout:45000});
    assert.equal((await state()).mode, 'home');
    assert.equal(new URL(page.url()).searchParams.has('section'), false);
    assert.equal(await page.locator('.navigation .mobile-nav-icon').count(), 4);
    assert.equal(await page.locator('.about-page').count(), 0);
    await page.locator('.home-product-link').click();
    await page.waitForFunction(() => window.__replica.getState().chat === 'open');
    assert.equal((await state()).mode, 'home'); await page.keyboard.press('Escape');
    checks.push('About is removed from navigation and routing; legacy URL resolves to Home; Explore JEV opens the existing guide');
    const evolution = await page.evaluate(() => window.__replica.controller.evolution.context());
    await select('fengge'); await nav('contact'); await waitIp('fengge');
    for (const id of ['fengge','spiderman','nailong','toothless','niulai']) {
      await select(id); assert.equal(await page.locator('.character-stage canvas').count(), 1);
      if (id !== 'niulai') await perform(id);
    }
    await select('fengge'); await page.waitForTimeout(600);
    await page.screenshot({path:`${out}/support-desktop.png`});
    await nav('home'); await waitIp('fengge');
    assert.deepEqual(await page.evaluate(() => window.__replica.controller.evolution.context()), evolution);
    await nav('contact'); await page.reload(); await waitIp('niulai');
    checks.push('Home and Support share all five models without navigation on selection; reload resets to Niulai');
    await select('nailong'); await perform('nailong'); await nav('home');
    assert.equal((await state()).ipVoice.status, 'idle');
    await nav('work'); await page.waitForSelector('.binding-page');
    assert.ok(await page.locator('.navigation button[aria-controls=ip-switcher]').isDisabled());
    await nav('home'); await waitIp('nailong');
    checks.push('Navigation stops voice; WORK remains gated and separate from the selected IP');
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-actions .language-toggle').click();
    for (const mode of ['contact','home']) {
      await nav(mode); await select(mode === 'contact' ? 'toothless' : 'fengge');
      if (mode === 'contact') {
        await page.reload(); await waitIp('niulai'); await select('toothless'); await perform('toothless');
      }
      assert.equal(await page.locator('.navigation .mobile-nav-icon').count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.waitForTimeout(600); await page.screenshot({path:`${out}/${mode}-mobile.png`});
    }
    checks.push('English mobile navigation has four pages; Support retains its visible interactive model and shared IP selector');
    assert.deepEqual(errors, []);
    const report={base,checks,pageErrors:errors};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e);process.exitCode=1; });
