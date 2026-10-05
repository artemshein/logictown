import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync('src/store-world.ts','utf8').split('export async function buildStore')[0].replace(/^import .*;\r?\n/gm,'');
const {storeFixtures,storeBlocked,storePath,storeExit}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
for(let i=0;i<storeFixtures.length;i++)for(let j=i+1;j<storeFixtures.length;j++){
 const a=storeFixtures[i],b=storeFixtures[j];
 assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2+.1||Math.abs(a.z-b.z)>=(a.d+b.d)/2+.1,`fixtures ${i} and ${j} need a gap`);
}
const start={x:0,z:-2.5};
for(const target of [storeExit,{x:0,z:3.5},{x:3,z:-2},{x:5.4,z:2.5}]){
 assert.ok(!storeBlocked(target.x,target.z));const path=storePath(start,target);assert.ok(path.length);
 for(const p of path)assert.ok(!storeBlocked(p.x,p.z));
}
console.log('Store furniture separation and accessible aisles verified.');
