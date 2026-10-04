// Original exterior geometry based on the user's Dutch Colonial reference.
// Photo materials: Poly Haven white_planks_clean, roof_slates_02, brick_wall_001 (CC0).
// Run fetch-colonial-textures.mjs first; tooling shares .asset-cache/tree-tools.
import {dedup} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {Document,NodeIO} from '../.asset-cache/tree-tools/node_modules/@gltf-transform/core/dist/index.js';
import {BoxGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,Vector3} from '../.asset-cache/tree-tools/node_modules/three/build/three.module.js';
import {mergeGeometries} from '../.asset-cache/tree-tools/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {readFile,writeFile,rename} from 'node:fs/promises';
import sharp from 'sharp';
const dimensions={},credits=[];
for(const [name,W,D,style,accent] of [['a',14.4,9.4,'gambrel',[.55,.80,.91,1]],['b',12.8,9,'gable',[.32,.43,.38,1]],['c',13.6,9.2,'hip',[.28,.38,.52,1]],['d',12.6,9.2,'farmhouse',[.08,.085,.09,1]]]){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('colonial '+style),buckets=new Map();
 const plain=(label,color,rough=.75)=>doc.createMaterial(label).setBaseColorFactor(color).setMetallicFactor(0).setRoughnessFactor(rough);
 const trim=plain('painted white joinery',[.94,.95,.93,1]),glass=plain('dark reflective glazing',[.055,.10,.13,1],.15),metal=plain('door hardware',[.18,.15,.10,1],.32);metal.setMetallicFactor(.65);
 async function textured(id,label,factor){const m=plain(label,factor,.85);for(const [map,setter]of [['color','setBaseColorTexture'],['normal','setNormalTexture']]){let bytes=await readFile(`.asset-cache/houses/colonial/${id}/${map}.jpg`);if(id==='white_planks_clean'&&map==='color')bytes=await sharp(bytes).grayscale().modulate({brightness:1.25}).toColourspace('srgb').jpeg({quality:90}).toBuffer();if(id==='brick_wall_001'&&style==='farmhouse'&&map==='color')bytes=await sharp(bytes).grayscale().modulate({brightness:1.25}).toColourspace('srgb').jpeg({quality:90}).toBuffer();if(id==='roof_slates_02'&&map==='color')bytes=await sharp(bytes).modulate({saturation:.25}).jpeg({quality:90}).toBuffer();m[setter](doc.createTexture(id+' '+map).setImage(bytes).setMimeType('image/jpeg'));}
 m.setMetallicRoughnessTexture(doc.createTexture(id+' roughness').setImage(await readFile(`.asset-cache/houses/colonial/${id}/roughness.jpg`)).setMimeType('image/jpeg'));return m}
 const siding=await textured('white_planks_clean','horizontal white clapboard',[1,1,1,1]),roof=await textured('roof_slates_02','charcoal shingle roof',[.25,.29,.33,1]),shutter=await textured('white_planks_clean','painted shutters',accent),brick=await textured('brick_wall_001','brick foundation and porch',style==='farmhouse'?[.9,.86,.78,1]:[.8,.65,.55,1]);
 function add(g,m){if(g.index)g=g.toNonIndexed();g.computeVertexNormals();const uv=g.getAttribute('uv'),p=g.getAttribute('position'),n=g.getAttribute('normal');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(m===siding)uv.setXY(i,y/2,Math.abs(n.getX(i))>.7?z/2:x/2);else if(m===roof)uv.setXY(i,x/2,z/2);else if(m===shutter)uv.setXY(i,x/2,y/2);else if(m===brick)uv.setXY(i,Math.abs(n.getX(i))>.7?z:x,Math.abs(n.getY(i))>.7?z:y);}if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g)}
 function box(x,y,z,w,h,d,m=trim){add(new BoxGeometry(w,h,d).translate(x,y,z),m)}
 function cylinder(x,y,z,r,h,m=trim){add(new CylinderGeometry(r,r,h,12).translate(x,y,z),m)}
 function face(points,m){const g=new BufferGeometry(),v=[];for(let i=1;i<points.length-1;i++)v.push(...points[0],...points[i],...points[i+1]);g.setAttribute('position',new Float32BufferAttribute(v,3));g.setAttribute('uv',new Float32BufferAttribute(new Array(v.length/3*2).fill(0),2));m.setDoubleSided(true);add(g,m)}
 function pitched(x,w,z,d,base,peak){face([[x-w/2,base,z-d/2],[x+w/2,base,z-d/2],[x+w/2,peak,z],[x-w/2,peak,z]],roof);face([[x-w/2,peak,z],[x+w/2,peak,z],[x+w/2,base,z+d/2],[x-w/2,base,z+d/2]],roof);for(const side of [-1,1])face([[x+side*w/2,base,z-d/2],[x+side*w/2,base,z+d/2],[x+side*w/2,peak,z]],siding)}
 const front=-D/2,back=D/2,upper=6.55;
 if(style==='farmhouse'){
  // A one-and-a-half-storey cottage with a projecting right gable and left porch.
  const dark=plain('charcoal window frames',[.045,.05,.05,1],.65);
  box(0,.35,0,W,.7,D,brick);box(0,2.12,0,W,2.9,D,siding);
  for(let y=.75;y<3.6;y+=.22){box(0,y,front-.04,W,.028,.06,siding);box(0,y,back+.04,W,.028,.06,siding);for(const x of [-W/2-.04,W/2+.04])box(x,y,0,.06,.028,D,siding)}
  pitched(0,W+.8,0,D+.8,3.7,7.4);
  for(const x of [-W/2,W/2])for(const z of [front,back])box(x,2.1,z,.16,3.05,.16);
  box(0,3.65,front-.22,W+.6,.20,.3);box(0,3.65,back+.22,W+.6,.20,.3);
  const wingX=-W*.29,wingW=4.9,wingFront=front-1.3,wingBack=front+2.6;
  box(wingX,.35,(wingFront+wingBack)/2,wingW,.7,wingBack-wingFront,brick);
  box(wingX,2.12,(wingFront+wingBack)/2,wingW,2.9,wingBack-wingFront,siding);
  for(let y=.75;y<3.6;y+=.22)box(wingX,y,wingFront-.04,wingW,.028,.06,siding);
  face([[wingX-wingW/2,3.6,wingFront],[wingX+wingW/2,3.6,wingFront],[wingX,6.15,wingFront]],siding);
  for(const sign of [-1,1])face([[wingX+sign*(wingW/2+.3),3.65,wingFront-.4],[wingX,6.35,wingFront-.4],[wingX,6.35,wingBack],[wingX+sign*(wingW/2+.3),3.65,wingBack]],roof);
  for(const side of [-1,1]){const g=new BoxGeometry(Math.hypot(wingW/2+.3,2.7),.16,.18);g.rotateZ(side*Math.atan2(2.7,wingW/2+.3)).translate(wingX-side*(wingW/2+.3)/2,5,wingFront-.44);add(g,trim)}
  for(const x of [wingX-wingW/2,wingX+wingW/2])box(x,2.1,wingFront,.18,3,.18);
  function tallWindow(x,y,z,w=1.6,h=2.25){box(x,y,z,w,h,.10,glass);for(const dx of [-w/2,w/2])box(x+dx,y,z-.07,.10,h+.1,.15,dark);for(const dy of [-h/2,h/2])box(x,y+dy,z-.07,w,.1,.15,dark);box(x,y,z-.10,.035,h,.04,dark);box(x,y,z-.10,w,.035,.04,dark);box(x,y-h/2-.12,z-.11,w+.2,.10,.22)}
  tallWindow(wingX,2.05,wingFront-.12,2.65,2.3);
  for(const x of [W*.39,.5])tallWindow(x,2.06,front-.13,1.65,2.25);
  for(const x of [-W*.34,0,W*.34]){const before=new Map([...buckets].map(([m,g])=>[m,g.length]));tallWindow(0,2.05,0);for(const [m,g]of buckets)for(let i=before.get(m)||0;i<g.length;i++)g[i].rotateY(Math.PI).translate(x,0,back+.12)}
  for(const side of [-1,1])for(const z of [-D*.24,D*.24]){const before=new Map([...buckets].map(([m,g])=>[m,g.length]));tallWindow(0,2.05,0,1.5);for(const [m,g]of buckets)for(let i=before.get(m)||0;i<g.length;i++)g[i].rotateY(side*Math.PI/2).translate(side*(W/2+.12),0,z)}
  const px=2.3,pw=6.6,pf=front-2.1;
  box(px,.4,front-.85,pw,.2,2.5,brick);
  for(let i=0;i<3;i++)box(px,.09+i*.09,pf-.6+i*.18,2.5,.18+i*.18,1.2-i*.36,brick);
  for(const x of [px-pw/2+.18,px+pw/2-.18]){box(x,1.96,pf+.13,.23,3.04,.23);box(x,.55,pf+.13,.4,.24,.4);box(x,3.45,pf+.13,.38,.20,.38)}
  face([[px-pw/2-.25,3.55,pf-.2],[px+pw/2+.25,3.55,pf-.2],[px+pw/2+.25,4.1,front+.8],[px-pw/2-.25,4.1,front+.8]],roof);
  box(px,3.48,pf-.18,pw+.5,.20,.2);
  box(px,1.95,front-.14,1.38,2.5,.15,dark);tallWindow(px,2.05,front-.26,1.10,2.12);box(px,3.28,front-.23,1.7,.15,.18);cylinder(px+.46,1.6,front-.40,.035,.15,metal);
  // Broad shed dormer in the left roof slope, separate from the projecting gable.
  box(2.15,5.3,front+.72,3.8,1.25,.15,dark);
  face([[.1,6.02,front+.42],[4.2,6.02,front+.42],[4.2,6.55,-1.15],[.1,6.55,-1.15]],roof);
  box(2.15,6.02,front+.35,4.1,.15,.17);
  for(const x of [1,2.15,3.3])tallWindow(x,5.32,front+.60,.86,.94);
  box(wingX,4.95,wingFront-.1,.4,1.2,.05,dark);
  box(-W*.38,6.6,1.6,.72,2,.8,brick);box(-W*.38,7.66,1.6,.88,.14,.96);
  for(const x of [-W/2+.12,W/2-.12])cylinder(x,1.85,front-.15,.04,3.4);
  box(px+.95,2.7,front-.4,.2,.32,.2,metal);
 }else{
 box(0,.18,0,W,.36,D,brick);
 if(style==='gambrel'){box(0,1.98,0,W,3.3,D,siding);box(0,5.10,0,W-1.3,3.0,D-.6,siding)}else box(0,3.43,0,W,6.5,D,siding);
 // Slightly projecting clapboards add small real edges instead of a flat painted cube.
 for(let y=.5;y<upper;y+=.22){const inset=style==='gambrel'&&y>3.6,ww=inset?W-1.3:W,dd=inset?D-.6:D;box(0,y,-dd/2-.035,ww,.028,.055,siding);box(0,y,dd/2+.035,ww,.028,.055,siding);box(-ww/2-.035,y,0,.055,.028,dd,siding);box(ww/2+.035,y,0,.055,.028,dd,siding)}
 for(const x of [-W/2,W/2])for(const z of [front,back])box(x,style==='gambrel'?1.98:3.48,z,.16,style==='gambrel'?3.3:6.6,.16);
 for(const y of (style==='gambrel'?[.4,3.58]:[.4,3.58,6.7])){box(0,y,front-.12,W+.35,.16,.25);box(0,y,back+.12,W+.35,.16,.25);for(const x of [-W/2-.1,W/2+.1])box(x,y,0,.25,.16,D+.4)}
 if(style==='gambrel'){
  // Broken slopes on both ends of the house; a broad front dormer echoes the reference.
  const e=W/2+.4,zf=front-.42,zb=back+.42;
  const outline=[[zf,3.8],[front+.30,6.72],[0,9.15],[back-.30,6.72],[zb,3.8]];
  for(let i=0;i<4;i++){const [z0,y0]=outline[i],[z1,y1]=outline[i+1];if(i===0){for(const [xl,xr]of [[-e,-W/2+.65],[W/2-.65,e]])face([[xl,y0,z0],[xr,y0,z0],[xr,y1,z1],[xl,y1,z1]],roof);}else face([[-e,y0,z0],[e,y0,z0],[e,y1,z1],[-e,y1,z1]],roof);}
  for(const x of [-e,e])face([[x,3.72,zf],[x,3.72,zb],...outline.slice().reverse().map(([z,y])=>[x,y,z])],siding);
  box(0,5.17,front-.13,W-1.3,2.96,.20,siding);
  face([[-W/2+.5,6.8,front-.36],[W/2-.5,6.8,front-.36],[W/2-.5,7.54,-1.95],[-W/2+.5,7.54,-1.95]],roof);
  box(0,6.77,front-.4,W-.9,.16,.24);
 }else if(style==='hip'){
  const e=W/2+.4,zf=front-.4,zb=back+.4,r=W/2-2.2;
  face([[-e,6.8,zf],[e,6.8,zf],[r,8.8,0],[-r,8.8,0]],roof);face([[-r,8.8,0],[r,8.8,0],[e,6.8,zb],[-e,6.8,zb]],roof);
  face([[-e,6.8,zb],[-e,6.8,zf],[-r,8.8,0]],roof);face([[e,6.8,zf],[e,6.8,zb],[r,8.8,0]],roof);
 }else{pitched(0,W+.8,0,D+.8,6.8,9.2);if(style==='cross'){pitched(-W*.28,W*.4,front+1.0,3.4,6.85,8.8)}}
 function window(x,y,z,w=1.48,h=1.85,side=false){
  // Build locally, then rotate side windows as a complete assembly.

  box(x,y,z,w,h,.09,glass);
  for(const dx of [-w/2-.075,w/2+.075])box(x+dx,y,z-.06,.12,h+.22,.13);
  for(const dy of [-h/2-.075,h/2+.075])box(x,y+dy,z-.06,w+.27,.12,.13);
  box(x,y,z-.10,.055,h,.08);for(const dy of [-h/6,h/6])box(x,y+dy,z-.10,w,.045,.08);
  box(x,y-h/2-.18,z-.15,w+.4,.12,.30);
  for(const sign of [-1,1]){const sx=x+sign*(w/2+.42);box(sx,y,z-.05,.57,h+.10,.085,shutter);for(const dy of [-h/2+.12,h/2-.12])box(sx,y+dy,z-.11,.52,.10,.035,shutter);for(const dx of [-.24,.24])box(sx+dx,y,z-.11,.065,h,.035,shutter);}
 }
 const xs=style==='gambrel'?[-W*.30,0,W*.30]:[-W*.30,0,W*.30];
 for(const x of [-W*.30,W*.30])window(x,1.95,front-.18);
 for(const x of xs)window(x,5.25,front-(style==='gambrel'?.30:.18));
 for(const x of [-W*.3,0,W*.3])for(const y of [1.95,5.25]){const before=new Map([...buckets].map(([m,g])=>[m,g.length]));window(0,y,0);for(const [m,geometries]of buckets)for(let i=before.get(m)||0;i<geometries.length;i++)geometries[i].rotateY(Math.PI).translate(x,0,back+.18);}
 // Side openings use transformed copies, retaining the same white trim and glazing.
 for(const side of [-1,1])for(const z of [-D*.26,D*.26])for(const y of [1.95,5.25]){
  const before=new Map([...buckets].map(([m,g])=>[m,g.length]));window(0,y,0,1.3,1.65);
  for(const [m,geometries]of buckets)for(let i=before.get(m)||0;i<geometries.length;i++)geometries[i].rotateY(side*Math.PI/2).translate(side*(W/2+.18),0,z);
 }
 // Closed glazed entry with surrounding mouldings and a brass handle.
 box(0,1.58,front-.20,1.30,2.45,.15,shutter);box(0,1.8,front-.30,.93,1.55,.03,glass);
 for(const x of [-.31,0,.31])box(x,1.8,front-.33,.045,1.55,.045);for(const y of [1.3,1.8,2.3])box(0,y,front-.33,.93,.045,.045);
 for(const x of [-.77,.77])box(x,1.58,front-.23,.16,2.72,.22);box(0,2.97,front-.23,1.7,.16,.22);cylinder(.48,1.34,front-.38,.055,.12,metal);
 const porchW=style==='hip'?W*.66:style==='cross'?W*.83:3.9,porchFront=front-2.1;
 box(0,.32,front-.9,porchW,.30,2.2,brick);
 for(let i=0;i<3;i++)box(0,.07+i*.08,porchFront-.52+i*.16,2.7,.14+i*.16,1.04-i*.32,brick);
 for(const x of [-porchW/2+.2,porchW/2-.2]){cylinder(x,1.95,porchFront+.18,.15,3.15);box(x,.5,porchFront+.18,.44,.22,.44);box(x,3.46,porchFront+.18,.42,.22,.42)}
 box(0,3.6,front-1.02,porchW+.36,.24,2.55);
 if(style==='gambrel'||style==='gable'){
  const w=porchW+.55,z=front-1.05;
  // Pediment points toward the street rather than a toy pyramidal roof.
  face([[-w/2,3.75,z-1.35],[0,4.65,z-1.35],[w/2,3.75,z-1.35]],trim);
  face([[-w/2,3.75,z+1.35],[0,4.65,z+1.35],[0,4.65,z-1.35],[-w/2,3.75,z-1.35]],roof);
  face([[0,4.65,z-1.35],[0,4.65,z+1.35],[w/2,3.75,z+1.35],[w/2,3.75,z-1.35]],roof);
 }else pitched(0,porchW+.55,front-1.0,2.65,3.75,4.35);
 // Porch light, rainwater pipes, chimney cap.
 box(0,3.05,front-.6,.20,.34,.20,metal);cylinder(0,3.3,front-.6,.025,.18,metal);
 for(const x of [-W/2+.14,W/2-.14])cylinder(x,3.4,front-.2,.045,6.1);
 box(W*.28,7.95,1.1,.7,2.1,.8,brick);box(W*.28,9.06,1.1,.9,.14,1.0,trim);
 }
 let min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),triangles=0;
 const mesh=doc.createMesh('detailed colonial exterior');
 for(const [mat,list]of buckets){const g=mergeGeometries(list,false);g.computeBoundingBox();min.min(g.boundingBox.min);max.max(g.boundingBox.max);const p=doc.createPrimitive().setMaterial(mat);for(const [s,t,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']])p.setAttribute(t,doc.createAccessor(t).setType(type).setArray(new Float32Array(g.getAttribute(s).array)).setBuffer(buffer));const indices=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);triangles+=indices.length/3;p.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indices).setBuffer(buffer));mesh.addPrimitive(p)}
 scene.addChild(doc.createNode('colonial house '+name).setMesh(mesh));await doc.transform(dedup());const target='public/assets/outdoor/building-type-'+name+'.glb',temporary='.asset-cache/houses/colonial/building-type-'+name+'.glb';await new NodeIO().write(temporary,doc);await rename(temporary,target);
 dimensions[name]={w:+(max.x-min.x).toFixed(3),h:+(max.y-min.y).toFixed(3),d:+(max.z-min.z).toFixed(3)};credits.push({file:'building-type-'+name+'.glb',author:'Logictown; photo textures by Rob Tuytel and Dimitrios Savva',license:'CC0-1.0',source:'https://polyhaven.com/a/white_planks_clean',changes:'Original '+style+' colonial exterior based on user reference, with Poly Haven CC0 siding, roof, shutter and brick textures; closed entry, porch, trim, window mullions and gutters',triangles});console.log(name,dimensions[name],triangles);
}
await writeFile('src/outdoor-house-dimensions.ts','// Generated by scripts/prepare-colonial-houses.mjs from actual mesh bounds.\nexport const outdoorHouseProfiles='+JSON.stringify(dimensions)+';\n');
const creditsFile='public/assets/outdoor/models-credits.json',old=JSON.parse(await readFile(creditsFile,'utf8'));old.models=old.models.map(m=>credits.find(c=>c.file===m.file)||m);await writeFile(creditsFile,JSON.stringify(old,null,2)+'\n');
