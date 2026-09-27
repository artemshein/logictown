import {Vector3,type ArcRotateCamera,type TransformNode,type AbstractMesh} from '@babylonjs/core';
import {blocksView} from './occlusion-math';
import {roomInfo,type RoomId} from './house-data';
import type {HouseRoom} from './house';

export function createWallOcclusion(rooms:Map<RoomId,HouseRoom>){
 const groups:{meshes:AbstractMesh[];boxes:{min:Vector3;max:Vector3}[];lastHit:number}[]=[];
 const structural=/wall|skirting|wainscot|molding|panel stile|chair rail|back cap|left cap|passage/;
 for(const [id,room] of rooms){
  const r=roomInfo[id];
  const planes=[{axis:'x' as const,value:-r.width/2},{axis:'x' as const,value:r.width/2},{axis:'z' as const,value:-r.depth/2},{axis:'z' as const,value:r.depth/2}];
  const buckets=planes.map(()=>({meshes:[] as AbstractMesh[],boxes:[] as {min:Vector3;max:Vector3}[],lastHit:-Infinity}));
  room.root.computeWorldMatrix(true);
  for(const mesh of room.root.getChildMeshes()){
   if(!mesh.isEnabled())continue;mesh.computeWorldMatrix(true);
   const bounds=mesh.getBoundingInfo().boundingBox,min=bounds.minimumWorld,max=bounds.maximumWorld;
   const localCenter=bounds.centerWorld.subtract(room.root.position);
   const isWall=structural.test(mesh.name)&&!mesh.name.includes('clock');
   // Include attached pictures, mirrors and shelves, but keep floor furniture.
   if(!isWall&&min.y<1.35)continue;
   let chosen=-1,distance=Infinity;
   planes.forEach((p,i)=>{const d=Math.abs(localCenter[p.axis]-p.value);if(d<distance){chosen=i;distance=d}});
   if(distance>(isWall?.3:.65))continue;
   const group=buckets[chosen];group.meshes.push(mesh);
   if(isWall){
    group.boxes.push({min:min.clone(),max:max.clone()});
    // Walls must occlude from both sides and participate in the depth buffer.
    if(mesh.material){const material=mesh.material.clone(mesh.material.name+' solid wall');if(material){material.backFaceCulling=false;material.disableDepthWrite=false;material.forceDepthWrite=true;mesh.material=material;}}
   }
  }
  groups.push(...buckets.filter(g=>g.boxes.length));
 }
 return (camera:ArcRotateCamera,girl:TransformNode,now:number)=>{
  const towardCamera=camera.position.subtract(camera.target).normalize();
  const right=Vector3.Cross(Vector3.Up(),towardCamera).normalize();
  const probes=[.25,.85,1.55].flatMap(y=>[-.3,0,.3].map(x=>girl.position.add(new Vector3(0,y,0)).add(right.scale(x))));
  for(const group of groups){
   if(group.boxes.some(b=>probes.some(p=>blocksView(p,towardCamera,b.min,b.max))))group.lastHit=now;
   const visible=now-group.lastHit>.2;
   for(const mesh of group.meshes)mesh.isVisible=visible;
  }
 };
}
