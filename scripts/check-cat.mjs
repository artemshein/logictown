import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {validateBytes} from 'gltf-validator';
const url=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const {createCatMotion}=await import(url(fs.readFileSync('src/cat-motion.ts','utf8')));
const {outdoorBlocked,outdoorPath}=await import(url(fs.readFileSync('src/outdoor-layout.ts','utf8').replace("'./outdoor-house-dimensions'",JSON.stringify(new URL('../src/outdoor-house-dimensions.ts',import.meta.url).href))));
let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const nav={blocked:outdoorBlocked,path:outdoorPath},start={x:8,z:-13.5};
for(const [label,speed,direction]of [['stationary',0,1],['slow approach',.7,1],['fast departure',3.8,-1]]){
 const cat=createCatMotion(start,nav,random);for(let i=0;i<50;i++)cat.update(.02,{x:8,z:-16+direction*speed*i*.02});assert.equal(cat.fleeCount,0,label);
}
// Babylon Vector3 exposes coordinates through getters, not own fields.
const point=(x,z)=>({get x(){return x},get z(){return z}});
const cat=createCatMotion(start,nav,random);cat.update(.02,{x:8,z:-17});
let state;for(let i=1;i<=30;i++){state=cat.update(.02,point(8,-17+3.8*i*.02));assert.equal(outdoorBlocked(cat.position.x,cat.position.z),false)}
assert.equal(cat.fleeCount,1);assert.equal(state.state,'run');assert.ok(Math.hypot(cat.position.x-8,cat.position.z+13.5)>2,'runs away promptly');
let walks=0,idles=0;const seen=new Set();for(let i=0;i<15000;i++){state=cat.update(.02,{x:-60,z:-45});assert.equal(outdoorBlocked(cat.position.x,cat.position.z),false);if(state.state==='walk')walks++;if(state.state==='idle')idles++;seen.add(`${Math.round(cat.position.x)},${Math.round(cat.position.z)}`)}
assert.ok(walks>100&&idles>100&&seen.size>20,'recovers, independently walks and rests');assert.equal(cat.fleeCount,1);
const wallNav={...nav,blocked:(x,z)=>z>-15&&z<-14.8||outdoorBlocked(x,z)};
const shielded=createCatMotion(start,wallNav,random);shielded.update(.02,{x:8,z:-17});shielded.update(.02,{x:8,z:-16.9});assert.equal(shielded.fleeCount,0,'fence or wall blocks threat sight');
const first=createCatMotion(start,nav,random);first.update(0,start);first.update(.02,{x:8,z:-14});assert.equal(first.fleeCount,0,'initial dog sample is not velocity');
const bytes=fs.readFileSync('public/models/cat/street-cat.glb');const validation=await validateBytes(new Uint8Array(bytes));assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));assert.ok(bytes.length<900000);
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));for(const name of ['Idle','Walk','Run'])assert.ok(gltf.animations.some(a=>a.name.split('|').at(-1)===name));
assert.ok(gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+gltf.accessors[p.indices].count/3,0),0)<10000);
const credits=JSON.parse(fs.readFileSync('public/models/cat/credits.json'));assert.equal(credits.license,'CC-BY-4.0');assert.ok(credits.author&&credits.source);
console.log('Cat: valid lightweight animated model; independent roaming/resting; fast approach triggers escape; slow/stationary/departing dog and obstacles do not; recovery and 5-minute outdoor collision check passed.');
