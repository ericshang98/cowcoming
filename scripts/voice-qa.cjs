const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4211';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,...(process.env.QA_PROXY?{proxy:{server:process.env.QA_PROXY}}:{args:['--no-proxy-server']})});
 const results=[];
 try {
  for(const width of (process.env.QA_WIDTHS||"1440,390").split(",").map(Number)){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:width===375?667:844}});
   const errors=[],voiceRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/audio/niulai/'))voiceRequests.push(r.url())});
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:60000});
   assert.equal(voiceRequests.length,0,'no audio download or autoplay before user chooses');
   await page.getByRole('button',{name:'听牛来说一句'}).click();
   const panel=page.getByRole('region',{name:'牛来的声音'});
   assert.equal(await panel.locator('.voice-list button').count(),7);
   await panel.getByRole('button',{name:'播放：长大是细微的积累，并不容易察觉',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='playing',null,{timeout:20000});
   await page.waitForFunction(()=>window.__replica.controller.voiceLevel>.05);
   await page.waitForFunction(()=>window.__replica.controller.rig?.mouth?.some(m=>m.weights?.some(w=>w>.02)));
   assert.match(await panel.locator('.voice-caption').innerText(),/长大是细微/);
   await page.waitForTimeout(500);
   await page.screenshot({path:`.pwc/evidence/voice-${width}.png`});
   await page.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='ended');
   assert.equal(await page.evaluate(()=>window.__replica.controller.voiceActive),false);
   await panel.getByRole('button',{name:'播放：是，是不一样，但其实也一样',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='playing');
   await panel.getByRole('button',{name:'声音已开启 · 静音',exact:true}).click();
   await page.waitForFunction(()=>!window.__replica.controller.voiceActive);
   assert.equal(await panel.getByRole('button',{name:'播放：好的呀',exact:true}).isDisabled(),true);
   await panel.getByRole('button',{name:'声音已关闭 · 开启声音',exact:true}).click();
   await panel.getByRole('button',{name:'播放：好的呀',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='playing');
   await page.getByRole('button',{name:'关闭牛来的声音'}).click();
   await page.waitForFunction(()=>!window.__replica.controller.voiceActive);
   assert.equal(await page.locator('#niulai-voice-panel').count(),0);
   await page.getByRole('button',{name:'听牛来说一句'}).click();
   await panel.getByRole('button',{name:'播放：长大是细微的积累，并不容易察觉',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='playing');
   await page.getByRole('button',{name:'ABOUT',exact:true}).click();
   await page.waitForFunction(()=>!window.__replica.controller.voiceActive);
   assert.equal(await page.locator('#niulai-voice-panel').count(),0);
   assert.deepEqual(errors,[]);
   results.push({width,pass:true,checks:['no-autoplay','seven-clips','playback','amplitude-mouth','subtitle','ended','mute','close','navigation']});
   console.log('PASS voice flow',width);
   await page.close();
  }
  const p=await browser.newPage();await p.goto(base);await p.waitForFunction(()=>window.__replica?.getState().bootDone,null,{timeout:60000});await p.getByRole('button',{name:'听牛来说一句'}).click();
  await p.route('**/audio/niulai/not-true.mp3',r=>r.fulfill({status:503,body:'unavailable'}));
  await p.getByRole('button',{name:'播放：才不是呢',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='error');assert.equal(await p.evaluate(()=>window.__replica.controller.voiceActive),false);
  await p.unroute('**/audio/niulai/not-true.mp3');await p.getByRole('button',{name:'播放：才不是呢',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.voice-caption')?.dataset.status==='playing');
  results.push({scenario:'failed-download-and-retry',pass:true});console.log('PASS failed download and retry');await p.close();
  fs.writeFileSync('.pwc/voice-verification.json',JSON.stringify({base,results},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
