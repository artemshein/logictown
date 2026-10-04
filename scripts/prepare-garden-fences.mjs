// Original garden fences following the user's white-picket and timber/wire references.
// Photographic wood materials: Rob Tuytel / Poly Haven, CC0. No alpha-test grids.
// Run fetch-colonial-textures.mjs first; tooling shares .asset-cache/tree-tools.
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {dedup} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {BoxGeometry,ExtrudeGeometry,Shape,Float32BufferAttribute} from '../.asset-cache/tree-tools/node_modules/three/build/three.module.js';
import {mergeGeometries} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {readFile,writeFile,rename} from 'node:fs/promises';
import sharp from 'sharp';
const entries=[];
for(const style of ['picket','wire']){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(style+' garden fence'),buckets=new Map();
 const wood=doc.createMaterial(style==='picket'?'white painted pickets':'warm timber frame').setMetallicFactor(0).setRoughnessFactor(.85);
 const id=style==='picket'?'white_planks_clean':'wood_planks_grey';
 for(const [map,setter]of [['color','setBaseColorTexture'],['normal','setNormalTexture'],['roughness','setMetallicRoughnessTexture']]){
  let s=sharp(await readFile(`.asset-cache/houses/colonial/${id}/${map}.jpg`)).resize(512,512);
  if(map==='color')s=style==='picket'?s.grayscale().modulate({brightness:1.3}).toColourspace('srgb'):s.grayscale().modulate({brightness:1.8}).toColourspace('srgb');
  wood[setter](doc.createTexture(id+' '+map).setImage(await s.jpeg({quality:90}).toBuffer()).setMimeType('image/jpeg'));
 }
 wood.setBaseColorFactor(style==='picket'?[.97,.98,.96,1]:[.85,.67,.43,1]);
 const iron=doc.createMaterial('galvanized woven wire').setBaseColorFactor([.14,.16,.15,1]).setMetallicFactor(.75).setRoughnessFactor(.5);
 function add(g,m=wood){if(g.index)g=g.toNonIndexed();g.computeVertexNormals();const p=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/1.5,p.getY(i)/1.5);if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g)}
 function box(x,y,z,w,h,d,m=wood){add(new BoxGeometry(w,h,d).translate(x,y,z),m)}
 const width=2.8,height=1.28;
 for(const x of [-width/2+.09,width/2-.09]){box(x,.63,0,.18,1.26,.18);box(x,1.29,0,.23,.06,.23);box(x,1.335,0,.18,.03,.18)}
 if(style==='picket'){
  for(const y of [.16,.92])box(0,y,.035,width,.10,.085);
  const count=16,span=width-.36;
  for(let i=0;i<count;i++){
   const x=-span/2+span*(i+.5)/count,w=.093,top=1.20;
   const shape=new Shape();shape.moveTo(-w/2,.05);shape.lineTo(w/2,.05);shape.lineTo(w/2,top-.095);shape.lineTo(0,top);shape.lineTo(-w/2,top-.095);shape.closePath();
   add(new ExtrudeGeometry(shape,{depth:.047,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.003,bevelThickness:.003,curveSegments:1}).translate(x,0,-.065));
  }
 }else{
  for(const y of [.13,1.15])box(0,y,0,width,.12,.10);
  for(let x=-1.2;x<=1.21;x+=.15)box(x,.64,.005,.008,.93,.008,iron);
  for(let y=.22;y<=1.09;y+=.145)box(0,y,0,2.42,.008,.008,iron);
  // Visible fasteners and hinges are separate dark metal details.
  for(const x of [-1.24,1.24])for(const y of [.24,1.05])box(x,y,-.06,.08,.035,.015,iron);
 }
 const mesh=doc.createMesh(style+' fence panel');let triangles=0;
 for(const [material,list]of buckets){const g=mergeGeometries(list,false),primitive=doc.createPrimitive().setMaterial(material);for(const [s,t,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']])primitive.setAttribute(t,doc.createAccessor(t).setType(type).setArray(new Float32Array(g.getAttribute(s).array)).setBuffer(buffer));const indices=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;primitive.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indices).setBuffer(buffer));mesh.addPrimitive(primitive)}
 scene.addChild(doc.createNode(style+' fence').setMesh(mesh));await doc.transform(dedup());
 const file=style==='picket'?'fence.glb':'fence-wire.glb',temporary='.asset-cache/houses/colonial/'+file;await new NodeIO().write(temporary,doc);await rename(temporary,'public/assets/outdoor/'+file);
 entries.push({file,author:'Logictown; photo textures by Rob Tuytel',license:'CC0-1.0',source:'https://polyhaven.com/a/'+id,changes:'Original '+style+' garden fence based on user reference; capped posts, photographic wood PBR maps, '+(style==='picket'?'bevelled pointed pickets and two rails':'wood frame and physical wire grid; no transparency texture'),triangles});console.log(file,triangles);
}
const path='public/assets/outdoor/models-credits.json',old=JSON.parse(await readFile(path,'utf8'));old.models=old.models.filter(m=>!m.file.startsWith('fence'));old.models.push(...entries);await writeFile(path,JSON.stringify(old,null,2)+'\n');
