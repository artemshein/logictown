import {MeshBuilder,MaterialPluginBase,Color3,LoadAssetContainerAsync,PBRMaterial,Texture,TransformNode,Vector3,VertexBuffer,type AssetContainer,type Mesh,type Scene,type ShadowGenerator,type AbstractMesh} from '@babylonjs/core';
import type {HouseRoom} from './house';
import type {RoomId} from './house-data';
import '@babylonjs/loaders/glTF';
import {applyWallFinishes} from './wall-finishes';
import {installCarpets} from './carpets';

type Furniture={room:RoomId;asset:string;p:[number,number,number];size:[number,number,number];angle?:number;hide:RegExp;finish?:string;filter?:(m:AbstractMesh)=>boolean};
const furniture:Furniture[]=[
 {room:'kitchen',asset:'../fixtures/fridge',p:[3.2,.06,2.7],size:[1.14,2.45,1.18],angle:Math.PI,hide:/^kitchen (refrigerator|fridge |freezer )/},
 {room:'kitchen',asset:'electric_stove',p:[-1.68,.06,2.7],size:[1.04,1.16,1.03],angle:Math.PI,hide:/^kitchen (lower cabinet|cabinet front|brass pull|countertop|oven|burner)/,filter:m=>Math.abs(m.position.x+1.68)<.52},
 {room:'kitchen',asset:'painted_wooden_cabinet',p:[-3.2,.06,1.45],size:[1.05,1.15,1.05],angle:Math.PI/2,finish:'#9ab09a',hide:/^kitchen unused cabinet$/},
 {room:'kitchen',asset:'pot_enamel_01',p:[-1.68,1.18,2.7],size:[.35,.25,.35],hide:/^kitchen unused pot$/},
 {room:'kitchen',asset:'wooden_cutting_board',p:[-2.8,1.22,2.7],size:[.42,.035,.32],hide:/^kitchen unused board$/},
 {room:'bathroom',asset:'../fixtures/bathtub',p:[-2,.06,1.05],size:[1.65,1,3.22],angle:Math.PI/2,hide:/^bathroom bath (bottom|side|end|water)$/},
 {room:'toilet',asset:'../fixtures/toilet',p:[-1.35,.06,1.5],size:[.8,1.4,1.45],angle:Math.PI,hide:/^(toilet (toilet cistern|cistern lid|flush button|toilet pedestal|toilet bowl|toilet inset)|toilet seat)$/},
 {room:'bedroom',asset:'vintage_day_bed',p:[-2.72,.08,1.43],size:[1.75,1.55,3],angle:Math.PI/2,hide:/^(bed |headboard|mattress|pillow|soft draped quilt|turned bedpost|teddy)/},
 {room:'bedroom',asset:'painted_wooden_table',p:[.22,.06,2.12],size:[2.18,1.135,1.04],angle:Math.PI,finish:'#648982',hide:/^desk /},
 {room:'bedroom',asset:'wooden_display_shelves_01',p:[2.85,.06,2.61],size:[1.8,1.2,.77],angle:Math.PI/2,hide:/^(cabinet |book$|book spine line|linen basket|basket weave)/},
 {room:'bedroom',asset:'wooden_stool_02',p:[.25,.06,1.13],size:[.6,.66,.55],finish:'#ae8454',hide:/^stool /},
 {room:'bedroom',asset:'wicker_basket_01',p:[-3.15,.06,-2.27],size:[.84,.58,.72],hide:/^(floor basket|basket seam|basket blanket)$/},
 {room:'bedroom',asset:'desk_lamp_arm_01',p:[-.57,1.20,2.36],size:[.32,.68,.42],hide:/^lamp /},
 {room:'living',asset:'sofa_03',p:[-1.25,.06,2.2],size:[3.65,1.55,1.4],angle:Math.PI,hide:/^living (sofa |seat cushion|soft pillow)/},
 {room:'living',asset:'modern_arm_chair_01',p:[2.55,.06,-.9],size:[1.2,1.5,1.1],angle:Math.PI,hide:/^living armchair/},
 {room:'living',asset:'modern_coffee_table_01',p:[-1,.06,-.15],size:[1.95,.65,1.15],hide:/^living coffee table/},
 {room:'living',asset:'wooden_display_shelves_01',p:[-3.4,.06,-1.4],size:[.7,1.9,2.1],angle:0,hide:/^living (bookcase |bookshelf|book$)/},
 {room:'kitchen',asset:'painted_wooden_table',p:[-.15,.06,-.5],size:[2,.94,1.4],finish:'#c8af89',hide:/^kitchen (dining table|table legs)/},
 ...[-1.4,1.1].map(x=>({room:'kitchen' as const,asset:'painted_wooden_chair_02',p:[x,.06,-.5] as [number,number,number],size:[.56,1.15,.54] as [number,number,number],angle:x<0?Math.PI/2:-Math.PI/2,finish:'#a6b8aa',hide:/^kitchen chair /,filter:(m:AbstractMesh)=>Math.abs(m.position.x-x)<.3})),
 {room:'bathroom',asset:'painted_wooden_cabinet_02',p:[2.3,.06,.1],size:[.85,1.28,.6],angle:Math.PI,finish:'#c1d2c5',hide:/^bathroom towel stand$/},
 {room:'hall',asset:'wooden_stool_02',p:[3,.06,-1.15],size:[1.9,.58,.75],angle:0,finish:'#ae8454',hide:/^hall (hall bench|bench legs|bench cushion)/},
];

