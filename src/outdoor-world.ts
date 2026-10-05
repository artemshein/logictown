import {Color3,LoadAssetContainerAsync,Mesh,MeshBuilder,StandardMaterial,Texture,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {createGardenPaint} from './outdoor-colors';
import {outdoorStore,outdoorHomes,outdoorTrees,outdoorFenceGroups,outdoorSwing,outdoorEntrance} from './outdoor-layout';
export async function buildOutdoorWorld(scene:Scene,shadow:ShadowGenerator){
 const texture=(name:string)=>{
  const mat=new StandardMaterial('outdoor '+name,scene);mat.specularColor=new Color3(.04,.04,.04);
  mat.diffuseTexture=new Texture(`/assets/outdoor/${name}/color.jpg`,scene);
  mat.bumpTexture=new Texture(`/assets/outdoor/${name}/normal.jpg`,scene);mat.bumpTexture.level=.35;
  return mat;
 };
 const grass=texture('grass_ground'),asphalt=texture('asphalt_01'),paving=texture('pavement_01');
 // Keep the photographed grass colour. A green material tint was hidden by
 // lighting clamping in sunlight but became fully visible inside shadows.
 grass.diffuseColor=Color3.White();grass.diffuseTexture!.level=1;
 grass.specularColor=Color3.Black();
 const floors:Mesh[]=[];
 function ground(name:string,x:number,z:number,w:number,d:number,y:number,material:StandardMaterial){
  const mesh=MeshBuilder.CreateGround(name,{width:w,height:d},scene);mesh.position.set(x,y,z);const surface=material.clone(name+' material') as StandardMaterial;mesh.material=surface;
  for(const t of [surface.diffuseTexture,surface.bumpTexture])if(t instanceof Texture){const map=t.clone();map.uScale=w/3;map.vScale=d/3;if(t===surface.diffuseTexture)surface.diffuseTexture=map;else surface.bumpTexture=map}
  mesh.receiveShadows=true;floors.push(mesh);return mesh;
 }
 // Keep distant grass green: blue scene fog otherwise creates a false sky gap below the hills.
 const lawn=ground('neighbourhood lawn',0,-16,500,500,-.01,grass);lawn.applyFog=false;
 ground('quiet residential street',0,-18,400,6,.012,asphalt);
 for(const z of [-13.5,-22.5])ground('pavement',0,z,400,3,.026,paving);
 ground('front garden path',outdoorEntrance.x,-7.7,2.2,7.4,.04,paving);
 if(outdoorEntrance.x!==0)ground('gate connecting path',outdoorEntrance.x/2,-11,Math.abs(outdoorEntrance.x)+2.2,2.2,.041,paving);
 ground('swing landing',outdoorSwing.x,outdoorSwing.z,5.2,4,.025,paving);
 const names=['building-type-a','building-type-b','building-type-c','building-type-d','tree-large','tree-small','fence','fence-wire','swing','garden-plant','village-store'];
 const containers=new Map(await Promise.all(names.map(async name=>[name,await LoadAssetContainerAsync(name==='garden-plant'?'/assets/polyhaven/potted_plant_01.glb':`/assets/outdoor/${name}.glb`,scene)] as const)));
 const templateBounds=new Map<string,{min:Vector3;size:Vector3}>();
 for(const [name,container]of containers){let min=new Vector3(Infinity,Infinity,Infinity),max=min.scale(-1);for(const m of container.meshes){if(!m.getTotalVertices())continue;m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min=Vector3.Minimize(min,b.minimumWorld);max=Vector3.Maximize(max,b.maximumWorld)}templateBounds.set(name,{min,size:max.subtract(min)})}
 function place(name:string,label:string,x:number,z:number,w:number,h:number,d:number,angle=0,castShadow=true){
  const instance=containers.get(name)!.instantiateModelsToScene(n=>label+' '+n,false,{doNotInstantiate:!name.startsWith('tree-')&&name!=='garden-plant'});
  const root=new TransformNode(label,scene),offset=new TransformNode(label+' origin',scene);offset.parent=root;
  const b=templateBounds.get(name)!;offset.scaling.set(w/b.size.x,h/b.size.y,d/b.size.z);offset.position.set(-(b.min.x+b.size.x/2)*offset.scaling.x,-b.min.y*offset.scaling.y,-(b.min.z+b.size.z/2)*offset.scaling.z);
  instance.rootNodes.forEach(n=>n.parent=offset);root.position.set(x,.04,z);root.rotation.y=angle;
  const meshes=root.getChildMeshes().filter(m=>m.getTotalVertices());meshes.forEach(m=>{m.receiveShadows=true;if(castShadow)shadow.addShadowCaster(m)});return {root,meshes,animations:instance.animationGroups};
 }
 place('village-store','village grocery store',outdoorStore.x,outdoorStore.z,outdoorStore.w,outdoorStore.h,outdoorStore.d,outdoorStore.angle);
 ground('store forecourt',outdoorStore.x,-24.1,22,1.4,.041,paving);
 const gardenPaint=outdoorHomes.map((_,plot)=>createGardenPaint(plot));
 for(const [plot,home] of outdoorHomes.entries()){const house=place('building-type-'+home.model,home.x===0&&home.angle===0?'Lea home':'neighbour house',home.x,home.z,home.w,home.h,home.d,home.angle);gardenPaint[plot](house.meshes)}
 // Garden paths follow each facade; small planters use the existing CC0 plant model.
 for(const home of outdoorHomes){
  const facing=home.angle===0?-1:1,doorX=home.x+(home.model==='d'?-2.3:0)*(home.angle===0?1:-1),edge=home.z+facing*home.d/2,gate=home.angle===0?-12:-24;
  if(home.x!==0||home.angle!==0){ground('neighbour garden walk',doorX,(edge+gate)/2,1.65,Math.abs(edge-gate)+.1,.04,paving);if(doorX!==home.x)ground('neighbour gate approach',(doorX+home.x)/2,gate-facing*.8,Math.abs(doorX-home.x)+1.65,1.65,.042,paving)}
  if(home.model==='a'||home.model==='d')for(const side of [-1,1]){
   const b=templateBounds.get('garden-plant')!,scale=1.35/b.size.y;
   place('garden-plant','porch planter',doorX+side*1.8,edge-facing*.42,b.size.x*scale,1.35,b.size.z*scale,side*.6);
  }
 }
 // A sparse belt of shared trees connects the gardens to the distant wooded ridges.
 for(const z of [28,-66])for(const [i,x]of [-64,-46,-28,-10,10,28,46,64].entries()){
  const b=templateBounds.get('tree-large')!,height=8.3+i%3*.8,scale=height/b.size.y;
  place('tree-large','woodland boundary',x,z+(i%2)*3,b.size.x*scale,height,b.size.z*scale,i*.9,false);
 }
 for(const [i,t]of outdoorTrees.entries()){
  const name=t.small?'tree-small':'tree-large',b=templateBounds.get(name)!,height=(t.small?4.2:6.2)*(1+(i%3-1)*.08),scale=height/b.size.y;
  place(name,'garden tree '+i,t.x,t.z,b.size.x*scale,height,b.size.z*scale,i*.7);
 }
 for(const [plot,fences]of outdoorFenceGroups.entries()){
  const fenceMeshes:Mesh[]=[],fenceType=plot%3===1?'fence-wire':'fence';
  function fenceLine(x:number,z:number,length:number,angle:number,label:string){const count=Math.max(1,Math.round(length/2.8)),segment=length/count;for(let i=0;i<count;i++){const along=-length/2+segment*(i+.5),p=place(fenceType,label+' '+i,x+Math.cos(angle)*along,z-Math.sin(angle)*along,segment,1.35,.2,angle);gardenPaint[plot](p.meshes);for(const m of p.meshes)if(m instanceof Mesh)fenceMeshes.push(m)}}
  for(const f of fences)fenceLine(f.x,f.z,Math.max(f.w,f.d),f.d>f.w?Math.PI/2:0,`plot ${plot} ${f.kind==='gate'?'open garden gate':'garden fence'}`);
  // Group by material within each plot, preserving both timber and metal wire.
  fenceMeshes.forEach(m=>{m.computeWorldMatrix(true);shadow.removeShadowCaster(m)});
  const merged=Mesh.MergeMeshes(fenceMeshes,true,true,undefined,false,true);if(merged){merged.name=`plot ${plot} fence and open gate`;merged.receiveShadows=true;shadow.addShadowCaster(merged)}
 }
 const swing=place('swing','backyard swings',outdoorSwing.x,outdoorSwing.z,3.76,2.475,1.69);swing.animations.forEach(a=>a.stop());
 const swingHinge=swing.root.getDescendants().find(n=>n.name.endsWith('seat-right')) as TransformNode;
 const swingSeat=swing.meshes.find(m=>m.name.endsWith('seat-right/charcoal'))!;
 return {floors,swingHinge,swingSeat};
}
