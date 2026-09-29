import {createMovementControls} from './controls';
import {moveWithCollisions,nearInteraction} from './movement';
import {createViewportSync} from './viewport';
import {installInteriorLibrary} from './interior-library';
import {createMemoryQuest} from './memory';
import {installMemoryObjects} from './memory-world';
import {createInteractionMarker} from './interaction-marker';
import {cameraDistance} from './camera-collision';
import {layout,houseBlocked,roomAt,navigation} from './layout';
import {buildHouseRoom,type HouseRoom} from './house';
import {roomInfo,roomNames,isBlocked,type RoomId} from './house-data';
import { loadLea } from './lea';
import { roundedBox, upgradeArt } from './art';
import './style.css';
import { Engine, Scene, Color3, Color4, Vector3, MeshBuilder, StandardMaterial, HemisphericLight, DirectionalLight, ShadowGenerator, ArcRotateCamera, TransformNode, Mesh, PointerEventTypes, Ray, DynamicTexture } from '@babylonjs/core';

const $ = <T extends HTMLElement = HTMLElement>(s:string) => document.querySelector<T>(s)!;
const interiorCheck=import.meta.env.DEV&&location.pathname==='/checks/interior.html';
const memoryCheck=import.meta.env.DEV&&location.pathname==='/checks/house.html';
const roomStorageKey=memoryCheck||interiorCheck?'logictown-memory-check-room':'logictown-room';
let saved:{clue?:boolean;solved?:boolean}={};
try{saved=JSON.parse(localStorage.getItem('logictown-v1')||'{}')}catch{}
let clue=!!saved.clue, solved=!!saved.solved;
function save(){try{localStorage.setItem('logictown-v1',JSON.stringify({clue,solved}))}catch{}}
$('#app').innerHTML=`<canvas id="world" aria-label="Трёхмерная комната Леи. Управление: кнопки справа или WASD. Значки появляются рядом с предметами."></canvas>
<header class="topbar"><div class="brand"><div class="brand-mark">⌂</div><div><strong>Тихий город</strong><small>МАЛЕНЬКИЕ ШАГИ · БОЛЬШИЕ ОТКРЫТИЯ</small></div></div><div class="top-actions"><button class="round" id="character-preview" aria-label="Посмотреть Лею крупно" title="Посмотреть Лею крупно">♙</button><button class="round" id="sound" aria-label="Включить звук" title="Звук">♪</button><button class="round" id="help" aria-label="Как играть" title="Как играть">?</button></div></header>
<section class="location"><div class="eyebrow">Глава 01 / Дом</div><h1>Комната Леи</h1><p>У каждого открытия<br>есть маленькое начало.</p><div class="chapter"><span></span><i></i><i></i><i></i><i></i> ПЕРВАЯ ИСТОРИЯ</div></section>
<aside class="quest"><div class="quest-head"><span>Маленькая загадка</span><span>✧</span></div><h2 id="quest-title">Мелодия утра</h2><p>Бабушка оставила сюрприз.<br>Интересно, как открыть<br>музыкальную шкатулку?</p><div class="quest-line" id="clue-step"><span class="check"></span>Найди бабушкину записку</div><div class="quest-line" id="box-step"><span class="check"></span>Открой шкатулку</div><button class="hint" id="hint">Нужна маленькая подсказка?</button></aside>
<footer class="bottom"><div class="player"><div class="portrait">👧🏻</div><div><strong>Лея</strong><small>Исследовательница</small></div></div><div class="instructions">Нажми на пол, чтобы идти · На значок, чтобы исследовать</div><div class="inventory"><button class="slot" id="bag-note" aria-label="Записка в рюкзаке" title="Записка">·</button><button class="slot" id="bag-star" aria-label="Звёздочка в рюкзаке" title="Звёздочка">·</button><div class="slot" title="Рюкзак">♧</div></div></footer>
<div class="toast" role="status"></div><div class="overlay" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div><div class="loading"><span>Загрузка…</span></div>`;

