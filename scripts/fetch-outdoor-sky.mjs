import sharp from 'sharp';
import {writeFile,readFile} from 'node:fs/promises';
const id='alps_field',response=await fetch('https://api.polyhaven.com/files/'+id);
if(!response.ok)throw new Error('Poly Haven metadata: '+response.status);
const files=await response.json();let source;
try{source=await readFile('.asset-cache/alps-field-source.jpg')}catch{
 const download=await fetch(files.tonemapped.url);
 if(!download.ok)throw new Error('Landscape download: '+download.status);
 source=Buffer.from(await download.arrayBuffer());await writeFile('.asset-cache/alps-field-source.jpg',source);
}
const bytes=await sharp(source).resize(4096,2048).jpeg({quality:90}).toBuffer();
await writeFile('public/assets/outdoor/mountain-landscape.jpg',bytes);
console.log('Alpine landscape panorama: '+bytes.length+' bytes');
