import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const modelRecipes=new Map();

// Original product meshes, in metres, with their base at y=0.
// Small standalone GLBs let the shop instance actual products at known sizes.
async function saveModel(name,parts,materials,images){
 modelRecipes.set(name,{parts,materials,images});
 const chunks=[],views=[],accessors=[];let offset=0;
 const append=bytes=>{const index=views.length;views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});const padded=Buffer.alloc(Math.ceil(bytes.length/4)*4);bytes.copy(padded);chunks.push(padded);offset+=padded.length;return index};
 const accessor=(values,size,type)=>{const data=type===5123?new Uint16Array(values):new Float32Array(values);const index=accessors.length,entry={bufferView:append(Buffer.from(data.buffer)),componentType:type,count:values.length/size,type:({1:'SCALAR',2:'VEC2',3:'VEC3'})[size]};if(size===3&&type===5126){entry.min=[0,1,2].map(a=>Math.min(...values.filter((_,i)=>i%3===a)));entry.max=[0,1,2].map(a=>Math.max(...values.filter((_,i)=>i%3===a)))}accessors.push(entry);return index};
 const primitives=parts.map(p=>({attributes:{POSITION:accessor(p.positions,3,5126),NORMAL:accessor(p.normals,3,5126),TEXCOORD_0:accessor(p.uvs,2,5126)},indices:accessor(p.indices,1,5123),material:p.material}));
 const embedded=[];for(const svg of images){const png=await sharp(Buffer.from(svg)).png().toBuffer();embedded.push({bufferView:append(png),mimeType:'image/png'})}
 const json={asset:{version:'2.0',generator:'Logictown original shop products'},scene:0,scenes:[{nodes:[0]}],nodes:[{name,mesh:0}],meshes:[{name,primitives}],materials,images:embedded,textures:embedded.map((_,i)=>({source:i,sampler:0})),samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:33071}],accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 const raw=Buffer.from(JSON.stringify(json)),jsonChunk=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(jsonChunk);const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+bin.length,8);jh.writeUInt32LE(jsonChunk.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 await writeFile(`public/assets/shop/${name}.glb`,Buffer.concat([header,jh,jsonChunk,bh,bin]));
}
function revolve(profile,material){
 const positions=[],normals=[],uvs=[],indices=[],segments=32;
 for(let row=0;row<profile.length;row++){const [y,r]=profile[row],prev=profile[Math.max(0,row-1)],next=profile[Math.min(profile.length-1,row+1)],slope=(next[1]-prev[1])/(next[0]-prev[0]||1),length=Math.hypot(1,slope);for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(r*Math.sin(a),y,r*Math.cos(a));normals.push(Math.sin(a)/length,-slope/length,Math.cos(a)/length);uvs.push(i/segments,1-row/(profile.length-1));}}
 for(let row=0;row<profile.length-1;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1)}return {positions,normals,uvs,indices,material};
}
function wrapper(){
 const positions=[],normals=[],uvs=[],indices=[];
 const profile=[[-.13,.008,.043],[-.105,.012,.043],[-.09,.023,.044],[.09,.023,.044],[.105,.012,.043],[.13,.008,.043]],n=16;
 for(let row=0;row<profile.length;row++){const [x,ry,rz]=profile[row];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,cy=Math.cos(a),sz=Math.sin(a);positions.push(x,.023+ry*cy,rz*sz);normals.push(0,cy,sz);uvs.push((x+.13)/.26,i/n)}}
 for(let row=0;row<profile.length-1;row++)for(let i=0;i<n;i++){const a=row*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1)}
 for(const row of [0,profile.length-1]){const centre=positions.length/3;positions.push(profile[row][0],.023,0);normals.push(row===0?-1:1,0,0);uvs.push(row===0?0:1,.5);for(let i=0;i<n;i++){const a=row*(n+1)+i;if(row===0)indices.push(centre,a+1,a);else indices.push(centre,a,a+1)}}
 return {positions,normals,uvs,indices,material:0};
}
function plane(points,material){return {positions:points.flat(),normals:points.flatMap(()=>[0,1,0]),uvs:[0,1,1,1,1,0,0,0],indices:[0,2,1,0,3,2],material}}
const colour=(name,rgba,roughness=.5)=>({name,pbrMetallicRoughness:{baseColorFactor:rgba,metallicFactor:0,roughnessFactor:roughness}});
await mkdir('public/assets/shop',{recursive:true});
const bottleLabel='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><rect width="512" height="256" fill="#eaba4c"/><rect y="24" width="512" height="204" fill="#fff4d2"/><circle cx="110" cy="132" r="58" fill="#d98531"/><path d="M103 66 Q108 35 146 43" stroke="#528046" stroke-width="13" fill="none"/><text x="308" y="107" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="55" fill="#365c37">СОК</text><text x="308" y="156" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#6c5c3e">ЯБЛОЧНЫЙ</text><text x="308" y="193" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#6c5c3e">0,5 л</text></svg>';
await saveModel('juice-bottle',[
 revolve([[0,0],[0,.06],[.012,.073],[.035,.075],[.225,.075],[.245,.069],[.272,.037],[.29,.027],[.336,.027],[.336,0]],0),
 revolve([[.065,.0756],[.225,.0756]],1),
 revolve([[.332,0],[.332,.031],[.338,.033],[.342,.031],[.347,.033],[.352,.031],[.358,.033],[.366,.031],[.366,0]],2),
],[colour('amber juice bottle',[.55,.3,.075,1],.24),{name:'apple juice label',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.65}},colour('green screw cap',[.12,.35,.17,1],.4)],[bottleLabel]);
const barLabel='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><rect width="512" height="256" rx="28" fill="#6d2637"/><rect x="12" y="12" width="488" height="232" rx="25" fill="none" stroke="#dfb864" stroke-width="10"/><text x="256" y="85" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#ffe9bd">ТИХИЙ ГОРОД</text><text x="256" y="147" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="49" fill="#fff3db">БАТОНЧИК</text><text x="256" y="202" text-anchor="middle" font-family="sans-serif" font-size="31" fill="#ffe0a0">ШОКОЛАД · ОРЕХ</text></svg>';
const bar=wrapper();
// A conforming printed panel follows the curved top of the wrapper.
const label={positions:[],normals:[],uvs:[],indices:[],material:1};
for(let i=0;i<=8;i++){const z=-.035+i*.07/8,y=.023+.023*Math.sqrt(1-(z/.044)**2)+.0003;for(const x of [-.086,.086]){label.positions.push(x,y,z);label.normals.push(0,1,0);label.uvs.push(x<0?0:1,i/8)}}
for(let i=0;i<8;i++){const a=i*2;label.indices.push(a,a+2,a+1,a+1,a+2,a+3)}
const seals=[];for(const side of [-1,1])for(let i=0;i<8;i++){const x0=side>0?.109:-.13,x1=side>0?.13:-.109,z=-.043+i*.01075;seals.push(plane([[x0,.033,z],[x1,.033,z],[x1,.033,z+.005],[x0,.033,z+.005]],2))}
await saveModel('chocolate-bar',[bar,label,...seals],[colour('burgundy foil wrapper',[.3,.04,.08,1],.4),{name:'printed chocolate wrapper',doubleSided:true,pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.6}},colour('crimped gold seals',[.7,.5,.2,1],.3)],[barLabel]);
const bottleRecipe=modelRecipes.get('juice-bottle'),barRecipe=modelRecipes.get('chocolate-bar');
for(const [suffix,hex,body,cap,flavour] of [
 ['apple','#639344',[.3,.55,.12,1],[.1,.35,.12,1],'ЯБЛОЧНЫЙ'],
 ['orange','#e58a27',[.95,.38,.035,1],[.8,.25,.015,1],'АПЕЛЬСИНОВЫЙ'],
 ['berry','#bd3c55',[.65,.035,.09,1],[.5,.025,.06,1],'ЯГОДНЫЙ'],
 ['grape','#8553a7',[.33,.09,.55,1],[.24,.04,.4,1],'ВИНОГРАДНЫЙ'],
]){
 const materials=structuredClone(bottleRecipe.materials);materials[0].pbrMetallicRoughness.baseColorFactor=body;materials[2].pbrMetallicRoughness.baseColorFactor=cap;
 const artwork=bottleLabel.replace('#eaba4c',hex).replace('#d98531',hex).replace('ЯБЛОЧНЫЙ',flavour);
 await saveModel('juice-bottle-'+suffix,bottleRecipe.parts,materials,[artwork]);
}
for(const [suffix,hex,body,flavour] of [
 ['nut','#6d2637',[.3,.04,.08,1],'ШОКОЛАД · ОРЕХ'],
 ['milk','#2866b2',[.025,.14,.5,1],'МОЛОЧНЫЙ ШОКОЛАД'],
 ['cereal','#408647',[.035,.32,.065,1],'ЗЛАКИ · ОРЕХ'],
 ['caramel','#d58d28',[.7,.3,.025,1],'ШОКОЛАД · КАРАМЕЛЬ'],
]){
 const materials=structuredClone(barRecipe.materials);materials[0].pbrMetallicRoughness.baseColorFactor=body;
 const artwork=barLabel.replace('#6d2637',hex).replace('ШОКОЛАД · ОРЕХ',flavour);
 await saveModel('chocolate-bar-'+suffix,barRecipe.parts,materials,[artwork]);
}
await writeFile('public/assets/shop/credits.json',JSON.stringify({author:'Logictown',license:'CC0-1.0',models:[...modelRecipes.keys()].map(name=>name+'.glb'),description:'Original product geometry and packaging artwork. Dimensions in metres; models rest on y=0.'},null,2)+'\n');
console.log('Created juice-bottle.glb and chocolate-bar.glb');
