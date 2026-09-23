// Requires BENBEN_ROOT pointing at the independently maintained local repository.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const relay=process.env.TEST_RELAY_URL, origin=process.env.TEST_UI_ORIGIN;
const response=await fetch(relay+'/v1/rooms',{method:'POST',headers:{Authorization:'Bearer '+process.env.TEST_RELAY_ADMIN,'Content-Type':'application/json'},body:JSON.stringify({label:'Isolated benben handoff QA'})});
assert.equal(response.status,200);const keys=await response.json();
const connect=await fetch(relay+'/v1/connect',{method:'POST',headers:{Authorization:'Bearer '+keys.browserKey}}), ticket=await connect.json();
const ws=new WebSocket(relay.replace(/^http/,'ws')+'/v1/socket/'+ticket.roomId+'?ticket='+ticket.ticket);
let latest;const messages=[];ws.onmessage=e=>{const m=JSON.parse(e.data);messages.push(m);if(m.type==='snapshot')latest=m;};
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
const wait=async predicate=>{const end=Date.now()+30000;while(!predicate()){if(Date.now()>end)throw Error('Timed out waiting for handoff state');await new Promise(r=>setTimeout(r,50));}};
let device,server,browser,logs='';
try{
 device=spawn(process.env.DEVICE_PYTHON||'python3',[resolve(process.env.BENBEN_ROOT,'tests/cowcoming_fixture.py')],{cwd:process.env.BENBEN_ROOT,env:{...process.env,COWCOMING_RELAY_URL:relay,COWCOMING_DEVICE_KEY:keys.deviceKey},stdio:['pipe','pipe','pipe']});
 device.stdout.on('data',x=>logs+=x);device.stderr.on('data',x=>logs+=x);
 await wait(()=>latest?.appliedRevision===latest?.profile.revision && latest?.deviceOnline);
 assert.deepEqual(latest.device.supportedActions,['NOD_DOUBLE','SHAKE','WAIT']);
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',new URL(origin).port,'--strictPort'],{stdio:['ignore','pipe','pipe']});
 server.stderr.on('data',x=>logs+=x);
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({relay,key})=>sessionStorage.setItem('cowcoming-live',JSON.stringify({relay,key})),{relay,key:keys.browserKey});
 await page.goto(origin+'/?section=work');
 await page.waitForFunction(()=>window.__replica?.controller.responseForm==='calf',null,{timeout:60000});
 device.stdin.write(JSON.stringify({request_id:'local_calf',mode:'preview',text:'你好'})+'\n');
 await wait(()=>messages.some(m=>m.type==='live.interaction'&&m.interaction.replyMode==='silent'));
 await page.waitForFunction(()=>window.__replica.controller.responsePlayer.busy);
 await page.waitForFunction(()=>!window.__replica.controller.responsePlayer.busy,null,{timeout:15000});
 assert.ok(latest.events.some(e=>e.type==='decision'&&e.actionId==='NOD_DOUBLE'));
 assert.ok(latest.events.some(e=>e.type==='command.result'&&e.status==='completed'));
 console.log('PASS real benben publisher → Worker → actual calf animation; silent local round');
 await page.locator('.evolution-node').filter({has:page.locator('strong',{hasText:/^普通牛来$/})}).click();
 await wait(()=>latest.profile.formId==='normal'&&latest.appliedRevision===latest.profile.revision);
 await page.waitForFunction(()=>window.__replica.controller.responseForm==='normal');
 assert.match(latest.profile.languagePrompt,/贷款|草根|大业务/);
 device.stdin.write(JSON.stringify({request_id:'local_normal',mode:'preview',text:'你会什么'})+'\n');
 await wait(()=>latest.messages.some(m=>m.role==='assistant'&&m.status==='complete'&&m.text.includes('头部')));
 await page.waitForFunction(()=>window.__replica.controller.responsePlayer.busy);
 await page.waitForFunction(()=>!window.__replica.controller.responsePlayer.busy,null,{timeout:15000});
 console.log('PASS webpage form → acknowledged local JEV profile; independent text stream + animation');
 ws.send(JSON.stringify({type:'command',commandId:'browser_shake',command:'action',actionId:'SHAKE'}));
 await wait(()=>latest.events.some(e=>e.type==='decision'&&e.commandId==='browser_shake'&&e.actionId==='SHAKE'));
 await page.waitForFunction(()=>window.__replica.controller.responsePlayer.busy);
 await page.waitForFunction(()=>!window.__replica.controller.responsePlayer.busy,null,{timeout:15000});
 assert.ok(latest.events.some(e=>e.commandId==='browser_shake'&&e.status==='completed'));
 assert.equal(latest.device.simulation,true);
 assert.deepEqual(errors,[]);
 assert.equal(messages.filter(m=>m.type==='error').length,0);
 await mkdir('.pwc/handoff',{recursive:true});await page.screenshot({path:'.pwc/handoff/benben-connected.png'});
 console.log('PASS browser command reuses local player; no protocol/browser errors; no hardware, audio or real models invoked');
} catch(e){console.error(logs.replaceAll(keys.deviceKey,'[redacted]'));throw e;}
finally {ws.close();device?.stdin.end(JSON.stringify({close:true})+'\n');device?.kill();server?.kill();await browser?.close();}
