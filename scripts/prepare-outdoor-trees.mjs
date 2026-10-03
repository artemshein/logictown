// npm install --prefix .asset-cache/tree-tools @gltf-transform/core @gltf-transform/functions meshoptimizer sharp
import {NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {simplifyPrimitive,weld,prune,quantize} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptSimplifier} from '../.asset-cache/tree-tools/node_modules/meshoptimizer/index.js';
import sharp from 'sharp';
import {ALL_EXTENSIONS} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/extensions/dist/index.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await MeshoptSimplifier.ready;
for(const [id,file] of [['tree_small_02','tree-small.glb'],['island_tree_01','tree-large.glb']]){
 const dir=`.asset-cache/trees/${id}`,url=`https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/${id}/`;
 await mkdir(dir+'/textures',{recursive:true});
 const files=await(await fetch('https://api.polyhaven.com/files/'+id)).json();
 const json=await(await fetch(url+id+'_1k.gltf')).json();
 await Promise.all([...json.buffers,...json.images].map(async r=>{try{if((await readFile(dir+'/'+r.uri)).length>100)return}catch{}const response=await fetch(files.gltf['1k'].gltf.include[r.uri].url);if(!response.ok)throw new Error(r.uri+': '+response.status);await writeFile(dir+'/'+r.uri,new Uint8Array(await response.arrayBuffer()))}));
 await writeFile(dir+'/model.gltf',JSON.stringify(json));
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(dir+'/model.gltf');
 // Give foliage its own budget: a blanket 98% reduction discarded whole leaves.
 await doc.transform(weld());
 for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  const material=primitive.getMaterial(),leaves=material?.getName().includes('leaves');
  simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:leaves?.08:.02,error:.008,lockBorder:false});
  // Source leaf maps are RGB and leaves already have their own silhouettes.
  // Opaque double-sided leaves avoid unnecessary blending/sorting.
  if(leaves)material.setAlphaMode('OPAQUE');
 }
 await doc.transform(prune(),quantize());
 for(const tex of doc.getRoot().listTextures()){
  const bytes=await sharp(Buffer.from(tex.getImage())).resize(512,512,{fit:'inside'}).jpeg({quality:85}).toBuffer();tex.setImage(bytes).setMimeType('image/jpeg');
 }
 await io.write('public/assets/outdoor/'+file,doc);
 const triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
 console.log(id,triangles+' triangles', (await readFile('public/assets/outdoor/'+file)).length+' bytes');
}
