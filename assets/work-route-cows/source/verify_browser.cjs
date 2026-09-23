const { chromium } = require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const ROOT=process.env.COW_RIG_OUTPUT || require('node:path').resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 for(const slug of ['xianniu','dark-niulai']){
  const page=await browser.newPage({viewport:{width:1100,height:950}});const errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+ROOT+'/'+slug+'/preview.html');await page.waitForSelector('body[data-ready="true"]');
  for(const name of ['look','bow','nod','tilt','reflect','wave']){
   await page.locator('[data-action="'+name+'"]').click();
   await page.waitForFunction(n=>window.assetPreview.active===n,name);
   await page.waitForTimeout(600);
   const moved=await page.evaluate(()=>{const h=window.assetPreview.head;return Math.abs(h.quaternion.x)+Math.abs(h.quaternion.y)+Math.abs(h.quaternion.z)});
   assert.ok(moved>.0001,name+' must move the actual head joint');
   await page.waitForFunction(n=>document.body.dataset.completed===n && window.assetPreview.active==='idle',name);
   checks.push(name+' animates and returns to idle');
  }
  await page.screenshot({path:ROOT+'/'+slug+'/preview-browser.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.screenshot({path:ROOT+'/'+slug+'/preview-mobile.png'});
  assert.deepEqual(errors,[]);checks.push('Desktop and 390px preview; no runtime errors');
  fs.writeFileSync(ROOT+'/'+slug+'/browser-verification.json',JSON.stringify({method:'Self-contained offline preview of final GLB; not a production deployment',checks,errors},null,2));console.log(slug,checks.length+' passed');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
