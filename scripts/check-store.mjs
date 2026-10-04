import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {validateBytes} from 'gltf-validator';
const url=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const {outdoorStore,outdoorBlocked,outdoorPath,outdoorSpawn,outdoorHomes}=await import(url(fs.readFileSync('src/outdoor-layout.ts','utf8').replace("'./outdoor-store-dimensions'",JSON.stringify(new URL('../src/outdoor-store-dimensions.ts',import.meta.url).href)).replace("'./outdoor-house-dimensions'",JSON.stringify(new URL('../src/outdoor-house-dimensions.ts',import.meta.url).href))));
const bytes=fs.readFileSync('public/assets/outdoor/village-store.glb');const report=await validateBytes(new Uint8Array(bytes));assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues.messages));assert.ok(bytes.length<2500000);
const j=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const triangles=j.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0);assert.ok(triangles<18000);assert.ok(j.images.length>=7);assert.ok(j.materials.some(m=>m.name.includes('burgundy')));assert.ok(j.materials.some(m=>m.name.includes('posters')));
assert.equal(outdoorBlocked(outdoorStore.x,outdoorStore.z),true);assert.ok(outdoorStore.w>18&&outdoorStore.h>6);assert.equal(outdoorBlocked(52,-23),false);
for(const z of [-18,-22.5])for(let x=38;x<=63;x+=.5)assert.equal(outdoorBlocked(x,z),false,'store keeps road and pavement open');
for(const target of [{x:52,z:-23},{x:41,z:-32.5},{x:62.5,z:-32.5},{x:52,z:-42}]){assert.equal(outdoorBlocked(target.x,target.z),false);const route=outdoorPath(outdoorSpawn,target);assert.ok(route.length);route.forEach(p=>assert.equal(outdoorBlocked(p.x,p.z),false))}
for(const h of outdoorHomes)assert.ok(Math.abs(h.x-outdoorStore.x)>(h.w+outdoorStore.w)/2||Math.abs(h.z-outdoorStore.z)>(h.d+outdoorStore.d)/2,'store does not intersect neighbouring homes');
const credits=JSON.parse(fs.readFileSync('public/assets/outdoor/store-credits.json'));assert.equal(credits.triangles,triangles);assert.ok(credits.textures.every(t=>t.license==='CC0-1.0'));
console.log(`Store: valid ${triangles}-triangle exterior with embedded photographic textures, free road/pavement, accessible sides, no house intersections and documented sources.`);
