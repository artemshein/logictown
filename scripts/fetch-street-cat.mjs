import fs from 'node:fs/promises';
import {NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
const folder=new URL('../public/models/cat/',import.meta.url);
const credit=JSON.parse(await fs.readFile(new URL('credits.json',folder),'utf8'));
const response=await fetch(credit.download);if(!response.ok)throw new Error(`Cat download: ${response.status}`);
const gltf=await response.json();
const binaryResponse=await fetch(new URL(gltf.buffers[0].uri,credit.download));if(!binaryResponse.ok)throw new Error(`Cat buffer: ${binaryResponse.status}`);
const originalBinary=Buffer.from(await binaryResponse.arrayBuffer());
// Keep the artist's smooth normals and rig; package the original into one GLB.
const bufferName=gltf.buffers[0].uri;
for(const animation of gltf.animations){if(animation.name==='IdleNorm')animation.name='Idle';if(animation.name==='WalkCycle')animation.name='Walk'}
const walk=gltf.animations.find(a=>a.name==='Walk');gltf.animations.push({...structuredClone(walk),name:'Run'});
const io=new NodeIO(),document=await io.readJSON({json:gltf,resources:{[bufferName]:new Uint8Array(originalBinary)}});
const bytes=await io.writeBinary(document);
await fs.writeFile(new URL(credit.file,folder),bytes);console.log(`Cat: ${bytes.length} bytes, ${credit.author}, ${credit.license}`);