export function installInteriorLibrary(scene:Scene,shadow:ShadowGenerator,rooms:Map<RoomId,HouseRoom>){
 const originals=new Map(Array.from(rooms,([id,room])=>[id,room.root.getChildMeshes()]));
 // Replace each potted plant as a whole, including its former stems and leaves.
 for(const [id,meshes] of originals){
  const pots=meshes.filter(m=>/^(handmade ceramic pot|.+ ceramic pot)$/.test(m.name));
  for(const pot of pots){
   const {min:lo,max:hi}=pot.getHierarchyBoundingVectors(true),height=hi.y-lo.y;
   const p=pot.position.clone(),base=pot.name==='handmade ceramic pot'?p.y-height/2:p.y-height/2;
   furniture.push({room:id,asset:'potted_plant_01',p:[p.x,base,p.z],size:[height*1.4,height*3.5,height*1.4],hide:/plant pot|ceramic pot|pot soil|plant stem|veined curved leaf| stem$| leaf$/,
    filter:m=>{const b=m.getBoundingInfo().boundingBox.center;const center=m.position.add(b);return Math.hypot(center.x-p.x,center.z-p.z)<height*1.5&&center.y>=base-.05&&center.y<base+height*5}});
  }
 }
 const cache=new Map<string,Promise<AssetContainer>>(),pending=new Map<RoomId,Promise<void>>(),finishes=new Map<string,PBRMaterial>();
 const load=(id:string)=>{let task=cache.get(id);if(!task){task=LoadAssetContainerAsync('/assets/polyhaven/'+id+'.glb',scene);cache.set(id,task);task.catch(()=>cache.delete(id))}return task};
 async function replace(item:Furniture){
  const container=await load(item.asset),root=new TransformNode('library '+item.asset,scene);
  root.setEnabled(false);const instance=container.instantiateModelsToScene(n=>'library '+n,false,{doNotInstantiate:true});
  instance.rootNodes.forEach(n=>n.parent=root);root.rotation.y=item.angle??0;root.computeWorldMatrix(true);
  root.getChildMeshes().forEach(m=>m.computeWorldMatrix(true));
  const {min,max}=root.getHierarchyBoundingVectors(true),extent=max.subtract(min),center=min.add(max).scale(.5);
  // Bounds were measured after rotation; apply scale in world-aligned parent space.
  const fit=new TransformNode('furniture fit '+item.asset,scene);root.parent=fit;fit.scaling.set(item.size[0]/extent.x,item.size[1]/extent.y,item.size[2]/extent.z);
  fit.parent=rooms.get(item.room)!.root;
  fit.position.set(item.p[0]-center.x*fit.scaling.x,item.p[1]-min.y*fit.scaling.y,item.p[2]-center.z*fit.scaling.z);
  root.getChildMeshes().forEach(m=>{m.receiveShadows=true;m.isPickable=true;shadow.addShadowCaster(m);if(item.finish){let paint=finishes.get(item.finish);if(!paint){paint=new PBRMaterial('clean furniture '+item.finish,scene);paint.albedoColor=Color3.FromHexString(item.finish).toLinearSpace();paint.metallic=0;paint.roughness=.78;paint.environmentIntensity=.4;finishes.set(item.finish,paint)}m.material=paint}else if(m.material instanceof PBRMaterial)m.material.environmentIntensity=.55});
  root.setEnabled(true);
  if(item.asset==='../fixtures/bathtub'){
   const old=originals.get('bathroom')!.find(m=>m.name==='bathroom bath water');
   const water=MeshBuilder.CreateDisc('library bath water',{radius:1,tessellation:64,sideOrientation:2},scene);
   water.parent=rooms.get('bathroom')!.root;water.position.set(-2,.79,1.05);water.rotation.x=Math.PI/2;water.scaling.set(.51,1.28,1);water.material=old?.material??null;water.isPickable=false;
  }
  for(const m of originals.get(item.room)!)if(item.hide.test(m.name)&&(!item.filter||item.filter(m)))m.setEnabled(false);
 }
 async function ensure(id:RoomId){
  if(pending.has(id))return pending.get(id)!;
  const task=(async()=>{for(const item of furniture.filter(i=>i.room===id))try{await replace(item)}catch(error){console.error('Furniture load failed: '+item.asset,error)}})();pending.set(id,task);return task;
 }
 installMaterials(scene,rooms);
 // Keep the room-specific wallpaper, panelling and tile bands above library finishes.
 applyWallFinishes(scene,rooms);
 installCarpets(scene,rooms);
 return {ensure};
}

