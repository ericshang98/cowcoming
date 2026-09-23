const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:42910/');
 for(const id of ['niulai','fengge','spiderman','nailong','toothless']){
  const result=await page.evaluate(async id=>{const {renderPortrait}=await import('/tools/ip-portraits/render.mjs');return renderPortrait(id==='niulai'?'/models/niulai-mouth.glb':`/characters/${id}/v1/model.glb`);},id);
  fs.mkdirSync('public/characters/avatars',{recursive:true});fs.writeFileSync(`public/characters/avatars/${id}.png`,Buffer.from(result.png.split(',')[1],'base64'));console.log(id,result.head);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
