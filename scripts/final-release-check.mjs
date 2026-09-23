// Software-only release gate. No production credentials, microphones or motors.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import net from 'node:net';

const root=resolve('.');
const benben=resolve(process.env.BENBEN_PATH||'../benben');
const python=process.env.BENBEN_TEST_PYTHON||process.env.BENBEN_PYTHON;
if(!python) throw new Error('Set BENBEN_PYTHON to the project Python with its existing test dependencies.');
const rows=[];
await mkdir('output/final-release',{recursive:true});
async function run(name,command,args,options={}){
 const started=Date.now();
 const code=await new Promise((resolveCode,reject)=>{
  const p=spawn(command,args,{stdio:'inherit',cwd:root,...options});
  p.on('error',reject);p.on('exit',code=>resolveCode(code));
 });
 rows.push({name,passed:code===0,elapsed_ms:Date.now()-started});
 await writeFile('output/final-release/checks.json',JSON.stringify({synthetic:true,checks:rows},null,2)+'\n');
 if(code!==0) throw new Error(name+' failed; see output above.');
}
await run('Python controller regressions',python,['-m','unittest','discover','-s','tests'],{cwd:benben});
await run('Local UI regressions',process.execPath,['--test',...(await readdir(benben+'/tests')).filter(n=>/^test_.*\.cjs$/.test(n)).map(n=>'tests/'+n)],{cwd:benben});
await run('Device SDK regressions',python,['-m','unittest','discover','-s','examples/device','-p','test_*.py']);
for(const step of ['test','build','test:relay']) await run(step,'npm',['run',step]);
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));
const port=socket.address().port;await new Promise(r=>socket.close(r));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'inherit'});
try{
 const base=`http://127.0.0.1:${port}/`;const end=Date.now()+30000;
 while(true){try{if((await fetch(base)).ok)break}catch{}if(vite.exitCode!==null||Date.now()>end)throw new Error('Vite startup failed');await new Promise(r=>setTimeout(r,150));}
 await run('Six actual model views and mobile layout',process.execPath,['scripts/model-loading-qa.cjs'],{env:{...process.env,QA_BASE_URL:base}});
}finally{vite.kill('SIGTERM');}
for(const schedule of ['after_reply','parallel']){
 await run('Full bridge matrix '+schedule,process.execPath,['scripts/combined-bridge-qa.mjs'],{env:{...process.env,BENBEN_PATH:benben,JEV_SCHEDULE:schedule}});
 const {copyFile}=await import('node:fs/promises');
 await copyFile('.pwc/benben-bridge-qa.json',`output/final-release/bridge-${schedule}.json`);
}
console.log('PASS: software release checks. Physical acceptance and Pages publication remain separate.');