function installMaterials(scene:Scene,rooms:Map<RoomId,HouseRoom>){
 const materials=new Map<string,PBRMaterial>();
 function material(asset:string,tint='#ffffff',repeat=1){
  const key=asset+tint+repeat;if(materials.has(key))return materials.get(key)!;
  const m=new PBRMaterial('Poly Haven '+key,scene),base='/assets/polyhaven/'+asset+'/';
  const tex=(file:string)=>{const t=new Texture(base+file+'.jpg',scene);t.uScale=t.vScale=repeat;t.anisotropicFilteringLevel=4;return t};
  m.albedoTexture=tex('color');m.bumpTexture=tex('normal');m.bumpTexture.level=.3;
  if(asset==='white_plaster_02'||asset==='quatrefoil_jacquard_fabric'){
   new PaintedSurface(m);m.bumpTexture.level=.3;
  }
  m.metallicTexture=tex('roughness');m.metallicTexture.gammaSpace=false;m.useRoughnessFromMetallicTextureAlpha=false;m.useRoughnessFromMetallicTextureGreen=true;m.useMetallnessFromMetallicTextureBlue=false;
  m.metallic=0;m.roughness=1;m.albedoColor=Color3.FromHexString(tint);m.environmentIntensity=.5;m.backFaceCulling=false;materials.set(key,m);return m;
 }
 const wood=material('wood_table','#eed5b1'),cloth=material('quatrefoil_jacquard_fabric','#d6d9bb');
 const wallColors:Record<RoomId,string>={bedroom:'#ede2d0',living:'#ddd8bd',kitchen:'#ebe2cc',bathroom:'#c8dfd8',toilet:'#e2d6bc',hall:'#e4d7bd'};
 for(const [id,room] of rooms)for(const abstract of room.root.getChildMeshes()){
  const m=abstract as Mesh,n=m.name;
  if(/solid wall|^back wall$|^left wall$|bedroom open passage|.+ back wall$|.+ left wall$|open passage wall|cutaway right wall/.test(n)){
   m.material=material('white_plaster_02',wallColors[id]);uv(m,'wall');
  }else if(/glazed wall tile/.test(n)){m.material=material('long_white_tiles',id==='bathroom'?'#aaccc3':'#e6e0cb');uv(m,'wall')}
  else if(n==='individual floor board')m.setEnabled(false);
  else if(n.endsWith('walkable floor')){m.material=material(['kitchen','bathroom','toilet'].includes(id)?'interior_tiles':'wooden_floor_01');uv(m,'floor')}
  else if(/floor board seam/.test(n))m.setEnabled(false);
  else if(/^(kitchen|bathroom|toilet) tile$/.test(n))m.setEnabled(false);
  else if(/wood|oak|walnut/.test(m.material?.name??'')&&!/frame|paper|print|clock/.test(n))m.material=wood;
  else if(/towel|cushion|curtain|woven carpet|round woven rug|basket blanket/.test(n))m.material=cloth;
 }
 function uv(mesh:Mesh,kind:'floor'|'wall'){
  const p=mesh.getVerticesData(VertexBuffer.PositionKind),norm=mesh.getVerticesData(VertexBuffer.NormalKind);if(!p||!norm)return;
  const values:number[]=[];for(let i=0;i<p.length;i+=3){const x=p[i]+mesh.position.x,y=p[i+1]+mesh.position.y,z=p[i+2]+mesh.position.z;values.push((kind==='floor'?x:Math.abs(norm[i])>Math.abs(norm[i+2])?z:x)/2,(kind==='floor'?z:y)/2)}mesh.setVerticesData(VertexBuffer.UVKind,values);
 }
}

// Recolour the library scan in the shader, preserving its photographed grain and weave.
class PaintedSurface extends MaterialPluginBase {
 constructor(material:PBRMaterial){super(material,'PaintedSurface',200,{},true,true)}
 getClassName(){return 'PaintedSurface'}
 getCustomCode(type:string){return type==='fragment'?{CUSTOM_FRAGMENT_UPDATE_ALBEDO:'surfaceAlbedo = vAlbedoColor.rgb * (0.78 + 0.22 * dot(albedoTexture.rgb, vec3(0.2126, 0.7152, 0.0722)));'}:null}
}