$('#character-preview').onclick=()=>{window.location.href='/character.html'};
const canvas=$<HTMLCanvasElement>('#world');
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,adaptToDeviceRatio:false});
engine.setHardwareScalingLevel(1/Math.min(window.devicePixelRatio,1.5));
const scene=new Scene(engine);scene.clearColor=new Color4(.914,.914,.868,1);
let cameraBoom=3.2;
const camera=new ArcRotateCamera('camera',-Math.PI/2,1.4,3.2,new Vector3(0,1,0),scene);
camera.mode=0;camera.minZ=.05;camera.maxZ=100;camera.fov=.9;
const viewport=createViewportSync(canvas,engine,aspect=>{camera.fov=aspect<.8?1.05:.9;cameraBoom=aspect<.8?3.5:3.2;camera.getProjectionMatrix(true)});
import.meta.hot?.dispose(()=>viewport.dispose());
const hemi=new HemisphericLight('sky',new Vector3(0,1,0),scene);hemi.intensity=.85;hemi.diffuse=Color3.FromHexString('#fff1d8');hemi.groundColor=Color3.FromHexString('#85968e');
const sun=new DirectionalLight('sun',new Vector3(-.7,-1,-.5),scene);sun.position=new Vector3(6,10,6);sun.intensity=2;sun.diffuse=Color3.FromHexString('#ffe2b1');
const shadow=new ShadowGenerator(2048,sun);shadow.useBlurExponentialShadowMap=true;shadow.blurKernel=24;shadow.darkness=.22;shadow.bias=.002;
scene.ambientColor=new Color3(.24,.24,.21);
const mats:Record<string,StandardMaterial>={};
function mat(name:string,hex:string){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.08,.07,.05);mats[name]=m;return m;}
const cream=mat('warm ivory','#f1e6cf'), wall=mat('sage plaster','#a8c4b4'), trim=mat('painted wood','#dbe1cc'), wood=mat('honey oak','#b98658'), lightwood=mat('light oak','#d3ab7b'), darkwood=mat('walnut','#795442'), pink=mat('rose linen','#d69883'), white=mat('cotton','#fff5db'), green=mat('leaf','#547e62'), green2=mat('young leaf','#82a076'), terra=mat('terracotta','#ba7860'), gold=mat('brass','#d9ac59'), blue=mat('blue book','#648b95'), red=mat('red book','#b86851'), brown=mat('hair','#594034'), skin=mat('skin','#f0bd96'), dress=mat('dress','#c47851'), shoe=mat('shoes','#775140'), black=mat('eyes','#3b3935');
function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial,parent?:TransformNode){const o=Math.min(w,h,d)>.055?roundedBox(scene,name,w,h,d):MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);o.material=m;o.receiveShadows=true;if(parent)o.parent=parent;shadow.addShadowCaster(o);return o;}
function sphere(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:StandardMaterial,parent?:TransformNode){const o=MeshBuilder.CreateSphere(name,{diameter:1,segments:24},scene);o.position.set(x,y,z);o.scaling.set(sx,sy,sz);o.material=m;if(parent)o.parent=parent;shadow.addShadowCaster(o);return o;}
function cyl(name:string,x:number,y:number,z:number,diam:number,height:number,m:StandardMaterial,top=diam,parent?:TransformNode){const o=MeshBuilder.CreateCylinder(name,{diameterBottom:diam,diameterTop:top,height,tessellation:32},scene);o.position.set(x,y,z);o.material=m;o.receiveShadows=true;if(parent)o.parent=parent;shadow.addShadowCaster(o);return o;}
function rod(name:string,a:Vector3,b:Vector3,r:number,m:StandardMaterial){const o=MeshBuilder.CreateTube(name,{path:[a,b],radius:r,tessellation:8},scene);o.material=m;shadow.addShadowCaster(o);return o;}

// Full room walls with open internal passages.
box('floating foundation',0,-.25,0,8.35,.46,7.15,cream);
const floor=box('walkable floor',0,0,0,8,.08,6.8,lightwood);
const grain=mat('floor seams','#ae875f');
for(let z=-3.2;z<=3.25;z+=.43){box('plank seam',0,.047,z,8,.008,.014,grain);for(let x=-3.9+(Math.round(z/.43)%2)*.7;x<4;x+=1.5)box('plank end',x,.048,z+.21,.01,.008,.41,grain)}
box('back wall',0,1.95,3.4,8.15,3.9,.16,wall);box('left wall',-4,1.95,0,.16,3.9,6.8,wall);
box('back skirting',0,.19,3.26,8,.29,.1,trim);box('left skirting',-3.88,.19,0,.1,.29,6.7,trim);
box('back cap',0,3.94,3.4,8.3,.11,.26,cream);box('left cap',-4,3.94,0,.25,.11,6.8,cream);
for(let x=-3.7;x<4;x+=.6)box('wall panel',x,.64,3.29,.025,1,.025,trim);
box('chair rail',0,1.16,3.27,8,.08,.065,trim);

// Window, sky, garden and curtain panels.
const sky=mat('window sky','#d4e8df');sky.emissiveColor=new Color3(.25,.29,.23);
box('window outer',.2,2.5,3.24,2.65,2.08,.15,cream);box('window view',.2,2.5,3.14,2.39,1.83,.035,sky);
const outside=mat('distant garden','#a9c59c');
sphere('tree beyond window',-.55,2.18,3.1,.95,1.1,.035,outside);sphere('tree beyond window',.89,1.94,3.09,1.2,.75,.035,green2);
box('window cross',.2,2.5,3.03,.08,1.88,.08,white);box('window cross',.2,2.51,3.03,2.4,.07,.08,white);
box('window sill',.2,1.48,3.02,2.95,.13,.5,cream);
rod('curtain rod',new Vector3(-1.5,3.66,2.96),new Vector3(1.9,3.66,2.96),.035,darkwood);
for(const side of [-1,1])for(let i=0;i<5;i++){const x=.2+side*(1.17+i*.085);cyl('curtain fold',x,2.52,2.98+(i%2)*.045,.17,2.08,white)}

