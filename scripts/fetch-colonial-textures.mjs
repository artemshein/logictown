import {mkdir,writeFile,access} from 'node:fs/promises';
import sharp from 'sharp';
for(const id of ['white_planks_clean','roof_slates_02','brick_wall_001','wood_planks_grey']){
 try{await access('.asset-cache/houses/colonial/'+id+'/roughness.jpg');continue}catch{}
 const files=await(await fetch('https://api.polyhaven.com/files/'+id)).json();await mkdir('.asset-cache/houses/colonial/'+id,{recursive:true});
 for(const [map,key] of [['color','Diffuse'],['normal','nor_gl'],['roughness','Rough']]){const source=files[key]['1k'].jpg.url;const b=Buffer.from(await(await fetch(source)).arrayBuffer());await writeFile('.asset-cache/houses/colonial/'+id+'/'+map+'.jpg',await sharp(b).resize(1024,1024).jpeg({quality:90}).toBuffer());}
 const info=await(await fetch('https://api.polyhaven.com/info/'+id)).json();console.log(id,info.authors);
}
