import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
const bytes=await fs.readFile(new URL('../public/models/lea-b.glb',import.meta.url));
const report=await validator.validateBytes(new Uint8Array(bytes),{uri:'lea-b.glb',maxIssues:100});
const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
assert.equal(report.issues.numErrors,0,'GLB validation errors');
assert.equal(json.skins.length,1,'Expected one deforming skeleton');
for(const clip of ['Idle','Walk','Interact','Celebrate'])assert(json.animations.some(a=>a.name===clip&&a.channels.length>0),`Missing animation ${clip}`);
for(const mesh of json.meshes)for(const primitive of mesh.primitives){assert(primitive.attributes.JOINTS_0!==undefined);assert(primitive.attributes.WEIGHTS_0!==undefined)}
await fs.writeFile(new URL('../art/lea/model/validation.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({errors:report.issues.numErrors,warnings:report.issues.numWarnings,animations:json.animations.map(a=>a.name),bones:json.skins[0].joints.length,bytes:bytes.length,issues:report.issues.messages.slice(0,10)},null,2));