// Bed with turned feet, quilt, pillow and stitched bands.
box('bed frame',-2.72,.42,1.45,1.7,.23,2.95,wood);for(const x of [-3.4,-2.04])for(const z of [.18,2.7])cyl('bed foot',x,.28,z,.14,.5,darkwood);
box('headboard',-2.72,.96,2.94,1.82,1.2,.14,wood);sphere('headboard top',-2.72,1.55,2.94,1.79,.44,.16,wood);
box('mattress',-2.72,.67,1.42,1.66,.31,2.81,white);box('duvet',-2.72,.86,.93,1.69,.22,1.91,pink);
for(let z=.1;z<1.85;z+=.27)box('quilt stitching',-2.72,.977,z,1.66,.008,.017,cream);
sphere('pillow',-2.72,.92,2.38,1.25,.28,.66,white);
box('bed end',-2.72,.67,-.06,1.82,.6,.12,wood);
// Rug with a woven border.
const rug=mat('rug sage','#839d88'),rugline=mat('rug border','#d9d3b1');
const rugMesh=cyl('round woven rug',.15,.072,-.75,3.65,.025,rug);rugMesh.scaling.z=.8;
for(const r of [1.65,1.70,1.76]){const ring=MeshBuilder.CreateTorus('woven ring',{diameter:r*2,thickness:.025,tessellation:72},scene);ring.position.set(.15,.09,-.75);ring.scaling.z=.8;ring.material=rugline;}
for(let i=0;i<40;i++){const a=i*Math.PI*2/40;rod('rug fringe',new Vector3(.15+Math.cos(a)*1.79,.08,-.75+Math.sin(a)*1.43),new Vector3(.15+Math.cos(a)*1.9,.08,-.75+Math.sin(a)*1.52),.013,cream)}

// Desk and its little stories.
box('desk top',.22,1.13,2.12,2.18,.13,1.04,lightwood);for(const x of [-.69,1.13])for(const z of [1.74,2.49])box('desk leg',x,.55,z,.11,1.1,.11,wood);
box('desk drawer',.22,.96,1.67,1.92,.23,.1,wood);sphere('drawer handle',.22,.96,1.6,.09,.07,.06,gold);
const paper=box('grandma note',-.06,1.211,1.99,.48,.015,.35,white);paper.rotation.y=.18;
for(let i=0;i<4;i++)box('writing',-.08,1.221,1.91+i*.045,.29-i*.03,.003,.009,green);
cyl('pencil cup',.91,1.34,2.36,.21,.33,terra);for(let i=0;i<3;i++)rod('pencil',new Vector3(.87+i*.04,1.37,2.36),new Vector3(.85+i*.065,1.69,2.35),.015,i===1?gold:blue);
cyl('lamp base',-.57,1.23,2.36,.34,.08,gold);rod('lamp stem',new Vector3(-.57,1.25,2.36),new Vector3(-.57,1.84,2.36),.035,gold);cyl('lamp shade',-.57,1.87,2.36,.56,.38,cream,.29);
cyl('stool seat',.25,.66,1.13,.67,.13,wood);for(const x of [-.01,.51])for(const z of [.93,1.34])rod('stool leg',new Vector3(x,.08,z),new Vector3(.25+(x-.25)*.8,.62,1.13+(z-1.13)*.8),.04,darkwood);

// Low bookcase, music box and assorted books.
box('cabinet back',2.85,.63,2.9,1.72,1.15,.12,wood);for(const x of [2.02,3.68])box('cabinet side',x,.68,2.61,.12,1.2,.69,lightwood);
for(const y of [.13,.64,1.23])box('cabinet shelf',2.85,y,2.61,1.8,.1,.77,lightwood);
const bookColors=[blue,red,cream,green,gold];for(let i=0;i<8;i++){const h=.3+(i%3)*.06;const b=box('book',2.22+i*.17,.2+h/2,2.5,.12,h,.38,bookColors[i%5]);if(i===6)b.rotation.z=-.15;box('book spine line',2.22+i*.17,.28,2.302,.09,.02,.005,gold)}
box('linen basket',3.13,.88,2.56,.71,.36,.51,cream);for(let i=0;i<5;i++)box('basket weave',3.13,.73+i*.065,2.299,.69,.012,.006,wood);
const musicbox=new TransformNode('music box',scene);musicbox.position.set(2.73,1.29,2.54);
box('box base',0,.16,0,.77,.31,.53,blue,musicbox);box('box gold stripe',0,.23,-.27,.76,.035,.014,gold,musicbox);sphere('box latch',0,.14,-.29,.08,.1,.04,gold,musicbox);
const lid=new TransformNode('hinged lid',scene);lid.parent=musicbox;lid.position.set(0,.33,.25);box('box lid',0,0,-.25,.8,.08,.56,blue,lid);
for(let i=0;i<3;i++)sphere('lid decoration',-.2+i*.2,.05,-.25,.09,.035,.09,gold,lid);

