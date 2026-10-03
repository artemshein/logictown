// Source ZIP: https://opengameart.org/sites/default/files/house_0.zip
// Extract into .asset-cache/houses/ordinary. Dependencies share the tree conversion tools.
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {OBJLoader} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/loaders/OBJLoader.js';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
for(const [name,image] of [['a','texture1.png'],['b','texture2.png']]){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('mansard house');
 const texture=doc.createTexture('photographic facade atlas').setImage(await sharp('.asset-cache/houses/ordinary/'+image).resize(2048,2048,{fit:'inside'}).jpeg({quality:90}).toBuffer()).setMimeType('image/jpeg');
 const mat=doc.createMaterial('plaster and terracotta').setBaseColorTexture(texture).setMetallicFactor(0).setRoughnessFactor(.95);
 const object=new OBJLoader().parse((await readFile('.asset-cache/houses/ordinary/house.obj','utf8')).replace(/^l .*$/gm,''));let triangles=0;
 object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone(),p=doc.createPrimitive().setMaterial(mat);
 for(const [s,t,type] of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']]){const a=g.getAttribute(s);if(!a)continue;const values=new Float32Array(a.array);if(s==='uv')for(let i=1;i<values.length;i+=2)values[i]=1-values[i];p.setAttribute(t,doc.createAccessor(t).setType(type).setArray(values).setBuffer(buffer))}
 const indices=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;p.setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer));scene.addChild(doc.createNode('house').setMesh(doc.createMesh().addPrimitive(p)));
 });await new NodeIO().write('public/assets/outdoor/building-type-'+name+'.glb',doc);console.log(name,triangles);
}
