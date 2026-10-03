import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {validateBytes} from 'gltf-validator';
import {outdoorBlocked,outdoorPath,outdoorSpawn,outdoorCompanionTarget,outdoorFences,outdoorHomes,outdoorTrees} from '../src/outdoor-layout.ts';
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const layoutUrl=moduleUrl(fs.readFileSync('src/layout.ts','utf8').replace("'./house-data'",JSON.stringify(new URL('../src/house-data.ts',import.meta.url).href)));
const {createDogMotion}=await import(moduleUrl(fs.readFileSync('src/dog-motion.ts','utf8').replace("'./layout'",JSON.stringify(layoutUrl))));
const targets=[outdoorSpawn,{x:0,z:-11},{x:0,z:-14},{x:20,z:-18},{x:-55,z:-18},{x:55,z:-18},{x:0,z:9},{x:8,z:10},outdoorSpawn];
let lea={...outdoorSpawn};const dog=createDogMotion(outdoorCompanionTarget(lea,0),{path:outdoorPath,blocked:outdoorBlocked,target:outdoorCompanionTarget});
for(const target of targets){const path=outdoorPath(lea,target);assert.ok(path.length||Math.hypot(lea.x-target.x,lea.z-target.z)<.6,JSON.stringify(target));
 for(const p of path){assert.equal(outdoorBlocked(p.x,p.z),false);const dx=p.x-lea.x,dz=p.z-lea.z,heading=Math.atan2(dx,dz),steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.05));
  for(let i=0;i<steps;i++){lea.x+=dx/steps;lea.z+=dz/steps;assert.equal(outdoorBlocked(lea.x,lea.z),false);dog.update(.02,lea,heading,true);assert.equal(outdoorBlocked(dog.position.x,dog.position.z),false)}
 }
 let state;for(let i=0;i<1600;i++)state=dog.update(.02,lea,0,false);
 assert.ok(state.sitting,'Dog must sit beside Lea at '+JSON.stringify(target));assert.ok(Math.hypot(dog.position.x-lea.x,dog.position.z-lea.z)<1.65);
}
assert.equal(outdoorBlocked(0,-12),false,'gate passage open');assert.equal(outdoorBlocked(1.4,-10.6),true,'open gate leaf blocks movement');
for(const f of outdoorFences)assert.ok(outdoorBlocked(f.x,f.z));for(const h of outdoorHomes)assert.ok(outdoorBlocked(h.x,h.z));for(const t of outdoorTrees)assert.ok(outdoorBlocked(t.x,t.z));
assert.ok(outdoorBlocked(64,0));assert.ok(outdoorBlocked(0,16));assert.ok(outdoorBlocked(0,-49));
const credits=JSON.parse(fs.readFileSync('public/assets/outdoor/models-credits.json'));
for(const asset of credits.models){assert.equal(asset.license,'CC0-1.0');const bytes=fs.readFileSync('public/assets/outdoor/'+asset.file);const result=await validateBytes(new Uint8Array(bytes),{externalResourceFunction:async uri=>new Uint8Array(fs.readFileSync('public/assets/outdoor/'+uri))});assert.equal(result.issues.numErrors,0,asset.file+JSON.stringify(result.issues.messages));assert.ok(bytes.length<(asset.triangles?3100000:400000));if(asset.triangles){const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length));const triangles=gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0),0);assert.equal(triangles,asset.triangles);assert.ok(triangles<45000);assert.ok(gltf.images.length>=6)}}
for(const asset of JSON.parse(fs.readFileSync('public/assets/outdoor/textures-credits.json'))){assert.equal(asset.license,'CC0-1.0');for(const map of ['color','normal','roughness'])assert.ok(fs.statSync(`public/assets/outdoor/${asset.id}/${map}.jpg`).size>0)}
assert.ok(fs.readFileSync('src/memory-world.ts','utf8').includes('hinge.rotation.y=0'));
assert.ok(fs.readFileSync('src/main.ts','utf8').includes("'/street.html'"));assert.ok(fs.readFileSync('vite.config.ts','utf8').includes("street: 'street.html'"));
console.log('Outdoor: yard, open gate, backyard, full street and return routes; dog follows and sits; fences/houses/trunks/limits block movement; all CC0 GLBs valid.');
