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
