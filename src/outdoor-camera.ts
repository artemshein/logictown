import {cameraDistance,type CameraWall,type Point3} from './camera-collision';
export function outdoorCameraDirection(alpha:number,beta:number):Point3{return {x:Math.cos(alpha)*Math.sin(beta),y:Math.cos(beta),z:Math.sin(alpha)*Math.sin(beta)}}
// A larger house can leave too little space behind Lea. Find the nearest clear side view.
export function outdoorCameraAngle(origin:Point3,preferred:number,beta:number,boom:number,walls:CameraWall[]){
 const clearance=(a:number)=>cameraDistance(origin,outdoorCameraDirection(a,beta),boom,walls);
 if(clearance(preferred)>=2.6)return preferred;
 let best=preferred,distance=clearance(preferred);
 for(const offset of [Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,2*Math.PI/3,-2*Math.PI/3,Math.PI]){
  const angle=preferred+offset,available=clearance(angle);if(available>=3.2)return angle;
  if(available>distance){best=angle;distance=available}
 }
 return best;
}
