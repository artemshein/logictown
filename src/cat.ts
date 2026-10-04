import {ImportMeshAsync,TransformNode,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {createCatMotion,type CatNavigation,type CatPoint} from './cat-motion';
export async function loadStreetCat(scene:Scene,shadow:ShadowGenerator,nav:CatNavigation){
 const result=await ImportMeshAsync('/models/cat/street-cat.glb',scene);
 result.animationGroups.forEach(g=>g.stop());
 const root=new TransformNode('street cat',scene),asset=new TransformNode('cat model',scene);asset.parent=root;
 result.meshes.filter(m=>!m.parent).forEach(m=>m.parent=asset);
 result.meshes.forEach(m=>{m.isPickable=false;m.receiveShadows=true;if(m.getTotalVertices())shadow.addShadowCaster(m)});
 const bounds=asset.getHierarchyBoundingVectors(true),scale=.43/(bounds.max.y-bounds.min.y);
 asset.scaling.setAll(scale);asset.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);
 const motion=createCatMotion({x:8,z:-13.5},nav);
 let playing='',state='idle';
 const play=(name:string)=>{if(playing===name)return;result.animationGroups.forEach(g=>g.stop());result.animationGroups.find(g=>g.name.split('|').at(-1)===name)?.start(true,name==='Run'?2.6:1);playing=name};
 root.position.set(motion.position.x,.035,motion.position.z);play('Idle');
 return {root,get closingSpeed(){return motion.closingSpeed},get state(){return state},get fleeCount(){return motion.fleeCount},update(dt:number,dog:CatPoint){
  const next=motion.update(dt,dog);state=next.state;root.position.x=motion.position.x;root.position.z=motion.position.z;
  root.rotation.y+=Math.atan2(Math.sin(next.facing-root.rotation.y),Math.cos(next.facing-root.rotation.y))*Math.min(1,dt*12);
  play(state==='run'?'Run':state==='walk'?'Walk':'Idle');
 }};
}
