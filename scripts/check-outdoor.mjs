import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {validateBytes} from 'gltf-validator';
import {outdoorBlocked,outdoorPath,outdoorSpawn,outdoorCompanionTarget,outdoorFences,outdoorHomes,outdoorTrees,outdoorEntrance,outdoorDoor,outdoorSwing,outdoorFenceGroups} from '../src/outdoor-layout.ts';
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const layoutUrl=moduleUrl(fs.readFileSync('src/layout.ts','utf8').replace("'./house-data'",JSON.stringify(new URL('../src/house-data.ts',import.meta.url).href)));
const {createDogMotion}=await import(moduleUrl(fs.readFileSync('src/dog-motion.ts','utf8').replace("'./layout'",JSON.stringify(layoutUrl))));
const neighbourTargets=outdoorHomes.flatMap(h=>{const facing=h.angle===0?-1:1,front=facing===-1?-12:-24,back=facing===-1?14:-48;return [{x:h.x,z:front-facing},{x:h.x,z:h.z+facing*(h.d/2+1.8)},{x:h.x,z:back+facing*2}]});
const targets=[...neighbourTargets,outdoorSpawn,{x:0,z:-11},{x:0,z:-14},{x:20,z:-18},{x:20,z:-22.5},{x:-55,z:-18},{x:55,z:-18},{x:0,z:9},{x:8,z:10},outdoorSpawn];
let lea={...outdoorSpawn};const dog=createDogMotion(outdoorCompanionTarget(lea,0),{path:outdoorPath,blocked:outdoorBlocked,target:outdoorCompanionTarget});
for(const target of targets){const path=outdoorPath(lea,target);assert.ok(path.length||Math.hypot(lea.x-target.x,lea.z-target.z)<.6,JSON.stringify(target));
 for(const p of path){assert.equal(outdoorBlocked(p.x,p.z),false);const dx=p.x-lea.x,dz=p.z-lea.z,heading=Math.atan2(dx,dz),steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.05));
  for(let i=0;i<steps;i++){lea.x+=dx/steps;lea.z+=dz/steps;assert.equal(outdoorBlocked(lea.x,lea.z),false);dog.update(.02,lea,heading,true);assert.equal(outdoorBlocked(dog.position.x,dog.position.z),false)}
 }
 let state;for(let i=0;i<1600;i++)state=dog.update(.02,lea,0,false);
 assert.ok(state.sitting,'Dog must sit beside Lea at '+JSON.stringify(target));assert.ok(Math.hypot(dog.position.x-lea.x,dog.position.z-lea.z)<1.65);
}
const ownHome=outdoorHomes.find(h=>h.x===0&&h.angle===0);
assert.equal(ownHome.w,11);assert.equal(ownHome.d,8.92);assert.equal(ownHome.h,10.27);
assert.ok(Math.abs(ownHome.z-ownHome.d/2+4)<1e-8,'front facade stays aligned with entrance');
assert.equal(outdoorBlocked(outdoorEntrance.x,outdoorEntrance.z),false);assert.equal(outdoorBlocked(outdoorSpawn.x,outdoorSpawn.z),false);
assert.ok(outdoorDoor.z<ownHome.z-ownHome.d/2);assert.ok(outdoorSwing.z-2.7/2>ownHome.z+ownHome.d/2+.25);
assert.equal(outdoorBlocked(5,0),true,'enlarged house footprint blocks movement');
for(const h of outdoorHomes)assert.ok(h.h>=5.5);
assert.ok(new Set(outdoorHomes.map(h=>`${h.w}/${h.h}/${h.d}`)).size>=4,'different house silhouettes and proportions');
assert.equal(outdoorFenceGroups.length,outdoorHomes.length);
for(const [i,h]of outdoorHomes.entries()){const group=outdoorFenceGroups[i],front=h.angle===0?-12:-24;assert.equal(group.length,6);assert.equal(group.filter(f=>f.kind==='gate').length,1);assert.equal(outdoorBlocked(h.x,front),false,'neighbour gate passage open');for(const f of group)assert.ok(outdoorBlocked(f.x,f.z))}
for(const z of [-18,-13.5,-22.5])for(let x=-60;x<=60;x+=.5)assert.equal(outdoorBlocked(x,z),false,'street and pavements stay clear');
assert.equal(outdoorBlocked(0,-12),false,'gate passage open');assert.equal(outdoorBlocked(1.4,-10.6),true,'open gate leaf blocks movement');
assert.equal(outdoorTrees.length,32);
for(const t of outdoorTrees){
 for(const h of outdoorHomes)assert.ok(Math.abs(t.x-h.x)>h.w/2+1||Math.abs(t.z-h.z)>h.d/2+1,'trunk clear of house');
 assert.ok(Math.hypot(t.x-outdoorSwing.x,t.z-outdoorSwing.z)>3,'tree clear of swings');
}
for(const f of outdoorFences)assert.ok(outdoorBlocked(f.x,f.z));for(const h of outdoorHomes)assert.ok(outdoorBlocked(h.x,h.z));for(const t of outdoorTrees)assert.ok(outdoorBlocked(t.x,t.z));
assert.ok(outdoorBlocked(64,0));assert.ok(outdoorBlocked(0,16));assert.ok(outdoorBlocked(0,-49));
const credits=JSON.parse(fs.readFileSync('public/assets/outdoor/models-credits.json'));
for(const asset of credits.models){assert.ok(['CC0-1.0','CC-BY-4.0'].includes(asset.license));if(asset.license==='CC-BY-4.0'){assert.ok(asset.author);assert.ok(asset.source);assert.ok(asset.changes)};const bytes=fs.readFileSync('public/assets/outdoor/'+asset.file);const result=await validateBytes(new Uint8Array(bytes),{externalResourceFunction:async uri=>new Uint8Array(fs.readFileSync('public/assets/outdoor/'+uri))});assert.equal(result.issues.numErrors,0,asset.file+JSON.stringify(result.issues.messages));assert.ok(bytes.length<(asset.file.startsWith('tree-')?6500000:asset.triangles?3100000:400000));if(asset.triangles){const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length));const triangles=gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0),0);assert.equal(triangles,asset.triangles);assert.ok(triangles<(asset.file.startsWith('tree-')?165000:asset.file==='fence.glb'?2000:45000));assert.ok(gltf.images.length>=(asset.file.startsWith('building-')?1:asset.file==='fence.glb'?3:6))}}
for(const asset of JSON.parse(fs.readFileSync('public/assets/outdoor/textures-credits.json'))){assert.equal(asset.license,'CC0-1.0');for(const map of ['color','normal','roughness'])assert.ok(fs.statSync(`public/assets/outdoor/${asset.id}/${map}.jpg`).size>0)}
assert.ok(fs.readFileSync('src/memory-world.ts','utf8').includes('hinge.rotation.y=0'));
assert.ok(fs.readFileSync('src/main.ts','utf8').includes("'/street.html'"));assert.ok(fs.readFileSync('vite.config.ts','utf8').includes("street: 'street.html'"));
console.log('Outdoor: yard, open gate, backyard, full street and return routes; dog follows and sits; fences/houses/trunks/limits block movement; all GLBs valid with source/license attribution.');
