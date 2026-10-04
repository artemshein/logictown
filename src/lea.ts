import { AnimationGroup, HDRCubeTexture, ImportMeshAsync, Quaternion, Scene, ShadowGenerator, TransformNode, Vector3, Space, Matrix } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export type LeaClip = 'Idle' | 'Walk' | 'Interact' | 'Celebrate' | 'Sit';
export async function loadLea(scene:Scene,parent:TransformNode,shadow?:ShadowGenerator){
  const result=await ImportMeshAsync('/models/cute-chibi-girl.glb',scene);
  const pivot=new TransformNode('Lea asset orientation',scene);pivot.parent=parent;pivot.scaling.setAll(1.3);
  result.meshes.filter(m=>!m.parent).forEach(m=>m.parent=pivot);
  result.meshes.forEach(m=>{m.receiveShadows=true;m.isPickable=false;shadow?.addShadowCaster(m)});
  if(!scene.environmentTexture){scene.environmentTexture=new HDRCubeTexture('/models/studio.hdr',scene,64,false,true,false,true);scene.environmentIntensity=.55;}
  const clips=new Map<string,AnimationGroup>();result.animationGroups.forEach(g=>{g.stop();clips.set(g.name.split('|').pop()!,g)});
  // The supplied idle clip is upright but holds the arms in a T-pose. The
  // bind pose lowers the arms, but its torso leans to one side. Combine the
  // upright idle body with the relaxed bind-pose arms.
  for(const {target,animation} of clips.get('idle')?.targetedAnimations??[]){
    if(!(target instanceof TransformNode)||/:(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(target.name))continue;
    const value=animation.getKeys()[0]?.value;
    if(animation.targetProperty==='rotationQuaternion'){
      if(value instanceof Quaternion)target.rotationQuaternion=value.clone();
    }
    if(animation.targetProperty==='position'&&value instanceof Vector3)target.position.copyFrom(value);
  }
  // The original right arm is posed with its hand on the hip. Mirror the
  // relaxed left arm so both hands hang naturally at the sides.
  for(const left of result.transformNodes.filter(n=>/:Left(Shoulder|Arm|ForeArm|Hand)/.test(n.name))){
    const counterpart=left.name.replace(':Left',':Right').replace(/_\d+$/,'_');
    const right=result.transformNodes.find(n=>n.name.startsWith(counterpart));
    const q=left.rotationQuaternion;
    if(right&&q)right.rotationQuaternion=new Quaternion(q.x,-q.y,-q.z,q.w);
  }
  const animatedJoints=[
    ['LeftUpLeg',.25],['RightUpLeg',-.25],['LeftLeg',-.12],['RightLeg',.12],
    ['LeftArm',-.15],['RightArm',.15],
  ].map(([name,amplitude])=>({node:result.transformNodes.find(n=>n.name.includes(`:${name}_`)),amplitude:Number(amplitude)}))
    .filter((entry):entry is {node:TransformNode;amplitude:number}=>!!entry.node)
    .map(entry=>({...entry,rest:entry.node.rotationQuaternion?.clone()??Quaternion.Identity()}));
  let active:LeaClip|undefined;
  let elapsed=0;
  const setWalkPose=(phase:number)=>animatedJoints.forEach(({node,rest,amplitude})=>{
    node.rotationQuaternion=Quaternion.RotationAxis(Vector3.Right(),Math.sin(phase)*amplitude).multiply(rest);
  });
  const observer=scene.onBeforeRenderObservable.add(()=>{if(active==='Walk'){elapsed+=scene.getEngine().getDeltaTime()/1000;setWalkPose(elapsed*10)}});
  const restPose=result.transformNodes.map(node=>({node,position:node.position.clone(),rotation:node.rotationQuaternion?.clone()}));
  const play=(name:LeaClip,loop=true)=>{
    if(name===active)return;
    result.animationGroups.forEach(g=>g.stop());
    restPose.forEach(({node,position,rotation})=>{node.position.copyFrom(position);if(rotation)node.rotationQuaternion=rotation.clone()});
    active=name;
    if(name==='Sit'){
      parent.computeWorldMatrix(true);
      const right=Vector3.TransformNormal(Vector3.Right(),parent.getWorldMatrix()).normalize();
      for(const [joint,angle] of [['LeftUpLeg',-Math.PI/2],['RightUpLeg',-Math.PI/2],['LeftLeg',Math.PI/2],['RightLeg',Math.PI/2],['LeftArm',-.75],['RightArm',-.75],['LeftForeArm',-.45],['RightForeArm',-.45]] as const){
        const node=result.transformNodes.find(n=>n.name.includes(`:${joint}_`));
        node?.rotate(right,angle,Space.WORLD);node?.computeWorldMatrix(true);
      }
      return;
    }
    if(name==='Walk'){elapsed=0;return}
    if(name!=='Idle')clips.get(name==='Interact'?'pose_01':'pose_02')?.start(loop);
  };
  play('Idle');
  const hipOffset=()=>{const hip=result.transformNodes.find(n=>n.name.includes(':Hips_'))!;hip.computeWorldMatrix(true);return Vector3.TransformCoordinates(hip.getAbsolutePosition(),Matrix.Invert(parent.computeWorldMatrix(true)))};
  return {hipOffset,pivot,meshes:result.meshes,clips,play,stop:()=>{scene.onBeforeRenderObservable.remove(observer);result.animationGroups.forEach(g=>g.stop());active=undefined}};
}
