const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4389/';
const output='output/model-loading';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const fixture=await startRelay();
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],checks=[]; 
 page.on('pageerror',e=>{errors.push(e.message)});
 await page.addInitScript(({relay,key})=>sessionStorage.setItem('cowcoming-live',JSON.stringify({relay,key})),{relay:fixture.relay,key:fixture.keys.browserKey});
 const select=async(label,route=0)=>{
   await page.locator('.evolution-routes button').nth(route).click();
   await page.locator('.evolution-node').filter({has:page.locator('strong',{hasText:new RegExp('^'+label+'$')})}).click();
 };
 const ready=async id=>{
   await page.waitForFunction(id=>window.__replica?.controller.responseForm===id && window.__replica.controller.ready && !window.__replica.controller.error,id,{timeout:30000});
   await page.locator('.evolution-node[aria-pressed=true] small').filter({hasText:'角色已就绪'}).waitFor();
   assert.equal(await page.locator('.scene-error').count(),0);
 };
 try {
 await page.goto(base+'?section=work');
 await page.locator('.evolution-footer').waitFor({timeout:60000});
 for(const [id,label,route] of [['calf','小牛',0],['normal','普通牛来',0],['playful','骚牛',0],['celestial','仙牛',0],['tough','硬牛',1],['dark','暗黑牛',1]]){
   await select(label,route); await ready(id);
   await page.mouse.move(720,500); await page.waitForTimeout(300);
   await page.screenshot({path:output+'/'+id+'.png'});
   assert.match(await page.evaluate(()=>window.__replica.controller.rig.asset),new RegExp('/evolution/'+id+'-'));
   checks.push('Loaded actual model: '+id);
 }
 await page.setViewportSize({width:390,height:844});
 await select('骚牛');await ready('playful');
 await page.mouse.move(195,350);await page.waitForTimeout(300);
 await page.screenshot({path:output+'/playful-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 checks.push('Mobile playful model loads without horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS',checks);
 }finally{
 fs.writeFileSync(output+'/report.json',JSON.stringify({checks,errors},null,2));
 await browser.close();await fixture.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});

async function startRelay() {
 const os=require('node:os'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
 const {spawn}=require('node:child_process');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'cowcoming-model-qa-'));
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const admin=crypto.randomBytes(32).toString('hex'),relay=`http://127.0.0.1:${port}`;
 fs.writeFileSync(path.join(folder,'wrangler.json'),JSON.stringify({name:'cow-model-qa',main:path.resolve('server/worker.mjs'),compatibility_date:'2025-11-25',durable_objects:{bindings:[{name:'ROOMS',class_name:'DeviceRoom'}]},migrations:[{tag:'v1',new_sqlite_classes:['DeviceRoom']}],vars:{ALLOWED_ORIGINS:new URL(base).origin}}));
 fs.writeFileSync(path.join(folder,'.dev.vars'),`ADMIN_KEY=${admin}\n`,{mode:0o600});
 const worker=spawn(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'dev','--inspector-port','0','--config',path.join(folder,'wrangler.json'),'--port',String(port),'--ip','127.0.0.1','--persist-to',path.join(folder,'state')],{detached:true,stdio:'ignore',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
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
