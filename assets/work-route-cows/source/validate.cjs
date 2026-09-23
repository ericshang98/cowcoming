const fs=require('node:fs');const path=require('node:path');
const validator=require(process.env.GLTF_VALIDATOR_PATH || 'gltf-validator');
const root=process.argv[2] || path.resolve(__dirname,'..');
(async()=>{for(const slug of ['xianniu','dark-niulai']){const dir=path.join(root,slug);const r=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(dir,slug+'-web.glb'))),{maxIssues:50});fs.writeFileSync(path.join(dir,'gltf-validation.json'),JSON.stringify(r,null,2));console.log(slug,r.issues);if(r.issues.numErrors||r.issues.numWarnings)process.exitCode=1;}})();
