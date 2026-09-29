import {Color3,MeshBuilder,PBRMaterial,Texture,VertexBuffer,type Mesh,type Scene} from '@babylonjs/core';
import type {HouseRoom} from './house';
import type {RoomId} from './house-data';

export function installCarpets(scene:Scene,rooms:Map<RoomId,HouseRoom>){
 const materials=new Map<string,PBRMaterial>();
 function fabric(id:string){
  if(materials.has(id))return materials.get(id)!;
  const m=new PBRMaterial('woven rug '+id,scene);
  const map=(name:string)=>{const t=new Texture(`/assets/carpets/${id}/${name}.jpg`,scene);t.anisotropicFilteringLevel=8;return t};
  m.albedoTexture=map('Color');m.bumpTexture=map('NormalGL');m.bumpTexture.level=.35;
  m.metallicTexture=map('Roughness');m.metallicTexture.gammaSpace=false;
  m.useRoughnessFromMetallicTextureAlpha=false;m.useRoughnessFromMetallicTextureGreen=true;m.useMetallnessFromMetallicTextureBlue=false;
  m.metallic=0;m.roughness=1;m.environmentIntensity=.4;materials.set(id,m);return m;
 }
 for(const [id,room] of rooms){
  const original=room.root.getChildMeshes().find(m=>/^(round woven rug|.+ woven carpet)$/.test(m.name)) as Mesh|undefined;
  if(!original)continue;
  const blue=id==='bedroom'||id==='bathroom',m=fabric(blue?'Carpet005':'Carpet008');
  const edge=new PBRMaterial(id+' rug binding',scene);edge.albedoColor=Color3.FromHexString(blue?'#344e57':'#78664d');edge.metallic=0;edge.roughness=1;
  const p=original.position.clone(),bounds=original.getBoundingInfo().boundingBox;
  let w=(bounds.maximum.x-bounds.minimum.x)*original.scaling.x,d=(bounds.maximum.z-bounds.minimum.z)*original.scaling.z;
  if(id==='hall'){w=18;d=1.65}
  original.setEnabled(false);
  for(const old of room.root.getChildMeshes())if(/^(woven ring|rug fringe)$/.test(old.name))old.setEnabled(false);
  const round=id==='bedroom';
  const make=(name:string,width:number,depth:number,height:number,y:number)=>{
   const mesh=round?MeshBuilder.CreateCylinder(name,{diameter:1,height,tessellation:96},scene):MeshBuilder.CreateBox(name,{width:1,depth:1,height},scene);
   mesh.scaling.set(width,1,depth);mesh.position.set(p.x,y,p.z);mesh.parent=room.root;mesh.receiveShadows=true;
   return mesh;
  };
  const base=make(id+' bound rug',w,d,.025,.073);base.material=edge;
  const pile=make(id+' patterned rug',w-.10,d-.10,.018,.091);pile.material=m;
  // Keep the photographed weave at the same physical scale, including the long runner.
  const positions=pile.getVerticesData(VertexBuffer.PositionKind)!;
  const uv:number[]=[];
  for(let i=0;i<positions.length;i+=3)uv.push(positions[i]*(w-.1)/2+.5,positions[i+2]*(d-.1)/2+.5);
  pile.setVerticesData(VertexBuffer.UVKind,uv);
 }
}
