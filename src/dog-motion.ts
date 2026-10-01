import {houseBlocked,navigation} from './layout';
export type GroundPoint={x:number;z:number};
export const dogBlocked=(x:number,z:number)=>x>=19.7
 ? z< -8.0||z> -2.2||x>26.5||(x<20.3&&Math.abs(z+5.1)>.5)
 :houseBlocked(x,z);
const {step,originX,originZ,nz}=navigation;
const nx=154;
const free=Array.from({length:nx*nz},(_,i)=>!dogBlocked(originX+i%nx*step,originZ+Math.floor(i/nx)*step));
const point=(i:number):GroundPoint=>({x:originX+i%nx*step,z:originZ+Math.floor(i/nx)*step});
export function nearestDogPoint(p:GroundPoint){let best=-1,distance=Infinity;for(let i=0;i<free.length;i++){if(!free[i])continue;const q=point(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<distance){best=i;distance=d}}return best}
export function dogPath(from:GroundPoint,to:GroundPoint):GroundPoint[]{
 const start=nearestDogPoint(from),end=nearestDogPoint(to),previous=new Int32Array(free.length).fill(-2),queue=[start];previous[start]=-1;
 for(let k=0;k<queue.length&&previous[end]===-2;k++){
  const cur=queue[k],x=cur%nx,z=Math.floor(cur/nx);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,id=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[id]||previous[id]!==-2)continue;previous[id]=cur;queue.push(id)}
 }
 if(previous[end]===-2)return [];
 const route=[];for(let i=end;i!==start;i=previous[i])route.push(point(i));return route.reverse();
}
export function companionTarget(lea:GroundPoint,heading:number):GroundPoint{
 for(const side of [-1,1]){const p={x:lea.x+side*.85*Math.cos(heading)-.3*Math.sin(heading),z:lea.z-side*.85*Math.sin(heading)-.3*Math.cos(heading)};if(!dogBlocked(p.x,p.z)&&(lea.x>=19.7||p.x<19.7))return p}
 return {x:lea.x-.85*Math.sin(heading),z:lea.z-.85*Math.cos(heading)};
}
export function createDogMotion(start:GroundPoint){
 const position={...start};let route:GroundPoint[]=[],replan=0,still=0,last={...start},goal={...start};
 return {position,update(dt:number,lea:GroundPoint,heading:number,moving:boolean){
  still=moving?0:still+dt;replan-=dt;
  const target=companionTarget(lea,heading),changed=Math.hypot(target.x-goal.x,target.z-goal.z)>.35;
  if(replan<=0&&(changed||!route.length&&Math.hypot(position.x-target.x,position.z-target.z)>.35)){
   route=dogPath(position,target);goal=target;replan=.6;
  }
  let budget=dt*(Math.hypot(position.x-lea.x,position.z-lea.z)>2?3.8:3.1);
  while(route.length&&budget>0){const p=route[0],d=Math.hypot(p.x-position.x,p.z-position.z),s=Math.min(d,budget);if(d<.001){route.shift();continue}const x=position.x+(p.x-position.x)*s/d,z=position.z+(p.z-position.z)*s/d;if(dogBlocked(x,z)){route=[];break}position.x=x;position.z=z;budget-=s;if(s===d)route.shift()}
  const walked=Math.hypot(position.x-last.x,position.z-last.z)>.00001;
  const facing=walked?Math.atan2(position.x-last.x,position.z-last.z):Math.atan2(lea.x-position.x,lea.z-position.z);last={...position};
  return {walked,facing,sitting:!walked&&still>.8&&Math.hypot(position.x-lea.x,position.z-lea.z)<1.65};
 }};
}
