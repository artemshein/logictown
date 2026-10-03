// Run after prepare-outdoor-houses.py; embed 1024px images and merge by material.
import {NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/extensions/dist/index.js';
import {join,prune,weld} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/functions/dist/index.js';
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const name of ['c','d']){const doc=await io.read('.asset-cache/houses/'+name+'.glb');await doc.transform(weld(),join(),prune());for(const t of doc.getRoot().listTextures())t.setImage(await sharp(t.getImage()).resize(1024,1024,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer()).setMimeType('image/jpeg');await io.write('public/assets/outdoor/building-type-'+name+'.glb',doc);}
for(const n of ['a','b','c','d']){const b=await readFile('public/assets/outdoor/building-type-'+n+'.glb');const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));console.log(n,b.length,j.meshes.reduce((s,m)=>s+m.primitives.reduce((s,p)=>s+j.accessors[p.indices].count/3,0),0),j.images?.length);}
