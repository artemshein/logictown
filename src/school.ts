import {ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,FxaaPostProcess,HemisphericLight,PointerEventTypes,Scene,ShadowGenerator,TransformNode,Vector3} from '@babylonjs/core';
import {buildSchoolWorld} from './school-world';
import {schoolBlocked,schoolPath,schoolCompanionTarget,schoolSpawn,schoolBusStop,schoolBusApproach,schoolBuilding,schoolBay,schoolFront,schoolStand,schoolFence,schoolTrack} from './school-layout';
import {loadLea} from './lea';
import {loadDog} from './dog';
import {installDogCommands} from './dog-commands';
import {dogPresent,dogBoardsBus} from './dog-whereabouts';
import {createSchoolBall} from './school-ball';
import {createWindSound} from './wind-sound';
import {createFallingLeaves} from './falling-leaves';
import {createRain} from './rain';
import {savePlayerLocation,installLocationAutosave} from './player-location';
import {createMovementControls} from './controls';
import {moveWithCollisions,nearInteraction} from './movement';
import {createViewportSync} from './viewport';
import {createAdaptiveQuality} from './render-quality';
import {cameraDistance} from './camera-collision';
import {outdoorCameraAngle,outdoorCameraDirection} from './outdoor-camera';
import {createOutdoorSky,outdoorSunDirection} from './outdoor-sky';
import './style.css';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<canvas id="world" aria-label="Школа за высоким забором, за ней футбольное поле и беговые дорожки. Управление: WASD или стрелки справа."></canvas><div class="loading"><strong>Приехали к школе…</strong><span>Остановка «Школа»</span></div><button class="street-swing" hidden>Поехать в город</button><div class="toast" role="status"></div>';
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,loading=document.querySelector<HTMLElement>('.loading')!,busButton=document.querySelector<HTMLButtonElement>('.street-swing')!;
const engine=new Engine(canvas,false,{stencil:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});engine.renderEvenInBackground=false;engine.maxFPS=60;
const scene=new Scene(engine);scene.clearColor=new Color4(.34,.69,.96,1);scene.fogMode=Scene.FOGMODE_NONE;
const camera=new ArcRotateCamera('school camera',-Math.PI/2,1.25,3.8,new Vector3(schoolSpawn.x,1.1,schoolSpawn.z),scene);camera.minZ=.05;camera.maxZ=220;camera.fov=.9;new FxaaPostProcess('school antialias',1,camera);let boom=3.8;
const viewport=createViewportSync(canvas,engine,aspect=>{camera.fov=aspect<.8?1.05:.9;boom=aspect<.8?4.2:3.8});
// Same daylight as the village street.
const sky=new HemisphericLight('clear blue sky',Vector3.Up(),scene);sky.intensity=.45;
const sun=new DirectionalLight('bright afternoon sun',outdoorSunDirection.scale(-1),scene);sun.intensity=1.65;sun.diffuse=new Color3(1,.96,.84);
sky.diffuse=sun.diffuse.clone();sky.groundColor=sun.diffuse.scale(.45);
const shadow=new ShadowGenerator(2048,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.0005;shadow.normalBias=.02;shadow.darkness=.22;
const dome=createOutdoorSky(scene);
const lea=new TransformNode('Lea at school',scene);lea.position.set(schoolSpawn.x,.11,schoolSpawn.z);lea.rotation.y=Math.PI;
const controls=createMovementControls(app),quality=createAdaptiveQuality();
let route:Vector3[]=[],transitioning=false,dog:Awaited<ReturnType<typeof loadDog>>|undefined;
function walkTo(p:Vector3){if(transitioning)return;route=schoolPath(lea.position,p).map(p=>new Vector3(p.x,.11,p.z))}
const checkMode=import.meta.env.DEV?new URLSearchParams(location.search).get('check'):null,check=!!checkMode;
const persistLocation=!check;
const toast=document.querySelector<HTMLElement>('.toast')!;let toastTimer:ReturnType<typeof setTimeout>|undefined;
function say(text:string,ms=2600){toast.textContent=text;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),ms)}
const nearBusStop=()=>!transitioning&&(nearInteraction(lea.position,schoolBusApproach,2.4)||Math.abs(lea.position.x-schoolBusStop.x)<schoolBusStop.w/2&&Math.abs(lea.position.z-schoolBusStop.z)<schoolBusStop.d/2);
function rideBus(){if(!nearBusStop())return;transitioning=true;route=[];controls.clear();loading.querySelector('strong')!.textContent='Садимся в автобус…';loading.querySelector('span')!.textContent='Маршрут 1 · Тихий город';loading.hidden=false;if(persistLocation){savePlayerLocation({version:2,area:'school'});dogBoardsBus('school',dog)}requestAnimationFrame(()=>requestAnimationFrame(()=>location.assign(check?'/bus.html?check=ride&to=town':'/bus.html?to=town')))}
busButton.onclick=rideBus;
const places={gate:{x:schoolFence.gate.x,z:schoolFence.front+2},steps:{x:0,z:-33.6},field:{x:0,z:schoolTrack.z+8},track:{x:-20,z:schoolTrack.z+19},stop:schoolBusApproach};
if(checkMode==='gate')lea.position.set(places.gate.x,.11,places.gate.z);
if(checkMode==='steps')lea.position.set(places.steps.x,.11,places.steps.z);
if(checkMode==='field')lea.position.set(places.field.x,.11,places.field.z);
if(checkMode==='track')lea.position.set(places.track.x,.11,places.track.z);
if(checkMode==='ball'){lea.position.set(schoolTrack.x+.9,.11,schoolTrack.z+.5);lea.rotation.y=-Math.PI/2}
// Camera blockers: the building and its entrance bay, plus the bleachers. The palisade is see-through.
const walls=[
 {min:new Vector3(schoolBuilding.x-schoolBuilding.w/2,0,schoolBuilding.z-schoolBuilding.d/2),max:new Vector3(schoolBuilding.x+schoolBuilding.w/2,schoolBuilding.h,schoolBuilding.z+schoolBuilding.d/2)},
 {min:new Vector3(schoolBay.x-schoolBay.w/2,0,schoolFront),max:new Vector3(schoolBay.x+schoolBay.w/2,schoolBay.h,schoolFront+schoolBay.depth)},
 {min:new Vector3(schoolStand.x-schoolStand.w/2,0,schoolStand.z-schoolStand.d/2),max:new Vector3(schoolStand.x+schoolStand.w/2,2.6,schoolStand.z+schoolStand.d/2)},
];
async function start(){
 const [world,character]=await Promise.all([buildSchoolWorld(scene,shadow),loadLea(scene,lea,shadow)]);
 const locationAutosave=installLocationAutosave(()=>({version:2,area:'school'}),()=>persistLocation&&!transitioning);
 locationAutosave.flush();scene.onDisposeObservable.add(()=>locationAutosave.dispose());
 const windSound=createWindSound();scene.onDisposeObservable.add(()=>windSound.dispose());
 const leaves=createFallingLeaves(scene,schoolBlocked,48,checkMode==='leaves');scene.onDisposeObservable.add(()=>leaves.dispose());
 if(checkMode==='leaves')Object.assign(window,{leavesCheck:(seconds:number)=>{for(let t=0;t<seconds;t+=.04)leaves.update(.04,lea.position,lea.rotation.y);return leaves.flying}});
 const rain=createRain(scene,{sun,sky,dome},raining=>say(raining?'Пошёл дождь':'Дождь закончился'),{force:checkMode==='rain',persist:persistLocation});scene.onDisposeObservable.add(()=>rain.dispose());
 // The puppy rides along unless it was told to sit back in town.
 const dogCommands=(!persistLocation||dogPresent('school'))?await loadDog(scene,lea,shadow,()=>false,{path:schoolPath,blocked:schoolBlocked,target:schoolCompanionTarget}).then(asset=>{dog=asset;const commands=installDogCommands(app,asset);scene.onDisposeObservable.add(()=>commands.dispose());return commands}):undefined;
 const ball=createSchoolBall(scene,shadow,()=>say('Гол!'));scene.onDisposeObservable.add(()=>ball.dispose());
 const kickButton=document.createElement('button');kickButton.className='street-swing';kickButton.textContent='Пнуть';kickButton.hidden=true;app.append(kickButton);
 kickButton.onclick=()=>{if(transitioning||!ball.near(lea.position))return;route=[];controls.clear();ball.kick(lea.rotation.y)};
 if(checkMode==='ball')Object.assign(window,{ballCheck:{ball,lea,step(seconds:number){for(let t=0;t<seconds;t+=.02)ball.update(.02,lea.position,0);return ball.mesh.position.asArray()}}});
 scene.environmentIntensity=.75;
 scene.onPointerObservable.add(info=>{if(info.type!==PointerEventTypes.POINTERTAP||transitioning)return;const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m.isEnabled()&&m.isVisible&&world.floors.includes(m as typeof world.floors[number]));if(hit?.pickedPoint)walkTo(hit.pickedPoint)});
