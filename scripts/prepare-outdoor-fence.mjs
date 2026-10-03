// Download https://opengameart.org/sites/default/files/wooden_log_fence.zip into .asset-cache/fence/log.
// npm install --prefix .asset-cache/tree-tools @gltf-transform/core three
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {FBXLoader} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/loaders/FBXLoader.js';
import {TextureLoader,Texture} from '../.asset-cache/tree-tools/node_modules/three/build/three.module.js';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
TextureLoader.prototype.load=function(){return new Texture()};
const folder='.asset-cache/fence/log/Wooden Log Fence',doc=new Document(),buffer=doc.createBuffer();
const material=doc.createMaterial('weathered timber').setMetallicFactor(0).setRoughnessFactor(1);
for(const [map,setter] of [['BaseColor','setBaseColorTexture'],['Normal','setNormalTexture']]){
 const image=await sharp(await readFile(`${folder}/Textures/WoodenFence/WoodenFence_${map}.png`)).resize(1024,1024).jpeg({quality:88}).toBuffer();
 material[setter](doc.createTexture(map).setImage(image).setMimeType('image/jpeg'));
}
const rough=await sharp(await readFile(`${folder}/Textures/WoodenFence/WoodenFence_Roughness.png`)).resize(1024,1024).removeAlpha().raw().toBuffer({resolveWithObject:true});
const pixels=Buffer.alloc(rough.info.width*rough.info.height*3);for(let i=0;i<pixels.length/3;i++){pixels[i*3]=255;pixels[i*3+1]=rough.data[i*rough.info.channels];pixels[i*3+2]=0}
material.setMetallicRoughnessTexture(doc.createTexture('roughness').setImage(await sharp(pixels,{raw:{width:rough.info.width,height:rough.info.height,channels:3}}).jpeg({quality:88}).toBuffer()).setMimeType('image/jpeg'));
const file=await readFile(`${folder}/Meshes/LOD1/WoodenFence_VarA_A_LOD1.fbx`);
const object=new FBXLoader().parse(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');object.updateMatrixWorld(true);
const scene=doc.createScene('wooden fence');let triangles=0;
object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld).rotateY(Math.PI/2),primitive=doc.createPrimitive().setMaterial(material);
 for(const [source,target,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']]){const a=g.getAttribute(source);if(!a)continue;const values=new Float32Array(a.array);if(source==='uv')for(let i=1;i<values.length;i+=2)values[i]=1-values[i];primitive.setAttribute(target,doc.createAccessor(target).setType(type).setArray(values).setBuffer(buffer))}
 const indices=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;primitive.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indices).setBuffer(buffer));scene.addChild(doc.createNode('fence panel').setMesh(doc.createMesh('fence').addPrimitive(primitive)));
});
await new NodeIO().write('public/assets/outdoor/fence.glb',doc);console.log(triangles+' triangles; '+(await readFile('public/assets/outdoor/fence.glb')).length+' bytes');
