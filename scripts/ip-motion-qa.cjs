const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const out=path.resolve('output/ip-motion-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const films=[];const results=[];
try{
 await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:42910/');await page.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:45000});
 await page.locator('.navigation button[aria-controls=ip-switcher]').click();await page.screenshot({path:path.join(out,'compact-picker.png')});await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__replica.controller.tracking=false);
 for(const [id,tap,signature] of [['fengge','nod','reflect'],['nailong','tilt','wave'],['toothless','tilt','wing_flap'],['spiderman','wave','bow']]){
  await page.locator('.navigation button[aria-controls=ip-switcher]').click();await page.locator(`[data-ip=${id}]`).click();await page.waitForFunction(id=>window.__replica.controller.rig?.characterId===id,id);await page.waitForTimeout(700);await page.mouse.move(10,500);
  for(const action of ['tap','signature']){
   await page.keyboard.press('Escape');await page.waitForTimeout(500);
   const before=await page.evaluate(()=>window.__replica.controller.rig.joints);
   if(action==='signature')await page.keyboard.press('l');
   else {for(const [x,y] of [[720,550],[700,620],[730,470],[650,600],[780,550]]){await page.mouse.click(x,y);if(await page.evaluate(()=>!!window.__replica.controller.ipPlayback))break;await page.waitForTimeout(150);}}
   await page.waitForFunction(()=>!!window.__replica.controller.ipPlayback,null,{timeout:5000});
   await page.evaluate(()=>window.__replica.controller.ipPlayback.audio.pause());
   const shots=[];let maxDelta=0;const jointDeltas={};
   for(const progress of [0,.32,.6,.84,1]){
    await page.evaluate(p=>{const c=window.__replica.controller;c.ipPlayback.audio.currentTime=c.ipPlayback.duration*Math.min(.999,p);},progress);await page.waitForTimeout(250);
    const current=await page.evaluate(()=>window.__replica.controller.rig.joints);
    for(const key of Object.keys(before)){const d=Math.hypot(current[key][0]-before[key][0],current[key][1]-before[key][1]);maxDelta=Math.max(maxDelta,d);jointDeltas[key]=Math.max(jointDeltas[key]||0,d);}
    const png=await page.screenshot({clip:{x:320,y:100,width:850,height:800},path:path.join(out,`${id}-${action}-${progress}.png`)});shots.push(png.toString('base64'));
   }
   assert.ok(maxDelta>12,`${id}/${action} must visibly move joints: ${maxDelta}`);
   results.push({id,action,maxPixelTravel:maxDelta,jointDeltas});films.push({id,action,shots});
   await page.keyboard.press('Escape');await page.waitForTimeout(400);
  }
 }
 assert.deepEqual(errors,[]);
 await page.setContent(`<style>body{background:#e8efef;color:#234;font:18px sans-serif;margin:20px}h2{margin:14px 0 6px}section{display:flex;gap:6px}img{width:240px}small{font-size:11px}</style>`+films.map(f=>`<h2>${f.id} · ${f.action} <small>start → 32% → 60% → 84% → settle</small></h2><section>${f.shots.map(s=>`<img src="data:image/png;base64,${s}">`).join('')}</section>`).join(''));
 await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:path.join(out,'all-actions.png'),fullPage:true});
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
