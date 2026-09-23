const fs=require('node:fs');const path=require('node:path');
const validator=require(process.env.GLTF_VALIDATOR_PATH||'gltf-validator');
const root=process.env.NIULAI_OUTPUT||path.resolve(__dirname,'..');const manifest=JSON.parse(fs.readFileSync(path.join(root,'actions.json')));const file=path.join(root,manifest.model);
validator.validateBytes(new Uint8Array(fs.readFileSync(file)),{uri:path.basename(file),maxIssues:1000}).then(report=>{
 fs.writeFileSync(path.join(root,'gltf-validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.issues));if(report.issues.numErrors||report.issues.numWarnings)process.exitCode=1;
}).catch(error=>{console.error(error);process.exitCode=1;});
