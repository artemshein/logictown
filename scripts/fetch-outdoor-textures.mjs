// Models are the original GLBs listed in public/assets/outdoor/models-credits.json.
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const credits=[];
async function get(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return r}
for(const id of ['grass_ground','asphalt_01','pavement_01']){
 const files=await(await get('https://api.polyhaven.com/files/'+id)).json(),info=await(await get('https://api.polyhaven.com/info/'+id)).json();
 await mkdir('public/assets/outdoor/'+id,{recursive:true});
 for(const [map,names]of Object.entries({color:['diff','Diffuse','col'],normal:['nor_gl'],roughness:['rough','Rough']})){
  const key=names.find(k=>files[k]);if(!key)throw Error('Missing '+map+' for '+id);const asset=files[key]['1k'].jpg??files[key]['1k'].png;
  const bytes=Buffer.from(await(await get(asset.url)).arrayBuffer());await writeFile(`public/assets/outdoor/${id}/${map}.jpg`,await sharp(bytes).resize(512,512).jpeg({quality:85}).toBuffer());
 }
 credits.push({id,source:'https://polyhaven.com/a/'+id,authors:info.authors,license:'CC0-1.0',changes:'512px JPEG color, normal and roughness maps; lawn tinted green at runtime'});
}
await writeFile('public/assets/outdoor/textures-credits.json',JSON.stringify(credits,null,2)+'\n');
