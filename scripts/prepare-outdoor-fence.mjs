// Download fence_0.zip and 2k_textures.zip from
// https://opengameart.org/content/low-poly-fence-textured (khairul169, CC0).
// Extract into .asset-cache/fence/model and .asset-cache/fence/picket-2k.
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {OBJLoader} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/loaders/OBJLoader.js';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
const folder='.asset-cache/fence/picket-2k',doc=new Document(),buffer=doc.createBuffer();
const material=doc.createMaterial('painted garden metal').setMetallicFactor(1).setRoughnessFactor(1);
for(const [map,setter] of [['Albedo','setBaseColorTexture'],['NormalMap','setNormalTexture']]){
 const source=sharp(await readFile(`${folder}/Fence_${map}.png`)).resize(1024,1024);
 if(map==='Albedo')source.grayscale().modulate({brightness:.6}).toColourspace('srgb');
 const image=await source.jpeg({quality:90}).toBuffer();
 material[setter](doc.createTexture(map).setImage(image).setMimeType('image/jpeg'));
}
const maps=await Promise.all(['Roughness','Metallic'].map(async name=>sharp(await readFile(`${folder}/Fence_${name}.png`)).resize(1024,1024).removeAlpha().raw().toBuffer({resolveWithObject:true})));
const pixels=Buffer.alloc(1024*1024*3);for(let i=0;i<pixels.length/3;i++){pixels[i*3]=255;pixels[i*3+1]=maps[0].data[i*maps[0].info.channels];pixels[i*3+2]=maps[1].data[i*maps[1].info.channels]}
material.setMetallicRoughnessTexture(doc.createTexture('metal roughness').setImage(await sharp(pixels,{raw:{width:1024,height:1024,channels:3}}).jpeg({quality:90}).toBuffer()).setMimeType('image/jpeg'));
const object=new OBJLoader().parse(await readFile('.asset-cache/fence/model/fence.obj','utf8'));
const scene=doc.createScene('garden railing');let triangles=0;
object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,primitive=doc.createPrimitive().setMaterial(material);
 for(const [source,target,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']]){const a=g.getAttribute(source);if(!a)continue;const values=new Float32Array(a.array);if(source==='uv')for(let i=1;i<values.length;i+=2)values[i]=1-values[i];primitive.setAttribute(target,doc.createAccessor(target).setType(type).setArray(values).setBuffer(buffer))}
 const indices=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;primitive.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indices).setBuffer(buffer));scene.addChild(doc.createNode('garden fence panel').setMesh(doc.createMesh('garden fence').addPrimitive(primitive)));
});
await new NodeIO().write('public/assets/outdoor/fence.glb',doc);console.log(triangles+' triangles; '+(await readFile('public/assets/outdoor/fence.glb')).length+' bytes');
