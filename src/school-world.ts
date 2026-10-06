import {InstancedMesh,LoadAssetContainerAsync,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {createOutdoorGround} from './outdoor-world';
import {buildBusStop} from './bus-stop';
import {buildSchoolBuilding} from './school-building';
import {buildSchoolSports} from './school-sports';
import {buildSchoolFence} from './school-fence';
import {schoolBuilding,schoolBusStop,schoolFence,schoolSteps,schoolTrees} from './school-layout';
export async function buildSchoolWorld(scene:Scene,shadow:ShadowGenerator){
 const {ground,floors,paving}=createOutdoorGround(scene);
 // Walk from the pavement through the gate to the steps, a forecourt and paths round to the field.
 const stepsFront=schoolSteps.z+schoolSteps.d/2,forecourt={z:stepsFront+1.75,d:3.5,w:59.4},back=schoolBuilding.z-schoolBuilding.d/2-2.6;
 ground('school entrance walk',schoolFence.gate.x,(-23.8+forecourt.z)/2,4.4,-23.8-forecourt.z,.04,paving);
 ground('school forecourt',0,forecourt.z,forecourt.w,forecourt.d,.041,paving);
 for(const s of [-1,1])ground('school side walk',s*(forecourt.w/2-1.2),(forecourt.z+back)/2,2.4,forecourt.z-back,.042,paving);
 ground('school back walk',0,back,forecourt.w,2.4,.043,paving);
 buildBusStop(scene,shadow,schoolBusStop,'Школа');
 buildSchoolBuilding(scene,shadow);
 const sports=buildSchoolSports(scene,shadow);floors.push(...sports.floors);
 buildSchoolFence(scene,shadow);
 const names=['tree-large','tree-small'];
 const containers=new Map(await Promise.all(names.map(async name=>[name,await LoadAssetContainerAsync(`/assets/outdoor/${name}.glb`,scene)] as const)));
 for(const [i,t]of schoolTrees.entries()){
  const container=containers.get(t.small?'tree-small':'tree-large')!,instance=container.instantiateModelsToScene(n=>`school tree ${i} ${n}`,false);
  let min=new Vector3(Infinity,Infinity,Infinity),max=min.scale(-1);
  for(const m of container.meshes){if(!m.getTotalVertices())continue;m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min=Vector3.Minimize(min,b.minimumWorld);max=Vector3.Maximize(max,b.maximumWorld)}
  const size=max.subtract(min),height=(t.small?4.2:6.6)*(1+(i%3-1)*.08),scale=height/size.y;
  const root=new TransformNode('school tree '+i,scene),offset=new TransformNode('school tree origin '+i,scene);offset.parent=root;offset.scaling.setAll(scale);
  offset.position.set(-(min.x+size.x/2)*scale,-min.y*scale,-(min.z+size.z/2)*scale);instance.rootNodes.forEach(n=>n.parent=offset);
  root.position.set(t.x,.04,t.z);root.rotation.y=i*.7;
  for(const m of root.getChildMeshes()){if(!m.getTotalVertices())continue;if(!(m instanceof InstancedMesh))m.receiveShadows=true;m.isPickable=false;shadow.addShadowCaster(m)}
 }
 return {floors};
}
