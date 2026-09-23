import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4327';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/?section=work');await page.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:60000});
 for(const [form,label,route] of [['calf','小牛',null],['normal','普通牛来',null],['celestial','仙牛',null],['tough','硬牛','dark'],['dark','暗黑牛','dark']]){
  if(route)await page.locator('.evolution-routes button').nth(1).click();
  await page.locator('.evolution-node').filter({hasText:label}).first().click();
  await page.waitForFunction(id=>window.__replica?.controller.responseForm===id,form,{timeout:30000});
  await page.locator('.motion-preview').evaluate(e=>e.open=true);
  for(const actionId of ['NOD','SHAKE','NOD_DOUBLE','TILT_LEFT','TILT_RIGHT']){
   await page.locator(`[data-motion="${actionId}"]`).click();
   await page.waitForFunction(()=>window.__replica.controller.responsePlayer.busy);
   const clip=await page.evaluate(()=>window.__replica.controller.responsePlayer.clip);
   await page.waitForFunction(()=>!window.__replica.controller.responsePlayer.busy,null,{timeout:12000});
   assert.match(await page.locator('.motion-preview small').textContent(),/完成|complete/);
   results.push({form,actionId,clip,status:'completed'});
  }
  await page.screenshot({path:`tmp/motion-integration/${form}-website.png`});
 }
 await page.locator('[data-motion="NOD"]').click();await page.locator('.motion-preview > button').click();
 assert.equal(await page.evaluate(()=>window.__replica.controller.responsePlayer.busy),false);
 await page.locator('.evolution-routes button').first().click();await page.locator('.evolution-node').filter({hasText:'骚牛'}).click();
 await page.waitForTimeout(1200);assert.equal(await page.locator('[data-motion="NOD"]').isDisabled(),true);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/motion-integration/mobile-website.png',fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync('tmp/motion-integration/browser-verification.json',JSON.stringify({results,errors,stop:true,missingAssetDisabled:true},null,2));console.log('PASS 25 actual browser clips, stop, missing asset, no page errors');
}finally{await browser.close();}
