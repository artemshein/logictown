import {ImportMeshAsync,Quaternion,Space,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {createDogMotion,companionTarget,dogPath,type DogNavigation} from './dog-motion';
import {createDogHints} from './dog-hints';
export async function loadDog(scene:Scene,lea:TransformNode,shadow:ShadowGenerator,bark:()=>boolean,nav?:DogNavigation){
 const result=await ImportMeshAsync('/models/dog/shiba-inu.glb',scene);
 const root=new TransformNode('Lea’s puppy',scene),asset=new TransformNode('puppy model',scene);asset.parent=root;asset.scaling.setAll(.19);
 result.meshes.filter(m=>!m.parent).forEach(m=>m.parent=asset);
 let interact=()=>{};
 result.meshes.forEach(m=>{m.isPickable=m.getTotalVertices()>0;m.metadata={...m.metadata,interaction:()=>interact()};m.receiveShadows=true;if(m.getTotalVertices())shadow.addShadowCaster(m)});
 const target=(nav?.target??companionTarget)(lea.position,lea.rotation.y),path=(nav?.path??dogPath)(lea.position,target);
 const motion=createDogMotion(path.at(-1)??{x:lea.position.x,z:lea.position.z},nav);root.position.set(motion.position.x,.045,motion.position.z);
 result.animationGroups.forEach(g=>g.stop());
 const nodes=result.transformNodes;
 const rest=nodes.map(node=>({node,p:node.position.clone(),q:node.rotationQuaternion?.clone()??Quaternion.Identity()}));
 const restore=()=>rest.forEach(({node,p,q})=>{node.position.copyFrom(p);node.rotationQuaternion=q.clone()});
 // The source has no sit clip. Fold the hind legs and lower the hips while
 // keeping the forelegs upright; interpolate this skeletal pose on stopping.
 const turn=(name:string,angle:number)=>{const n=nodes.find(n=>n.name===name);n?.rotate(Vector3.Right(),angle,Space.WORLD)};
 const body=nodes.find(n=>n.name==='Body');if(body)body.position.y-=1.05;
 turn('Back',-.7);
 for(const side of ['L','R']){turn('BackLeg.'+side,1.05);turn('BackUpperLeg.'+side,-1.65);turn('BackLowerLeg.'+side,.6);turn('FrontShoulder.'+side,.7)}
 const seated=rest.map(({node})=>({p:node.position.clone(),q:node.rotationQuaternion?.clone()??Quaternion.Identity()}));restore();
 const walk=result.animationGroups.find(g=>g.name.split('|').pop()==='Walk');
 let walking=false,blend=0;const hints=createDogHints();
 return {root,setInteraction(handler:()=>void){interact=handler},command(next:'sit'|'follow'){motion.setCommand(next)},update(dt:number,moving:boolean,collected:number[],active:boolean){
  const state=motion.update(dt,lea.position,lea.rotation.y,moving);root.position.x=motion.position.x;root.position.z=motion.position.z;
  root.rotation.y+=Math.atan2(Math.sin(state.facing-root.rotation.y),Math.cos(state.facing-root.rotation.y))*Math.min(1,dt*10);
  if(state.walked!==walking){walking=state.walked;if(walking){restore();walk?.start(true)}else{walk?.stop();restore()}}
  if(!walking){blend+=((state.sitting?1:0)-blend)*Math.min(1,dt*7);rest.forEach(({node,p,q},i)=>{Vector3.LerpToRef(p,seated[i].p,blend,node.position);node.rotationQuaternion=Quaternion.Slerp(q,seated[i].q,blend)})}else blend=0;
  if(!active)return;
  hints.update(lea.position,root.position,collected,bark);
 },get sitting(){return motion.command==='sit'||motion.command==='auto'&&blend>.9},get staying(){return motion.command==='sit'},get barked(){return [...hints.notified]},get barkCount(){return hints.count}};
}
