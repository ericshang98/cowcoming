const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
const ROOT=process.env.COW_RIG_OUTPUT || require('node:path').resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,proxy:{server:'http://127.0.0.1:7890'}});
 for(const slug of ['xianniu','dark-niulai']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],replaced=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/models/niulai*.glb',async route=>{replaced.push(route.request().url());await route.fulfill({path:ROOT+'/'+slug+'/'+slug+'-web.glb',contentType:'model/gltf-binary'});});
  try{
   await page.goto('https://cowcoming.world/?section=work',{timeout:60000});
   await page.waitForFunction(()=>window.__replica?.controller.rig?.animation==='idle',null,{timeout:60000});
   await page.waitForFunction(()=>window.__replica.getState().bootDone);
   await page.waitForTimeout(1600);
   assert.equal(await page.evaluate(()=>window.__replica.getState().mode),'work');assert.ok(replaced.length);
   const rig=await page.evaluate(()=>window.__replica.controller.rig);assert.ok(rig.animations.includes('bow')&&rig.animations.includes('wave'));checks.push('Production WORK renderer loads the substituted final GLB');
   await page.screenshot({path:ROOT+'/'+slug+'/work-renderer.png'});
   for(const clip of ['bow','wave']){
    await page.evaluate(n=>window.__replica.controller.gesture(n),clip);
    await page.waitForFunction(n=>window.__replica.controller.rig.animation===n,clip);
    await page.waitForTimeout(600);await page.screenshot({path:ROOT+'/'+slug+'/work-'+clip+'.png'});
    await page.waitForFunction(()=>window.__replica.controller.rig.animation==='idle');checks.push(clip+' plays and returns to idle');
   }
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:ROOT+'/'+slug+'/work-mobile.png'});
   assert.deepEqual(errors,[]);checks.push('No runtime errors in desktop and mobile WORK rendering');
  }catch(e){errors.push(e.stack);process.exitCode=1;await page.screenshot({path:ROOT+'/'+slug+'/work-failure.png'}).catch(()=>{});}
  const scripts=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.src));
  fs.writeFileSync(ROOT+'/'+slug+'/work-renderer-verification.json',JSON.stringify({at:new Date().toISOString(),method:'Read-only production page in an isolated browser with model response override; no asset uploaded, no node configuration changed, not a deployment',scripts,replaced,checks,errors},null,2));console.log(slug,checks,errors);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
