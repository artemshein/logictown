import assert from 'node:assert/strict';
import fs from 'node:fs';
// Node strips TypeScript; rewrite the single extensionless data import for this test.
const source=fs.readFileSync(new URL('../src/layout.ts',import.meta.url),'utf8').replace("'./house-data'","'"+new URL('../src/house-data.ts',import.meta.url).href+"'");
const {stripTypeScriptTypes}=await import('node:module');
const {layout,houseBlocked,entries,navigation}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const {roomInfo}=await import('../src/house-data.ts');
const {step,originX,originZ,nx,nz}=navigation;
const p=i=>[originX+i%nx*step,originZ+Math.floor(i/nx)*step];
const valid=Array.from({length:nx*nz},(_,i)=>!houseBlocked(...p(i)));
const nearest=([x,z])=>{let best=-1,d=Infinity;for(let i=0;i<valid.length;i++)if(valid[i]){const q=p(i),dd=(q[0]-x)**2+(q[1]-z)**2;if(dd<d){best=i;d=dd}}return best};
const start=nearest([1.5,-1.8]),seen=new Set([start]),queue=[start];
for(let k=0;k<queue.length;k++){const cur=queue[k];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur%nx+dx,z=Math.floor(cur/nx)+dz,i=z*nx+x;if(x<0||x>=nx||z<0||z>=nz||seen.has(i)||!valid[i])continue;seen.add(i);queue.push(i)}}
for(const [id,[x,z]] of Object.entries(layout)){const r=roomInfo[id],target=[x+r.spawn[0],z+r.spawn[1]];assert(!houseBlocked(...target),id+' spawn blocked');assert(seen.has(nearest(target)),id+' disconnected');console.log(id+': reachable on foot from bedroom')}
for(const [id,entry] of Object.entries(entries)){const [x,z]=layout[id],r=roomInfo[id],edge=z+(z===0?-r.depth/2:r.depth/2);for(const delta of [-.2,0,.2])assert(!houseBlocked(x+entry,edge+delta),id+' passage blocked')}
assert(houseBlocked(4,0),'partition must block walking between bedrooms');
assert(houseBlocked(-2.72,1.43),'bed must block walking');
assert(houseBlocked(30,-5),'outside must block walking');
console.log('Open thresholds, partitions, furniture and outer bounds verified');
const spots={bedroom:[[-.65,.8],[2.63,1.56],[-2,-2.5],[-1.9,-.85]],living:[[.55,-.4]],kitchen:[[-2.2,1.66],[1.85,-.7]],bathroom:[[-.7,1.9],[1.4,-.8]],toilet:[[-.4,1.35]],hall:[[-2,-.45],[10.8,0]]};
for(const [id,targets] of Object.entries(spots))for(const [lx,lz] of targets){const target=[layout[id][0]+lx,layout[id][1]+lz];assert(!houseBlocked(...target),id+' interaction blocked');assert(seen.has(nearest(target)),id+' interaction unreachable')}
console.log('All object interactions reachable across the shared floor');

for(const [id,lx,lz] of [['bedroom',-2.75,-.65],['bedroom',2.9,-2.55],['living',3.25,1.05],['living',-.1,-2.2],['hall',7.5,-1.28]]){const [x,z]=layout[id];assert(houseBlocked(x+lx,z+lz),id+' added furniture must block walking')}
console.log('Added cabinets, bedside table and ottoman block walking');

for(const [id,entry] of Object.entries(entries)){const [x,z]=layout[id],r=roomInfo[id],edge=z+(z===0?-r.depth/2:r.depth/2);for(const dx of [-.5,0,.5])for(const dz of [0])assert(!houseBlocked(x+entry+dx,edge+dz),id+' open door must leave a walking lane '+dx+','+dz)}
console.log('Open door leaves preserve a metre-wide lane at each threshold');
