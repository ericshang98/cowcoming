const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4187/';
const output = '.pwc/work-models';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const fixture=await startRelay();
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.addInitScript(({relay,key})=>sessionStorage.setItem('cowcoming-live',JSON.stringify({relay,key})),{relay:fixture.relay,key:fixture.keys.browserKey});
 const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 const asset=name=>page.waitForFunction(name=>window.__replica?.controller.rig?.asset.includes(name),name);
 const select=async name=>page.locator('.evolution-node').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).click();
 try {
  await page.goto(base+'?section=work');
  await page.locator('.evolution-footer').waitFor();
  await select('仙牛');await asset('evolution/celestial-');
  await page.getByText('当前展示该形态的模型。',{exact:true}).waitFor();
  await page.waitForTimeout(1000);await page.screenshot({path:output+'/xianniu-desktop.png'});
  for(const name of ['bow','wave']) {
   await page.evaluate(name=>window.__replica.controller.gesture(name,'conversation'),name);
   await page.waitForFunction(name=>window.__replica.controller.rig.animation===name,name);
   await page.waitForFunction(()=>window.__replica.controller.rig.animation==='idle');
  }
  check('Celestial route loads the real skinned model; bow and wave return to idle');
  await page.locator('.evolution-routes button').nth(1).click();
  await asset('evolution/celestial-');
  await select('暗黑牛');await asset('evolution/dark-');
  await page.waitForTimeout(1000);await page.screenshot({path:output+'/dark-desktop.png'});
  await page.mouse.move(1040,300);await page.waitForTimeout(700);
  assert.ok(Math.abs(await page.evaluate(()=>window.__replica.controller.headYaw))>0.02);
  await page.evaluate(()=>window.__replica.controller.gesture('wave','conversation'));
  await page.waitForFunction(()=>window.__replica.controller.rig.animation==='wave');
  await page.waitForFunction(()=>window.__replica.controller.rig.animation==='idle');
  check('Dark route loads its model and supports gaze and greeting');
  await page.getByRole('button',{name:'首页',exact:true}).click();await asset('niulai-mouth');
  await page.locator('.navigation button[aria-controls=ip-switcher]').click();
  await page.locator('[data-ip=nailong]').click();await asset('/characters/nailong/');
  await page.getByRole('button',{name:'进化',exact:true}).click();await asset('evolution/dark-');
  assert.ok(await page.locator('.navigation button[aria-controls=ip-switcher]').isDisabled());
  await page.getByRole('button',{name:'重置为小牛',exact:true}).click();await asset('evolution/calf-');
  await page.getByRole('button',{name:'首页',exact:true}).click();await asset('/characters/nailong/');
  check('HOME choice and WORK form persist independently; WORK reset only resets evolution');
  await page.locator('.navigation').getByRole('button',{name:'Switch to English'}).click();
  await page.locator('.navigation button[aria-controls=ip-switcher]').click();
  assert.equal(await page.locator('dialog[open] [data-ip=spiderman]').count(),1);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'WORK',exact:true}).click();
  await page.locator('.evolution-routes button').nth(0).click();
  await select('Celestial Niulai');await asset('evolution/celestial-');
  check('HOME picker and WORK available-model states follow the English language setting');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(800);await page.screenshot({path:output+'/xianniu-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.locator('.evolution-routes button').nth(1).click();await select('Dark Niulai');await asset('evolution/dark-');
  await page.waitForTimeout(800);await page.screenshot({path:output+'/dark-mobile.png',fullPage:true});
  check('Both route models render in the 390px mobile WORK layout without horizontal overflow');
  assert.deepEqual(errors,[]);check('No runtime errors');
  const failure=await browser.newPage();
  await failure.route('**/models/evolution/celestial-*.glb',route=>route.abort());
  await failure.addInitScript(({relay,key})=>sessionStorage.setItem('cowcoming-live',JSON.stringify({relay,key})),{relay:fixture.relay,key:fixture.keys.browserKey});
  await failure.goto(base+'?section=work');
  await failure.locator('.evolution-footer').waitFor();
  await failure.locator('.evolution-routes button').nth(0).click();
  await failure.locator('.evolution-node').filter({hasText:'仙牛'}).click();
  await failure.getByRole('alert').waitFor();
  assert.match(await failure.locator('.evolution-selection').innerText(), /模型不可用/);
  await failure.locator('.evolution-node').filter({hasText:'小牛'}).click();
  await failure.waitForFunction(()=>window.__replica.controller.rig?.asset.includes('evolution/calf-'));
  await failure.waitForFunction(()=>!document.querySelector('.scene-error'));
  await failure.close();
  check('Failed WORK asset is marked unavailable and switching to calf recovers the stage');
 } finally {fs.writeFileSync(output+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close();await fixture.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

async function startRelay() {
 const os=require('node:os'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
 const {spawn}=require('node:child_process');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'cowcoming-model-qa-'));
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const admin=crypto.randomBytes(32).toString('hex'),relay=`http://127.0.0.1:${port}`;
 fs.writeFileSync(path.join(folder,'wrangler.json'),JSON.stringify({name:'cow-model-qa',main:path.resolve('server/worker.mjs'),compatibility_date:'2025-11-25',durable_objects:{bindings:[{name:'ROOMS',class_name:'DeviceRoom'}]},migrations:[{tag:'v1',new_sqlite_classes:['DeviceRoom']}],vars:{ALLOWED_ORIGINS:new URL(base).origin}}));
 fs.writeFileSync(path.join(folder,'.dev.vars'),`ADMIN_KEY=${admin}\n`,{mode:0o600});
 const worker=spawn(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'dev','--config',path.join(folder,'wrangler.json'),'--port',String(port),'--ip','127.0.0.1','--persist-to',path.join(folder,'state')],{detached:true,stdio:'ignore',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 let device,heartbeat;
 const close=async()=>{clearInterval(heartbeat);device?.close();try{process.kill(-worker.pid,'SIGTERM')}catch{};fs.rmSync(folder,{recursive:true,force:true})};
 try {
  const deadline=Date.now()+45000;
  while(true){try{if((await fetch(relay+'/health')).ok)break}catch{};if(Date.now()>deadline)throw new Error('Test Worker did not start');await new Promise(r=>setTimeout(r,150));}
  const response=await fetch(relay+'/v1/rooms',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:JSON.stringify({label:'WORK model QA only'})});assert.ok(response.ok);const keys=await response.json();
  const ticket=await(await fetch(relay+'/v1/connect',{method:'POST',headers:{Authorization:'Bearer '+keys.deviceKey}})).json();
  device=new WebSocket(relay.replace('http:','ws:')+'/v1/socket/'+ticket.roomId+'?ticket='+ticket.ticket);
  device.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='profile')device.send(JSON.stringify({type:'profile.applied',eventId:crypto.randomUUID(),revision:m.profile.revision}));});
  await new Promise((resolve,reject)=>{device.onopen=resolve;device.onerror=reject});
  device.send(JSON.stringify({type:'device.status',eventId:crypto.randomUUID(),simulation:true,name:'Model QA simulation',actionContractVersion:2,supportedActions:[],hardware:'offline'}));
  heartbeat=setInterval(()=>{if(device.readyState===1)device.send(JSON.stringify({type:'ping'}))},10000);
  return {relay,keys,close};
 }catch(e){await close();throw e}
}
