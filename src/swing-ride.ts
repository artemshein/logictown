import {Matrix,Quaternion,Vector3,type TransformNode,type AbstractMesh} from '@babylonjs/core';
import {createSwingMotion} from './swing-motion';
import type {loadLea} from './lea';
export function createSwingRide(lea:TransformNode,character:Awaited<ReturnType<typeof loadLea>>,hinge:TransformNode,seat:AbstractMesh){
 const motion=createSwingMotion(),rest=hinge.rotationQuaternion?.clone()??Quaternion.FromEulerVector(hinge.rotation);
 let exit=lea.position.clone(),exitHeading=0,hip=Vector3.Zero();
 // Seat origin is its centre. Use a local anchor so chains, seat and rider share the pivot.
 seat.computeWorldMatrix(true);
 const seatPoint=Vector3.TransformCoordinates(seat.getAbsolutePosition(),Matrix.Invert(hinge.computeWorldMatrix(true)));seatPoint.y+=.045;
 function positionRider(){
  hinge.computeWorldMatrix(true);
  // glTF's reflected coordinate conversion can flip a decomposed quaternion.
  // Derive the physical tilt from the chain's up direction instead.
  const up=Vector3.TransformNormal(Vector3.Up(),hinge.getWorldMatrix()).normalize();
  const rotation=Quaternion.RotationAxis(Vector3.Right(),Math.atan2(up.z,up.y));
  const matrix=Matrix.FromQuaternionToRef(rotation,Matrix.Identity());
  lea.rotationQuaternion=rotation;
  lea.position.copyFrom(Vector3.TransformCoordinates(seatPoint,hinge.getWorldMatrix()).subtract(Vector3.TransformNormal(hip,matrix)));
  lea.computeWorldMatrix(true);
  const grips=[-1,1].map(side=>Vector3.TransformCoordinates(seatPoint.add(new Vector3(side*.234,.48,0)),hinge.getWorldMatrix()));
  character.gripSwing(grips[0],grips[1]);
 }
 return {get active(){return motion.active},start(){
  if(motion.active)return;exit=lea.position.clone();exitHeading=lea.rotation.y;lea.rotation.y=0;character.play('Sit');hip=character.hipOffset();motion.start();positionRider();
 },stop(){
  if(!motion.active)return;motion.stop();hinge.rotationQuaternion=rest.clone();lea.rotationQuaternion=null;lea.rotation.set(0,exitHeading,0);lea.position.copyFrom(exit);character.play('Idle');
 },update(dt:number){if(!motion.active)return;hinge.rotationQuaternion=rest.multiply(Quaternion.RotationAxis(Vector3.Right(),motion.update(dt)));positionRider()}};
}
