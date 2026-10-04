import {Color3,MultiMaterial,PBRMaterial,type Material,type AbstractMesh} from '@babylonjs/core';
// Muted paint colours, one combination per garden. Texture maps remain shared.
const palette=[
 {wall:'#d5dfd1',accent:'#829a92',fence:'#d4ddd0'},
 {wall:'#d6dee3',accent:'#8795a3',fence:'#b5c3cc'},
 {wall:'#e5d8c3',accent:'#9c9582',fence:'#d7cbb7'},
 {wall:'#dccdca',accent:'#a38b89',fence:'#c4b0ac'},
 {wall:'#d9d5df',accent:'#9690a2',fence:'#c5bfce'},
 {wall:'#d0dddc',accent:'#809a99',fence:'#b9cdca'},
 {wall:'#e5dfd1',accent:'#9b947d',fence:'#d7d1bf'},
 {wall:'#cdd9d2',accent:'#7d9389',fence:'#b3c4ba'},
];
export function createGardenPaint(plot:number){
 const colors=palette[plot%palette.length],cache=new Map<Material,Material>();
 function tint(material:Material):Material{
  const existing=cache.get(material);if(existing)return existing;
  if(material instanceof MultiMaterial){const copy=material.clone(material.name+' garden '+plot);cache.set(material,copy);copy.subMaterials=material.subMaterials.map(m=>m?tint(m):null);return copy}
  const name=material.name,color=name.includes('horizontal white clapboard')?colors.wall:name.includes('painted shutters')?colors.accent:name.includes('white painted pickets')||name.includes('warm timber frame')?colors.fence:undefined;
  if(!color||!(material instanceof PBRMaterial))return material;
  const copy=material.clone(name+' garden '+plot);copy.albedoColor=Color3.FromHexString(color).toLinearSpace();cache.set(material,copy);return copy;
 }
 return (meshes:AbstractMesh[])=>{for(const mesh of meshes)if(mesh.material)mesh.material=tint(mesh.material)};
}
