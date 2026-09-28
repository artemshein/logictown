export type Point3={x:number;y:number;z:number};
export type CameraWall={min:Point3;max:Point3};
// Sweep a small camera volume along its boom, stopping before the nearest wall.
export function cameraDistance(origin:Point3,direction:Point3,distance:number,walls:CameraWall[],padding=.18){
 let result=distance;
 for(const wall of walls){
  let near=0,far=distance;
  for(const axis of ['x','y','z'] as const){
   const lo=wall.min[axis]-padding,hi=wall.max[axis]+padding,d=direction[axis],o=origin[axis];
   if(Math.abs(d)<1e-8){if(o<lo||o>hi){far=-1;break}continue}
   let a=(lo-o)/d,b=(hi-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
  }
  if(far>=near&&far>=0)result=Math.min(result,Math.max(.08,near-.02));
 }
 return result;
}
