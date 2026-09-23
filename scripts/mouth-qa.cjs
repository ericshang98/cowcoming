const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,...(process.env.QA_PROXY?{proxy:{server:process.env.QA_PROXY}}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const weights=()=>page.evaluate(()=>window.__replica.controller.rig.mouth[0].weights);
 const check=name=>{checks.push(name);console.log('PASS',name)};
 try {
  await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:4178/');
  await page.waitForFunction(()=>window.__replica?.getState().bootDone && window.__replica.controller.rig?.animation==='idle');
  assert.equal(await page.evaluate(()=>window.__replica.controller.rig.asset),'/models/niulai-mouth.glb');
  assert.deepEqual(await weights(),[0,0,0]);check('new mouth model starts closed');
  await page.locator('.mouth-preview summary').click();
  for(const [name,index,target] of [['张嘴',0,[1,0,0]],['咧嘴',1,[.55,1,0]],['圆嘴',2,[.8,0,1]],['闭嘴',-1,[0,0,0]]]) {
   await page.getByRole('button',{name,exact:true}).click();
   await page.waitForFunction(target=>window.__replica.controller.rig.mouth[0].weights.every((v,i)=>Math.abs(v-target[i])<.01),target);
   await page.screenshot({path:`.pwc/evidence/mouth-${index}.png`});
   check(`${name} applies its intended mouth pose`);
  }
  await page.getByRole('button',{name:'张嘴',exact:true}).click();
  await page.keyboard.press('l');
  await page.waitForFunction(()=>window.__replica.controller.rig.animation==='wave');
  await page.waitForTimeout(500);
  assert.ok((await weights())[0]>.9);check('mouth pose coexists with body animation');
  await page.locator('.mouth-preview summary').click();
  await page.waitForFunction(()=>window.__replica.controller.rig.mouth[0].weights.every(v=>v<.01));
  check('closing preview restores closed mouth');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.mouth-preview summary').click();
  await page.getByRole('button',{name:'圆嘴',exact:true}).click();
  await page.waitForTimeout(800);
  const box=await page.locator('.mouth-preview-panel').boundingBox();
  assert.ok(box.x>=0 && box.x+box.width<=390 && box.y>=0 && box.y+box.height<844);
  await page.screenshot({path:'.pwc/evidence/mouth-mobile.png'});check('mouth controls fit the narrow layout');
  await page.getByRole('navigation').getByRole('button',{name:'IDEA52',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__replica.controller.mouthPose),'closed');
  check('leaving home clears the preview pose');
  assert.deepEqual(errors,[]);
 }finally{
  fs.writeFileSync('.pwc/mouth-verification.json',JSON.stringify({baseURL:process.env.QA_BASE_URL||'http://127.0.0.1:4178/',checks,errors},null,2));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
