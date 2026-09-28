import {Color3,DynamicTexture,Texture,type Scene,type StandardMaterial} from '@babylonjs/core';
import type {RoomId} from './house-data';

// One repeat spans 2 metres horizontally and the full 4-metre wall height.
// The lower finish therefore stays at the same height across separate wall segments.
export function addWallSurface(scene:Scene,id:RoomId,material:StandardMaterial,palette?:string[]){
 const width=512,height=1024,px=256;
 const base=material.diffuseTexture as DynamicTexture;
 const texture=new DynamicTexture(id+' complete wall finish',{width,height},scene,true);
 const c=texture.getContext() as unknown as CanvasRenderingContext2D;
 const source=base.getContext().canvas as unknown as HTMLCanvasElement;
 for(let y=0;y<height;y+=width)c.drawImage(source,0,y,width,width);
 let seed=931;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const lower=palette?1.8:1.24,top=height-lower*px;
 if(palette){
  c.fillStyle='#e8e1d2';c.fillRect(0,top,width,height-top);
  const tw=.5*px,th=.35*px;
  for(let row=0;row*th<lower*px;row++)for(let col=0;col<4;col++){
   const x=col*tw,y=height-(row+1)*th;
   c.save();c.beginPath();c.rect(0,top,width,height-top);c.clip();
   c.fillStyle=palette[(row*3+col)%palette.length];c.fillRect(x+2,y+2,tw-4,th-4);
   const glaze=c.createLinearGradient(x,y,x+tw,y+th);glaze.addColorStop(0,'#ffffff30');glaze.addColorStop(.35,'#ffffff08');glaze.addColorStop(1,'#35483b20');c.fillStyle=glaze;c.fillRect(x+3,y+3,tw-6,th-6);
   c.strokeStyle='#fff9e666';c.lineWidth=1.5;c.strokeRect(x+4,y+4,tw-8,th-8);c.restore();
  }
 }else{
  c.fillStyle=id==='hall'?'#b0b5a0':id==='living'?'#c4c1aa':'#c9caba';c.fillRect(0,top,width,height-top);
  for(let x=0;x<width;x+=width/3){
   c.strokeStyle='#56635240';c.lineWidth=2;c.strokeRect(x+14,top+20,width/3-28,height-top-54);
   c.strokeStyle='#fff5db66';c.strokeRect(x+17,top+23,width/3-28,height-top-54);
  }
 }
 // Dado rail and skirting; fine colour variation keeps large surfaces from looking flat.
 c.fillStyle=palette?'#e8e1d2':'#e3dfca';c.fillRect(0,top-7,width,12);c.fillRect(0,height-25,width,25);
 c.fillStyle='#ffffff66';c.fillRect(0,top-7,width,2);c.fillStyle='#5a604238';c.fillRect(0,top+5,width,3);
 for(let i=0;i<55000;i++){c.fillStyle=random()>.5?'#ffffff0c':'#403c2a0c';c.fillRect(random()*width,random()*height,1,1)}
 texture.update();texture.wrapU=Texture.WRAP_ADDRESSMODE;texture.wrapV=Texture.CLAMP_ADDRESSMODE;texture.anisotropicFilteringLevel=4;
 material.diffuseTexture=texture;material.backFaceCulling=false;

 // A small tangent-space normal map adds plaster grain and recessed grout in the light.
 const nw=128,nh=256,normal=new DynamicTexture(id+' wall relief',{width:nw,height:nh},scene,true);
 const nc=normal.getContext() as unknown as CanvasRenderingContext2D,data=nc.createImageData(nw,nh);
 const relief=(x:number,y:number)=>{
  const metres=(nh-y)/64;
  if(palette&&metres<lower){const u=((x%32)+32)%32,v=((nh-y)%22.4+22.4)%22.4;return u<.8||v<.8?0:2}
  return Math.sin(x*1.7+y*2.3)*.08;
 };
 for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){
  const dx=(relief(x-1,y)-relief(x+1,y))*.25,dy=(relief(x,y-1)-relief(x,y+1))*.25,n=Math.hypot(dx,dy,1),i=(y*nw+x)*4;
  data.data[i]=128+127*dx/n;data.data[i+1]=128+127*dy/n;data.data[i+2]=128+127/n;data.data[i+3]=255;
 }
 nc.putImageData(data,0,0);normal.update();normal.wrapU=Texture.WRAP_ADDRESSMODE;normal.wrapV=Texture.CLAMP_ADDRESSMODE;normal.level=.35;material.bumpTexture=normal;
 material.specularColor=palette?new Color3(.11,.12,.1):new Color3(.025,.025,.02);
 base.dispose();
}
