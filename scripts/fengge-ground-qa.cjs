const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:42910/';
const out='output/fengge-ground';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try {
 await p.addInitScript(()=>localStorage.setItem('cowcoming-ip','fengge'));
 await p.goto(base);await p.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:45000});
 assert.equal(await p.evaluate(()=>window.__replica.getState().activeIp),'niulai');
 assert.equal(await p.evaluate(()=>localStorage.getItem('cowcoming-ip')),null);
 await p.locator('button[aria-controls=ip-switcher]').filter({visible:true}).click();await p.locator('[data-ip=fengge]').click();
 await p.waitForFunction(()=>window.__replica.controller.rig.characterId==='fengge');
 for(const [width,height] of [[1440,1000],[1280,720],[390,844],[320,740]]) {
  await p.setViewportSize({width,height});
  for(const [mode,index] of [['home',3],['contact',6]]) {
   await p.locator('.navigation > button').nth(index).click();
   await p.waitForFunction(()=>window.__replica.controller.rig?.characterId==='fengge');await p.waitForTimeout(850);
   await p.evaluate(()=>window.__replica.controller.tracking=false);await p.mouse.move(0,0);await p.waitForTimeout(500);
   const r=await p.evaluate(()=>{const c=window.__replica.controller,stage=document.querySelector('.character-stage').getBoundingClientRect(),shadow=document.querySelector('.ground-shadow').getBoundingClientRect();return {scale:c.rig.scale,head:c.rig.head,position:c.rig.position,stage:stage.toJSON(),shadow:shadow.toJSON()};});
   assert.ok(r.stage.height>200);assert.ok(r.shadow.y>=r.stage.y && r.shadow.bottom<r.stage.bottom,`ground inside ${mode}/${width}`);
   assert.equal(await p.locator('.character-stage canvas').count(),1);
   await p.screenshot({path:`${out}/${mode}-${width}-idle.png`});
   await p.keyboard.press('l');await p.waitForFunction(()=>window.__replica.controller.ipPlayback?.audio.currentTime>.05 && window.__replica.controller.rig.animationTime>.01);
   await p.evaluate(()=>{const a=window.__replica.controller.ipPlayback;a.audio.pause();a.audio.currentTime=a.duration*.48;});await p.waitForTimeout(300);
   const action=await p.evaluate(()=>window.__replica.controller.rig);
   assert.equal(action.animation,'reflect'); assert.ok(action.animationTime>.3);
   await p.screenshot({path:`${out}/${mode}-${width}-action.png`});await p.keyboard.press('Escape');
   results.push({mode,width,...r});
  }
 }
 await p.reload();await p.waitForFunction(()=>window.__replica.controller.rig?.characterId==='niulai');assert.equal(await p.evaluate(()=>window.__replica.getState().activeIp),'niulai');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,results,errors},null,2));console.log(`PASS ${results.length} framing/action views; old cache ignored; reload resets to Niulai; zero page errors`);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
