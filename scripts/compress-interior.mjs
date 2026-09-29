import {readFile,writeFile,readdir} from 'node:fs/promises';
import sharp from 'sharp';
const directory='public/assets/polyhaven';
for(const file of (await readdir(directory)).filter(f=>f.endsWith('.glb'))){
 const data=await readFile(`${directory}/${file}`),jsonLength=data.readUInt32LE(12);
 const gltf=JSON.parse(data.subarray(20,20+jsonLength).toString()),binary=data.subarray(28+jsonLength);
 const replacements=new Map();
 for(const image of gltf.images??[]){
  if(image.mimeType==='image/jpeg'&&file!=='electric_stove.glb')continue;
  const view=gltf.bufferViews[image.bufferView],raw=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const png=sharp(raw),meta=await png.metadata();
  // Keep alpha-bearing leaves as PNG; pack opaque colour and data maps as high-quality JPEG.
  if(meta.hasAlpha)continue;
  const compressed=await png.jpeg({quality:file==='electric_stove.glb'?74:88,chromaSubsampling:'4:4:4'}).toBuffer();
  if(compressed.length<raw.length){replacements.set(image.bufferView,compressed);image.mimeType='image/jpeg'}
 }
 let offset=0;const parts=[];
 for(let i=0;i<gltf.bufferViews.length;i++){
  const view=gltf.bufferViews[i],content=replacements.get(i)??binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  view.byteOffset=offset;view.byteLength=content.length;parts.push(content);offset+=content.length;
  const pad=(4-offset%4)%4;parts.push(Buffer.alloc(pad));offset+=pad;
 }
 gltf.buffers[0].byteLength=offset;
 const text=Buffer.from(JSON.stringify(gltf)),json=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat(parts);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length);chunk.writeUInt32LE(0x004e4942,4);
 await writeFile(`${directory}/${file}`,Buffer.concat([header,json,chunk,bin]));
 console.log(file,Math.round(data.length/1024)+' KB -> '+Math.round((28+json.length+bin.length)/1024)+' KB');
}

const stats=JSON.parse(await readFile(directory+'/models.json','utf8'));
for(const model of stats)model.bytes=(await readFile(directory+'/'+model.id+'.glb')).length;
await writeFile(directory+'/models.json',JSON.stringify(stats,null,2)+'\n');

const credits=JSON.parse(await readFile(directory+'/credits.json','utf8'));
for(const asset of credits.filter(a=>a.type==='texture'))for(const map of ['color','normal','roughness']){
 const raw=await readFile(`.asset-cache/polyhaven/${asset.id}/${map}.jpg`);
 const packed=await sharp(raw).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toBuffer();
 await writeFile(`${directory}/${asset.id}/${map}.jpg`,packed.length<raw.length?packed:raw);
}
