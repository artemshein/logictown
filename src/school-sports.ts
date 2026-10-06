import {Color3,Mesh,MeshBuilder,StandardMaterial,TransformNode,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {canvasMaterial} from './school-building';
import {schoolGoals,schoolLightPoles,schoolPitch,schoolStand,schoolTrack,schoolTrackOuter} from './school-layout';
const pxPerMetre=28;
/** Striped pitch inside a red six-lane track, painted on one alpha-tested ground. */
function paintField(c:CanvasRenderingContext2D,w:number,h:number){
 const k=w/(schoolTrack.straight+2*schoolTrackOuter),half=schoolTrack.straight/2;
 const X=(x:number)=>w/2+x*k,Y=(z:number)=>h/2-z*k,line=Math.max(1.6,.08*k);
 const stadium=(r:number)=>{c.beginPath();c.arc(X(half),Y(0),r*k,-Math.PI/2,Math.PI/2);c.arc(X(-half),Y(0),r*k,Math.PI/2,Math.PI*1.5);c.closePath()};
 c.clearRect(0,0,w,h);
 stadium(schoolTrackOuter);c.fillStyle='#b9503b';c.fill();
 // Fine rubber grain on the track.
 for(let i=0;i<9000;i++){c.fillStyle=i%2?'rgba(255,220,200,.07)':'rgba(70,20,10,.08)';c.fillRect(Math.random()*w,Math.random()*h,2,2)}
 c.save();stadium(schoolTrack.inner);c.clip();
 for(let x=-half-schoolTrack.inner,i=0;x<half+schoolTrack.inner;x+=5,i++){c.fillStyle=i%2?'#4f9a3f':'#5aa848';c.fillRect(X(x),0,5*k+1,h)}
 c.restore();
 c.strokeStyle='#f6f4ee';c.lineWidth=line;
 for(let i=0;i<=schoolTrack.lanes;i++){stadium(schoolTrack.inner+i*schoolTrack.lane);c.stroke()}
 // Finish line and lane numbers on the straight nearest the school.
 c.beginPath();c.moveTo(X(half-4),Y(schoolTrack.inner));c.lineTo(X(half-4),Y(schoolTrackOuter));c.lineWidth=line*2.5;c.stroke();c.lineWidth=line;
 c.fillStyle='#f6f4ee';c.font=`700 ${.7*k}px system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';
 for(let i=0;i<schoolTrack.lanes;i++){const z=schoolTrack.inner+(i+.5)*schoolTrack.lane;c.save();c.translate(X(half-5.2),Y(z));c.rotate(Math.PI/2);c.fillText(String(i+1),0,0);c.restore()}
 // Football markings.
 const pw=schoolPitch.w/2,pd=schoolPitch.d/2;
 const rect=(x1:number,z1:number,x2:number,z2:number)=>{c.strokeRect(X(Math.min(x1,x2)),Y(Math.max(z1,z2)),Math.abs(x2-x1)*k,Math.abs(z2-z1)*k)};
 const dot=(x:number,z:number)=>{c.beginPath();c.arc(X(x),Y(z),.18*k,0,Math.PI*2);c.fill()};
 rect(-pw,-pd,pw,pd);c.beginPath();c.moveTo(X(0),Y(pd));c.lineTo(X(0),Y(-pd));c.stroke();
 c.beginPath();c.arc(X(0),Y(0),5*k,0,Math.PI*2);c.stroke();dot(0,0);
 for(const s of [-1,1]){
  rect(s*pw,-10,s*(pw-9),10);rect(s*pw,-4.5,s*(pw-3),4.5);dot(s*(pw-6.5),0);
  const a=Math.acos(2.5/5);c.beginPath();if(s>0)c.arc(X(pw-6.5),Y(0),5*k,Math.PI-a,Math.PI+a);else c.arc(X(-pw+6.5),Y(0),5*k,-a,a);c.stroke();
  for(const t of [-1,1]){c.beginPath();c.arc(X(s*pw),Y(t*pd),.7*k,0,Math.PI*2);c.stroke()}
 }
}
const netPaint=(c:CanvasRenderingContext2D,w:number,h:number)=>{c.clearRect(0,0,w,h);c.strokeStyle='rgba(250,250,250,.85)';c.lineWidth=2;for(let x=0;x<=w;x+=16){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}};
export function buildSchoolSports(scene:Scene,shadow:ShadowGenerator){
 const meshes:Mesh[]=[];
 const W=schoolTrack.straight+2*schoolTrackOuter,H=2*schoolTrackOuter;
 const fieldMaterial=canvasMaterial(scene,'school track and pitch',Math.round(W*pxPerMetre),Math.round(H*pxPerMetre),paintField,true);fieldMaterial.backFaceCulling=true;fieldMaterial.specularColor=Color3.Black();
 const field=MeshBuilder.CreateGround('school track and football pitch',{width:W,height:H},scene);field.position.set(schoolTrack.x,.03,schoolTrack.z);field.material=fieldMaterial;field.receiveShadows=true;
 const mat=(name:string,hex:string,spec=.1)=>{const m=new StandardMaterial('school '+name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(spec,spec,spec);return m};
 const white=mat('goal frame','#f4f4f0',.3),alu=mat('stand aluminium','#c3c8cc',.35),frame=mat('stand frame','#6c7276',.2),deck=mat('stand deck','#8e959a',.2),pole=mat('floodlight pole','#8b9195',.25);
 const lamp=mat('floodlight lamps','#fffbe8');lamp.emissiveColor=new Color3(.75,.74,.66);
 const net=canvasMaterial(scene,'goal net',256,256,netPaint,true);net.specularColor=Color3.Black();
 const parts=new Map<StandardMaterial,Mesh[]>();const add=(m:Mesh,material:StandardMaterial)=>{m.material=material;const list=parts.get(material)??[];list.push(m);parts.set(material,list);return m};
 const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material:StandardMaterial)=>{const b=add(MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),material);b.position.set(x,y,z);return b};
 const bar=(name:string,length:number,x:number,y:number,z:number,axis:'x'|'y'|'z')=>{const b=add(MeshBuilder.CreateCylinder(name,{height:length,diameter:.12,tessellation:10},scene),white);b.position.set(x,y,z);if(axis==='x')b.rotation.z=Math.PI/2;if(axis==='z')b.rotation.x=Math.PI/2;return b};
 for(const g of schoolGoals){
  const back=g.x+g.side*g.depth;
  for(const t of [-1,1]){bar('goal post',g.h,g.x,g.h/2,g.z+t*g.w/2,'y');bar('goal back post',g.h,back,g.h/2,g.z+t*g.w/2,'y');bar('goal ground bar',g.depth,g.x+g.side*g.depth/2,.06,g.z+t*g.w/2,'x');
   bar('goal top stay',g.depth,g.x+g.side*g.depth/2,g.h,g.z+t*g.w/2,'x')}
  bar('goal crossbar',g.w+.12,g.x,g.h,g.z,'z');bar('goal back bar',g.w,back,.06,g.z,'z');bar('goal back top bar',g.w,back,g.h,g.z,'z');
  // Box-shaped net: back, sides and roof; double-sided alpha-tested planes.
  const plane=(w:number,h:number,x:number,y:number,z:number,ry:number,rx=0)=>{const p=MeshBuilder.CreatePlane('goal net',{width:w,height:h},scene);p.material=net;p.position.set(x,y,z);p.rotation.set(rx,ry,0);p.isPickable=false;meshes.push(p);return p};
  plane(g.w,g.h,back,g.h/2,g.z,Math.PI/2);
  for(const t of [-1,1])plane(g.depth,g.h,g.x+g.side*g.depth/2,g.h/2,g.z+t*g.w/2,0);
  plane(g.depth,g.w,g.x+g.side*g.depth/2,g.h,g.z,0,Math.PI/2);
 }
 // Aluminium bleachers on the far straight, rising away from the pitch.
 const s=schoolStand,rowDepth=s.d/s.rows,frontEdge=s.z+s.d/2;
 for(let i=0;i<s.rows;i++){
  const z=frontEdge-rowDepth*(i+.5),y=.45+i*.42;
  box('stand seat',s.w,.06,.34,s.x,y,z-.08,alu);box('stand footboard',s.w,.04,.5,s.x,y-.4,z+.16,alu);
  // Solid stepped deck under each row, so no grass shows through beneath the seats.
  const deckTop=y-.42;if(deckTop>.01)box('stand deck',s.w,deckTop,rowDepth,s.x,deckTop/2,z,deck);
  box('stand riser',s.w,.42,.04,s.x,deckTop+.21,z-rowDepth/2+.02,deck);
 }
 for(let x=-s.w/2+.3;x<=s.w/2;x+=s.w/6-.1){
  const leg=box('stand stringer',.08,.1,s.d*1.08,s.x+x,(.45+(s.rows-1)*.42)/2,s.z,frame);leg.rotation.x=Math.atan2(.42*(s.rows-1),s.d-rowDepth);
  for(let i=0;i<s.rows;i++){const y=.45+i*.42;box('stand leg',.07,y,.07,s.x+x,y/2,frontEdge-rowDepth*(i+.5),frame)}
 }
 const topY=.45+(s.rows-1)*.42;box('stand back rail',s.w,.05,.05,s.x,topY+1,s.z-s.d/2+.05,frame);
 for(let x=-s.w/2;x<=s.w/2+.01;x+=s.w/8)box('stand rail post',.05,1,.05,s.x+x,topY+.5,s.z-s.d/2+.05,frame);
 for(const t of [-1,1])box('stand side rail',.05,.05,s.d,s.x+t*s.w/2,topY+.6,s.z,frame);
 // Floodlight masts, lamp heads tilted towards the centre spot.
 for(const p of schoolLightPoles){
  const m=add(MeshBuilder.CreateCylinder('floodlight mast',{height:14,diameterTop:.22,diameterBottom:.4,tessellation:10},scene),pole);m.position.set(p.x,7,p.z);
  const head=new TransformNode('floodlight head',scene);head.position.set(p.x,14.2,p.z);head.rotation.y=Math.atan2(schoolTrack.x-p.x,schoolTrack.z-p.z);
  for(let r=0;r<2;r++)for(let c=0;c<3;c++){const housing=box('floodlight housing',.7,.55,.3,(c-1)*.8,r*.7,0,frame);housing.parent=head;housing.rotation.x=.45;const glass=box('floodlight lamp',.6,.45,.05,(c-1)*.8,r*.7-.07,.17,lamp);glass.parent=head;glass.rotation.x=.45}
  box('floodlight frame',2.6,.08,.08,p.x,14,p.z,pole).rotation.y=head.rotation.y;
 }
 for(const [material,list] of parts){
  const merged=Mesh.MergeMeshes(list,true,true);if(!merged)continue;
  merged.name=material.name;merged.receiveShadows=true;merged.isPickable=false;meshes.push(merged);if(material!==lamp)shadow.addShadowCaster(merged);
 }
 return {floors:[field],meshes};
}
