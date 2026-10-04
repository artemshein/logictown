// Store exterior following the user's log-built food market reference.
// Existing downloaded Poly Haven photographic wood and roof textures, CC0.
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {dedup} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {BoxGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,Vector3} from '../.asset-cache/tree-tools/node_modules/three/build/three.module.js';
import {mergeGeometries} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {TextGeometry} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/geometries/TextGeometry.js';
import {FontLoader} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/loaders/FontLoader.js';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import sharp from 'sharp';
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('village food market'),buckets=new Map();
const plain=(name,color,rough=.8)=>doc.createMaterial(name).setBaseColorFactor(color).setMetallicFactor(0).setRoughnessFactor(rough);
const white=plain('painted ivory trim',[.94,.94,.90,1]),concrete=plain('light concrete foundation and steps',[.57,.58,.55,1]),glass=plain('shop glazing',[.075,.14,.17,1],.15),hardware=plain('brushed door handles',[.44,.45,.44,1],.3);hardware.setMetallicFactor(.8);
async function textured(id,label,color){const m=plain(label,color);for(const [key,setter]of [['color','setBaseColorTexture'],['normal','setNormalTexture'],['roughness','setMetallicRoughnessTexture']]){let s=sharp(await readFile(`.asset-cache/houses/colonial/${id}/${key}.jpg`)).resize(512,512);if(key==='color')s=s.grayscale().modulate({brightness:1.5}).toColourspace('srgb');m[setter](doc.createTexture(label+' '+key).setImage(await s.jpeg({quality:90}).toBuffer()).setMimeType('image/jpeg'))}return m}
const log=await textured('wood_planks_grey','burgundy painted timber logs',[.46,.095,.115,1]),roof=await textured('roof_slates_02','grey slate roof',[.22,.25,.27,1]),rail=await textured('wood_planks_grey','natural timber handrails',[.66,.50,.32,1]);
function add(g,m){if(g.index)g=g.toNonIndexed();if(!g.getAttribute('uv'))g.setAttribute('uv',new Float32BufferAttribute(new Array(g.getAttribute('position').count*2).fill(0),2));if(m.getName()==='food market posters'){const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i))}if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g)}
function box(x,y,z,w,h,d,m=white){add(new BoxGeometry(w,h,d).translate(x,y,z),m)}
function face(points,m){const vertices=[];for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(vertices.flatMap((_,i)=>i%3?[]:[vertices[i]/2,vertices[i+1]/2]),2));g.computeVertexNormals();m.setDoubleSided(true);add(g,m)}
// Horizontal rounded logs, with flat end grain visible at interlocking corners.
function timber(x,y,z,length,along='x'){const g=new CylinderGeometry(.155,.155,length,12,1,false);g.rotateZ(Math.PI/2);if(along==='z')g.rotateY(Math.PI/2);g.translate(x,y,z);add(g,log)}
function wall(x,z,length,along,holes=[],top=3.85){for(let y=.66;y<top;y+=.29){let intervals=[[-length/2,length/2]];for(const h of holes)if(y>h.bottom-.14&&y<h.top+.14){const next=[];for(const [a,b]of intervals){if(h.a>a)next.push([a,Math.min(h.a,b)]);if(h.b<b)next.push([Math.max(h.b,a),b])}intervals=next.filter(([a,b])=>b>a)}for(const [a,b]of intervals)timber(x+(along==='x'?(a+b)/2:0),y,z+(along==='z'?(a+b)/2:0),b-a,along)}}
const W=18.4,D=9,front=-4.5,entry=-6.05;
box(0,.24,0,W,.48,D,concrete);box(0,.24,-5.15,5.8,.48,1.3,concrete);
const openings=[-6.4,6.4].map(x=>({a:x-1.15,b:x+1.15,bottom:1.1,top:2.85}));
wall(0,front,W,'x',[...openings,{a:-2.9,b:2.9,bottom:0,top:4}]);wall(0,4.5,W,'x');for(const x of [-W/2,W/2])wall(x,0,D+.3,'z');
wall(0,entry,5.8,'x',[{a:-1.35,b:1.35,bottom:.45,top:3.15}],4.25);for(const x of [-2.9,2.9])wall(x,-5.3,1.85,'z',[],4.25);
// Alternating exposed log tails continue beyond the corners.
for(let y=.66;y<3.85;y+=.29)for(const x of [-9.2,9.2])timber(x,y+.10,front+.07,.65,'z');
for(let y=.66;y<4.25;y+=.29)for(const x of [-2.9,2.9])timber(x,y+.10,entry+.05,.60,'z');
// Main broad low roof, intersected by a projecting entrance gable.
for(const side of [-1,1])face([[-9.65,3.95,side*4.95],[9.65,3.95,side*4.95],[9.65,5.6,0],[-9.65,5.6,0]],roof);
for(const x of [-9.2,9.2])face([[x,3.85,-4.5],[x,5.6,0],[x,3.85,4.5]],log);
for(let y=4.3;y<6.1;y+=.29){const width=5.8*(6.12-y)/(6.12-4.2);if(width>0)timber(0,y,entry,width)}
for(const side of [-1,1])face([[side*3.28,4.25,entry-.45],[0,6.3,entry-.45],[0,6.3,-1.5],[side*3.28,4.25,-1.5]],roof);
function slopedTrim(a,b,width=.18){const v=new Vector3(...b).sub(new Vector3(...a)),g=new BoxGeometry(v.length(),width,.22);g.rotateZ(Math.atan2(v.y,v.x)).translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);add(g,white)}
for(const side of [-1,1]){slopedTrim([side*3.3,4.22,entry-.48],[0,6.3,entry-.48],.22);box(side*3.2,4.18,-4.1,.25,.2,5.1)}
for(const z of [-4.95,4.95])box(0,3.95,z,19.3,.23,.22);box(0,5.65,0,19.35,.12,.18,roof);
// White-framed poster windows, kept distinct from the protruding rounded logs.
async function posterMaterial(){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#822b39"/><rect x="18" y="18" width="476" height="476" rx="8" fill="none" stroke="#efe3ba" stroke-width="8"/><text x="256" y="100" text-anchor="middle" font-family="Arial" font-size="45" font-weight="bold" fill="#fff4db">СВЕЖИЕ</text><text x="256" y="156" text-anchor="middle" font-family="Arial" font-size="36" fill="#fff4db">ПРОДУКТЫ</text><circle cx="175" cy="290" r="64" fill="#d8473b"/><circle cx="228" cy="291" r="64" fill="#ee6250"/><path d="M200 229q0-53 40-61" fill="none" stroke="#65452b" stroke-width="13"/><ellipse cx="232" cy="207" rx="40" ry="15" fill="#718450" transform="rotate(-23 232 207)"/><ellipse cx="330" cy="320" rx="88" ry="47" fill="#e6b665" transform="rotate(-25 330 320)"/><path d="m280 314 25 30m5-63 25 30m5-63 25 30" stroke="#ba8746" stroke-width="8"/><text x="256" y="432" text-anchor="middle" font-family="Arial" font-size="29" fill="#fff4db">ХЛЕБ • ОВОЩИ • ФРУКТЫ</text></svg>`;const m=plain('food market posters',[1,1,1,1]);m.setBaseColorTexture(doc.createTexture('market poster').setImage(await sharp(Buffer.from(svg)).png().toBuffer()).setMimeType('image/png'));return m}
const poster=await posterMaterial();
for(const x of [-6.4,6.4]){box(x,1.98,front-.13,2.3,1.75,.075,glass);for(const dx of [-1.23,1.23])box(x+dx,1.98,front-.25,.16,2.06,.20);for(const y of [.96,3])box(x,y,front-.25,2.62,.16,.20);box(x,1.96,front-.20,1.95,1.48,.025,poster);box(x,.87,front-.31,2.72,.10,.35)}
// Closed glazed double doors and a recessed vestibule.
box(0,1.81,entry+.12,2.6,2.65,.08,glass);
for(const x of [-1.35,0,1.35])box(x,1.8,entry-.11,.13,2.75,.17);
for(const x of [-.67,.67]){for(const dx of [-.54,0,.54])box(x+dx,1.93,entry-.16,.05,2.23,.05);for(const y of [1.15,1.82,2.49,3.02])box(x,y,entry-.16,1.14,.055,.05);box(x,.70,entry-.15,1.17,.45,.08);box(x+(x<0?.43:-.43),1.64,entry-.27,.045,.38,.045,hardware)}
box(0,3.25,entry-.20,2.95,.18,.25);for(const x of [-1.47,1.47])box(x,1.86,entry-.20,.16,2.95,.25);
// Concrete landing, three steps and the timber rails on the ramp and stairs.
box(0,.25,entry-.9,6.1,.5,1.9,concrete);
for(let i=0;i<3;i++)box(.6,.09+i*.075,entry-2.4+i*.32,2.8,.18+i*.15,.96-i*.25,concrete);
const rampX=-2.25,z0=entry-4.0,z1=entry-.35;
face([[rampX-.65,.03,z0],[rampX+.65,.03,z0],[rampX+.65,.5,z1],[rampX-.65,.5,z1]],concrete);
for(const x of [rampX-.70,rampX+.70,2.1]){
 const from=x===2.1?entry-2.8:z0+.1,to=entry-.55;
 for(const z of [from,(from+to)/2,to]){const h=.03+(z-from)/(to-from)*.47;box(x,h+.55,z,.12,1.1,.12,rail)}
 for(const height of [.6,1.08]){const delta=to-from,g=new BoxGeometry(.13,.11,Math.hypot(delta,.47));g.rotateX(-Math.atan2(.47,delta)).translate(x,height+.265,(from+to)/2);add(g,rail)}
}
// Readable raised white letters instead of an illegible flat sign texture.
await mkdir('.asset-cache/store',{recursive:true});
try{await readFile('.asset-cache/store/droid_sans_bold.typeface.json')}catch{const response=await fetch('https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/fonts/droid/droid_sans_bold.typeface.json');if(!response.ok)throw new Error('Font download failed');await writeFile('.asset-cache/store/droid_sans_bold.typeface.json',await response.text())}
const font=new FontLoader().parse(JSON.parse(await readFile('.asset-cache/store/droid_sans_bold.typeface.json','utf8')));
await writeFile('public/assets/outdoor/store-font-license.txt','Copyright (C) 2008 The Android Open Source Project\nDroid Sans Bold — Apache License 2.0\n\n'+await (await fetch('https://www.apache.org/licenses/LICENSE-2.0.txt')).text());
const text=new TextGeometry('ПРОДУКТЫ',{font,size:.62,depth:.045,curveSegments:3,bevelEnabled:false});text.computeBoundingBox();const width=text.boundingBox.max.x-text.boundingBox.min.x;text.rotateY(Math.PI);text.translate(width/2,3.70,entry-.21);add(text,white);
let min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),triangles=0;const mesh=doc.createMesh('red log village grocery');
for(const [material,list]of buckets){const g=mergeGeometries(list,false);g.computeBoundingBox();min.min(g.boundingBox.min);max.max(g.boundingBox.max);const p=doc.createPrimitive().setMaterial(material);for(const [key,semantic,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']])p.setAttribute(semantic,doc.createAccessor(semantic).setType(type).setArray(new Float32Array(g.getAttribute(key).array)).setBuffer(buffer));const indices=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;p.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indices).setBuffer(buffer));mesh.addPrimitive(p)}
// Centre the full footprint, retaining native proportions at runtime.
const centreZ=(min.z+max.z)/2;scene.addChild(doc.createNode('village store exterior').setTranslation([0,-min.y,-centreZ]).setMesh(mesh));await doc.transform(dedup());await mkdir('.asset-cache/store',{recursive:true});await new NodeIO().write('.asset-cache/store/village-store.glb',doc);await rename('.asset-cache/store/village-store.glb','public/assets/outdoor/village-store.glb');
const dimensions={w:max.x-min.x,h:max.y-min.y,d:max.z-min.z};await writeFile('src/outdoor-store-dimensions.ts','// Generated from the complete village store mesh bounds.\nexport const outdoorStoreDimensions='+JSON.stringify(dimensions)+';\n');
await writeFile('public/assets/outdoor/store-credits.json',JSON.stringify({file:'village-store.glb',title:'Village food market',author:'Logictown; photographic materials by Rob Tuytel and Dimitrios Savva / Poly Haven',license:'CC0-1.0',triangles,geometry:'Original exterior following the user reference; available frontier stores and cabins did not match the log facade and projecting entrance.',textures:[{source:'https://polyhaven.com/a/wood_planks_grey',license:'CC0-1.0',changes:'512px grayscale photographic grain with burgundy or natural wood tint'},{source:'https://polyhaven.com/a/roof_slates_02',license:'CC0-1.0',changes:'512px grayscale photographic slate'}],letterFont:'Droid Sans Bold; Android Open Source Project; Apache-2.0; obtained from three.js r180 (examples/fonts/droid/README.txt)',posters:'Original vector artwork'},null,2)+'\n');console.log('Village store',dimensions,triangles);
