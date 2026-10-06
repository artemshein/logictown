import {Color3,DynamicTexture,Mesh,MeshBuilder,PBRMaterial,TransformNode,VertexBuffer,VertexData,type BaseTexture,type Scene,type ShadowGenerator} from '@babylonjs/core';
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
function buildHair(scene:Scene,body:Mesh){
 const root=new TransformNode('Lea hair',scene);root.parent=body;
 const mat=new PBRMaterial('Lea copper auburn hair',scene);mat.albedoTexture=strandTexture(scene);mat.albedoColor=new Color3(1,1,1);mat.metallic=0;mat.roughness=.55;
 const meshes:Mesh[]=[];
 const add=(m:Mesh,parent:TransformNode=root)=>{m.parent=parent;m.material=mat;m.receiveShadows=true;meshes.push(m);return m};
 // One rounded volume from the brow line to the nape. Below the brows its front is pressed back
 // behind the face mask so the recessed eyes stay clear; that flattened part is never seen.
 const skull=add(MeshBuilder.CreateSphere('Lea hair',{diameter:2,segments:28,updatable:true},scene));
 const unit=skull.getVerticesData(VertexBuffer.PositionKind)!,shaped=new Float32Array(unit.length);
 for(let i=0;i<unit.length;i+=3){
  const x=unit[i]*.148,z=.88+unit[i+1]*.15;let y=.06-unit[i+2]*.17;
  const limit=z>=.895?-1:-.11+Math.min(1,(.895-z)/.095)*.11,width=1-Math.min(1,Math.max(0,(Math.abs(x)-.13)/.02));
  if(y<limit)y+=(limit-y)*width;
  shaped[i]=x;shaped[i+1]=y;shaped[i+2]=z;
 }
 const normals:number[]=[];VertexData.ComputeNormals(shaped,skull.getIndices()!,normals);
 skull.updateVerticesData(VertexBuffer.PositionKind,shaped);skull.updateVerticesData(VertexBuffer.NormalKind,normals);skull.refreshBoundingInfo();
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
 // Side locks fall in front of the ears from the temples.
 for(const s of [-1,1])rooted(s*.128,.9,.72,-.04,.048,-s*.03);
 return {root,meshes};
}
// The irises have open patches meant to show an eyeball the model lacks, and the head behind the
// face mask is hollow: hair or scenery showed through the eyes. A dark teal volume fills the head
// just behind the mask, so from any angle the eyes look into it. Hat on or off.
function buildEyeBacking(scene:Scene,body:Mesh){
 const mat=new PBRMaterial('Lea iris depth',scene);mat.albedoColor=Color3.White();mat.metallic=0;mat.roughness=.35;
 const e=MeshBuilder.CreateSphere('Lea eye backing',{diameter:1,segments:20},scene);e.parent=body;e.material=mat;e.isPickable=false;
 e.position.set(0,.02,.81);e.rotation.x=Math.PI/2;e.scaling.set(.26,.17,.16);
 // Teal straight behind the eyes, skin tone towards the temples where it can peek out under the hair.
 const iris=Color3.FromHexString('#1f5a60'),skin=Color3.FromHexString('#f2cdb8'),normals=e.getVerticesData(VertexBuffer.NormalKind)!,colors:number[]=[];
 for(let i=0;i<normals.length;i+=3){const t=Math.min(1,Math.max(0,(normals[i+2]-.35)/.35)),c=Color3.Lerp(skin,iris,t*t*(3-2*t));colors.push(c.r,c.g,c.b,1)}
 e.setVerticesData(VertexBuffer.ColorKind,colors);
 return e;
}
export async function createLeaHat(scene:Scene,body:Mesh,head:TransformNode|undefined,shadow?:ShadowGenerator){
 const full=Array.from(body.getIndices()??[]);let bare:number[]|undefined;
 const hair=buildHair(scene,body),eyes=buildEyeBacking(scene,body);hair.meshes.forEach(m=>shadow?.addShadowCaster(m));
 body.computeWorldMatrix(true);head?.computeWorldMatrix(true);if(head){hair.root.setParent(head);eyes.setParent(head)}
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
