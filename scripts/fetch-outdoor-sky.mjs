import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const id='syferfontein_18d_clear_puresky',response=await fetch('https://api.polyhaven.com/files/'+id);
if(!response.ok)throw new Error('Poly Haven metadata: '+response.status);
const files=await response.json(),download=await fetch(files.tonemapped.url);
if(!download.ok)throw new Error('Sky download: '+download.status);
const bytes=await sharp(Buffer.from(await download.arrayBuffer())).resize(2048,1024).jpeg({quality:90}).toBuffer();
await writeFile('public/assets/outdoor/clear-sky.jpg',bytes);
console.log('Clear sky panorama: '+bytes.length+' bytes');
