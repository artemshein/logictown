import {Color3,LoadAssetContainerAsync,Mesh,MeshBuilder,StandardMaterial,Texture,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {outdoorHomes,outdoorTrees,outdoorFences} from './outdoor-layout';
export async function buildOutdoorWorld(scene:Scene,shadow:ShadowGenerator){
 const texture=(name:string)=>{
  const mat=new StandardMaterial('outdoor '+name,scene);mat.specularColor=new Color3(.04,.04,.04);
  mat.diffuseTexture=new Texture(`/assets/outdoor/${name}/color.jpg`,scene);
  mat.bumpTexture=new Texture(`/assets/outdoor/${name}/normal.jpg`,scene);mat.bumpTexture.level=.35;
  return mat;
 };
 const grass=texture('grass_ground'),asphalt=texture('asphalt_01'),paving=texture('pavement_01');
 grass.diffuseColor=new Color3(.25,1,.22);
 const floors:Mesh[]=[];
 function ground(name:string,x:number,z:number,w:number,d:number,y:number,material:StandardMaterial){
  const mesh=MeshBuilder.CreateGround(name,{width:w,height:d},scene);mesh.position.set(x,y,z);const surface=material.clone(name+' material') as StandardMaterial;mesh.material=surface;
  for(const t of [surface.diffuseTexture,surface.bumpTexture])if(t instanceof Texture){const map=t.clone();map.uScale=w/3;map.vScale=d/3;if(t===surface.diffuseTexture)surface.diffuseTexture=map;else surface.bumpTexture=map}
  mesh.receiveShadows=true;floors.push(mesh);return mesh;
 }
 ground('neighbourhood lawn',0,-16,500,500,-.01,grass);
 ground('quiet residential street',0,-18,400,6,.012,asphalt);
 for(const z of [-13.5,-22.5])ground('pavement',0,z,400,3,.026,paving);
 ground('front garden path',0,-8,2.2,8,.04,paving);
 ground('swing landing',4,9,5.2,4,.025,paving);
 const names=['building-type-a','building-type-b','building-type-c','building-type-d','tree-large','tree-small','fence','swing'];
 const containers=new Map(await Promise.all(names.map(async name=>[name,await LoadAssetContainerAsync(`/assets/outdoor/${name}.glb`,scene)] as const)));
 const templateBounds=new Map<string,{min:Vector3;size:Vector3}>();
 for(const [name,container]of containers){let min=new Vector3(Infinity,Infinity,Infinity),max=min.scale(-1);for(const m of container.meshes){if(!m.getTotalVertices())continue;m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min=Vector3.Minimize(min,b.minimumWorld);max=Vector3.Maximize(max,b.maximumWorld)}templateBounds.set(name,{min,size:max.subtract(min)})}
 function place(name:string,label:string,x:number,z:number,w:number,h:number,d:number,angle=0){
  const instance=containers.get(name)!.instantiateModelsToScene(n=>label+' '+n,false,{doNotInstantiate:true});
  const root=new TransformNode(label,scene),offset=new TransformNode(label+' origin',scene);offset.parent=root;
  const b=templateBounds.get(name)!;offset.scaling.set(w/b.size.x,h/b.size.y,d/b.size.z);offset.position.set(-(b.min.x+b.size.x/2)*offset.scaling.x,-b.min.y*offset.scaling.y,-(b.min.z+b.size.z/2)*offset.scaling.z);
  instance.rootNodes.forEach(n=>n.parent=offset);root.position.set(x,.04,z);root.rotation.y=angle;
  const meshes=root.getChildMeshes().filter(m=>m.getTotalVertices());meshes.forEach(m=>{m.receiveShadows=true;shadow.addShadowCaster(m)});return {root,meshes,animations:instance.animationGroups};
 }
 for(const home of outdoorHomes)place('building-type-'+home.model,home.x===0&&home.z===0?'Lea home':'neighbour house',home.x,home.z,9,home.model==='a'?5.8:6.8,8,home.angle);
 for(const [i,t]of outdoorTrees.entries())place(t.small?'tree-small':'tree-large','garden tree '+i,t.x,t.z,t.small?2.3:3,t.small?3.8:5.5,t.small?2.6:3.5,i*.7);
 const fenceMeshes:Mesh[]=[];
 function fenceLine(x:number,z:number,length:number,angle:number,label:string){const count=Math.ceil(length/2),segment=length/count;for(let i=0;i<count;i++){const along=-length/2+segment*(i+.5),p=place('fence',label+' '+i,x+Math.cos(angle)*along,z-Math.sin(angle)*along,segment,1.15,.18,angle);for(const m of p.meshes)if(m instanceof Mesh)fenceMeshes.push(m)}}
 for(const f of outdoorFences)fenceLine(f.x,f.z,Math.max(f.w,f.d),f.d>f.w?Math.PI/2:0,f.kind==='gate'?'open garden gate':'garden fence');
 // Merge the repeated static fence segments into one draw call.
 fenceMeshes.forEach(m=>{m.computeWorldMatrix(true);shadow.removeShadowCaster(m)});
 const merged=Mesh.MergeMeshes(fenceMeshes,true,true,undefined,false,false);if(merged){merged.name='fence and open gate';merged.receiveShadows=true;shadow.addShadowCaster(merged)}
 const swing=place('swing','backyard swings',4,9,3.76,2.475,1.69);swing.animations.forEach(a=>a.start(true));
 return {floors};
}
