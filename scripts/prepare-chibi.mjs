import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const source=await fs.readFile(new URL('../cute_chibi_girl_-_free_game-ready_character.glb',import.meta.url));
assert.equal(source.toString('ascii',0,4),'glTF');
const jsonLength=source.readUInt32LE(12);
const gltf=JSON.parse(source.toString('utf8',20,20+jsonLength));
const binaryOffset=20+jsonLength;
const binaryLength=source.readUInt32LE(binaryOffset);
const binary=source.subarray(binaryOffset+8,binaryOffset+8+binaryLength);

// Sketchfab's converted GLB places animation keys tightly in two strided views.
// The glTF spec forbids byteStride on animation sampler accessors.
const animationViews=new Set(gltf.animations.flatMap(animation=>animation.samplers.flatMap(sampler=>[
  gltf.accessors[sampler.input].bufferView,gltf.accessors[sampler.output].bufferView,
])));
for(const index of animationViews){
  const view=gltf.bufferViews[index];
  if(view.byteStride===undefined)continue;
  const accessors=gltf.accessors.filter(accessor=>accessor.bufferView===index);
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  assert(accessors.every(accessor=>accessor.componentType===5126&&widths[accessor.type]*4===view.byteStride));
  delete view.byteStride;
}

const json=Buffer.from(JSON.stringify(gltf));
const paddedJson=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
const output=Buffer.alloc(12+8+paddedJson.length+8+binary.length);
output.write('glTF',0,'ascii');output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
output.writeUInt32LE(paddedJson.length,12);output.write('JSON',16,'ascii');paddedJson.copy(output,20);
const nextOffset=20+paddedJson.length;
output.writeUInt32LE(binary.length,nextOffset);output.write('BIN\0',nextOffset+4,'ascii');binary.copy(output,nextOffset+8);
await fs.writeFile(new URL('../public/models/cute-chibi-girl.glb',import.meta.url),output);
console.log(`Prepared ${output.length} bytes`);
