import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {validateBytes} from 'gltf-validator';
const root='public/assets/polyhaven',credits=JSON.parse(await readFile(root+'/credits.json','utf8'));
let total=0;
for(const asset of credits){
 assert.equal(asset.license,'CC0-1.0');assert(asset.source.startsWith('https://polyhaven.com/a/'));
 if(asset.type==='model'){
  const data=await readFile(root+'/'+asset.id+'.glb');total+=data.length;
  const report=await validateBytes(new Uint8Array(data),{maxIssues:20});
  assert.equal(report.issues.numErrors,0,asset.id+': '+JSON.stringify(report.issues.messages));
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  const triangles=json.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+json.accessors[p.indices].count/3,0),0);
  assert(triangles<=16000,asset.id+' exceeds mobile geometry budget');
  assert(data.length<2*1024*1024,asset.id+' exceeds model download budget');
 }else for(const map of ['color','normal','roughness'])assert((await stat(`${root}/${asset.id}/${map}.jpg`)).size>0);
}
console.log(`${credits.filter(a=>a.type==='model').length} valid CC0 models, ${Math.round(total/1024/1024*10)/10} MB total; all texture maps present`);
const fixtures=JSON.parse(await readFile('public/assets/fixtures/credits.json','utf8'));
for(const asset of fixtures){
 assert.equal(asset.license,'CC0-1.0');assert(asset.source.startsWith('https://3dassets.dev/assets/'));
 const data=await readFile('public/assets/fixtures/'+asset.file);
 const report=await validateBytes(new Uint8Array(data),{maxIssues:20});
 assert.equal(report.issues.numErrors,0,asset.file+': '+JSON.stringify(report.issues.messages));
 assert(data.length<500000);assert(asset.triangles<4000);
}
console.log('Fridge, bathtub and toilet: valid CC0 GLBs, each under 500 KB / 4000 triangles');
