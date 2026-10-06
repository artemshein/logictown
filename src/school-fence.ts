import {Color3,Matrix,Mesh,MeshBuilder,StandardMaterial,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {brickMaterial,brickUV,canvasMaterial} from './school-building';
import {schoolFence,schoolFenceRuns,schoolGateLeaves,schoolGatePillars} from './school-layout';
const curb=.16,picketGap=.13,postGap=2.4;
const plaquePaint=(c:CanvasRenderingContext2D,w:number,h:number)=>{
 c.fillStyle='#2f4a3f';c.fillRect(0,0,w,h);c.strokeStyle='#d8c58c';c.lineWidth=h*.05;c.strokeRect(h*.08,h*.08,w-h*.16,h-h*.16);
 c.fillStyle='#f3ecd6';c.textAlign='center';c.textBaseline='middle';c.font=`700 ${h*.22}px Georgia,serif`;c.fillText('ШКОЛА № 1',w/2,h*.4,w*.85);
 c.font=`500 ${h*.12}px system-ui,sans-serif`;c.fillText('Тихий город',w/2,h*.7,w*.85);
};
/** Black steel palisade on a concrete curb: pickets and posts are thin instances. */
export function buildSchoolFence(scene:Scene,shadow:ShadowGenerator){
 const metal=new StandardMaterial('school fence powder coat',scene);metal.diffuseColor=Color3.FromHexString('#1c1e20');metal.specularColor=new Color3(.25,.25,.25);
 const concrete=new StandardMaterial('school fence curb',scene);concrete.diffuseColor=Color3.FromHexString('#bdbab3');concrete.specularColor=new Color3(.04,.04,.04);
 const H=schoolFence.height,pickets:Matrix[]=[],posts:Matrix[]=[],rails:Mesh[]=[],curbs:Mesh[]=[];
 const along=(x1:number,z1:number,x2:number,z2:number,y:number,h:number,t:number,list:Mesh[],name:string)=>{
  const length=Math.hypot(x2-x1,z2-z1),b=MeshBuilder.CreateBox(name,{width:length,height:h,depth:t},scene);b.position.set((x1+x2)/2,y,(z1+z2)/2);b.rotation.y=-Math.atan2(z2-z1,x2-x1);list.push(b);
 };
 function run(x1:number,z1:number,x2:number,z2:number,base:number,withPosts=true){
  const length=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.round(length/picketGap));
  for(let i=0;i<=n;i++){const t=i/n;pickets.push(Matrix.Translation(x1+(x2-x1)*t,base+H/2,z1+(z2-z1)*t))}
  if(withPosts){const m=Math.max(1,Math.round(length/postGap));for(let i=0;i<=m;i++){const t=i/m;posts.push(Matrix.Translation(x1+(x2-x1)*t,base+(H+.08)/2,z1+(z2-z1)*t))}}
  for(const y of [.18,H-.42,H-.14])along(x1,z1,x2,z2,base+y,.045,.045,rails,'school fence rail');
 }
 for(const r of schoolFenceRuns){run(r.x1,r.z1,r.x2,r.z2,curb);along(r.x1,r.z1,r.x2,r.z2,curb/2,curb,.32,curbs,'school fence curb')}
 // Open gate leaves: a heavier frame with the same pickets, standing just inside.
 for(const l of schoolGateLeaves){
  const z1=l.z+l.length/2,z2=l.z-l.length/2;run(l.x,z1,l.x,z2,.05,false);
  for(const z of [z1,z2])posts.push(Matrix.Translation(l.x,.05+(H+.08)/2,z));
  along(l.x,z1,l.x,z2,.05+H/2,.05,.06,rails,'school gate brace');
 }
 const picket=MeshBuilder.CreateBox('school fence pickets',{width:.026,height:H,depth:.026},scene);picket.material=metal;picket.isPickable=false;
 const buffer=new Float32Array(pickets.length*16);pickets.forEach((m,i)=>m.copyToArray(buffer,i*16));picket.thinInstanceSetBuffer('matrix',buffer,16);
 const post=MeshBuilder.CreateBox('school fence posts',{width:.09,height:H+.08,depth:.09},scene);post.material=metal;post.isPickable=false;
 const postBuffer=new Float32Array(posts.length*16);posts.forEach((m,i)=>m.copyToArray(postBuffer,i*16));post.thinInstanceSetBuffer('matrix',postBuffer,16);
 const railMesh=Mesh.MergeMeshes(rails,true,true)!;railMesh.name='school fence rails';railMesh.material=metal;
 const curbMesh=Mesh.MergeMeshes(curbs,true,true)!;curbMesh.name='school fence curb';curbMesh.material=concrete;
 // Brick gate pillars with stone caps, lamps and the school plaque.
 const brick=brickMaterial(scene),stone=new StandardMaterial('school pillar stone',scene);stone.diffuseColor=Color3.FromHexString('#c3bfb3');stone.specularColor=new Color3(.05,.05,.05);
 const lamp=new StandardMaterial('school gate lamp',scene);lamp.diffuseColor=Color3.FromHexString('#fff1c9');lamp.emissiveColor=new Color3(.95,.8,.45);
 const pillarParts:Mesh[]=[],caps:Mesh[]=[],lamps:Mesh[]=[];
 for(const p of schoolGatePillars){
  const b=MeshBuilder.CreateBox('school gate pillar',{width:.9,height:3,depth:.9,wrap:true,faceUV:brickUV(.9,3,.9)},scene);b.position.set(p.x,1.5,p.z);pillarParts.push(b);
  const cap=MeshBuilder.CreateBox('school pillar cap',{width:1.1,height:.16,depth:1.1},scene);cap.position.set(p.x,3.08,p.z);caps.push(cap);
  const top=MeshBuilder.CreateBox('school pillar cap top',{width:.8,height:.14,depth:.8},scene);top.position.set(p.x,3.23,p.z);caps.push(top);
  const globe=MeshBuilder.CreateSphere('school gate lamp',{diameter:.42,segments:10},scene);globe.position.set(p.x,3.52,p.z);lamps.push(globe);
 }
 const pillars=Mesh.MergeMeshes(pillarParts,true,true)!;pillars.material=brick;pillars.name='school gate pillars';
 const capMesh=Mesh.MergeMeshes(caps,true,true)!;capMesh.material=stone;capMesh.name='school pillar caps';
 const lampMesh=Mesh.MergeMeshes(lamps,true,true)!;lampMesh.material=lamp;lampMesh.name='school gate lamps';
 const plaque=MeshBuilder.CreatePlane('school gate plaque',{width:.72,height:.5},scene);plaque.material=canvasMaterial(scene,'school gate plaque',256,178,plaquePaint);
 const right=schoolGatePillars[1];plaque.position.set(right.x,1.75,right.z+.46);plaque.rotation.y=Math.PI;
 const meshes=[picket,post,railMesh,curbMesh,pillars,capMesh,lampMesh,plaque];
 for(const m of meshes){m.receiveShadows=true;m.isPickable=false}
 for(const m of [post,railMesh,pillars,capMesh])shadow.addShadowCaster(m);
 return {meshes};
}
