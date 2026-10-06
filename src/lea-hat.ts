import {Color3,DynamicTexture,Mesh,MeshBuilder,PBRMaterial,StandardMaterial,TransformNode,VertexBuffer,VertexData,type BaseTexture,type Scene,type ShadowGenerator} from '@babylonjs/core';
// Lea's beanie is part of her single mesh. Under it the model has only a face mask, so taking
// the hat off swaps in a modelled auburn hairdo (skull, bangs, side locks) bound to the head.
const storageKey='logictown-lea-hat';
export function readHatOn(){try{return localStorage.getItem(storageKey)!=='off'}catch{return true}}
function saveHatOn(on:boolean){try{localStorage.setItem(storageKey,on?'on':'off')}catch{}}
async function texturePixels(texture:BaseTexture){
 if(!texture.isReady())await new Promise<void>(resolve=>{const check=()=>texture.isReady()?resolve():setTimeout(check,50);check()});
 const size=texture.getSize(),pixels=await texture.readPixels();
 return pixels?{size,pixels:new Uint8Array(pixels.buffer,pixels.byteOffset,pixels.byteLength)}:undefined;
}
function strandTexture(scene:Scene){
 const t=new DynamicTexture('lea hair strands',{width:256,height:256},scene,true),c=t.getContext() as unknown as CanvasRenderingContext2D;
 const g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,'#a04a26');g.addColorStop(.5,'#b8582c');g.addColorStop(1,'#8a3d1f');c.fillStyle=g;c.fillRect(0,0,256,256);
 let seed=5;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 for(let i=0;i<220;i++){const x=rnd()*256;c.strokeStyle=rnd()<.5?`rgba(255,190,140,${.08+rnd()*.14})`:`rgba(60,20,8,${.08+rnd()*.14})`;c.lineWidth=1+rnd()*2;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+rnd()*8-4,90,x+rnd()*8-4,170,x+rnd()*6-3,256);c.stroke()}
 t.update();return t;
}
/** Mesh-local frame of Lea's body: x across, y towards the back of the head, z up. */
// The model is hollow behind its face mask and its irises have open patches: through them the eyes
// looked into whatever stood behind the head. A copy of each shell drawn from the inside only, in a
// dark teal, closes every gap without ever showing on the outside.
function interiorMaterial(scene:Scene){
 const mat=new StandardMaterial('Lea interior',scene);mat.disableLighting=true;mat.emissiveColor=Color3.FromHexString('#1d4449');mat.cullBackFaces=false;return mat;
}
function addInterior(mesh:Mesh,material:StandardMaterial){const inside=mesh.clone(mesh.name+' interior',mesh.parent,true)!;inside.material=material;inside.isPickable=false;return inside}
function buildHair(scene:Scene,body:Mesh,interior:StandardMaterial){
 const root=new TransformNode('Lea hair',scene);root.parent=body;
 const mat=new PBRMaterial('Lea copper auburn hair',scene);mat.albedoTexture=strandTexture(scene);mat.albedoColor=new Color3(1,1,1);mat.metallic=0;mat.roughness=.55;
 const meshes:Mesh[]=[];
 const add=(m:Mesh,parent:TransformNode=root)=>{m.parent=parent;m.material=mat;m.receiveShadows=true;meshes.push(m);return m};
 // A bob: rounded crown above, straight sides falling to the jaw line below. Under the brows the
 // front is pressed back behind the face mask (eyes stay clear) and the sides frame the cheeks.
 const skull=add(MeshBuilder.CreateSphere('Lea hair',{diameter:2,segments:32,updatable:true},scene));
 const unit=skull.getVerticesData(VertexBuffer.PositionKind)!,shaped=new Float32Array(unit.length),colors:number[]=[];
 const smooth=(a:number,b:number,v:number)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
 for(let i=0;i<unit.length;i+=3){
  const ux=unit[i],uy=unit[i+1],uz=unit[i+2];let x:number,y:number,z:number;
  if(uy>=0){x=ux*.148;y=.06-uz*.17;z=.88+uy*.15}
  else{const r=Math.hypot(ux,uz),g=Math.sqrt(1-uy**8),dx=r>1e-6?ux/r:0,dz=r>1e-6?uz/r:0;x=dx*g*.15;y=.06-dz*g*.17;z=.88+uy*.2}
  if(z<.895){
   const face=-.11+Math.min(1,(.895-z)/.095)*.11,limit=face+(-.06-face)*smooth(.115,.14,Math.abs(x));
   // The pressed-back part faces the eyes from inside the head: tint it like the interior.
   if(y<limit-.004){y=limit;colors.push(.11,.27,.29,1)}else{if(y<limit)y=limit;colors.push(1,1,1,1)}
  }else colors.push(1,1,1,1);
  shaped[i]=x;shaped[i+1]=y;shaped[i+2]=z;
 }
 const normals:number[]=[];VertexData.ComputeNormals(shaped,skull.getIndices()!,normals);
 skull.updateVerticesData(VertexBuffer.PositionKind,shaped);skull.updateVerticesData(VertexBuffer.NormalKind,normals);skull.setVerticesData(VertexBuffer.ColorKind,colors);skull.refreshBoundingInfo();
 addInterior(skull,interior);
 // A pointed lock: a flattened cone, wide at the hairline and tapering downwards.
 const lock=(x:number,y:number,top:number,length:number,width:number,lean:number,tilt=0)=>{
  const pivot=new TransformNode('Lea hair lock',scene);pivot.parent=root;pivot.position.set(x,y,top);pivot.rotation.set(tilt,lean,0);
  const cone=add(MeshBuilder.CreateCylinder('Lea hair lock',{height:length,diameterTop:width,diameterBottom:.004,tessellation:8},scene),pivot);
  cone.rotation.x=Math.PI/2;cone.position.z=-length/2;cone.scaling.z=.32;return cone;
 };
 // Bangs grow out of the front of the hair volume: each lock is rooted just inside its surface
 // at the hairline and runs down over the forehead to the brows, so no gap opens above them.
 const surface=(x:number,z:number)=>.06-.17*Math.sqrt(Math.max(0,1-(x/.148)**2-((z-.88)/.15)**2));
 const rooted=(x:number,rootZ:number,tipZ:number,tipY:number,width:number,lean:number)=>{
  const rootY=surface(x,rootZ)+.028,dy=tipY-rootY,dz=tipZ-rootZ,length=Math.hypot(dy,dz);
  lock(x,rootY,rootZ,length,width,lean,Math.asin(dy/length)).scaling.z=.5;
 };
 for(let i=-3;i<=3;i++){const x=i*.032;rooted(x,.95,.855-(i%2?.008:0),-.116+x*x*2.2,.06,-i*.04)}
 return {root,meshes};
}
export async function createLeaHat(scene:Scene,body:Mesh,head:TransformNode|undefined,shadow?:ShadowGenerator){
 const full=Array.from(body.getIndices()??[]);let bare:number[]|undefined;
 const interior=interiorMaterial(scene);addInterior(body,interior);
 const hair=buildHair(scene,body,interior);hair.meshes.forEach(m=>shadow?.addShadowCaster(m));
 body.computeWorldMatrix(true);head?.computeWorldMatrix(true);if(head)hair.root.setParent(head);
 let on=true;
 const apply=()=>{hair.root.setEnabled(!on&&!!bare);body.setIndices(on||!bare?full:bare)};
 apply();
 // Hat triangles are the green ones in the texture atlas (eyes are teal, so blue is excluded).
 try{
  const material=body.material as PBRMaterial|null,texture=material?.albedoTexture;
  const read=texture&&await texturePixels(texture);
  if(read){
   const uv=body.getVerticesData(VertexBuffer.UVKind)!,{size,pixels}=read,green=new Uint8Array(uv.length/2);
   for(let i=0;i<green.length;i++){const u=uv[i*2]-Math.floor(uv[i*2]),v=uv[i*2+1]-Math.floor(uv[i*2+1]),x=Math.min(size.width-1,Math.floor(u*size.width)),y=Math.min(size.height-1,Math.floor(v*size.height)),k=(y*size.width+x)*4;green[i]=pixels[k+1]>pixels[k]+25&&pixels[k+1]>pixels[k+2]+10?1:0}
   bare=[];for(let i=0;i<full.length;i+=3)if(green[full[i]]+green[full[i+1]]+green[full[i+2]]<2)bare.push(full[i],full[i+1],full[i+2]);
  }
 }catch(error){console.warn('Lea hat stays on: texture unreadable',error)}
 on=readHatOn();apply();
 return {
  get on(){return on},
  get removable(){return !!bare},
  set(next:boolean){if(!bare)return;on=next;saveHatOn(on);apply()},
  hair:hair.meshes,
 };
}
