import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,TransformNode,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {outdoorBusStop} from './outdoor-layout';
type Paint=(c:CanvasRenderingContext2D,w:number,h:number)=>void;
function canvasMaterial(scene:Scene,name:string,w:number,h:number,paint:Paint,glow=0){
 const texture=new DynamicTexture(name,{width:w,height:h},scene,true),c=texture.getContext() as unknown as CanvasRenderingContext2D;paint(c,w,h);texture.update();
 const m=new StandardMaterial(name,scene);m.diffuseTexture=texture;m.specularColor=new Color3(.05,.05,.05);if(glow){m.emissiveTexture=texture;m.emissiveColor=new Color3(glow,glow,glow)}
 return m;
}
const poster:Paint=(c,w,h)=>{
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#f6c98a');sky.addColorStop(.55,'#fbe6c4');sky.addColorStop(1,'#f3d3a1');c.fillStyle=sky;c.fillRect(0,0,w,h);
 c.fillStyle='#8aa0a8';c.beginPath();c.moveTo(0,h*.72);c.lineTo(w*.3,h*.42);c.lineTo(w*.55,h*.62);c.lineTo(w*.78,h*.36);c.lineTo(w,h*.58);c.lineTo(w,h);c.lineTo(0,h);c.fill();
 c.fillStyle='#eef3f4';c.beginPath();c.moveTo(w*.78,h*.36);c.lineTo(w*.71,h*.45);c.lineTo(w*.85,h*.45);c.fill();
 c.fillStyle='#5c7f62';c.fillRect(0,h*.8,w,h*.2);
 c.fillStyle='#d9472f';c.fillRect(w*.18,h*.66,w*.5,h*.1);c.fillStyle='#bfe3f2';for(let i=0;i<4;i++)c.fillRect(w*(.21+i*.11),h*.675,w*.08,h*.04);
 c.fillStyle='#fff';c.font=`700 ${w*.1}px system-ui,sans-serif`;c.textAlign='center';c.fillText('ТИХИЙ ГОРОД',w/2,h*.13);
 c.font=`500 ${w*.065}px system-ui,sans-serif`;c.fillStyle='#6b4a2a';c.fillText('Автобус до школы',w/2,h*.21);
};
const routeMap:Paint=(c,w,h)=>{
 c.fillStyle='#eef2f2';c.fillRect(0,0,w,h);c.strokeStyle='#36594e';c.lineWidth=w*.025;c.beginPath();c.moveTo(w*.15,h*.25);c.lineTo(w*.15,h*.8);c.stroke();
 c.fillStyle='#36594e';c.font=`600 ${w*.075}px system-ui,sans-serif`;c.textAlign='left';
 [['Остановка',.28],['Дома',.46],['Магазин',.64],['Школа',.8]].forEach(([t,y])=>{c.beginPath();c.arc(w*.15,h*Number(y),w*.04,0,Math.PI*2);c.fill();c.fillText(String(t),w*.26,h*Number(y)+w*.025)});
 c.font=`700 ${w*.09}px system-ui,sans-serif`;c.fillText('Маршрут 1',w*.1,h*.13);
};
const stopSign:Paint=(c,w,h)=>{
 c.fillStyle='#fff';c.fillRect(0,0,w,h);c.fillStyle='#1f5fb4';c.fillRect(w*.05,h*.05,w*.9,h*.9);c.fillStyle='#fff';
 c.fillRect(w*.2,h*.3,w*.6,h*.32);c.fillStyle='#1f5fb4';for(let i=0;i<3;i++)c.fillRect(w*(.25+i*.18),h*.35,w*.13,h*.12);
 c.fillStyle='#fff';c.beginPath();c.arc(w*.32,h*.66,w*.07,0,Math.PI*2);c.arc(w*.68,h*.66,w*.07,0,Math.PI*2);c.fill();
};
const nameBoard:Paint=(c,w,h)=>{
 c.fillStyle='#f4f1e8';c.fillRect(0,0,w,h);c.fillStyle='#36594e';c.textAlign='center';c.font=`700 ${h*.42}px system-ui,sans-serif`;c.fillText('Остановка «Тихий город»',w/2,h*.62);
};
/** A timber shelter with a glowing soffit, glass back wall and a bench. */
export function buildBusStop(scene:Scene,shadow:ShadowGenerator){
 const root=new TransformNode('bus stop',scene);root.position.set(outdoorBusStop.x,0,outdoorBusStop.z);
 const mat=(name:string,c:Color3,alpha=1)=>{const m=new StandardMaterial('bus stop '+name,scene);m.diffuseColor=c;m.specularColor=new Color3(.06,.06,.06);if(alpha<1){m.alpha=alpha;m.backFaceCulling=false}return m};
 const wood=mat('timber',new Color3(.74,.46,.24)),concrete=mat('slab',new Color3(.7,.69,.66)),metal=mat('roof',new Color3(.46,.48,.5)),glass=mat('glass',new Color3(.75,.88,.92),.22),dark=mat('frame',new Color3(.16,.17,.18));
 const soffit=mat('soffit light',new Color3(.98,.74,.45));soffit.emissiveColor=new Color3(.9,.58,.28);
 const meshes:Mesh[]=[];
 const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial,cast=true)=>{const b=MeshBuilder.CreateBox('bus stop '+name,{width:w,height:h,depth:d},scene);b.parent=root;b.position.set(x,y,z);b.material=m;b.receiveShadows=true;if(cast)shadow.addShadowCaster(b);meshes.push(b);return b};
 // Printed faces are single-sided planes; rotY points their front (-z by default) outward.
 const face=(name:string,w:number,h:number,x:number,y:number,z:number,rotY:number,m:StandardMaterial)=>{const p=MeshBuilder.CreatePlane('bus stop '+name,{width:w,height:h},scene);p.parent=root;p.position.set(x,y,z);p.rotation.y=rotY;p.material=m;meshes.push(p);return p};
 box('slab',outdoorBusStop.w,.15,outdoorBusStop.d,0,.075,0,concrete,false);
 const back=-1.05,front=.95,side=2.05;
 for(const x of [-side,side]){box('front post',.14,2.62,.14,x,1.46,front,wood);box('back post',.14,2.48,.14,x,1.39,back,wood)}
 box('back post centre',.12,2.48,.12,0,1.39,back,wood);
 // Mono-pitch roof, high above the road side, with warm lights between the rafters.
 const roof=new TransformNode('bus stop roof',scene);roof.parent=root;roof.position.set(0,2.7,-.05);roof.rotation.x=-.07;
 const roofBox=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial,cast=true)=>{const b=box(name,w,h,d,x,y,z,m,cast);b.parent=roof;return b};
 roofBox('roof sheet',4.9,.07,3.05,0,.13,0,metal);roofBox('roof fascia',4.94,.16,.06,0,.1,1.53,metal);
 roofBox('front beam',4.5,.2,.14,0,-.04,1.0,wood);roofBox('back beam',4.5,.2,.14,0,-.04,-1.0,wood);
 for(let i=0;i<8;i++){const x=-2.1+i*.6;roofBox('rafter',.07,.14,3,x,.03,0,wood);if(i<7)roofBox('soffit light',.5,.02,2.7,x+.3,.08,0,soffit,false)}
 // Glass back wall with timber rails and the stop name.
 box('back rail low',4.1,.1,.1,0,.3,back,wood);box('back rail top',4.1,.12,.12,0,2.5,back,wood);
 for(const x of [-1.03,1.03])box('back glass',1.95,2.08,.02,x,1.38,back,glass,false);
 box('name board backing',1.84,.28,.03,-1.03,2.15,back+.02,dark,false);face('name board',1.8,.24,-1.03,2.15,back+.04,Math.PI,canvasMaterial(scene,'bus stop name board',512,68,nameBoard));
 face('timetable',.6,.8,1.2,1.5,back+.03,Math.PI,canvasMaterial(scene,'bus stop route map',256,340,routeMap));
 // Back-lit poster on the left and a glass side with the route map on the right.
 box('poster frame',.12,1.9,1.35,-side,1.2,-.3,dark);
 const ad=canvasMaterial(scene,'bus stop poster',256,368,poster,.85);face('poster',1.24,1.78,-side+.065,1.2,-.3,-Math.PI/2,ad);face('poster outside',1.24,1.78,-side-.065,1.2,-.3,Math.PI/2,ad);
 box('side glass',.02,2.05,1.35,side,1.37,-.3,glass,false);box('side rail',.1,.1,1.4,side,.3,-.3,wood);
 face('side map',.55,.7,side-.02,1.45,-.2,Math.PI/2,canvasMaterial(scene,'bus stop side map',256,330,routeMap));
 // Bench along the back wall.
 box('bench seat',2.4,.06,.42,-.25,.5,-.72,wood);box('bench back',2.4,.22,.04,-.25,.78,-.92,wood);
 for(const x of [-1.3,.8])box('bench leg',.08,.42,.36,x,.29,-.72,dark);
 // Bus stop sign at the kerb.
 const pole=MeshBuilder.CreateCylinder('bus stop sign pole',{height:2.6,diameter:.07,tessellation:10},scene);pole.parent=root;pole.position.set(2.75,1.3,4.15);pole.material=mat('pole',new Color3(.58,.6,.62));shadow.addShadowCaster(pole);meshes.push(pole);
 // Faces both directions of traffic.
 const signFace=canvasMaterial(scene,'bus stop sign face',128,128,stopSign);box('bus stop sign plate',.02,.57,.57,2.75,2.35,4.15,mat('sign plate',new Color3(.85,.86,.87)));
 for(const dir of [-1,1])face('sign',.55,.55,2.75+dir*.015,2.35,4.15,-dir*Math.PI/2,signFace);
 meshes.forEach(m=>m.isPickable=false);
 return {root,meshes};
}