function plant(x:number,y:number,z:number,size:number){cyl('plant pot',x,y+.2*size,z,.4*size,.4*size,terra,.5*size);cyl('pot soil',x,y+.407*size,z,.44*size,.015,darkwood);for(let i=0;i<7;i++){const a=i*2.4,h=(.5+(i%3)*.15)*size;const end=new Vector3(x+Math.cos(a)*.3*size,y+.35*size+h,z+Math.sin(a)*.3*size);rod('plant stem',new Vector3(x,y+.35*size,z),end,.012*size,green);const leaf=sphere('leaf',end.x,end.y,end.z,.23*size,.47*size,.09*size,i%2?green:green2);leaf.rotation.set(.3,a,-.55*Math.cos(a));}}
plant(3.26,.05,.69,1.5);plant(1.15,1.56,3.02,.48);plant(-3.47,1.46,-2.45,.65);
// Wall shelf and framed botanical art.
box('left floating shelf',-3.68,1.43,-2.45,.55,.11,1.5,wood);
box('art frame',-3.86,2.55,.01,.12,1.05,.81,wood);box('art paper',-3.783,2.55,.01,.025,.88,.65,white);
for(let i=0;i<5;i++){const leaf=sphere('painted leaf',-3.761,2.3+i*.105,.01+Math.sin(i*2)*.13,.018,.14,.23,green2);leaf.rotation.x=i*.4;}
// Round wall clock.
const clock=cyl('wall clock',2.87,2.84,3.22,.67,.09,wood);clock.rotation.x=Math.PI/2;
const face=cyl('clock face',2.87,2.84,3.16,.56,.025,cream);face.rotation.x=Math.PI/2;
box('clock hand',2.87,2.94,3.135,.025,.21,.02,darkwood);const hand=box('clock hand',2.95,2.81,3.13,.19,.025,.02,darkwood);hand.rotation.z=-.3;
// Small foreground details.
box('toy blocks',2.65,.2,-1.96,.33,.32,.33,red);const block=box('toy block',3,.16,-1.79,.26,.24,.26,gold);block.rotation.y=.3;
sphere('toy ball',2.9,.25,-2.52,.43,.43,.43,blue);
const basket=cyl('floor basket',-3.15,.29,-2.27,.78,.49,wood,.85);for(let i=0;i<4;i++){const tor=MeshBuilder.CreateTorus('basket seam',{diameter:.79+i*.014,thickness:.026,tessellation:32},scene);tor.position.set(-3.15,.14+i*.1,-2.27);tor.material=lightwood;}
sphere('basket blanket',-3.14,.57,-2.25,.73,.26,.65,white);
// Little teddy on the bed.
const teddy=mat('teddy fur','#cba270');sphere('teddy body',-2.83,1.23,2.08,.34,.42,.28,teddy);sphere('teddy head',-2.83,1.53,2.08,.33,.3,.29,teddy);for(const s of [-1,1]){sphere('teddy ear',-2.83+s*.14,1.66,2.08,.12,.13,.09,teddy);sphere('teddy eye',-2.83+s*.07,1.55,1.942,.028,.032,.02,black)}

// Character: a fully 3D, animated storybook doll.
const girl=new TransformNode('Lea',scene);girl.position.set(.1,.11,-1.13);girl.rotation.y=Math.PI;
cyl('dress skirt',0,.6,0,.61,.53,dress,.35,girl);sphere('bodice',0,.91,0,.39,.4,.28,dress,girl);
cyl('neck',0,1.12,0,.13,.18,skin,.13,girl);sphere('head',0,1.39,0,.49,.53,.45,skin,girl);
sphere('hair cap',0,1.53,-.035,.52,.39,.46,brown,girl);sphere('back hair',0,1.35,-.15,.49,.49,.24,brown,girl);
for(const s of [-1,1]){sphere('pigtail',s*.285,1.27,-.045,.18,.38,.2,brown,girl);sphere('hair tie',s*.265,1.41,-.04,.12,.08,.15,gold,girl);sphere('ear',s*.24,1.37,0,.09,.14,.1,skin,girl);sphere('eye',s*.093,1.4,.212,.038,.052,.025,black,girl);sphere('cheek',s*.14,1.32,.203,.076,.039,.018,pink,girl);}
sphere('nose',0,1.35,.229,.065,.07,.052,skin,girl);
const smile=MeshBuilder.CreateTube('smile',{path:[new Vector3(-.045,1.293,.217),new Vector3(0,1.284,.225),new Vector3(.045,1.293,.217)],radius:.008,tessellation:6},scene);smile.parent=girl;smile.material=terra;
box('dress collar',0,1.035,.145,.27,.07,.035,cream,girl);sphere('dress button',0,.91,.16,.035,.035,.02,gold,girl);
const limbs:TransformNode[]=[];
for(const s of [-1,1]){const leg=new TransformNode('leg',scene);leg.parent=girl;leg.position.set(s*.135,.43,0);cyl('stocking',0,-.16,0,.12,.33,cream,.13,leg);sphere('shoe',0,-.32,.045,.19,.13,.29,shoe,leg);limbs.push(leg);const arm=new TransformNode('arm',scene);arm.parent=girl;arm.position.set(s*.235,.99,0);sphere('sleeve',s*.035,-.065,0,.18,.24,.2,dress,arm);cyl('forearm',s*.065,-.23,0,.095,.25,skin,.11,arm);sphere('hand',s*.065,-.36,0,.12,.14,.11,skin,arm);limbs.push(arm);}
upgradeArt(scene,camera,shadow,girl);
const bedroomRoot=new TransformNode('room-bedroom-original',scene);
scene.meshes.filter(m=>!m.isDescendantOf(girl)).forEach(m=>{if(!m.parent)m.parent=bedroomRoot});
scene.transformNodes.filter(n=>n!==girl&&n!==bedroomRoot&&!n.parent).forEach(n=>n.parent=bedroomRoot);
const bedroomCeiling=mat('bedroom ceiling ivory','#e5dfd1');bedroomCeiling.backFaceCulling=false;
box('bedroom ceiling',0,3.98,0,8.12,.16,6.92,bedroomCeiling,bedroomRoot);
for(const z of [-3.28,3.28])box('bedroom ceiling cornice',0,3.8,z,8,.14,.18,cream,bedroomRoot);
for(const x of [-3.88,3.88])box('bedroom ceiling cornice',x,3.8,0,.18,.14,6.8,cream,bedroomRoot);
for(const [lo,hi] of [[-4,.5],[2.5,4]])box('bedroom open passage',(lo+hi)/2,1.95,-3.4,hi-lo,3.9,.12,wall,bedroomRoot);
box('solid wall bedroom right',3.94,1.95,0,.12,3.9,6.8,wall,bedroomRoot);
box('solid wall bedroom lintel',1.5,3.35,-3.4,2,1.1,.12,wall,bedroomRoot);
const bedroomJamb=mat('bedroom doorway ivory','#e9dfc9');
for(const x of [.52,2.48])box('bedroom passage jamb',x,1.4,-3.4,.09,2.8,.24,bedroomJamb,bedroomRoot);
box('bedroom passage head',1.5,2.8,-3.4,2.03,.1,.24,bedroomJamb,bedroomRoot);
box('bedroom passage threshold',1.5,.055,-3.4,1.95,.025,.24,lightwood,bedroomRoot);
const houseRooms=new Map<RoomId,HouseRoom>([['bedroom',{root:bedroomRoot,floor,hotspots:[]}]]);
let currentRoom:RoomId='bedroom';
for(const id of Object.keys(layout) as RoomId[]){if(id!=='bedroom')houseRooms.set(id,buildHouseRoom(scene,shadow,id));const r=houseRooms.get(id)!;r.root.position.set(layout[id][0],0,layout[id][1]);}
const floors=new Set(Array.from(houseRooms.values()).map(r=>r.floor));

