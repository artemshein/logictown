import {Color3,MeshBuilder,StandardMaterial,TransformNode,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {entries} from './layout';
import {roomInfo,type RoomId} from './house-data';
import type {HouseRoom} from './house';

// Northern leaves fold back against the wall; bathroom leaves open along the right jamb.
export function installOpenDoors(scene:Scene,shadow:ShadowGenerator,rooms:Map<RoomId,HouseRoom>){
 const paint=new StandardMaterial('interior door ivory paint',scene);paint.diffuseColor=Color3.FromHexString('#e3d6bb');
 const panel=new StandardMaterial('interior door recessed paint',scene);panel.diffuseColor=Color3.FromHexString('#c6c9b4');
 const brass=new StandardMaterial('interior door brass',scene);brass.diffuseColor=Color3.FromHexString('#b99a59');brass.specularColor=new Color3(.4,.32,.18);
 for(const [id,room] of rooms){
  if(id==='hall')continue;
  const gap=entries[id]!,south=id==='bathroom'||id==='toilet',edge=(south?1:-1)*roomInfo[id].depth/2;
  const hinge=new TransformNode(id+' open door hinge',scene);hinge.parent=room.root;
  hinge.position.set(gap+(south?.92:-.92),.08,edge-.2);hinge.rotation.y=south?-Math.PI/2:Math.PI;
  const direction=south?-1:1,width=1.82;
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material=paint){const m=MeshBuilder.CreateBox('interior door '+name+' '+id,{width:w,height:h,depth:d},scene);m.parent=hinge;m.position.set(x,y,z);m.material=material;m.receiveShadows=true;return m}
  const leaf=box('leaf',direction*width/2,1.32,0,width,2.64,.075);shadow.addShadowCaster(leaf);
  for(const side of [-1,1]){
   for(const [y,h] of [[.67,.86],[1.88,1.08]]){
    box('inset',direction*width/2,y,side*.041,width-.28,h,.012,panel);
    for(const x of [.12,width-.12])box('stile',direction*x,y,side*.056,.045,h+.09,.025);
    for(const yy of [y-h/2-.035,y+h/2+.035])box('rail',direction*width/2,yy,side*.056,width-.19,.045,.025);
   }
   box('handle plate',direction*(width-.17),1.22,side*.065,.065,.2,.025,brass);
   box('lever',direction*(width-.25),1.23,side*.11,.22,.035,.04,brass);
  }
  for(const y of [.3,1.3,2.3]){const m=MeshBuilder.CreateCylinder('interior door hinge '+id,{diameter:.065,height:.15,tessellation:12},scene);m.parent=hinge;m.position.set(0,y,.045);m.material=brass}
 }
}
