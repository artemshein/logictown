import {busStopObstacles,type OutdoorObstacle,type OutdoorPoint} from './outdoor-layout';
// The school sits south of the same bus road as the village (z=-18), so the shelter,
// lane and arrival point match the town stop exactly.
export const schoolBusStop={x:-16,z:-25.7,w:4.6,d:2.6};
export const schoolBusApproach={x:-16,z:-23.3};
export const schoolSpawn={x:schoolBusApproach.x,z:schoolBusApproach.z};
// Red-brick building: two storeys over a stone basement, with a projecting entrance bay.
export const schoolBuilding={x:0,z:-46,w:48,d:14,h:10.2};
export const schoolBay={x:0,w:12,depth:1.4,h:11};
export const schoolFront=schoolBuilding.z+schoolBuilding.d/2;
export const schoolSteps={x:0,z:schoolFront+schoolBay.depth+1.3,w:7,d:2.6};
// Running track around the football pitch behind the school.
export const schoolTrack={x:0,z:-82,straight:56,inner:16,lanes:6,lane:1.1};
export const schoolTrackOuter=schoolTrack.inner+schoolTrack.lanes*schoolTrack.lane;
export const schoolPitch={x:0,z:schoolTrack.z,w:60,d:28};
export const schoolGoals=[-1,1].map(side=>({x:schoolPitch.x+side*schoolPitch.w/2,z:schoolPitch.z,side,w:6,h:2.2,depth:1.6}));
// Floodlights at the corners between the track and the fence.
export const schoolLightPoles=[-1,1].flatMap(sx=>[-1,1].map(sz=>({x:sx*44,z:schoolTrack.z+sz*24.5})));
// A girl in a cat hoodie waits beside the east end of the bleachers.
export const schoolGirl={x:15.2,z:schoolTrack.z-schoolTrackOuter-2.2,angle:0};
export const schoolStand={x:0,z:schoolTrack.z-schoolTrackOuter-4,w:26,d:4.4,rows:5};
// Tall metal fence around the whole grounds; the gate opens onto the pavement.
export const schoolFence={minX:-58,maxX:58,front:-29,back:-116,height:2.4,gate:{x:0,w:5}};
const gateHalf=schoolFence.gate.w/2,gateLeaf=2.4;
export const schoolGatePillars=[-1,1].map(side=>({x:schoolFence.gate.x+side*(gateHalf+.45),z:schoolFence.front}));
export const schoolFenceRuns=[
 {x1:schoolFence.minX,z1:schoolFence.front,x2:schoolFence.gate.x-gateHalf-.9,z2:schoolFence.front},
 {x1:schoolFence.gate.x+gateHalf+.9,z1:schoolFence.front,x2:schoolFence.maxX,z2:schoolFence.front},
 {x1:schoolFence.maxX,z1:schoolFence.front,x2:schoolFence.maxX,z2:schoolFence.back},
 {x1:schoolFence.maxX,z1:schoolFence.back,x2:schoolFence.minX,z2:schoolFence.back},
 {x1:schoolFence.minX,z1:schoolFence.back,x2:schoolFence.minX,z2:schoolFence.front},
];
// Both leaves stand open inside the grounds, along the entrance path.
export const schoolGateLeaves=[-1,1].map(side=>({x:schoolFence.gate.x+side*(gateHalf-.1),z:schoolFence.front-.5-gateLeaf/2,length:gateLeaf}));
export const schoolTrees=[
 {x:-36,z:-32.5,small:true},{x:36,z:-32.5,small:true},{x:-46,z:-37,small:false},{x:46,z:-38,small:false},
 {x:-52,z:-48,small:false},{x:52,z:-50,small:false},
 ...[-50,-34,18,34,50].map((x,i)=>({x,z:-10+(i%2)*1.5,small:i%2===1})),
 ...[-66,-44,-20,8,30,54,68].map((x,i)=>({x,z:-124-(i%2)*3,small:false})),
 ...[-74,74].flatMap(x=>[-40,-70,-100].map(z=>({x,z,small:false}))),
];
export const schoolObstacles:OutdoorObstacle[]=[
 {x:schoolBuilding.x,z:schoolBuilding.z,w:schoolBuilding.w,d:schoolBuilding.d,kind:'school'},
 {x:schoolBay.x,z:schoolFront+schoolBay.depth/2,w:schoolBay.w,d:schoolBay.depth,kind:'school'},
 {x:schoolSteps.x,z:schoolSteps.z,w:schoolSteps.w+.8,d:schoolSteps.d,kind:'steps'},
 ...schoolLightPoles.map(p=>({...p,w:.5,d:.5,kind:'pole'})),
 ...schoolFenceRuns.map(r=>({x:(r.x1+r.x2)/2,z:(r.z1+r.z2)/2,w:Math.abs(r.x2-r.x1)||.2,d:Math.abs(r.z2-r.z1)||.2,kind:'fence'})),
 ...schoolGatePillars.map(p=>({...p,w:.9,d:.9,kind:'pillar'})),
 ...schoolGateLeaves.map(l=>({x:l.x,z:l.z,w:.15,d:l.length,kind:'gate'})),
 ...schoolGoals.flatMap(g=>[-1,1].map(s=>({x:g.x+g.side*g.depth/2,z:g.z+s*g.w/2,w:g.depth,d:.15,kind:'goal'}))),
 ...schoolGoals.map(g=>({x:g.x+g.side*g.depth,z:g.z,w:.15,d:g.w,kind:'goal'})),
 {x:schoolStand.x,z:schoolStand.z,w:schoolStand.w,d:schoolStand.d,kind:'stand'},
 {x:schoolGirl.x,z:schoolGirl.z,w:.5,d:.5,kind:'girl'},
 ...schoolTrees.map(t=>({...t,w:t.small?.8:1.8,d:t.small?.8:1.8,kind:'tree'})),
 ...busStopObstacles(schoolBusStop),
];
const bounds={minX:-70,maxX:70,minZ:-120,maxZ:-9};
export function schoolBlocked(x:number,z:number){return x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ||schoolObstacles.some(o=>Math.abs(x-o.x)<o.w/2+.25-1e-6&&Math.abs(z-o.z)<o.d/2+.25-1e-6)}
const step=.5,nx=(bounds.maxX-bounds.minX)/step+1,nz=(bounds.maxZ-bounds.minZ)/step+1;
const free=Array.from({length:nx*nz},(_,i)=>!schoolBlocked(bounds.minX+i%nx*step,bounds.minZ+Math.floor(i/nx)*step));
const point=(id:number):OutdoorPoint=>({x:bounds.minX+id%nx*step,z:bounds.minZ+Math.floor(id/nx)*step});
const nearest=(p:OutdoorPoint)=>{let best=-1,dist=Infinity;for(let i=0;i<free.length;i++){if(!free[i])continue;const q=point(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<dist){best=i;dist=d}}return best};
export function schoolCompanionTarget(lea:OutdoorPoint,heading:number){for(const side of [-1,1]){const p={x:lea.x+side*.9*Math.cos(heading)-.35*Math.sin(heading),z:lea.z-side*.9*Math.sin(heading)-.35*Math.cos(heading)};if(!schoolBlocked(p.x,p.z))return p}return {x:lea.x,z:lea.z}}
export function schoolPath(from:OutdoorPoint,to:OutdoorPoint):OutdoorPoint[]{
 const start=nearest(from),end=nearest(to);
 if(start<0||end<0)return [];
 const queue=[start],prev=new Int32Array(free.length).fill(-2);prev[start]=-1;
 for(let k=0;k<queue.length&&prev[end]===-2;k++){
  const id=queue[k],x=id%nx,z=Math.floor(id/nx);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,i=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[i]||prev[i]!==-2)continue;prev[i]=id;queue.push(i)}
 }
 if(prev[end]===-2)return [];
 const path=[];for(let id=end;id!==start;id=prev[id])path.push(point(id));return path.reverse();
}