let leaAsset:Awaited<ReturnType<typeof loadLea>>|undefined;
let characterActionUntil=0;
const fallbackMeshes=girl.getChildMeshes();
void loadLea(scene,girl,shadow).then(asset=>{leaAsset=asset;fallbackMeshes.forEach(m=>m.dispose());limbs.length=0}).catch(e=>{console.error('Lea model could not load',e);toast('Модель Леи пока не загрузилась. Обновите страницу.')});
function characterAction(name:'Interact'|'Celebrate'){characterActionUntil=performance.now()+2000;leaAsset?.play(name,false);}

// Floor destination ring.
const marker=MeshBuilder.CreateTorus('destination',{diameter:.43,thickness:.018,tessellation:40},scene);marker.material=gold;marker.position.y=.1;marker.isVisible=false;marker.isPickable=false;
function blocked(x:number,z:number){return houseBlocked(x,z)}
// Small navigation grid with breadth-first search, so furniture cannot be crossed.
const {step,originX,originZ,nx,nz}=navigation;
const walkable=Array.from({length:nx*nz},(_,i)=>!blocked(originX+i%nx*step,originZ+Math.floor(i/nx)*step));
const point=(i:number)=>new Vector3(originX+(i%nx)*step,.11,originZ+Math.floor(i/nx)*step);
function nearest(p:Vector3){let best=-1,dist=Infinity;for(let i=0;i<nx*nz;i++){const q=point(i);if(!walkable[i])continue;const d=Vector3.DistanceSquared(p,q);if(d<dist){dist=d;best=i}}return best;}
let leavingHouse=false;
let route:Vector3[]=[],arrival:(()=>void)|null=null;
function walkTo(p:Vector3,action?:()=>void){if(!$('.overlay').hidden)return;const start=nearest(girl.position),end=nearest(p);const queue=[start],prev=new Map<number,number>();prev.set(start,-1);for(let k=0;k<queue.length&&!prev.has(end);k++){const cur=queue[k];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur%nx+dx,z=Math.floor(cur/nx)+dz,id=z*nx+x;if(x<0||x>=nx||z<0||z>=nz||prev.has(id))continue;const q=point(id);if(!walkable[id])continue;prev.set(id,cur);queue.push(id)}}if(!prev.has(end)){toast('Сюда пока не пройти. Попробуй другую точку.');return}const ids=[];for(let i=end;i!==start;i=prev.get(i)!)ids.push(i);route=ids.reverse().map(point);arrival=action||null;marker.position.copyFrom(point(end));marker.position.y=.105;marker.isVisible=true;if(!route.length){arrival?.();arrival=null;marker.isVisible=false;}}
const controls=createMovementControls($('#app'));import.meta.hot?.dispose(()=>controls.dispose());

