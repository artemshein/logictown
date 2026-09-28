import {Color3,DynamicTexture,StandardMaterial,Texture,VertexBuffer,type Scene,type Mesh} from '@babylonjs/core';
import type {HouseRoom} from './house';
import type {RoomId} from './house-data';

// Tileable, locally painted finishes. UVs use metres so adjoining walls keep the same scale.
export function applyWallFinishes(scene:Scene,rooms:Map<RoomId,HouseRoom>){
 let seed=7183;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function painted(name:string,base:string,kind:'plaster'|'paper'|'ceramic'){
  const n=kind==='ceramic'?128:512,texture=new DynamicTexture(name,{width:n,height:n},scene,true);
  const c=texture.getContext() as unknown as CanvasRenderingContext2D;
  const rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16)),data=c.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const u=x/n*Math.PI*2,v=y/n*Math.PI*2;
   const cloud=Math.sin(u+Math.sin(v))*Math.cos(v*2)+.5*Math.sin(u*3-v*2)+.25*Math.cos(u*7+v*5);
   const variation=cloud*(kind==='plaster'?1.4:kind==='ceramic'?2.7:1.2)+(random()-.5)*(kind==='plaster'?3:2);
   const i=(y*n+x)*4;for(let k=0;k<3;k++)data.data[i+k]=Math.max(0,Math.min(255,rgb[k]+variation));data.data[i+3]=255;
  }
  c.putImageData(data,0,0);
  if(kind==='paper'){
   for(let x=0;x<n;x+=32){c.fillStyle='#b3ad9310';c.fillRect(x,0,1,n)}
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const x=col*128+32+(row%2)*48,y=row*128+27;
    c.save();c.translate(x,y);c.rotate((col%2?1:-1)*.13);
    c.strokeStyle='#7f927e';c.lineWidth=1.25;c.beginPath();c.moveTo(0,40);c.quadraticCurveTo(-7,18,1,0);c.stroke();
    for(let k=0;k<4;k++){const side=k%2?1:-1;c.fillStyle=k%2?'#9ba88d':'#aeba9c';c.beginPath();c.ellipse(side*5,9+k*7,6,2.5,side*.65,0,Math.PI*2);c.fill()}
    c.fillStyle='#c6a393';for(let k=0;k<5;k++){c.beginPath();c.ellipse(1+Math.cos(k*1.256)*3,-2+Math.sin(k*1.256)*3,2.6,1.7,k*1.256,0,Math.PI*2);c.fill()}
    c.restore();
   }
  }
  if(kind==='ceramic'){
   const edge=c.createLinearGradient(0,0,n,0);edge.addColorStop(0,'#ffffff30');edge.addColorStop(.04,'#ffffff08');edge.addColorStop(.94,'#ffffff00');edge.addColorStop(1,'#4f62531a');c.fillStyle=edge;c.fillRect(0,0,n,n);
   c.strokeStyle='#ffffff20';c.lineWidth=2;c.strokeRect(2,2,n-4,n-4);
  }
  texture.update();texture.wrapU=texture.wrapV=Texture.WRAP_ADDRESSMODE;texture.anisotropicFilteringLevel=4;
  const m=new StandardMaterial(name,scene);m.diffuseTexture=texture;m.diffuseColor=Color3.White();m.specularColor=kind==='ceramic'?new Color3(.18,.19,.17):new Color3(.025,.025,.02);m.specularPower=kind==='ceramic'?75:12;return m;
 }
 const paper=painted('ivory wildflower wallpaper','#e0d8bf','paper');
 const plaster:Record<RoomId,StandardMaterial>={bedroom:paper,living:painted('living warm limewash','#cfbfa5','plaster'),kitchen:painted('kitchen oat plaster','#d8ceba','plaster'),bathroom:painted('bathroom chalk plaster','#c5d0c8','plaster'),toilet:painted('toilet linen plaster','#d4ccb5','plaster'),hall:painted('hall sand plaster','#d4c6ae','plaster')};
 const tilePalette:Partial<Record<RoomId,string[]>>={kitchen:['#dce1cd','#d4dbc6','#e0e2d1','#d8deca'],bathroom:['#92b5ae','#a0bfb5','#aac5bb','#9cbbb4'],toilet:['#d2be9e','#dccbad','#d6c3a5','#dfcfb4']};
 const tiles=new Map<RoomId,StandardMaterial[]>();for(const id of ['kitchen','bathroom','toilet'] as RoomId[])tiles.set(id,tilePalette[id]!.map((color,i)=>painted(id+' handmade glaze '+i,color,'ceramic')));
 function worldUV(mesh:Mesh){const p=mesh.getVerticesData(VertexBuffer.PositionKind),normals=mesh.getVerticesData(VertexBuffer.NormalKind);if(!p||!normals)return;const uv:number[]=[];for(let i=0;i<p.length;i+=3){const x=p[i]+mesh.position.x,y=p[i+1]+mesh.position.y,z=p[i+2]+mesh.position.z;uv.push((Math.abs(normals[i])>Math.abs(normals[i+2])?z:x)/1.6,y/1.6)}mesh.setVerticesData(VertexBuffer.UVKind,uv)}
 for(const [id,room] of rooms){let tileIndex=0;for(const abstract of room.root.getChildMeshes()){
   const mesh=abstract as Mesh,name=mesh.name;
   if(name.includes('glazed wall tile')){mesh.material=tiles.get(id)![tileIndex++%4];continue}
   if(name.includes('solid wall')||name==='back wall'||name==='left wall'||name==='bedroom open passage'||name===id+' back wall'||name===id+' left wall'||name===id+' open passage wall'||name===id+' cutaway right wall'){
    mesh.material=plaster[id];worldUV(mesh);
   }
  }
 }
}

