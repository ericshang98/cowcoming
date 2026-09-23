const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4211';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,...(process.env.QA_PROXY?{proxy:{server:process.env.QA_PROXY}}:{args:['--no-proxy-server']})});const results=[];
try{for(const width of (process.env.QA_WIDTHS||'1440,390').split(',').map(Number)){
 const page=await b.newPage({viewport:{width,height:width===1440?900:844},hasTouch:width<768});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:60000});await page.waitForTimeout(1000);
 assert.doesNotMatch(await page.locator('.home-page').innerText(),/面前有人|人往左|人离开|看见你了|感知/);
 const x=width/2,y=width===1440?430:265;
 if(width<768)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.waitForFunction(()=>window.__replica.getState().voice.status==='playing'&&window.__replica.getState().voice.track.id==='mama');
 assert.match(await page.locator('.interaction-line').innerText(),/妈/);
 await page.waitForFunction(()=>window.__replica.getState().voice.status==='ended');
 await page.mouse.click(10,400);await page.mouse.click(x,y,{button:'right'});await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.__replica.getState().voice.status),'ended','background/right clicks must not trigger voice');
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+12,{steps:6});await page.mouse.up();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.__replica.getState().voice.status),'ended','dragging must not trigger voice');
 // Return the rotated model to its original angle using the existing drag behavior.
 await page.mouse.move(x+45,y+12);await page.mouse.down();await page.mouse.move(x,y,{steps:6});await page.mouse.up();
 let previous;
 for(let i=0;i<3;i++){
  if(width===1440){await page.getByRole('button',{name:/叫声妈妈/}).focus();await page.keyboard.press('l');}
  else await page.getByRole('button',{name:/挥挥手/}).click();
  await page.waitForFunction(()=>window.__replica.getState().voice.status==='playing');
  const id=await page.evaluate(()=>window.__replica.getState().voice.track.id);assert.ok(['growing','tomorrow','same-different'].includes(id));assert.notEqual(id,previous);previous=id;
  await page.waitForFunction(()=>window.__replica.controller.rig.animation==='wave');
  await page.waitForFunction(()=>window.__replica.controller.voiceLevel>.05);
  if(i===0)await page.screenshot({path:`.pwc/evidence/interaction-${width}.png`});
  await page.waitForFunction(()=>window.__replica.getState().voice.status==='ended');
 }
 await page.getByRole('button',{name:'Mute sound',exact:true}).filter({visible:true}).first().click();
 await page.getByRole('button',{name:/叫声妈妈/}).click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.__replica.controller.voiceActive),false);
 assert.match(await page.locator('.interaction-line').innerText(),/声音已关闭/);
 assert.deepEqual(errors,[]);results.push({width,pass:true,checks:['model-tap-mama','background/right-click/drag-ignored','wave-with-long-voice','no-repeat','real-instructions','mute-honored']});console.log('PASS direct interactions',width);await page.close();
}fs.writeFileSync('.pwc/interaction-verification.json',JSON.stringify({base,results},null,2));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
