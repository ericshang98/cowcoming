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
    await page.locator('.navigation > button').nth({home:3,work:4,blog:5,about:6,contact:7}[mode]).click();
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
    await page.goto(base); await page.waitForFunction(() => window.__replica?.getState().bootDone, null, {timeout:45000});
    const evolution = await page.evaluate(() => window.__replica.controller.evolution.context());
    await select('fengge'); await nav('about'); await waitIp('fengge'); await brand();
    for (const id of ['fengge','spiderman','nailong','toothless','niulai']) {
      await select(id);
      await page.waitForFunction(() => !document.querySelector('.cowcoming-model-controls button').disabled);
      assert.equal(await page.locator('.character-stage canvas').count(), 1);
      if (id !== 'niulai') await perform(id);
    }
    checks.push('About shares the Home choice, loads all five real models, plays four signature actions and switches without navigating');
    await select('fengge'); await page.screenshot({path:`${out}/about-desktop.png`});
    await nav('contact'); await waitIp('fengge'); await perform('fengge');
    await select('nailong'); await nav('home'); await waitIp('nailong'); await brand();
    assert.deepEqual(await page.evaluate(() => window.__replica.controller.evolution.context()), evolution);
    await nav('contact'); await page.reload(); await waitIp('nailong');
    await page.waitForFunction(() => window.__replica.getState().bootDone);
    await brand(); await page.waitForTimeout(500); await page.screenshot({path:`${out}/support-desktop.png`});
    checks.push('Support shares selection both ways with Home and restores its actual selected model on direct reload');
    await nav('about'); await page.reload(); await waitIp('nailong');
    await page.waitForFunction(() => !document.querySelector('.cowcoming-model-controls button').disabled);
    await perform('nailong'); await nav('contact');
    assert.equal((await state()).ipVoice.status, 'idle');
    const restoredEvolution = await page.evaluate(() => window.__replica.controller.evolution.context());
    await nav('work'); await page.waitForSelector('.binding-page');
    assert.ok(await page.locator('.navigation button[aria-controls=ip-switcher]').isDisabled());
    await nav('home'); await waitIp('nailong');
    assert.deepEqual(await page.evaluate(() => window.__replica.controller.evolution.context()), restoredEvolution);
    checks.push('About restores selection on reload; navigation stops voice; WORK binding and evolution stay isolated');
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-actions .language-toggle').click();
    for (const mode of ['about','contact','home']) {
      await nav(mode); await select(mode === 'contact' ? 'toothless' : 'fengge');
      if (mode === 'contact') {
        await page.reload(); await waitIp('toothless');
        await page.waitForFunction(() => window.__replica.getState().bootDone);
        await perform('toothless');
      }
      if (mode === 'about') await page.waitForFunction(() => !document.querySelector('.cowcoming-model-controls button').disabled);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.waitForTimeout(500);
      await page.screenshot({path:`${out}/${mode}-mobile.png`});
    }
    checks.push('English mobile Home/About/Support keep Cowcoming branding, switch IP in place and avoid horizontal overflow');
    assert.deepEqual(errors, []);
    const report={base,checks,pageErrors:errors};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e);process.exitCode=1; });
