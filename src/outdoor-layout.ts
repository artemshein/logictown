import {outdoorHouseProfiles} from './outdoor-house-dimensions';
export type OutdoorPoint={x:number;z:number};
export type OutdoorObstacle={x:number;z:number;w:number;d:number;kind:string};
export const outdoorSpawn={x:0,z:-6.3};
// Native model proportions; each street-facing facade stays at its plot entrance.
export const outdoorHouseDimensions=outdoorHouseProfiles.a;
export const outdoorEntrance={x:0,z:-5.8};
export const outdoorDoor={x:0,z:-4.3};
export const outdoorSwing={x:4,z:11};
export const outdoorHomes=[{x:0,z:0,model:'a',angle:0},{x:-26,z:0,model:'b',angle:0},{x:26,z:0,model:'c',angle:0},{x:-52,z:0,model:'d',angle:0},{x:52,z:0,model:'b',angle:0},{x:-26,z:-35,model:'c',angle:Math.PI},{x:0,z:-35,model:'d',angle:Math.PI},{x:26,z:-35,model:'a',angle:Math.PI}].map(h=>{const dimensions=outdoorHouseProfiles[h.model as keyof typeof outdoorHouseProfiles];return {...h,...dimensions,z:h.angle===0?-4+dimensions.d/2:-31-dimensions.d/2}});
export const outdoorTrees=outdoorHomes.flatMap(home=>{
 const front=home.angle===0?-1:1,back=-front;
 return [
  {x:home.x-9,z:home.z+back*7,small:false},
  {x:home.x+9,z:home.z+back*4,small:false},
  {x:home.x-9,z:home.z+front*7,small:true},
  {x:home.x+9,z:home.z+front*7,small:true},
 ];
});
// Each plot has a street-facing opening and a gate leaf parked inside the garden.
export const outdoorFenceGroups:OutdoorObstacle[][]=outdoorHomes.map(home=>{
 const facing=home.angle===0?-1:1,front=home.angle===0?-12:-24,back=home.angle===0?14:-48;
 const mid=(front+back)/2,depth=Math.abs(front-back);
 return [
  {x:home.x-12,z:mid,w:.2,d:depth,kind:'fence'},
  {x:home.x+12,z:mid,w:.2,d:depth,kind:'fence'},
  {x:home.x,z:back,w:24,d:.2,kind:'fence'},
  {x:home.x-6.7,z:front,w:10.6,d:.2,kind:'fence'},
  {x:home.x+6.7,z:front,w:10.6,d:.2,kind:'fence'},
  {x:home.x+1.4,z:front-facing*1.4,w:.2,d:2.8,kind:'gate'},
 ];
});
export const outdoorFences=outdoorFenceGroups.flat();
export const outdoorObstacles:OutdoorObstacle[]=[
 ...outdoorHomes.map(h=>({...h,kind:'house'})),...outdoorFences,
 ...outdoorTrees.map(t=>({...t,w:t.small?.8:1.8,d:t.small?.8:1.8,kind:'tree'})),
 {...outdoorSwing,w:4,d:2.7,kind:'swing'},
];
export function outdoorBlocked(x:number,z:number){return x< -63||x>63||z< -48||z>15||outdoorObstacles.some(o=>Math.abs(x-o.x)<o.w/2+.25-1e-6&&Math.abs(z-o.z)<o.d/2+.25-1e-6)}
const step=.5,ox=-63,oz=-48,nx=253,nz=127;
const free=Array.from({length:nx*nz},(_,i)=>!outdoorBlocked(ox+i%nx*step,oz+Math.floor(i/nx)*step));
const point=(id:number):OutdoorPoint=>({x:ox+id%nx*step,z:oz+Math.floor(id/nx)*step});
const nearest=(p:OutdoorPoint)=>{let best=-1,dist=Infinity;for(let i=0;i<free.length;i++){if(!free[i])continue;const q=point(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<dist){best=i;dist=d}}return best};
export function outdoorPath(from:OutdoorPoint,to:OutdoorPoint):OutdoorPoint[]{
 const start=nearest(from),end=nearest(to),queue=[start],prev=new Int32Array(free.length).fill(-2);prev[start]=-1;
 for(let k=0;k<queue.length&&prev[end]===-2;k++){
  const id=queue[k],x=id%nx,z=Math.floor(id/nx);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,i=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[i]||prev[i]!==-2)continue;prev[i]=id;queue.push(i)}
 }
 if(prev[end]===-2)return [];
 const path=[];for(let id=end;id!==start;id=prev[id])path.push(point(id));return path.reverse();
}
export function outdoorCompanionTarget(lea:OutdoorPoint,heading:number){for(const side of [-1,1]){const p={x:lea.x+side*.9*Math.cos(heading)-.35*Math.sin(heading),z:lea.z-side*.9*Math.sin(heading)-.35*Math.cos(heading)};if(!outdoorBlocked(p.x,p.z))return p}return {...lea}}
