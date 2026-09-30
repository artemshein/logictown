import assert from 'node:assert/strict';
import {NullEngine,Scene,MeshBuilder,StandardMaterial,Vector3,Ray} from '@babylonjs/core';
import {applyWallSides} from '../src/wall-sides.ts';

const engine=new NullEngine(),scene=new Scene(engine);
const inside=new StandardMaterial('room',scene),outside=new StandardMaterial('exterior',scene),reveal=new StandardMaterial('opening',scene);
for(const [axis,position] of [['x',-4],['x',4],['z',-3.4],['z',3.4]]){
 const wall=MeshBuilder.CreateBox('wall',{width:axis==='x'?.12:8,height:3.6,depth:axis==='z'?.12:6.8},scene);
 wall.position[axis]=position;wall.position.y=1.8;wall.computeWorldMatrix(true);
 const count=wall.getTotalIndices();applyWallSides(wall,inside,outside,reveal);
 assert.equal(wall.getTotalIndices(),count,'all wall triangles retained');
 function finish(origin,direction){
  const hit=scene.pickWithRay(new Ray(origin,direction),mesh=>mesh===wall);
  assert(hit?.hit,'wall is still pickable');
  return wall.subMeshes[hit.subMeshId].getMaterial();
 }
 const direction=Vector3.Zero();direction[axis]=Math.sign(position);
 assert.equal(finish(new Vector3(0,1.8,0),direction),inside,'room faces show room finish');
 const origin=wall.position.clone();origin[axis]+=Math.sign(position);
 assert.equal(finish(origin,direction.negate()),outside,'outer faces show exterior finish');
 assert.equal(finish(wall.position.add(new Vector3(0,3,0)),new Vector3(0,-1,0)),reveal,'wall caps show opening finish');
 wall.dispose();
}
scene.dispose();engine.dispose();
console.log('All four wall orientations: independent inner, outer and opening finishes verified');
