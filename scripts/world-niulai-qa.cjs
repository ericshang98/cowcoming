const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true,...(process.env.QA_PROXY ? {proxy:{server:process.env.QA_PROXY}} : {})});
 const page = await browser.newPage({viewport:{width:1280,height:850}});
 const requests=[],errors=[],checks=[];
 page.on('request',r=>requests.push(r.url()));
 page.on('pageerror',e=>errors.push(e.message));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 try {
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4178/')+'?section=blog');
  await page.getByRole('button',{name:/ENTER IDEA52/}).click();
  await page.getByLabel('World quality').selectOption('LOW');
  // Wait for the actual model and environment transfer before sending input;
  // a fixed delay starts movement before Explorer mounts on a cold CDN visit.
  await page.waitForFunction(() => ['niulai-mouth.glb','studio_fuch.hdr'].every(name =>
    performance.getEntriesByType('resource').some(r => r.name.endsWith(name) && r.responseEnd > 0)
  ));
  await page.waitForTimeout(1000);
  assert.ok(!requests.some(u=>u.includes('mascot-anim.glb')), 'IDEA52 must not load the old robot');
  assert.ok(requests.some(u=>u.includes('niulai-mouth.glb')), 'IDEA52 loads the supplied Niulai');
  check('exploration uses Niulai instead of the original robot');
  await page.screenshot({path:'.pwc/evidence/world-niulai-idle.png'});
  const meters=async()=>parseInt(await page.locator('.world-progress footer').innerText(),10);
  const initial=await meters();
  await page.keyboard.down('w');
  await page.waitForTimeout(2300);
  await page.screenshot({path:'.pwc/evidence/world-niulai-walking.png'});
  await page.keyboard.up('w');
  assert.ok(await meters()>initial,'walking must advance the player');
  check('walking moves through the grass');
  await page.keyboard.down('d');
  await page.keyboard.down('Shift');
  await page.waitForTimeout(2300);
  await page.screenshot({path:'.pwc/evidence/world-niulai-running.png'});
  await page.keyboard.up('d');
  await page.keyboard.up('Shift');
  check('turning and accelerated movement render');
  await page.getByRole('button',{name:'Open world map'}).click();
  await page.locator('.world-map-grid button').nth(1).click();
  await page.locator('.near-idea').waitFor();
  await page.keyboard.press('Space');
  await page.locator('.idea-detail').waitFor();
  await page.getByRole('button',{name:'Close idea',exact:true}).click();
  check('fast travel and idea details still work');
  await page.setViewportSize({width:390,height:844});
  const before=await meters();
  const up=page.locator('.world-touch button').filter({hasText:'↑'});
  const button=await up.boundingBox();
  await page.mouse.move(button.x+button.width/2,button.y+button.height/2);
  await page.mouse.down();
  await page.waitForTimeout(1600);
  await page.mouse.up();
  assert.ok(await meters()>before,'touch movement must advance the player');
  await page.screenshot({path:'.pwc/evidence/world-niulai-mobile.png'});
  check('mobile movement works');
  assert.deepEqual(errors,[]);
  check('no browser runtime errors');
 } finally {
  fs.writeFileSync('.pwc/world-niulai-verification.json',JSON.stringify({baseURL:process.env.QA_BASE_URL||'http://127.0.0.1:4178/',checks,errors},null,2));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