if(check){const nav=document.createElement('nav');nav.className='street-check';for(const [label,p] of [['К мячу',{x:schoolTrack.x+.9,z:schoolTrack.z}],['К воротам',places.gate],['К крыльцу',places.steps],['На поле',places.field],['На дорожку',places.track],['К остановке',places.stop]] as const){const b=document.createElement('button');b.textContent=label;b.onclick=()=>walkTo(new Vector3(p.x,.11,p.z));nav.append(b)}const out=document.createElement('output');out.id='school-status';nav.append(out);app.append(nav)}
 // Start behind Lea instead of swinging round on the first frames.
 camera.alpha=-Math.PI/2-lea.rotation.y;
 await scene.whenReadyAsync();loading.hidden=true;
 if(!check)say('Школа № 1. Автобус обратно в город ждёт на остановке.',4200);
 engine.runRenderLoop(()=>{
  const q=quality.sample(engine.getDeltaTime());if(q!==undefined)viewport.setQuality(q);viewport.update();const dt=Math.min(.04,engine.getDeltaTime()/1000),input=controls.read(!transitioning);let moving=false;
  if(input.forward||input.turn){route=[];lea.rotation.y+=input.turn*dt*2.2;const p=moveWithCollisions(lea.position,lea.rotation.y,input.forward*dt*(input.run?6.2:3.3),schoolBlocked);moving=Math.hypot(p.x-lea.position.x,p.z-lea.position.z)>.0001;lea.position.x=p.x;lea.position.z=p.z}
  else if(route.length&&!transitioning){const delta=route[0].subtract(lea.position);delta.y=0;const dist=delta.length(),travel=Math.min(dist,dt*3.3);if(dist<.001)route.shift();else{const p={x:lea.position.x+delta.x*travel/dist,z:lea.position.z+delta.z*travel/dist};if(!schoolBlocked(p.x,p.z)){lea.position.x=p.x;lea.position.z=p.z;moving=true;lea.rotation.y+=Math.atan2(Math.sin(Math.atan2(delta.x,delta.z)-lea.rotation.y),Math.cos(Math.atan2(delta.x,delta.z)-lea.rotation.y))*Math.min(1,dt*13);if(travel===dist)route.shift()}else route=[]}}
  character.play(moving?(input.run&&(input.forward||input.turn)?'Run':'Walk'):'Idle');
  dog?.update(dt,moving,[],false);dogCommands?.update(!transitioning);
  ball.update(dt,lea.position,moving?(input.run&&input.forward?6.2:3.3):0);
  leaves.update(dt,lea.position,lea.rotation.y);
  rain.update(dt,lea.position);
  busButton.hidden=!nearBusStop();kickButton.hidden=transitioning||!ball.near(lea.position);
  camera.beta=1.25;camera.target.set(lea.position.x,1.1,lea.position.z);const alpha=outdoorCameraAngle(camera.target,-Math.PI/2-lea.rotation.y,camera.beta,boom,walls);camera.alpha+=Math.atan2(Math.sin(alpha-camera.alpha),Math.cos(alpha-camera.alpha))*(1-Math.exp(-dt*7));
  const dir=outdoorCameraDirection(camera.alpha,camera.beta);const distance=cameraDistance(camera.target,dir,boom,walls);camera.radius=distance<camera.radius?distance:Math.min(distance,camera.radius+dt*3);
  if(checkMode==='overview'){camera.target.set(0,4,-46);camera.alpha=Math.PI/2-.35;camera.beta=1.2;camera.radius=62}
  if(checkMode==='facade'){camera.target.set(0,5.2,-40);camera.alpha=Math.PI/2;camera.beta=1.5;camera.radius=34}
  if(checkMode==='stadium'){camera.target.set(0,0,schoolTrack.z);camera.alpha=Math.PI/2+.2;camera.beta=.95;camera.radius=78}
  if(checkMode==='fence'){camera.target.set(30,1.2,schoolFence.front);camera.alpha=Math.PI/2-.55;camera.beta=1.42;camera.radius=9}
  if(checkMode==='entrance'){camera.target.set(0,3,-38);camera.alpha=Math.PI/2+.25;camera.beta=1.42;camera.radius=13}
  sun.position.copyFrom(lea.position.add(outdoorSunDirection.scale(80)));
  if(check)document.querySelector('#school-status')!.textContent=`Лея ${lea.position.x.toFixed(1)}, ${lea.position.z.toFixed(1)} · остановка ${nearBusStop()?'рядом':'далеко'} · мяч ${ball.mesh.position.x.toFixed(1)}, ${ball.mesh.position.z.toFixed(1)}, ударов ${ball.kicks}, голов ${ball.goals} · листьев в воздухе ${leaves.flying} · дождь ${rain.raining?Math.round(rain.level*100)+'%':'через '+rain.secondsToRain.toFixed(0)+' с'} · FPS ${engine.getFps().toFixed(0)}`;
  scene.render();
  locationAutosave.tick(dt);
 });
}
void start().catch(error=>{console.error(error);loading.querySelector('strong')!.textContent='Не удалось загрузить школу';loading.querySelector('span')!.innerHTML='<button class="primary" id="school-retry">Попробовать снова</button> <a href="/street.html">Вернуться на улицу</a>';document.querySelector('#school-retry')!.addEventListener('click',()=>location.reload())});
import.meta.hot?.dispose(()=>{controls.dispose();viewport.dispose();engine.dispose()});
