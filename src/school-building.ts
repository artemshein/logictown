import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,Texture,TransformNode,Vector4,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {schoolBay,schoolBuilding,schoolFront,schoolSteps} from './school-layout';
type Paint=(c:CanvasRenderingContext2D,w:number,h:number)=>void;
export function canvasMaterial(scene:Scene,name:string,w:number,h:number,paint:Paint,alpha=false){
 const texture=new DynamicTexture(name,{width:w,height:h},scene,true),c=texture.getContext() as unknown as CanvasRenderingContext2D;paint(c,w,h);texture.update();texture.hasAlpha=alpha;
 const m=new StandardMaterial(name,scene);m.diffuseTexture=texture;m.specularColor=new Color3(.05,.05,.05);if(alpha)m.backFaceCulling=false;
 return m;
}
// Seeded noise keeps bricks and blinds identical on every load.
const random=(seed:number)=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
/** Running-bond red brick; one texture repeat covers brickTile metres. */
export const brickTile=2;
export function brickMaterial(scene:Scene){
 const m=canvasMaterial(scene,'school red brick',512,512,(c,w,h)=>{
  const rnd=random(7),courses=26,row=h/courses,brick=w/8;
  c.fillStyle='#cbbfae';c.fillRect(0,0,w,h);
  const tones=['#a4492f','#9b4129','#b0553a','#8f3a26','#a94e33','#97452e','#7e3524','#b45d3f'];
  for(let r=0;r<courses;r++)for(let i=-1;i<9;i++){
   const x=i*brick+(r%2?brick/2:0);c.fillStyle=tones[Math.floor(rnd()*tones.length)];c.fillRect(x+2,r*row+2,brick-4,row-3);
   c.fillStyle=`rgba(40,15,8,${rnd()*.12})`;c.fillRect(x+2,r*row+row*.55,brick-4,row*.45-1);
  }
 });
 m.diffuseTexture!.wrapU=m.diffuseTexture!.wrapV=Texture.WRAP_ADDRESSMODE;return m;
}
// Box UVs in metres so every brick face keeps the same coursing scale.
export function brickUV(w:number,h:number,d:number){const t=brickTile;return [new Vector4(0,0,w/t,h/t),new Vector4(0,0,w/t,h/t),new Vector4(0,0,d/t,h/t),new Vector4(0,0,d/t,h/t),new Vector4(0,0,w/t,d/t),new Vector4(0,0,w/t,d/t)]}
// White timber frames with tall lower sashes, a transom row and a few lowered blinds.
const windowPaint=(cols:number,transom:boolean,seed:number):Paint=>(c,w,h)=>{
 const rnd=random(seed),f=Math.max(5,w*.03),m=Math.max(4,Math.min(w,h)*.022),pane=(w-2*f-(cols-1)*m)/cols,split=transom?h*.3:0;
 c.fillStyle='#f3f1ea';c.fillRect(0,0,w,h);
 const glass=(x:number,y:number,pw:number,ph:number)=>{
  const g=c.createLinearGradient(x,y,x+pw*.4,y+ph);g.addColorStop(0,'#7b93a4');g.addColorStop(.45,'#3c4c59');g.addColorStop(1,'#273139');c.fillStyle=g;c.fillRect(x,y,pw,ph);
  c.fillStyle='rgba(255,255,255,.13)';c.beginPath();c.moveTo(x+pw*.15,y+ph);c.lineTo(x+pw*.55,y);c.lineTo(x+pw*.75,y);c.lineTo(x+pw*.35,y+ph);c.fill();
  if(rnd()<.18){c.fillStyle='#ebe5d4';c.fillRect(x,y,pw,ph*(.2+rnd()*.5))}
 };
 for(let i=0;i<cols;i++){
  const x=f+i*(pane+m);
  if(transom){glass(x,f,pane,split-f-m/2);const y=split+m/2,lh=h-f-y;glass(x,y,pane,lh/2-m/4);glass(x,y+lh/2+m/4,pane,lh/2-m/4)}
  else glass(x,f,pane,h-2*f);
 }
 c.strokeStyle='#c9c4b6';c.lineWidth=2;c.strokeRect(1,1,w-2,h-2);
};
// Stone portal with a fanlight arch over white double doors.
const entrancePaint:Paint=(c,w,h)=>{
 c.fillStyle='#c9c5ba';c.fillRect(0,0,w,h);c.strokeStyle='#b3aea1';c.lineWidth=2;
 for(let y=h*.12;y<h;y+=h*.12){c.beginPath();c.moveTo(0,y);c.lineTo(w*.08,y);c.moveTo(w*.92,y);c.lineTo(w,y);c.stroke()}
 const cx=w/2,top=h*.36,r=w*.36;
 // Voussoirs and keystone around the arch.
 c.fillStyle='#bdb8ab';c.beginPath();c.arc(cx,top,r+w*.07,Math.PI,0);c.lineTo(cx+r+w*.07,h);c.lineTo(cx+r,h);c.lineTo(cx+r,top);c.arc(cx,top,r,0,Math.PI,true);c.lineTo(cx-r,h);c.lineTo(cx-r-w*.07,h);c.fill();
 c.strokeStyle='#a39e91';for(let a=0;a<=12;a++){const t=Math.PI+a*Math.PI/12;c.beginPath();c.moveTo(cx+Math.cos(t)*r,top+Math.sin(t)*r);c.lineTo(cx+Math.cos(t)*(r+w*.07),top+Math.sin(t)*(r+w*.07));c.stroke()}
 c.fillStyle='#d6d2c7';c.fillRect(cx-w*.045,top-r-w*.085,w*.09,w*.11);
 c.fillStyle='#2a2d30';c.beginPath();c.arc(cx,top,r,Math.PI,0);c.lineTo(cx+r,h);c.lineTo(cx-r,h);c.fill();
 // Fanlight.
 const fr=r*.88,fy=top+h*.06;const g=c.createLinearGradient(0,fy-fr,0,fy);g.addColorStop(0,'#6f8798');g.addColorStop(1,'#2f3b45');
 c.fillStyle=g;c.beginPath();c.arc(cx,fy,fr,Math.PI,0);c.fill();c.strokeStyle='#f1efe9';c.lineWidth=w*.014;c.beginPath();c.arc(cx,fy,fr,Math.PI,0);c.closePath();c.stroke();
 for(let a=1;a<6;a++){const t=Math.PI+a*Math.PI/6;c.beginPath();c.moveTo(cx,fy);c.lineTo(cx+Math.cos(t)*fr,fy+Math.sin(t)*fr);c.stroke()}
 c.beginPath();c.arc(cx,fy,fr*.3,Math.PI,0);c.stroke();
 // Double doors with glazed upper panels.
 const dl=cx-fr,dw=fr*2,dt=fy+w*.01;c.fillStyle='#f1efe9';c.fillRect(dl,dt,dw,h-dt);
 for(const x of [dl+dw*.08,dl+dw*.54]){const pw=dw*.38;c.fillStyle='#3a4852';c.fillRect(x,dt+h*.04,pw,h*.26);c.fillStyle='#f1efe9';c.fillRect(x+pw/2-2,dt+h*.04,4,h*.26);c.fillRect(x,dt+h*.17-2,pw,4);c.strokeStyle='#d5d1c6';c.lineWidth=3;c.strokeRect(x,dt+h*.36,pw,h-dt-h*.42)}
 c.fillStyle='#c9c4b8';c.fillRect(cx-2,dt,4,h-dt);c.fillStyle='#55585a';c.fillRect(cx-w*.04,dt+h*.38,w*.025,h*.05);c.fillRect(cx+w*.015,dt+h*.38,w*.025,h*.05);
};
const signPaint:Paint=(c,w,h)=>{
 c.fillStyle='#d8d4c9';c.fillRect(0,0,w,h);c.strokeStyle='#a9a497';c.lineWidth=h*.06;c.strokeRect(h*.08,h*.08,w-h*.16,h-h*.16);
 c.fillStyle='#3b4040';c.textAlign='center';c.textBaseline='middle';c.font=`700 ${h*.5}px Georgia,'Times New Roman',serif`;c.fillText('Ш К О Л А   № 1',w/2,h*.55,w*.9);
};
const backDoorPaint:Paint=(c,w,h)=>{
 c.fillStyle='#f1efe9';c.fillRect(0,0,w,h);c.fillStyle='#3a4852';c.fillRect(w*.1,h*.06,w*.8,h*.2);c.fillRect(w*.14,h*.33,w*.32,h*.3);c.fillRect(w*.54,h*.33,w*.32,h*.3);
 c.fillStyle='#d5d1c6';c.fillRect(w*.49,h*.3,w*.02,h*.7);c.fillStyle='#55585a';c.fillRect(w*.4,h*.68,w*.06,h*.04);
};
/** The red-brick school: stone basement, white multi-pane windows and a gabled entrance bay. */
export function buildSchoolBuilding(scene:Scene,shadow:ShadowGenerator){
 const root=new TransformNode('school building',scene);root.position.set(schoolBuilding.x,0,schoolBuilding.z);
 const mat=(name:string,hex:string,spec=.05)=>{const m=new StandardMaterial('school '+name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(spec,spec,spec);return m};
 const brick=brickMaterial(scene),stone=mat('stone','#c3bfb3'),basement=mat('basement stone','#9b978e'),roof=mat('roof','#4c4f52'),metal=mat('dark metal','#25282a',.3),step=mat('concrete steps','#b4b1aa');
 const lamp=mat('lantern glass','#fff1c9');lamp.emissiveColor=new Color3(.95,.8,.45);
 const hedge=mat('hedge','#4d7535');hedge.diffuseColor=new Color3(.3,.47,.2);
 const windows={wide:canvasMaterial(scene,'school wide window',512,256,windowPaint(6,true,3)),wideB:canvasMaterial(scene,'school wide window b',512,256,windowPaint(6,true,11)),narrow:canvasMaterial(scene,'school narrow window',128,256,windowPaint(2,true,5)),side:canvasMaterial(scene,'school side window',256,256,windowPaint(4,true,9)),basement:canvasMaterial(scene,'school basement window',256,80,windowPaint(3,false,13))};
 const groups=new Map<StandardMaterial,Mesh[]>();const add=(m:Mesh,material:StandardMaterial,parent:TransformNode=root)=>{m.parent=parent;m.material=material;const list=groups.get(material)??[];list.push(m);groups.set(material,list);return m};
 const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material:StandardMaterial,parent?:TransformNode)=>{const b=add(MeshBuilder.CreateBox('school '+name,{width:w,height:h,depth:d,wrap:true,faceUV:material===brick?brickUV(w,h,d):undefined},scene),material,parent);b.position.set(x,y,z);return b};
 const W=schoolBuilding.w,D=schoolBuilding.d,front=D/2,bayFront=front+schoolBay.depth,bayZ=front+schoolBay.depth/2,bw=schoolBay.w;
 // Facades face +z (road), -z (field), +x and -x; planes face -z unless rotated.
 type Side='front'|'back'|'right'|'left';
 const face=(side:Side,along:number,offset=0)=>side==='front'?{x:along,z:front+offset,rot:Math.PI}:side==='back'?{x:along,z:-front-offset,rot:0}:side==='right'?{x:W/2+offset,z:along,rot:-Math.PI/2}:{x:-W/2-offset,z:along,rot:Math.PI/2};
 function opening(name:string,side:Side,along:number,y:number,w:number,h:number,material:StandardMaterial,base=0,trim=true){
  const p=face(side,along,base+.02),plane=add(MeshBuilder.CreatePlane('school '+name,{width:w,height:h},scene),material);plane.position.set(p.x,y+h/2,p.z);plane.rotation.y=p.rot;
  if(!trim)return;
  const sill=face(side,along,base+.08),lintel=face(side,along,base+.04);
  const s=box(name+' sill',w+.24,.1,.16,sill.x,y-.05,sill.z,stone);s.rotation.y=p.rot;
  const l=box(name+' lintel',w+.36,.2,.08,lintel.x,y+h+.12,lintel.z,stone);l.rotation.y=p.rot;
 }
 // Body, stone basement, string courses, cornice and parapet.
 box('basement',W+.1,1.5,D+.1,0,.75,0,basement);box('brick body',W,8,D,0,5.5,0,brick);
 box('water table',W+.18,.14,D+.18,0,1.52,0,stone);box('string course',W+.16,.2,D+.16,0,5.05,0,stone);box('cornice',W+.5,.3,D+.5,0,9.35,0,stone);
 for(const [w,d,x,z] of [[W,.3,0,front-.15],[W,.3,0,-front+.15],[.3,D,W/2-.15,0],[.3,D,-W/2+.15,0]] as const){box('parapet',w,.7,d,x,9.85,z,brick);box('parapet coping',w+.12,.08,d+.12,x,10.24,z,stone)}
 box('flat roof',W-.6,.06,D-.6,0,9.53,0,roof);
 for(const x of [-12,11])box('roof ventilation unit',3,1.1,2,x,10.05,-2.5,mat('roof unit','#9aa0a3',.2));
 // Entrance bay rises above the parapet into a low brick gable with a stone medallion.
 box('bay basement',bw+.1,1.5,schoolBay.depth+.1,0,.75,bayZ,basement);box('bay brick',bw,schoolBay.h-1.5,schoolBay.depth,0,1.5+(schoolBay.h-1.5)/2,bayZ,brick);
 box('bay string course',bw+.16,.2,schoolBay.depth+.08,0,5.05,bayZ+.04,stone);box('bay cornice',bw+.5,.3,schoolBay.depth+.25,0,9.35,bayZ+.125,stone);
 const gableH=1.3,gable=new TransformNode('school gable',scene);gable.parent=root;gable.position.set(0,schoolBay.h,bayZ);gable.scaling.set(bw/Math.SQRT2,gableH*Math.SQRT2,1);
 box('gable',1,1,schoolBay.depth,0,0,0,brick,gable).rotation.z=Math.PI/4;
 const slope=Math.atan2(gableH,bw/2),run=Math.hypot(gableH,bw/2)+.2;
 for(const s of [-1,1]){const c=box('gable coping',run,.14,schoolBay.depth+.16,s*bw/4,schoolBay.h+gableH/2+.06,bayZ,stone);c.rotation.z=-s*slope}
 box('bay coping',bw+.16,.1,schoolBay.depth+.16,0,schoolBay.h,bayZ,stone);
 const medallion=add(MeshBuilder.CreateCylinder('school medallion',{diameter:.75,height:.1,tessellation:24},scene),stone);medallion.rotation.x=Math.PI/2;medallion.position.set(0,schoolBay.h+.45,bayFront+.06);
 // Windows: narrow and wide groups on both wings, two storeys plus basement lights.
 const wing=[{x:7.8,w:1.5,m:windows.narrow},{x:12.6,w:5.2,m:windows.wide},{x:18.6,w:5.2,m:windows.wideB},{x:22.6,w:1.5,m:windows.narrow}];
 for(const side of ['front','back'] as const)for(const s of [-1,1])for(const win of wing){
  opening('window ground floor',side,s*win.x,2,win.w,2.6,win.m);opening('window first floor',side,s*win.x,5.6,win.w,2.6,s>0?win.m:win.m===windows.wide?windows.wideB:win.m===windows.wideB?windows.wide:win.m);
  if(win.w>2)opening('basement window',side,s*win.x,.45,2.4,.75,windows.basement,.05,false);
 }
 opening('back centre window',"back",0,5.6,4.4,2.6,windows.wide);
 opening('back door','back',0,0,1.9,2.7,canvasMaterial(scene,'school back door',192,272,backDoorPaint),.1,false);
 box('back door canopy',2.6,.12,1.1,0,2.95,-front-.55,metal);box('back door landing',3,.16,1.6,0,.08,-front-.8,step);
 for(const side of ['right','left'] as const)for(const z of [-3.2,3.2]){opening('side window',side,z,2,3,2.6,windows.side);opening('side window upper',side,z,5.6,3,2.6,windows.side)}
 // Entrance: stone portal, arched doors, school name, lanterns and steps.
 box('portal',5,5,.3,0,2.5,bayFront+.15,stone);
 const door=add(MeshBuilder.CreatePlane('school entrance',{width:3.4,height:4.25},scene),canvasMaterial(scene,'school entrance arch',512,640,entrancePaint));door.position.set(0,.6+4.25/2,bayFront+.31);door.rotation.y=Math.PI;
 box('name plate',3.8,.62,.12,0,5.3,bayFront+.06,stone);
 const sign=add(MeshBuilder.CreatePlane('school name',{width:3.6,height:.52},scene),canvasMaterial(scene,'school name sign',768,112,signPaint));sign.position.set(0,5.3,bayFront+.125);sign.rotation.y=Math.PI;
 opening('bay window',"front",0,5.95,4.4,2.4,windows.wide,schoolBay.depth);
 for(const s of [-1,1]){box('lantern bracket',.08,.08,.3,s*3,3.5,bayFront+.3,metal);box('lantern',.26,.42,.26,s*3,3.3,bayFront+.5,metal);box('lantern glass',.2,.3,.2,s*3,3.3,bayFront+.5,lamp).scaling.set(1.05,1,1.05)}
 const stepsBack=bayFront,stepsDepth=schoolSteps.d;
 for(let i=0;i<4;i++){const d=stepsDepth-i*.6;box('entrance step',schoolSteps.w-i*.2,.15*(i+1),d,0,.075*(i+1),stepsBack+d/2,step)}
 for(const s of [-1,1])box('step cheek wall',.4,.8,stepsDepth,s*(schoolSteps.w/2+.2),.4,stepsBack+stepsDepth/2,stone);
 // Clipped shrubs along the foundation and bins by the steps.
 const rnd=random(21);
 for(const s of [-1,1])for(let x=7.2;x<23.5;x+=1.45){const b=add(MeshBuilder.CreateSphere('school shrub',{diameter:1,segments:8},scene),hedge);const k=.85+rnd()*.35;b.scaling.set(1.25*k,.9*k,1*k);b.position.set(s*x,.35*k,front+.75)}
 for(const s of [-1,1]){const bin=add(MeshBuilder.CreateCylinder('school bin',{diameter:.55,height:.85,tessellation:14},scene),metal);bin.position.set(s*(schoolSteps.w/2+1),.43,bayFront+stepsDepth-.3)}
 const meshes:Mesh[]=[];
 for(const [material,list] of groups){
  const merged=Mesh.MergeMeshes(list,true,true);if(!merged)continue;
  merged.name=material.name;merged.receiveShadows=true;merged.isPickable=false;meshes.push(merged);
  if(!(material.diffuseTexture instanceof DynamicTexture)||material===brick)shadow.addShadowCaster(merged);
 }
 root.dispose();
 return {meshes};
}
