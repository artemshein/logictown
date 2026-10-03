import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
const layoutUrl=moduleUrl(fs.readFileSync('src/layout.ts','utf8').replace("'./house-data'","'"+new URL('../src/house-data.ts',import.meta.url).href+"'"));
const {layout}=await import(layoutUrl);
const {createDogMotion,dogPath,dogBlocked,companionTarget}=await import(moduleUrl(fs.readFileSync('src/dog-motion.ts','utf8').replace("'./layout'",JSON.stringify(layoutUrl))));
const rooms=Object.values(layout).map(([x,z])=>({x:x+1.4,z}));
for(const from of rooms)for(const to of rooms){const route=dogPath(from,to);assert.ok(route.length||Math.hypot(from.x-to.x,from.z-to.z)<.1);for(const p of route)assert.equal(dogBlocked(p.x,p.z),false)}
let lea={x:0,z:0},dog=createDogMotion(companionTarget(lea,0));let seated=false,walked=false;
for(const target of [...rooms,...rooms.reverse()]){
 const route=dogPath(lea,target);
 for(const next of route){for(let i=0;i<4;i++){lea={x:lea.x+(next.x-lea.x)/(4-i),z:lea.z+(next.z-lea.z)/(4-i)};const s=dog.update(.02,lea,0,true);walked ||= s.walked;assert.equal(dogBlocked(dog.position.x,dog.position.z),false)}}
 for(let i=0;i<1200;i++){const s=dog.update(.02,lea,0,false);seated=s.sitting;assert.equal(dogBlocked(dog.position.x,dog.position.z),false)}
 assert.ok(seated,`Dog did not sit beside Lea at ${JSON.stringify(target)}`);
 assert.ok(Math.hypot(dog.position.x-lea.x,dog.position.z-lea.z)<1.65);
}
assert.ok(walked);assert.ok(seated);
console.log('Dog follows through all rooms, avoids obstacles and sits beside Lea.');

const fragmentsUrl=moduleUrl(fs.readFileSync('src/puzzle-fragments.ts','utf8'));
const {createDogHints}=await import(moduleUrl(fs.readFileSync('src/dog-hints.ts','utf8').replace("'./layout'",JSON.stringify(layoutUrl)).replace("'./puzzle-fragments'",JSON.stringify(fragmentsUrl))));
const hints=createDogHints();let barks=0,enabled=false;
const bark=()=>{if(!enabled)return false;barks++;return true};
const bedroom={x:-1.9,z:-.85};
hints.update(bedroom,bedroom,[],bark);assert.equal(barks,0);
enabled=true;
for(let i=0;i<100;i++)hints.update(bedroom,bedroom,[],bark);
assert.equal(barks,1,'one bark, including after previously muted/unavailable audio');
const kitchen={x:13.8,z:1.66},bathroom={x:1.4,z:-11};
hints.update(kitchen,kitchen,[1],bark);assert.equal(barks,1,'collected fragment is ignored');
hints.update(kitchen,{x:13.8,z:-5.1},[],bark);assert.equal(barks,1,'no bark through a wall');
for(let i=0;i<10;i++){hints.update(kitchen,kitchen,[],bark);hints.update(bathroom,bathroom,[],bark)}
assert.equal(barks,3);assert.equal(hints.count,3);
console.log('Exactly one bark per uncollected nearby fragment; mute and room boundaries respected.');
const {validateBytes}=await import('gltf-validator');
const model=fs.readFileSync('public/models/dog/shiba-inu.glb');
const validation=await validateBytes(new Uint8Array(model));assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
assert.ok(model.length<600000);console.log(`Valid dog GLB: ${Math.round(model.length/1024)} KB.`);
