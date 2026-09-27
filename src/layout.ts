import {roomInfo,type RoomId} from './house-data';
export const layout:Record<RoomId,[number,number]>={bedroom:[0,0],living:[8,0],kitchen:[16,0],bathroom:[0,-10.2],toilet:[6,-9.6],hall:[8,-5.1]};
export const entries:Partial<Record<RoomId,number>>={bedroom:1.5,living:1.5,kitchen:1.5,bathroom:1.95,toilet:1.25};
roomInfo.hall.width=24;roomInfo.hall.depth=3.4;roomInfo.hall.spawn=[0,0];roomInfo.hall.obstacles=[{x:3,z:-.4,w:1.2,d:2.2}];
roomInfo.hall.description='Открытые проходы —\nи целый дом открытий.';
roomInfo.hall.story='Все комнаты соединены одним коридором. Выбери место на полу или название комнаты — Лея дойдёт туда сама.';
export function roomAt(x:number,z:number):RoomId|undefined{return (Object.keys(layout) as RoomId[]).find(id=>{const [ox,oz]=layout[id],r=roomInfo[id];return Math.abs(x-ox)<=r.width/2&&Math.abs(z-oz)<=r.depth/2})}
export function houseBlocked(x:number,z:number){
 const id=roomAt(x,z);if(!id)return true;const [ox,oz]=layout[id],r=roomInfo[id],lx=x-ox,lz=z-oz;
 if(r.obstacles.some(o=>Math.abs(lx-o.x)<o.w/2+.22&&Math.abs(lz-o.z)<o.d/2+.22))return true;
 if(id==='hall')return Math.abs(lx)>r.width/2-.25;
 const entry=entries[id]!,north=id==='bedroom'||id==='living'||id==='kitchen';
 if(Math.abs(lx)>r.width/2-.25)return true;
 if(north){if(lz>r.depth/2-.25)return true;if(lz< -r.depth/2+.25&&Math.abs(lx-entry)>.72)return true;}
 else {if(lz< -r.depth/2+.25)return true;if(lz>r.depth/2-.25&&Math.abs(lx-entry)>.72)return true;}
 return false;
}
export const navigation={step:.2,originX:-4,originZ:-13.6,nx:121,nz:86};
