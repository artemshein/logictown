export type OutdoorPoint={x:number;z:number};
export type OutdoorObstacle={x:number;z:number;w:number;d:number;kind:string};
export const outdoorSpawn={x:0,z:-6.3};
export const outdoorHomes=[{x:0,z:0,model:'a',angle:0},{x:-26,z:0,model:'b',angle:0},{x:26,z:0,model:'c',angle:0},{x:-52,z:0,model:'d',angle:0},{x:52,z:0,model:'b',angle:0},{x:-26,z:-35,model:'c',angle:Math.PI},{x:0,z:-35,model:'d',angle:Math.PI},{x:26,z:-35,model:'a',angle:Math.PI}];
export const outdoorTrees=[{x:-8,z:8,small:false},{x:8,z:3,small:false},{x:-8,z:-5,small:true},{x:7,z:12,small:true},...[-52,-26,26,52].flatMap(x=>[{x:x-7,z:7,small:false},{x:x+7,z:-6,small:true}]),...[-48,-12,15,46].map(x=>({x,z:-43,small:false}))];
export const outdoorFences:OutdoorObstacle[]=[
 {x:-12,z:1,w:.2,d:26,kind:'fence'},{x:12,z:1,w:.2,d:26,kind:'fence'},
 {x:0,z:14,w:24,d:.2,kind:'fence'},
 {x:-6.7,z:-12,w:10.6,d:.2,kind:'fence'},{x:6.7,z:-12,w:10.6,d:.2,kind:'fence'},
 // Gate is already open, parked beside the right post inside the yard.
 {x:1.4,z:-10.6,w:.2,d:2.8,kind:'gate'},
];
export const outdoorObstacles:OutdoorObstacle[]=[
 ...outdoorHomes.map(h=>({...h,w:9,d:8,kind:'house'})),...outdoorFences,
 ...outdoorTrees.map(t=>({...t,w:.6,d:.6,kind:'tree'})),
 {x:4,z:9,w:4,d:2.7,kind:'swing'},
];
export function outdoorBlocked(x:number,z:number){return x< -63||x>63||z< -48||z>15||outdoorObstacles.some(o=>Math.abs(x-o.x)<o.w/2+.25&&Math.abs(z-o.z)<o.d/2+.25)}
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