let toastTimer=0;function toast(text:string){$('.toast').textContent=text;$('.toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('.toast').classList.remove('visible'),4200)}
let lastFocus:HTMLElement|null=null;
function modal(html:string){controls.clear();lastFocus=document.activeElement as HTMLElement;$('.modal').innerHTML=`<button class="close" aria-label="Закрыть">×</button>${html}`;$('.overlay').hidden=false;$('.close').onclick=closeModal;$('.close').focus();}
function closeModal(){$('.overlay').hidden=true;lastFocus?.focus();}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Tab'&&!$('.overlay').hidden){const items=Array.from(document.querySelectorAll<HTMLElement>('.modal button'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('.overlay').addEventListener('click',e=>{if(e.target===$('.overlay'))closeModal()});
function updateUI(){$('#clue-step').classList.toggle('done',clue);$('#box-step').classList.toggle('done',solved);$('#clue-step .check').textContent=clue?'✓':'';$('#box-step .check').textContent=solved?'✓':'';$('#bag-note').textContent=clue?'✎':'·';$('#bag-star').textContent=solved?'★':'·';$('.quest').classList.toggle('solved',solved);$('#quest-title').textContent=solved?'Первое открытие!':'Мелодия утра';}
function showNote(){characterAction('Interact');clue=true;save();updateUI();tone([523,659]);modal(`<div class="eyebrow">На столе · Бабушкина записка</div><div class="illustration">✉</div><h2 id="modal-title">Доброе утро, Лея!</h2><p>«В шкатулке тебя ждёт маленький подарок.<br>Поставь фигурки на свои места:</p><p><strong>Цветок — сразу справа от солнышка.<br>Солнышко — справа от луны.</strong></p><p>Пусть каждый день начинается с открытия.<br>Обнимаю, бабушка»</p><button class="primary" id="note-ok">Пойду к шкатулке</button>`);$('#note-ok').onclick=()=>{closeModal();walkTo(new Vector3(2.63,.11,1.56),showPuzzle)}}
const symbols=['☀','☾','❀'],names=['Солнце','Луна','Цветок'];let selection=[0,0,0],attempts=0;
function showPuzzle(){if(solved){showSuccess();return}modal(`<div class="eyebrow">Головоломка 01 / Порядок</div><h2 id="modal-title">Мелодия утра</h2><p>${clue?'Цветок — сразу справа от солнышка.<br>Солнышко — справа от луны.':'Три фигурки, три места. Где же подсказка?<br>Кажется, на столе лежит записка…'}</p><div class="puzzle-slots">${selection.map((v,i)=>`<button class="puzzle-slot" data-slot="${i}" aria-label="Место ${i+1}: ${names[v]}. Нажмите, чтобы сменить"><b>${symbols[v]}</b><small>${i+1} · ${names[v]}</small></button>`).join('')}</div><p>Нажимай на фигурки, чтобы менять их.</p><div class="feedback" role="status"></div><div class="modal-actions"><button class="secondary" id="puzzle-clue">${clue?'Записка':'Найти записку'}</button><button class="primary" id="check">Открыть шкатулку</button></div>`);document.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);selection[i]=(selection[i]+1)%3;b.innerHTML=`<b>${symbols[selection[i]]}</b><small>${i+1} · ${names[selection[i]]}</small>`;b.setAttribute('aria-label',`Место ${i+1}: ${names[selection[i]]}. Нажмите, чтобы сменить`);b.classList.add('selected');$('.feedback').textContent='';tone([330+selection[i]*110])});$('#puzzle-clue').onclick=()=>{closeModal();if(clue)showNote();else walkTo(new Vector3(-.6,.11,.92),showNote)};$('#check').onclick=()=>{if(selection.join() ==='1,0,2'){solved=true;save();updateUI();tone([523,659,784,1047]);showSuccess()}else{attempts++;$('.feedback').textContent=attempts>1?'Начни с луны: перед солнышком должно быть место.':'Пока не открывается. Проверь порядок слева направо.';tone([220,196]);}}}
function showSuccess(){characterAction('Celebrate');modal(`<div class="eyebrow">Маленькая победа</div><div class="illustration" style="color:#d3a14b">✦</div><h2 id="modal-title">У тебя получилось!</h2><p>Шкатулка заиграла, а внутри оказалась<br><strong>золотая звёздочка — за любопытство.</strong></p><p>Это первое открытие Леи в Тихом городе.<br>Впереди ещё столько интересного!</p><button class="primary" id="success-ok">Продолжить исследовать</button>`);$('#success-ok').onclick=closeModal;}
$('#bag-note').onclick=()=>clue?showNote():toast('Здесь будет храниться найденная записка.');$('#bag-star').onclick=()=>solved?showSuccess():toast('Здесь пока пусто. Что же спрятано в шкатулке?');$('#hint').onclick=()=>toast(clue?'Слева направо: луна, солнце, цветок. Нажми на значок над шкатулкой.':'Нажми на карандаш над письменным столом — Лея подойдёт к записке.');
$('#help').onclick=()=>{modal(`<div class="eyebrow">Добро пожаловать домой</div><h2 id="modal-title">Маленькое приключение</h2><p>Нажми на свободное место на полу — Лея подойдёт туда, обходя мебель.</p><p>Открытые проходы соединяют весь дом. Нажми на название комнаты сверху — Лея сама дойдёт до неё. Камера плавно следует за Леей. Значки над предметами открывают маленькие истории. Найди бабушкину записку и открой музыкальную шкатулку.</p><p>Прогресс сохраняется в этом браузере.<br>Звук можно включить кнопкой ♪.</p><div class="modal-actions"><button class="secondary" id="reset">Начать заново</button><button class="primary" id="help-ok">Всё понятно</button></div>`);$('#help-ok').onclick=closeModal;$('#reset').onclick=()=>{clue=false;solved=false;selection=[0,0,0];attempts=0;route=[];arrival=null;marker.isVisible=false;switchRoom('bedroom');girl.position.set(.1,.11,-1.13);save();updateUI();closeModal();toast('Новое утро, новая история. Начнём с записки?')}};
let audio:AudioContext|undefined,sound=false;
function tone(notes:number[]){if(!sound)return;audio??=new AudioContext();void audio.resume();notes.forEach((n,i)=>{const osc=audio!.createOscillator(),gain=audio!.createGain(),t=audio!.currentTime+i*.16;osc.type='sine';osc.frequency.value=n;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.075,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+.65);osc.connect(gain);gain.connect(audio!.destination);osc.start(t);osc.stop(t+.7)})}
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'♫':'♪';$('#sound').setAttribute('aria-label',sound?'Выключить звук':'Включить звук');tone([523,659,784]);toast(sound?'Звуки шкатулки включены':'Звуки выключены')};
let memoryObjects:ReturnType<typeof installMemoryObjects>|undefined;
const memory=createMemoryQuest({modal,close:closeModal,celebrate:()=>characterAction('Celebrate'),changed:()=>memoryObjects?.sync(),exit:()=>{
 leavingHouse=true;marker.isVisible=false;route=[new Vector3(22,.11,-5.1)];memoryObjects?.sync();
 arrival=()=>{leavingHouse=false;modal(`<div class="memory"><h2 id="modal-title">За порогом</h2><p>Дверь открыта. Лея вышла из дома — впереди Тихий город.</p><blockquote>«Теперь у тебя есть своя история».</blockquote><button class="primary" id="return-home">Вернуться в дом</button></div>`);$('#return-home').onclick=returnHome};

}},memoryCheck||interiorCheck?'logictown-memory-check-v1':'logictown-memory-v1');
memoryObjects=installMemoryObjects(scene,shadow,houseRooms,memory);memoryObjects.sync();
const interior=installInteriorLibrary(scene,shadow,houseRooms);
const cameraWalls=Array.from(houseRooms.values()).flatMap(room=>room.root.getChildMeshes()).filter(m=>m.isEnabled()&&/wall|open passage/.test(m.name)&&!/tile|clock/.test(m.name)).map(mesh=>{
 mesh.computeWorldMatrix(true);if(mesh.material){mesh.material.backFaceCulling=false;mesh.material.disableDepthWrite=false;mesh.material.forceDepthWrite=true}
 const b=mesh.getBoundingInfo().boundingBox;return {min:b.minimumWorld.clone(),max:b.maximumWorld.clone()};
});
const exteriorDoor=scene.getMeshByName('front door');
scene.onPointerObservable.add(info=>{
 if(info.type!==PointerEventTypes.POINTERTAP||!$('.overlay').hidden)return;
 const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m.isEnabled()&&m.isVisible&&m.isPickable);
 hit?.pickedMesh?.metadata?.interaction?.();
});
function returnHome(){closeModal();leavingHouse=true;route=[new Vector3(18.8,.11,-5.1)];arrival=()=>{leavingHouse=false;switchRoom('hall')}}
const returnPin=createInteractionMarker(scene,'Вернуться в дом','⌂',new Vector3(21.3,1.2,-5.1),returnHome);

