import {ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,FxaaPostProcess,HemisphericLight,PointerEventTypes,Scene,ShadowGenerator,TransformNode,Vector3} from '@babylonjs/core';
import {buildOutdoorWorld} from './outdoor-world';
import {outdoorBlocked,outdoorPath,outdoorSpawn,outdoorCompanionTarget,outdoorObstacles,outdoorStore,outdoorHomes,outdoorEntrance,outdoorDoor,outdoorFlowerBeds,outdoorWateringCan,outdoorNeighbourDoors,outdoorBusStop,outdoorBusApproach} from './outdoor-layout';
import {loadLea} from './lea';
import {loadDog} from './dog';
import {installDogCommands} from './dog-commands';
import {loadStreetCat} from './cat';
import {createSwingRide} from './swing-ride';
import {createSwingSound} from './swing-sound';
import {createWindSound} from './wind-sound';
import {createFallingLeaves} from './falling-leaves';
import {createGardenWatering} from './garden-watering';
import {createDoorKnocks} from './door-knock';
import {createSwingControls} from './swing-controls';
import {savePlayerLocation,installLocationAutosave} from './player-location';
import {createMovementControls} from './controls';
import {moveWithCollisions,nearInteraction} from './movement';
import {createViewportSync} from './viewport';
import {createAdaptiveQuality} from './render-quality';
import {createInteractionMarker} from './interaction-marker';
import {cameraDistance} from './camera-collision';
import {outdoorCameraAngle,outdoorCameraDirection} from './outdoor-camera';
import {createOutdoorSky,outdoorSunDirection} from './outdoor-sky';
import './style.css';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<canvas id="world" aria-label="Двор Леи и солнечная улица. Управление: WASD или стрелки справа. Можно пройти через открытую калитку."></canvas><div class="loading"><strong>Выходим на улицу…</strong><span>Тихий город</span></div><button class="street-home" hidden>⌂ В дом</button><button class="street-swing" hidden>Покачаться</button><div class="toast" role="status"></div>';
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,loading=document.querySelector<HTMLElement>('.loading')!,homeButton=document.querySelector<HTMLButtonElement>('.street-home')!;
const engine=new Engine(canvas,false,{stencil:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});engine.renderEvenInBackground=false;engine.maxFPS=60;
const scene=new Scene(engine);scene.clearColor=new Color4(.34,.69,.96,1);scene.fogMode=Scene.FOGMODE_NONE;
const camera=new ArcRotateCamera('street camera',-Math.PI/2,1.25,3.8,new Vector3(outdoorSpawn.x,1.1,outdoorSpawn.z),scene);camera.minZ=.05;camera.maxZ=180;camera.fov=.9;new FxaaPostProcess('street antialias',1,camera);let boom=3.8;
const viewport=createViewportSync(canvas,engine,aspect=>{camera.fov=aspect<.8?1.05:.9;boom=aspect<.8?4.2:3.8});
// Avoid saturating StandardMaterial's diffuse lighting: too much fill erases pavement shadows.
const sky=new HemisphericLight('clear blue sky',Vector3.Up(),scene);sky.intensity=.45;
const sun=new DirectionalLight('bright afternoon sun',outdoorSunDirection.scale(-1),scene);sun.intensity=1.65;sun.diffuse=new Color3(1,.96,.84);sun.position.set(12,24,-16);
// Direct and fill light share a hue: shadows lower brightness without making grass greener.
sky.diffuse=sun.diffuse.clone();sky.groundColor=sun.diffuse.scale(.45);
const shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.0005;shadow.normalBias=.02;shadow.darkness=.22;
createOutdoorSky(scene);
const lea=new TransformNode('Lea outdoors',scene);lea.position.set(outdoorSpawn.x,.11,outdoorSpawn.z);const controls=createMovementControls(app),quality=createAdaptiveQuality();
let route:Vector3[]=[],transitioning=false;
function walkTo(p:Vector3){if(transitioning)return;route=outdoorPath(lea.position,p).map(p=>new Vector3(p.x,.11,p.z))}
const checkMode=import.meta.env.DEV?new URLSearchParams(location.search).get('check'):null;
const check=!!checkMode;
const persistLocation=!check;
let returningFromStore=false;try{returningFromStore=sessionStorage.getItem('logictown-return-store')==='1';sessionStorage.removeItem('logictown-return-store')}catch{}
if(returningFromStore)lea.position.set(52,.11,-23);
let returningFromBus=false;try{returningFromBus=sessionStorage.getItem('logictown-return-bus')==='1';sessionStorage.removeItem('logictown-return-bus')}catch{}
if(returningFromBus){lea.position.set(outdoorBusApproach.x,.11,outdoorBusApproach.z);lea.rotation.y=Math.PI}
const toast=document.querySelector<HTMLElement>('.toast')!;let toastTimer:ReturnType<typeof setTimeout>|undefined;
function say(text:string){toast.textContent=text;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600)}
const storeApproach=new Vector3(52,.11,-24);
const storeButton=document.createElement('button');storeButton.className='street-swing';storeButton.textContent='Войти в магазин';storeButton.hidden=true;app.append(storeButton);
function enterStore(){if(transitioning||!nearInteraction(lea.position,storeApproach,2.8))return;transitioning=true;controls.clear();if(persistLocation)savePlayerLocation({version:2,area:'store'});location.assign(check?'/store.html?check=entry':'/store.html')}
storeButton.onclick=enterStore;
const busButton=document.createElement('button');busButton.className='street-swing';busButton.textContent='Поехать в школу';busButton.hidden=true;app.append(busButton);
const nearBusStop=()=>!transitioning&&(nearInteraction(lea.position,new Vector3(outdoorBusApproach.x,.11,outdoorBusApproach.z),2.4)||Math.abs(lea.position.x-outdoorBusStop.x)<outdoorBusStop.w/2&&Math.abs(lea.position.z-outdoorBusStop.z)<outdoorBusStop.d/2);
function rideBus(){if(!nearBusStop())return;transitioning=true;route=[];controls.clear();loading.querySelector('strong')!.textContent='Садимся в автобус…';loading.hidden=false;if(persistLocation)savePlayerLocation({version:2,area:'street'});requestAnimationFrame(()=>requestAnimationFrame(()=>location.assign(check?'/bus.html?check=ride':'/bus.html')))}
busButton.onclick=rideBus;
const storePin=createInteractionMarker(scene,'Войти в магазин','↪',new Vector3(52,1.5,-24.5),enterStore);
const townOverview=checkMode==='town';
if(townOverview){homeButton.hidden=true}
const fenceOverview=checkMode==='fence-white'||checkMode==='fence-wire';
const overviewHome=checkMode?.startsWith('architecture-')?outdoorHomes.find(h=>h.model===checkMode.slice(-1)&&h.angle===0):fenceOverview?outdoorHomes.find(h=>h.model===(checkMode==='fence-wire'?'b':'a')&&h.angle===0):undefined;
if(overviewHome)lea.position.set(overviewHome.x,.11,-11);
if(checkMode==='store')lea.position.set(52,.11,-23);
if(checkMode==='swing'||checkMode==='swing-grip')lea.position.set(1.4,.11,11);
if(checkMode==='cat'||checkMode==='cat-model')lea.position.set(8,.11,-17.5);
if(checkMode==='garden'){lea.position.set(-3.9,.11,-6.2);lea.rotation.y=0}
if(checkMode==='watering-can'){lea.position.set(outdoorWateringCan.x-1.5,.11,outdoorWateringCan.z);lea.rotation.y=Math.PI/2}
if(checkMode==='knock'){lea.position.set(outdoorNeighbourDoors[0].x,.11,outdoorNeighbourDoors[0].z-1);lea.rotation.y=0}
if(checkMode==='bus-stop'){lea.position.set(outdoorBusApproach.x+1,.11,outdoorBusApproach.z+.8);lea.rotation.y=Math.PI+.4}
if(checkMode==='house-c')lea.position.set(26,.11,-6.3);
if(checkMode==='house-d')lea.position.set(-52,.11,-6.3);
if(checkMode==='shadow-road'){lea.position.set(20,.11,-18);lea.rotation.y=Math.PI}
if(checkMode==='shadow-pavement'){lea.position.set(20,.11,-22.5);lea.rotation.y=Math.PI}
function returnHome(){if(transitioning||!nearInteraction(lea.position,new Vector3(outdoorEntrance.x,.11,outdoorEntrance.z),2.2))return;transitioning=true;route=[];loading.querySelector('strong')!.textContent='Возвращаемся домой…';loading.hidden=false;if(persistLocation)savePlayerLocation({version:2,area:'house',room:'hall'});try{sessionStorage.setItem('logictown-return-home','1')}catch{}requestAnimationFrame(()=>requestAnimationFrame(()=>location.assign(checkMode==='outdoor'?'/checks/outdoor.html':check?'/checks/house.html':'/')))}
homeButton.onclick=returnHome;
const pin=createInteractionMarker(scene,'Вернуться в дом','⌂',new Vector3(outdoorDoor.x,2,outdoorDoor.z),returnHome);
const walls=outdoorObstacles.filter(o=>o.kind==='house'||o.kind==='store'||o.kind==='fence'||o.kind==='gate').map(o=>({min:new Vector3(o.x-o.w/2,0,o.z-o.d/2),max:new Vector3(o.x+o.w/2,o.kind==='store'?outdoorStore.h:o.kind==='house'?outdoorHomes.find(h=>h.x===o.x&&h.z===o.z)!.h:1.35,o.z+o.d/2)}));
async function start(){
 const [world,character]=await Promise.all([buildOutdoorWorld(scene,shadow),loadLea(scene,lea,shadow)]);
 const ride=createSwingRide(lea,character,world.swingHinge,world.swingSeat);
 const locationAutosave=installLocationAutosave(()=>({version:2,area:'street'}),()=>persistLocation&&!transitioning);
 locationAutosave.flush();scene.onDisposeObservable.add(()=>locationAutosave.dispose());
 const swingSound=createSwingSound();scene.onDisposeObservable.add(()=>swingSound.dispose());
 const windSound=createWindSound(checkMode==='wind');scene.onDisposeObservable.add(()=>windSound.dispose());
 if(checkMode==='wind'){const nav=document.createElement('div');nav.className='street-check';nav.style.top='auto';nav.style.bottom='150px';const button=document.createElement('button');button.textContent='Проверить ветер';button.onclick=()=>{void windSound.preview()};const status=document.createElement('output');status.id='wind-status';nav.append(button,status);app.append(nav);scene.onBeforeRenderObservable.add(()=>status.textContent=windSound.status());}
 const leaves=createFallingLeaves(scene,outdoorBlocked,48,checkMode==='leaves');if(checkMode==='leaves')Object.assign(window,{leavesCheck:(seconds:number)=>{for(let t=0;t<seconds;t+=.04)leaves.update(.04,lea.position,lea.rotation.y);return leaves.flying}});scene.onDisposeObservable.add(()=>leaves.dispose());
 const garden=createGardenWatering(scene,shadow,lea,character,outdoorFlowerBeds,outdoorWateringCan,say);scene.onDisposeObservable.add(()=>garden.dispose());
 if(checkMode==='garden'||checkMode==='watering-can')Object.assign(window,{gardenCheck:garden,gardenStep:(seconds:number)=>{for(let t=0;t<seconds;t+=.04)garden.update(.04,true);return garden.wateringTime}});
 const knocks=createDoorKnocks(outdoorNeighbourDoors,lea);scene.onDisposeObservable.add(()=>knocks.dispose());
 if(checkMode==='knock')Object.assign(window,{knockCheck:knocks});
 const swingButton=document.querySelector<HTMLButtonElement>('.street-swing')!;
 const swingControls=createSwingControls(app);
 const nearSwing=()=>Vector3.Distance(lea.position,world.swingSeat.getAbsolutePosition())<2.6&&!transitioning;
 const stopRide=()=>{ride.stop();swingControls.show(false);controls.clear();route=[]};
 swingButton.onclick=()=>{if(ride.active){stopRide();return}if(!nearSwing())return;route=[];controls.clear();ride.start();swingControls.show(true)};
 const cancelRide=(e:KeyboardEvent)=>{if(ride.active&&e.code==='Escape'){stopRide();e.preventDefault()}};
 window.addEventListener('keydown',cancelRide);
 scene.onDisposeObservable.add(()=>{swingControls.dispose();window.removeEventListener('keydown',cancelRide)});
 const dog=await loadDog(scene,lea,shadow,()=>false,{path:outdoorPath,blocked:outdoorBlocked,target:outdoorCompanionTarget});
 const dogCommands=installDogCommands(app,dog);scene.onDisposeObservable.add(()=>dogCommands.dispose());
 const cat=await loadStreetCat(scene,shadow,{path:outdoorPath,blocked:outdoorBlocked});
 if(checkMode==='cat-model')cat.root.rotation.y=Math.PI;
 let catCheckStarted=checkMode!=='cat';
 scene.environmentIntensity=.75;
 scene.onPointerObservable.add(info=>{if(info.type!==PointerEventTypes.POINTERTAP||transitioning||ride.active||garden.busy)return;const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m.isEnabled()&&m.isVisible&&m.isPickable);if(hit?.pickedMesh?.metadata?.interaction){hit.pickedMesh.metadata.interaction();return}if(hit?.pickedPoint&&world.floors.includes(hit.pickedMesh as typeof world.floors[number]))walkTo(hit.pickedPoint)});
 if(check&&!overviewHome&&!townOverview){const nav=document.createElement('nav');nav.className='street-check';for(const [label,x,z]of [['К магазину',52,-23],['К качелям',1.4,11],['К кошке',8,-13.5],['У калитки',0,-11],['На улице',20,-18],['Тротуар',20,-22.5],['Соседний двор',26,-29.2],['Задний двор',0,9],['У дерева',9.5,3],['Перед домом',outdoorSpawn.x,outdoorSpawn.z],['Дом с широким крыльцом',26,-6.3],['Дом с мансардой',-52,-6.3],['К клумбе',-3.9,-6.2],['К лейке',outdoorWateringCan.x-1.5,outdoorWateringCan.z],['К остановке',outdoorBusApproach.x,outdoorBusApproach.z],['К двери соседа',outdoorNeighbourDoors[0].x,outdoorNeighbourDoors[0].z]] as const){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(label==='К кошке'){catCheckStarted=true;walkTo(cat.root.position)}else walkTo(new Vector3(x,.11,z))};nav.append(b)}const out=document.createElement('output');out.id='street-status';nav.append(out);app.append(nav)}
 await scene.whenReadyAsync();loading.hidden=true;
 engine.runRenderLoop(()=>{
  const q=quality.sample(engine.getDeltaTime());if(q!==undefined)viewport.setQuality(q);viewport.update();const dt=Math.min(.04,engine.getDeltaTime()/1000),input=controls.read(!transitioning&&!ride.active&&!garden.busy);if(garden.busy)route=[];let moving=false;
  if(!ride.active&&(input.forward||input.turn)){route=[];lea.rotation.y+=input.turn*dt*2.2;const p=moveWithCollisions(lea.position,lea.rotation.y,input.forward*dt*3.3,outdoorBlocked);moving=Math.hypot(p.x-lea.position.x,p.z-lea.position.z)>.0001;lea.position.x=p.x;lea.position.z=p.z}
  else if(!ride.active&&route.length&&!transitioning){const delta=route[0].subtract(lea.position);delta.y=0;const dist=delta.length(),travel=Math.min(dist,dt*3.3);if(dist<.001)route.shift();else{const p={x:lea.position.x+delta.x*travel/dist,z:lea.position.z+delta.z*travel/dist};if(!outdoorBlocked(p.x,p.z)){lea.position.x=p.x;lea.position.z=p.z;moving=true;lea.rotation.y+=Math.atan2(Math.sin(Math.atan2(delta.x,delta.z)-lea.rotation.y),Math.cos(Math.atan2(delta.x,delta.z)-lea.rotation.y))*Math.min(1,dt*13);if(travel===dist)route.shift()}else route=[]}}
  if(ride.active){ride.update(dt,swingControls.read());swingControls.update(ride.amplitude,ride.direction,ride.feedback,ride.won)}else character.play(moving?'Walk':'Idle');
  swingSound.update(ride.active,ride.angle,dt,Vector3.Distance(lea.position,world.swingHinge.getAbsolutePosition()));
  swingButton.hidden=!ride.active&&!nearSwing();swingButton.textContent=ride.active?'Закончить качание':'Покачаться';
  dog.update(dt,moving,[],false);if(checkMode!=='cat-model'&&catCheckStarted)cat.update(dt,dog.root.position);
  dogCommands.update(!transitioning&&!ride.active);
  leaves.update(dt,lea.position,lea.rotation.y);
  garden.update(dt,!transitioning&&!ride.active);knocks.update(!transitioning&&!ride.active&&!garden.busy);
  const nearStore=nearInteraction(lea.position,storeApproach,2.8)&&!transitioning;storeButton.hidden=!nearStore;busButton.hidden=ride.active||garden.busy||!nearBusStop();storePin.mesh.setEnabled(nearStore);
  camera.beta=1.25;camera.target.set(lea.position.x,1.1,lea.position.z);const alpha=outdoorCameraAngle(camera.target,-Math.PI/2-lea.rotation.y+(garden.busy?.95:0),camera.beta,boom,walls);camera.alpha+=Math.atan2(Math.sin(alpha-camera.alpha),Math.cos(alpha-camera.alpha))*(1-Math.exp(-dt*7));
  const dir=outdoorCameraDirection(camera.alpha,camera.beta);const distance=cameraDistance(camera.target,dir,boom,walls);camera.radius=distance<camera.radius?distance:Math.min(distance,camera.radius+dt*3);
  if(overviewHome){camera.target.set(overviewHome.x,3.9,overviewHome.z);camera.alpha=-Math.PI/2;camera.beta=1.47;camera.radius=25}
  if(fenceOverview&&overviewHome){camera.target.set(overviewHome.x+5,.8,-12);camera.alpha=-Math.PI/2;camera.beta=1.46;camera.radius=6.8}
  if(checkMode==='cat-model'||checkMode==='cat'){camera.target.set(cat.root.position.x,.35,cat.root.position.z);camera.alpha=-Math.PI/2+.65;camera.beta=1.3;camera.radius=checkMode==='cat-model'?2.2:9}
  if(ride.active||checkMode==='swing'||checkMode==='swing-grip'){camera.target.set(4,1.1,11);camera.alpha=Math.PI/2+.8;camera.beta=1.35;camera.radius=5;if(checkMode==='swing-grip'){camera.target.set(3.15,1,11);camera.radius=2.8}}
  if(checkMode==='store'){camera.target.set(52,2.6,-30.5);camera.alpha=Math.PI/2+.22;camera.beta=1.46;camera.radius=18}
  if(townOverview){camera.target.set(0,2,-16);camera.alpha=-Math.PI/2;camera.beta=1.35;camera.radius=84}
  sun.position.copyFrom(lea.position.add(outdoorSunDirection.scale(80)));const near=nearInteraction(lea.position,new Vector3(outdoorEntrance.x,.11,outdoorEntrance.z),2.2)&&!transitioning;homeButton.hidden=!near||townOverview;pin.mesh.setEnabled(near);
  if(check&&!overviewHome&&!townOverview)document.querySelector('#street-status')!.textContent=`${ride.active?'Качаемся · хват '+(character.gripError*1000).toFixed(1)+' мм · ':''}Лея ${lea.position.x.toFixed(1)}, ${lea.position.z.toFixed(1)} · щенок ${dog.sitting?'сидит':'идёт'} · расстояние ${Vector3.Distance(lea.position,dog.root.position).toFixed(1)} · кошка ${cat.state} ${cat.root.position.x.toFixed(1)}, ${cat.root.position.z.toFixed(1)} · сближение ${cat.closingSpeed.toFixed(1)} · до кошки ${Vector3.Distance(cat.root.position,dog.root.position).toFixed(1)} · испугов ${cat.fleeCount} · листьев в воздухе ${leaves.flying} · лейка ${garden.carried?'в руке':'не взята'}${garden.busy?' · поливаем '+garden.wateringTime.toFixed(1)+' с':''} · поливов ${garden.waterings} · стуков ${knocks.count} · FPS ${engine.getFps().toFixed(0)}`;
  scene.render();
  locationAutosave.tick(dt);
 });
}
void start().catch(error=>{console.error(error);loading.querySelector('strong')!.textContent='Не удалось загрузить улицу';loading.querySelector('span')!.innerHTML='<button class="primary" id="street-retry">Попробовать снова</button> <a href="/">Вернуться в дом</a>';document.querySelector('#street-retry')!.addEventListener('click',()=>location.reload())});
import.meta.hot?.dispose(()=>{controls.dispose();viewport.dispose();engine.dispose()});
