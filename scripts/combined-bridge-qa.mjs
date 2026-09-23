// Actual local Worker + Python controller/bridge + Chrome + normal GLB.
// All model, speech and actuator work is synthetic; no user services or keys.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const benben = resolve(process.env.BENBEN_PATH || '../benben');
const python = process.env.BENBEN_PYTHON || join(benben, '.venv-bridge/bin/python');
const folder = await mkdtemp(join(tmpdir(), 'benben-cowcoming-qa-'));
const children = [], logs = new Map();
let browser;
function child(command, args, options = {}) {
  const p = spawn(command, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  children.push(p); logs.set(p, '');
  for (const stream of [p.stdout, p.stderr]) stream.on('data', b => logs.set(p, (logs.get(p) + b).slice(-6000)));
  return p;
}
async function stop(p, signal = 'SIGTERM') {
  if (p.exitCode !== null || p.signalCode !== null) return;
  const exited = new Promise(r => p.once('exit', r));
  process.kill(-p.pid, signal);
  await exited;
}
async function port() {
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const n = s.address().port;
  await new Promise(r => s.close(r));
  return n;
}
async function until(fn, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const value = await fn(); if (value) return value; } catch { /* startup */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Timeout: ' + label);
}
const admin = crypto.randomBytes(32).toString('hex');
const relay = `http://127.0.0.1:${await port()}`;
const web = `http://127.0.0.1:${await port()}`;
const report = [], errors = [];
try {
  await writeFile(join(folder, 'wrangler.json'), JSON.stringify({
    name: 'cowcoming-benben-synthetic-test', main: resolve('server/worker.mjs'),
    compatibility_date: '2025-11-25',
    durable_objects: { bindings: [{ name: 'ROOMS', class_name: 'DeviceRoom' }] },
    migrations: [{ tag: 'v1', new_sqlite_classes: ['DeviceRoom'] }],
    vars: { ALLOWED_ORIGINS: web },
  }));
  await writeFile(join(folder, '.dev.vars'), `ADMIN_KEY=${admin}\n`, { mode: 0o600 });
  child(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'dev',
    '--config', join(folder, 'wrangler.json'), '--port', new URL(relay).port,
    '--ip', '127.0.0.1', '--persist-to', join(folder, 'state')],
    { env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  child(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', new URL(web).port, '--strictPort']);
  const fixture = child(python, ['-m', 'tests.cowcoming_fixture'], { cwd: benben });
  const info = await until(() => {
    const line = logs.get(fixture).split('\n').find(l => l.startsWith('{"port":'));
    return line && JSON.parse(line);
  }, 'synthetic controller startup');
  const local = `http://127.0.0.1:${info.port}`;
  await until(async () => (await fetch(relay + '/health')).ok, 'Worker startup', 60000);
  await until(async () => (await fetch(web)).ok, 'Vite startup');
  const roomResponse = await fetch(relay + '/v1/rooms', { method: 'POST',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'Synthetic Benben nod test' }) });
  assert.equal(roomResponse.status, 200);
  const room = await roomResponse.json();
  const token = (await (await fetch(local + '/session')).json()).token;
  const localPost = async (path, body) => {
    const r = await fetch(local + path, { method: 'POST', headers: {
      'X-Niu-Reaction': token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.ok(r.ok, `${path}: ${r.status}`);
    return r.json();
  };
  await mkdir('.pwc', { recursive: true });
  await mkdir('tmp', { recursive: true });
  await writeFile('tmp/benben-harness.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/tmp/benben-harness.jsx"></script></body></html>');
  await writeFile('tmp/benben-harness.jsx', `
import React from 'react';import{createRoot}from'react-dom/client';
import * as THREE from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import useLiveDevice from '/src/live/useLiveDevice';
import{createResponsePlayer}from'/src/live/response-player.mjs';
import{evolutionAssets}from'/src/evolution-assets.mjs';
const manifest=evolutionAssets.normal,gltf=await new GLTFLoader().loadAsync(manifest.model);
const scene=new THREE.Scene();scene.background=new THREE.Color('#edf5f6');scene.add(gltf.scene);
scene.add(new THREE.HemisphereLight(0xffffff,0x607880,3));
const bounds=new THREE.Box3().setFromObject(gltf.scene),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
const camera=new THREE.PerspectiveCamera(40,640/480,.01,1000);camera.position.copy(center).add(new THREE.Vector3(0,size.y*.1,Math.max(size.y,size.x)*2));camera.lookAt(center);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(640,480);document.body.appendChild(renderer.domElement);
let mixer=new THREE.AnimationMixer(gltf.scene); const actions={},bones=new Set();
gltf.scene.traverse(o=>{if(o.isBone){bones.add(o.name);if(o.userData.name)bones.add(o.userData.name)}});for(const c of gltf.animations)actions[c.name]=mixer.clipAction(c);
actions.idle=actions.idle||actions[gltf.animations.find(c=>/idle/i.test(c.name))?.name];
window.results=[];window.starts=0;
let player=createResponsePlayer({mixer,actions,bones,manifest,onStart:()=>window.starts++});
const play=player.play.bind(player);player.play=request=>play(request).then(result=>{window.results.push(result);return result});
const controller={responsePlayer:player,responseForm:'normal',queue:{clear(){}}};window.player=player;
let activeModel=gltf.scene;
window.loadForm=async form=>{
 const asset=evolutionAssets[form], loaded=await new GLTFLoader().loadAsync(asset.model);
 player.dispose();mixer.stopAllAction();scene.remove(activeModel);activeModel=loaded.scene;scene.add(activeModel);
 mixer=new THREE.AnimationMixer(activeModel);const nextActions={},nextBones=new Set();
 activeModel.traverse(o=>{if(o.isBone){nextBones.add(o.name);if(o.userData.name)nextBones.add(o.userData.name)}});
 for(const c of loaded.animations)nextActions[c.name]=mixer.clipAction(c);
 player=createResponsePlayer({mixer,actions:nextActions,bones:nextBones,manifest:asset,onStart:()=>window.starts++});
 const run=player.play.bind(player);player.play=request=>run(request).then(result=>{window.results.push(result);return result});
 controller.responsePlayer=player;controller.responseForm=form;window.player=player;
 const b=new THREE.Box3().setFromObject(activeModel),c=b.getCenter(new THREE.Vector3()),z=b.getSize(new THREE.Vector3());
 camera.position.copy(c).add(new THREE.Vector3(0,z.y*.1,Math.max(z.y,z.x)*2));camera.lookAt(c);
};

let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.1,(now-last)/1000);last=now;player.update(dt);mixer.update(dt);renderer.render(scene,camera)});
function App(){const live=useLiveDevice(controller,true);window.live=live;return <><h2>点头联调 · 合成执行器 / 真实模型动画</h2><pre>{JSON.stringify({connection:live.status,animation:live.lastAnimation,receipt:live.snapshot?.events.filter(e=>e.type==='action').at(-1)},null,2)}</pre></>}
createRoot(document.getElementById('root')).render(<App/>);`);
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 820 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {if(r.status() >= 400 && r.url().startsWith(web)) errors.push('HTTP ' + r.status() + ' ' + new URL(r.url()).pathname);});
  page.on('console', m => {if(m.type() === 'error') errors.push(m.text().replace(/(?:key|ticket)=[^ &]+/g, 'key=REDACTED'));});
  await page.goto(web + '/tmp/benben-harness.html');
  await page.waitForFunction(() => window.live,null,{polling:100,timeout:30000});
  await page.evaluate(({ relay, key }) => window.live.connect(relay, key, false), { relay, key: room.browserKey });
  await page.waitForFunction(() => window.live.snapshot);
  await page.evaluate(() => window.live.updateProfile({ formId: 'normal', allowedActions: ['NOD', 'WAIT'] }));
  const connectBridge = () => child(python, ['-m', 'niu_reactions.cowcoming_bridge', '--relay', relay, '--local', local],
    { cwd: benben, env: { ...process.env, COWCOMING_DEVICE_KEY: room.deviceKey } });
  let bridge = connectBridge();
  await page.waitForFunction(() => window.live.snapshot?.appliedRevision === window.live.snapshot?.profile.revision && window.live.online);
  const nod = id => localPost('/run', { request_id: id, mode: 'hardware', form_id: 'mature', reply_mode: 'fast', text: '点一下头' });
  await nod('qa_nod_one');
  await page.waitForFunction(() => window.starts === 1);
  await page.waitForFunction(() => window.results.some(r => r.status === 'completed'));
  await page.waitForFunction(() => window.live.snapshot.events.some(e => e.type === 'action' && e.status === 'sent'));
  assert.equal(await page.evaluate(() => window.live.snapshot.events.filter(e => e.type === 'decision').length), 1);
  assert.equal(await page.evaluate(() => window.live.snapshot.events.some(e => e.type === 'action' && e.status === 'completed')), false);
  report.push('Same local JEV turn produces exactly one NOD and actual normal GLB animation; timed end is sent, never physical completed.');
  await page.screenshot({ path: '.pwc/benben-nod-qa.png' });
  assert.equal((await nod('qa_nod_one')).duplicate, true);
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await page.evaluate(() => window.starts), 1);
  report.push('Duplicate local request does not replay animation or execute another turn.');
  await nod('qa_nod_cancel');
  await page.waitForFunction(() => window.starts === 2 && window.player.busy);
  await localPost('/stop', {});
  await page.waitForFunction(() => window.results.at(-1)?.status === 'completed' && !window.player.busy);
  report.push('Local stop updates hardware receipt while the accepted software clip completes, preserving current main behavior.');
  await until(async () => !(await (await fetch(local + '/state')).json()).busy, 'cancel finish');
  await nod('qa_remote_stop');
  await page.waitForFunction(() => window.starts === 3 && window.player.busy);
  await page.evaluate(() => window.live.command({ command: 'stop' }));
  await page.waitForFunction(() => window.live.snapshot.events.some(e => e.type === 'command.result' && e.status === 'stopped'));
  report.push('Web stop reaches the existing local controller and returns its stop acknowledgement.');
  await until(async () => !(await (await fetch(local + '/state')).json()).busy, 'remote stop finish');
  await nod('qa_disconnect');
  await page.waitForFunction(() => window.starts === 4);
  await stop(bridge, 'SIGKILL');
  await page.waitForFunction(() => !window.live.online && !window.player.busy);
  bridge = connectBridge();
  await page.waitForFunction(() => window.live.online && window.live.snapshot.appliedRevision === window.live.snapshot.profile.revision);
  await until(async () => !(await (await fetch(local + '/state')).json()).busy, 'disconnected turn finish');
  await new Promise(r => setTimeout(r, 400));
  assert.equal(await page.evaluate(() => window.starts), 4);
  report.push('Device disconnect marks offline; accepted clip completes and reconnect skips the in-flight/old turn.');
  await nod('qa_after_reconnect');
  await page.waitForFunction(() => window.starts === 5);
  await page.waitForFunction(() => window.results.length === 5 && window.results.at(-1)?.status === 'completed' && !window.player.busy);
  report.push('A new turn after reconnect works normally.');
  assert.equal(await page.evaluate(() => window.live.snapshot.device.jev), 'ready', 'Observed local JEV should be ready');
  await page.evaluate(() => window.live.command({ command: 'interact', input: 'Do not invoke another JEV' }));
  await page.waitForFunction(() => window.live.snapshot.events.some(e => e.type === 'command.result' && e.status === 'failed'));
  assert.equal(await page.evaluate(() => window.starts), 5);
  report.push('Unsupported web interaction is explicitly rejected instead of invoking a second JEV.');
  const cases = [
    ['nod','NOD','点一下头','nod_confirm'],
    ['shake_head','SHAKE','摇摇头','head_shake'],
    ['nod_double','NOD_DOUBLE','点两次头','nod_proud'],
    ['tilt_left','TILT_LEFT','向左歪头','tilt_curious_left'],
    ['tilt_right','TILT_RIGHT','向右歪头','tilt_curious_right'],
  ];
  const matrix = [];
  for (const formId of ['calf','normal','playful','tough','celestial','dark']) {
    await page.evaluate(formId => window.live.updateProfile({formId, allowedActions: ['NOD','SHAKE','NOD_DOUBLE','TILT_LEFT','TILT_RIGHT','WAIT']}), formId);
    await page.waitForFunction(formId => window.live.snapshot?.profile.formId === formId &&
      window.live.snapshot.appliedRevision === window.live.snapshot.profile.revision,
      formId, {polling:100, timeout:15000});
    const current = await page.evaluate(() => window.live.snapshot.profile);
    const localResponse = await fetch(local + '/bridge/events', {headers:{'X-Niu-Reaction':token}});
    const localState = await localResponse.json();
    assert.equal(localState.form_id, formId);
    assert.equal(localState.persona_version, current.personaVersion);
    assert.deepEqual((await page.evaluate(()=>window.live.snapshot.device.supportedActions)).sort(),
      ['NOD','SHAKE','NOD_DOUBLE','TILT_LEFT','TILT_RIGHT','WAIT'].sort());
    await page.evaluate(form => window.loadForm(form), formId);
    for (const [motionId, actionId, text, suffix] of cases) {
      const before = await page.evaluate(()=>({starts:window.starts, results:window.results.length}));
      const request_id = 'qa_' + formId + '_' + motionId;
      await localPost('/run', {request_id, mode:'hardware', form_id:formId, reply_mode:'fast', text});
      try {
        await page.waitForFunction(before => window.starts === before.starts+1 &&
          window.results.length === before.results+1 && !window.player.busy,
          before, {polling:100, timeout:20000});
      } catch (error) {
        const localState = await (await fetch(local+'/state')).json();
        console.error('Matrix failure', JSON.stringify({formId,motionId,before,
          controller:{phase:localState.phase,error:localState.error,motion:localState.motion,
            candidates:localState.motion_candidates,selected:localState.motion_reaction_id},
          browser:await page.evaluate(()=>({starts:window.starts,results:window.results.slice(-2),
            animation:window.live.lastAnimation,error:window.live.error,
            events:window.live.snapshot.events.slice(-4)}))}));
        throw error;
      }
      const observed = await page.evaluate(()=>({decision:window.live.snapshot.events.findLast(e=>e.type==='decision'),
        result:window.results.at(-1), receipt:window.live.snapshot.events.findLast(e=>e.type==='action')}));
      assert.equal(observed.decision.actionId, actionId);
      assert.equal(observed.decision.formId, formId);
      assert.equal(observed.result.clip, formId+'_'+suffix);
      assert.equal(observed.result.status, 'completed');
      assert.equal(observed.receipt.status, 'sent');
      await until(async () => !(await (await fetch(local+'/state')).json()).busy, 'matrix turn finish');
      matrix.push({formId,motionId,actionId,clip:observed.result.clip,software:'completed',hardware:'synthetic-timed-sent'});
    }
    console.log(formId + ': all five local decisions reached matching real GLB animations');
  }
  report.push('All six forms acknowledge the same persona version; all 30 local-motion/real-GLB combinations pass, including distinct single/double nod and left/right tilt. No real motors.');
  assert.deepEqual(errors, []);
  await writeFile('.pwc/benben-bridge-qa.json', JSON.stringify({ synthetic: true, checks: report, matrix, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: report.length, synthetic: true, checks: report }, null, 2));
} catch (error) {
  console.error('Browser errors:', JSON.stringify(errors));
  // Fixture/bridge logs contain no keys or user model output; do not dump room/ticket URLs.
  for (const p of children) if (p.spawnfile === python) console.error(logs.get(p));
  throw error;
} finally {
  await browser?.close();
  for (const p of children.reverse()) await stop(p);
  await rm(folder, { recursive: true, force: true });
  await rm('tmp/benben-harness.html', {force: true});
  await rm('tmp/benben-harness.jsx', {force: true});
}