// The room graph is shared by door navigation, room selection and collision checks.
$('#app').insertAdjacentHTML('beforeend',`<nav class="house-nav" aria-label="План дома">${Object.entries(roomNames).map(([id,name])=>`<button data-room="${id}" aria-pressed="${id==='bedroom'}">${name}</button>`).join('')}</nav><aside class="room-story quest" hidden><div class="quest-head">Наш дом <span>⌂</span></div><h2></h2><p></p><span class="room-count"></span></aside>`);
let roomAnchors:{marker:ReturnType<typeof createInteractionMarker>;approach:Vector3}[]=[];
function switchRoom(id:RoomId){
 void interior.ensure(id);
 currentRoom=id;const cfg=roomInfo[id];
 $('.location h1').textContent=roomNames[id];$('.location p').textContent=cfg.description;document.title=roomNames[id]+' — Тихий город';canvas.setAttribute('aria-label','Единый дом Леи. Сейчас: '+roomNames[id]+'. Управление: кнопки справа или WASD. Значки появляются рядом с предметами.');
 document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===id)));
 document.querySelector<HTMLElement>('aside.quest:not(.room-story)')!.hidden=id!=='bedroom';
 $('.room-story').hidden=id==='bedroom';$('.room-story h2').textContent=roomNames[id];$('.room-story p').textContent=cfg.story;$('.room-count').textContent='Единый дом · Без загрузок';
 roomAnchors.forEach(a=>a.marker.dispose());roomAnchors=[];
 const room=houseRooms.get(id)!,offset=new Vector3(layout[id][0],0,layout[id][1]);
 for(const spot of room.hotspots){
 const approach=spot.approach.add(offset);
 const pin=createInteractionMarker(scene,spot.label,spot.icon,spot.position.add(offset),()=>{if(!nearInteraction(girl.position,approach))return;walkTo(approach,()=>{characterAction('Interact');spot.activate?.();if(spot.message)toast(spot.message)})});
 roomAnchors.push({marker:pin,approach});
 }

 try{localStorage.setItem(roomStorageKey,id)}catch{}
}
for(const b of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-room]')))b.onclick=()=>{const id=b.dataset.room as RoomId,cfg=roomInfo[id];walkTo(new Vector3(layout[id][0]+cfg.spawn[0],.11,layout[id][1]+cfg.spawn[1]));};
let initialRoom:RoomId='bedroom';try{const stored=localStorage.getItem(roomStorageKey);if(stored&&stored in roomInfo)initialRoom=stored as RoomId}catch{}
if(memoryCheck)initialRoom='hall';
if(interiorCheck){const id=new URLSearchParams(location.search).get('room');initialRoom=id&&id in roomInfo?id as RoomId:'bedroom'}
girl.position.set(layout[initialRoom][0]+roomInfo[initialRoom].spawn[0],.11,layout[initialRoom][1]+roomInfo[initialRoom].spawn[1]);
if(memoryCheck)girl.position.set(18.8,.11,-5.1);
girl.rotation.y=memoryCheck?Math.PI/2:0;camera.alpha=-Math.PI/2-girl.rotation.y;camera.target.set(girl.position.x,1,girl.position.z);switchRoom(initialRoom);
let time=0;
engine.runRenderLoop(()=>{viewport.update();const dt=Math.min(engine.getDeltaTime()/1000,.04);time+=dt;const input=controls.read($('.overlay').hidden&&!leavingHouse);
 const manual=(input.forward!==0||input.turn!==0)&&!leavingHouse;
 let manualMoving=false;
 if(manual){route=[];arrival=null;marker.isVisible=false;characterActionUntil=0;girl.rotation.y+=input.turn*dt*2.2;
 const outside=girl.position.x>20;
 const collides=(x:number,z:number)=>outside?(x<20.1||x>26.7||z< -8.2||z> -2):blocked(x,z);
 const next=moveWithCollisions(girl.position,girl.rotation.y,input.forward*dt*2.9,collides);manualMoving=Math.hypot(next.x-girl.position.x,next.z-girl.position.z)>.0001;girl.position.x=next.x;girl.position.z=next.z;
 }
 const moving=manualMoving||route.length>0&&$('.overlay').hidden;if(route.length&&$('.overlay').hidden){const delta=route[0].subtract(girl.position);delta.y=0;const dist=delta.length();if(dist<dt*2.9){girl.position.x=route[0].x;girl.position.z=route[0].z;route.shift();if(!route.length){marker.isVisible=false;const fn=arrival;arrival=null;fn?.()}}else{girl.position.addInPlace(delta.scale(dt*2.9/dist));const target=Math.atan2(delta.x,delta.z);girl.rotation.y+=Math.atan2(Math.sin(target-girl.rotation.y),Math.cos(target-girl.rotation.y))*Math.min(1,dt*13)}}girl.position.y=.11+(moving?Math.abs(Math.sin(time*11))*.025:Math.sin(time*2)*.008);if(performance.now()>characterActionUntil)leaAsset?.play(moving?'Walk':'Idle');limbs.forEach((l,i)=>l.rotation.x=moving?Math.sin(time*11+(i<2?0:Math.PI))*(i%2?.35:.5):Math.sin(time*2+i)*.025);lid.rotation.x+=( (solved?-1.08:0)-lid.rotation.x)*dt*4;marker.rotation.y+=dt;const entered=roomAt(girl.position.x,girl.position.z);if(entered&&entered!==currentRoom)switchRoom(entered);const cameraAlpha=-Math.PI/2-girl.rotation.y;camera.alpha+=Math.atan2(Math.sin(cameraAlpha-camera.alpha),Math.cos(cameraAlpha-camera.alpha))*(1-Math.exp(-dt*7));
 camera.target.set(girl.position.x,1.45,girl.position.z);
 const direction=new Vector3(Math.cos(camera.alpha)*Math.sin(camera.beta),Math.cos(camera.beta),Math.sin(camera.alpha)*Math.sin(camera.beta));
 const walls=[...cameraWalls];
 if(exteriorDoor){exteriorDoor.computeWorldMatrix(true);const b=exteriorDoor.getBoundingInfo().boundingBox;walls.push({min:b.minimumWorld,max:b.maximumWorld})}
 const allowed=cameraDistance(camera.target,direction,cameraBoom,walls);
 camera.radius=allowed<camera.radius?allowed:Math.min(allowed,camera.radius+dt*3);
 sun.position.set(girl.position.x+6,10,girl.position.z+6);camera.getViewMatrix();
 for(const a of [{marker:returnPin,approach:new Vector3(22,.11,-5.1)},...roomAnchors]){
  const near=nearInteraction(girl.position,a.approach)&&$('.overlay').hidden&&(a.marker!==returnPin||girl.position.x>20);
  a.marker.mesh.setEnabled(near);
  if(near){
   const delta=a.marker.mesh.position.subtract(camera.position),distance=delta.length();
   const hit=scene.pickWithRay(new Ray(camera.position,delta.normalize(),distance),m=>m.isEnabled()&&m.isVisible&&m.isPickable&&!m.metadata?.interaction&&!m.isDescendantOf(girl));
   a.marker.mesh.setEnabled(!hit?.hit||hit.distance>=distance-.12);
  }
 }
 scene.render();
});


viewport.update();updateUI();
void interior.ensure(initialRoom).then(async()=>{
 $('.loading').hidden=true;
 // Warm the remaining rooms in the background so nearby doorways show finished furniture.
 for(const id of houseRooms.keys())if(id!==initialRoom)await interior.ensure(id);
});








