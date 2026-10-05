import {Space,Vector3,type TransformNode} from '@babylonjs/core';
/** Rotate the arm joints towards a palm target without stretching the bones. */
export function placePalm(joints:TransformNode[],palm:TransformNode,target:Vector3){
 for(let pass=0;pass<18;pass++){
  palm.computeWorldMatrix(true);if(Vector3.Distance(palm.getAbsolutePosition(),target)<.002)break;
  for(const joint of joints){
   joint.computeWorldMatrix(true);palm.computeWorldMatrix(true);
   const origin=joint.getAbsolutePosition(),from=palm.getAbsolutePosition().subtract(origin),to=target.subtract(origin);
   if(from.lengthSquared()<1e-9||to.lengthSquared()<1e-9)continue;
   from.normalize();to.normalize();const axis=Vector3.Cross(from,to),angle=Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(from,to))));
   if(axis.lengthSquared()>1e-10){joint.rotate(axis.normalize(),Math.min(angle,.5),Space.WORLD);joint.computeWorldMatrix(true)}
  }
 }
 palm.computeWorldMatrix(true);return Vector3.Distance(palm.getAbsolutePosition(),target);
}
const alignJoint=(joint:TransformNode,from:Vector3,to:Vector3)=>{
 if(from.lengthSquared()<1e-10||to.lengthSquared()<1e-10)return;
 const f=from.normalizeToNew(),t=to.normalizeToNew(),axis=Vector3.Cross(f,t),angle=Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(f,t))));
 if(axis.lengthSquared()>1e-12&&angle>1e-5){joint.rotate(axis.normalize(),angle,Space.WORLD);joint.computeWorldMatrix(true)}
};
/** Two-bone reach: the elbow bends towards `pole` (e.g. down and outward), so it never folds backwards. */
export function reachArm(upper:TransformNode,fore:TransformNode,palm:TransformNode,target:Vector3,pole:Vector3){
 for(let pass=0;pass<2;pass++){
  [upper,fore,palm].forEach(n=>n.computeWorldMatrix(true));
  const s=upper.getAbsolutePosition().clone(),e=fore.getAbsolutePosition().clone(),p=palm.getAbsolutePosition().clone();
  const a=Vector3.Distance(s,e),b=Vector3.Distance(e,p),toTarget=target.subtract(s);
  const d=Math.max(Math.abs(a-b)+1e-3,Math.min(a+b-1e-3,toTarget.length())),dir=toTarget.normalize();
  const side=pole.subtract(dir.scale(Vector3.Dot(pole,dir)));if(side.lengthSquared()<1e-8)side.copyFrom(Vector3.Up());side.normalize();
  const along=(a*a-b*b+d*d)/(2*d),lift=Math.sqrt(Math.max(0,a*a-along*along));
  const elbow=s.add(dir.scale(along)).add(side.scale(lift)),reach=s.add(dir.scale(d));
  alignJoint(upper,e.subtract(s),elbow.subtract(s));
  fore.computeWorldMatrix(true);palm.computeWorldMatrix(true);
  alignJoint(fore,palm.getAbsolutePosition().subtract(fore.getAbsolutePosition()),reach.subtract(fore.getAbsolutePosition()));
 }
 palm.computeWorldMatrix(true);return Vector3.Distance(palm.getAbsolutePosition(),target);
}
