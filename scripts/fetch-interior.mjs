import {mkdir,writeFile,readFile,cp} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.asset-cache/polyhaven');
const models=['vintage_day_bed','sofa_03','modern_arm_chair_01','painted_wooden_table','WoodenTable_01','wooden_stool_02','painted_wooden_chair_02','painted_wooden_cabinet_02','wooden_bookshelf_worn','wicker_basket_01','potted_plant_01','desk_lamp_arm_01','electric_stove','painted_wooden_cabinet','pot_enamel_01','wooden_cutting_board'];
const textures=['white_plaster_02','wooden_floor_01','wood_table','quatrefoil_jacquard_fabric','long_white_tiles','interior_tiles','beige_wall_002'];
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'LogicTownAssetPreparation/1.0'}});if(!r.ok)throw Error(`${r.status} ${url}`);return r}
async function save(file,url){try{await readFile(file);return}catch{}await mkdir(path.dirname(file),{recursive:true});await writeFile(file,new Uint8Array(await (await get(url)).arrayBuffer()))}
const credits=[];
for(const id of [...models,...textures]){
 const files=await (await get(`https://api.polyhaven.com/files/${id}`)).json();
 const info=await (await get(`https://api.polyhaven.com/info/${id}`)).json();
 const dir=path.join(root,id);
 if(models.includes(id)){
  const asset=files.gltf['1k'].gltf;
  await save(path.join(dir,'model.gltf'),asset.url);
  for(const [name,file] of Object.entries(asset.include)){
   const dest=path.resolve(dir,name);if(!dest.startsWith(dir+path.sep))throw Error('Invalid asset path');await save(dest,file.url);
  }
 }else{
  for(const [type,names] of Object.entries({color:['diff','Diffuse','col_1'],normal:['nor_gl'],roughness:['rough','Rough']})){
   const key=names.find(k=>files[k]);if(!key)throw Error(`Missing ${type} for ${id}`);
   const resolution=id==='beige_wall_002'?'2k':'1k';
   const asset=files[key][resolution].jpg??files[key][resolution].png;
   await save(path.join(dir,type+'.'+(files[key][resolution].jpg?'jpg':'png')),asset.url);
  }
 }
 credits.push({id,name:info.name,authors:info.authors,source:`https://polyhaven.com/a/${id}`,license:'CC0-1.0',resolution:models.includes(id)?'1k':id==='beige_wall_002'?'2k':'1k',type:models.includes(id)?'model':'texture'});
 console.log('Downloaded',id);
}
await writeFile(path.join(root,'credits.json'),JSON.stringify(credits,null,2)+'\n');

await mkdir('public/assets/polyhaven',{recursive:true});
await cp(path.join(root,'credits.json'),'public/assets/polyhaven/credits.json');
for(const id of textures)await cp(path.join(root,id),path.join('public/assets/polyhaven',id),{recursive:true});
