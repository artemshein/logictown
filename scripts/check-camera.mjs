import assert from 'node:assert/strict';
import {cameraDistance} from '../src/camera-collision.ts';
const wall={min:{x:-3,y:0,z:-2.1},max:{x:3,y:4,z:-2}};
const origin={x:0,y:1.45,z:0},back={x:0,y:0,z:-1};
assert.equal(cameraDistance(origin,back,3,[]),3);
assert(Math.abs(cameraDistance(origin,back,3,[wall])-1.8)<1e-8);
assert.equal(cameraDistance(origin,{x:0,y:0,z:1},3,[wall]),3,'wall behind the boom does not pull camera');
assert.equal(cameraDistance({x:4,y:1,z:0},back,3,[wall]),3,'parallel ray outside wall');
assert(cameraDistance({x:0,y:1,z:-1.7},back,3,[wall])<.15,'camera stays inside room near wall');
const nearWall={min:{x:-3,y:0,z:-1.1},max:{x:3,y:4,z:-1}};
assert(cameraDistance(origin,back,3,[wall,nearWall])<1,'nearest wall wins');
const doorway=[{min:{x:-3,y:0,z:-2.1},max:{x:-1,y:4,z:-2}},{min:{x:1,y:0,z:-2.1},max:{x:3,y:4,z:-2}}];
assert.equal(cameraDistance(origin,back,3,doorway),3,'open passage stays clear');
console.log('Camera: room boundaries, clearance, nearest wall and open passages passed');

// Street camera avoids zooming into Lea beside the enlarged house.
const outdoorSource=(await import('node:fs')).readFileSync(new URL('../src/outdoor-camera.ts',import.meta.url),'utf8');
const cameraUrl=new URL('../src/camera-collision.ts',import.meta.url).href;
const {outdoorCameraAngle,outdoorCameraDirection}=await import('data:text/javascript;base64,'+Buffer.from((await import('node:module')).stripTypeScriptTypes(outdoorSource.replace("'./camera-collision'",JSON.stringify(cameraUrl)))).toString('base64'));
const house={min:{x:-6.75,y:0,z:-4},max:{x:6.75,y:8.7,z:8}};
for(const [origin,alpha]of [[{x:0,y:1.1,z:9},-Math.PI/2],[{x:7.5,y:1.1,z:2},Math.PI]]){const angle=outdoorCameraAngle(origin,alpha,1.25,3.8,[house]);assert.ok(cameraDistance(origin,outdoorCameraDirection(angle,1.25),3.8,[house])>=3.2)}
assert.equal(outdoorCameraAngle({x:0,y:1.1,z:-6.3},-Math.PI/2,1.25,3.8,[house]),-Math.PI/2);
console.log('Outdoor camera: enlarged rear and side walls keep a clear view; open front view unchanged.');
