import {ImportMeshAsync,PBRMaterial,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {cashierPosition} from './store-world';

export async function loadStoreCashier(scene:Scene,shadow:ShadowGenerator,assetUrl='/assets/shop/female-cashier.glb'){
 const asset=await ImportMeshAsync(assetUrl,scene);
 asset.animationGroups.forEach(group=>group.stop());
 const figure=new TransformNode('cashier model',scene);
 asset.meshes.filter(mesh=>!mesh.parent).forEach(mesh=>mesh.parent=figure);
 figure.computeWorldMatrix(true);figure.getChildMeshes().forEach(mesh=>mesh.computeWorldMatrix(true));
 const {min,max}=figure.getHierarchyBoundingVectors(true),height=max.y-min.y;
 if(!Number.isFinite(height)||height<=0)throw new Error('Cashier model has invalid bounds');
 const scale=1.75/height;
 const fit=new TransformNode('cashier standing fit',scene);figure.parent=fit;fit.scaling.setAll(scale);
 figure.position.set(-(min.x+max.x)/2,-min.y,-(min.z+max.z)/2);
 const root=new TransformNode('cashier behind counter',scene);fit.parent=root;
 root.position.set(cashierPosition.x,.01,cashierPosition.z);root.rotation.y=Math.PI;
 asset.meshes.forEach(mesh=>{mesh.isPickable=false;mesh.receiveShadows=true;if(mesh.getTotalVertices())shadow.addShadowCaster(mesh);if(mesh.material instanceof PBRMaterial)mesh.material.environmentIntensity=.4});
 const idle=asset.animationGroups.find(group=>/idle/i.test(group.name)&&!/offensive/i.test(group.name));
 if(idle)idle.start(true,.8);
 let elapsed=0;
 const breathing=scene.onBeforeRenderObservable.add(()=>{
  if(idle)return;
  elapsed+=Math.min(.05,scene.getEngine().getDeltaTime()/1000);
  fit.scaling.y=scale*(1+Math.sin(elapsed*1.6)*.003);
  root.rotation.y=Math.PI+Math.sin(elapsed*.55)*.018;
 });
 scene.onDisposeObservable.add(()=>scene.onBeforeRenderObservable.remove(breathing));
 return {root,idle,position:new Vector3(cashierPosition.x,.01,cashierPosition.z)};
}
