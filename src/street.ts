import {ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,FxaaPostProcess,HemisphericLight,MeshBuilder,PointerEventTypes,Scene,ShadowGenerator,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';
import {buildOutdoorWorld} from './outdoor-world';
import {outdoorBlocked,outdoorPath,outdoorSpawn,outdoorCompanionTarget,outdoorObstacles} from './outdoor-layout';
import {loadLea} from './lea';
import {loadDog} from './dog';
import {createMovementControls} from './controls';
import {moveWithCollisions,nearInteraction} from './movement';
import {createViewportSync} from './viewport';
import {createAdaptiveQuality} from './render-quality';
import {createInteractionMarker} from './interaction-marker';
import {cameraDistance} from './camera-collision';
import './style.css';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<canvas id="world" aria-label="Двор Леи и солнечная улица. Управление: WASD или стрелки справа. Можно пройти через открытую калитку."></canvas><div class="loading"><strong>Выходим на улицу…</strong><span>Тихий город</span></div><button class="street-home" hidden>⌂ В дом</button><div class="toast" role="status"></div>';
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,loading=document.querySelector<HTMLElement>('.loading')!,homeButton=document.querySelector<HTMLButtonElement>('.street-home')!;
const engine=new Engine(canvas,false,{stencil:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});engine.renderEvenInBackground=false;engine.maxFPS=60;
const scene=new Scene(engine);scene.clearColor=new Color4(.34,.69,.96,1);scene.fogMode=Scene.FOGMODE_LINEAR;scene.fogStart=65;scene.fogEnd=145;scene.fogColor=new Color3(.34,.69,.96);
const camera=new ArcRotateCamera('street camera',-Math.PI/2,1.35,5.6,new Vector3(0,1.35,-6.3),scene);camera.minZ=.05;camera.maxZ=180;camera.fov=.9;new FxaaPostProcess('street antialias',1,camera);let boom=5.6;
const viewport=createViewportSync(canvas,engine,aspect=>{camera.fov=aspect<.8?1.05:.9;boom=aspect<.8?6.2:5.6});
const sky=new HemisphericLight('clear blue sky',Vector3.Up(),scene);sky.intensity=.95;sky.diffuse=new Color3(.83,.93,1);sky.groundColor=new Color3(.45,.52,.34);
const sun=new DirectionalLight('bright afternoon sun',new Vector3(-.6,-1,.4),scene);sun.intensity=1.65;sun.diffuse=new Color3(1,.96,.84);sun.position.set(12,24,-16);
const shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.002;shadow.normalBias=.02;shadow.darkness=.22;
const orb=MeshBuilder.CreateSphere('sun disc',{diameter:5,segments:16},scene);orb.position.set(65,90,-95);orb.isPickable=false;const sunMaterial=new StandardMaterial('sunlight',scene);sunMaterial.disableLighting=true;sunMaterial.emissiveColor=new Color3(1,1,.88);orb.material=sunMaterial;
const lea=new TransformNode('Lea outdoors',scene);lea.position.set(outdoorSpawn.x,.11,outdoorSpawn.z);const controls=createMovementControls(app),quality=createAdaptiveQuality();
let route:Vector3[]=[],transitioning=false;
function walkTo(p:Vector3){if(transitioning)return;route=outdoorPath(lea.position,p).map(p=>new Vector3(p.x,.11,p.z))}
const checkMode=import.meta.env.DEV?new URLSearchParams(location.search).get('check'):null;
const check=!!checkMode;
function returnHome(){if(transitioning||!nearInteraction(lea.position,new Vector3(0,.11,-5.8),2.2))return;transitioning=true;route=[];loading.querySelector('strong')!.textContent='Возвращаемся домой…';loading.hidden=false;try{sessionStorage.setItem('logictown-return-home','1')}catch{}requestAnimationFrame(()=>requestAnimationFrame(()=>location.assign(checkMode==='outdoor'?'/checks/outdoor.html':check?'/checks/house.html':'/')))}
homeButton.onclick=returnHome;
const pin=createInteractionMarker(scene,'Вернуться в дом','⌂',new Vector3(0,2,-4.3),returnHome);
const walls=outdoorObstacles.filter(o=>o.kind==='house'||o.kind==='fence'||o.kind==='gate').map(o=>({min:new Vector3(o.x-o.w/2,0,o.z-o.d/2),max:new Vector3(o.x+o.w/2,o.kind==='house'?7:1.2,o.z+o.d/2)}));
async function start(){
 const [world,character]=await Promise.all([buildOutdoorWorld(scene,shadow),loadLea(scene,lea,shadow)]);
 const dog=await loadDog(scene,lea,shadow,()=>false,{path:outdoorPath,blocked:outdoorBlocked,target:outdoorCompanionTarget});
 scene.environmentIntensity=.75;
 scene.onPointerObservable.add(info=>{if(info.type!==PointerEventTypes.POINTERTAP||transitioning)return;const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m.isEnabled()&&m.isVisible&&m.isPickable);if(hit?.pickedMesh?.metadata?.interaction){hit.pickedMesh.metadata.interaction();return}if(hit?.pickedPoint&&world.floors.includes(hit.pickedMesh as typeof world.floors[number]))walkTo(hit.pickedPoint)});
 if(check){const nav=document.createElement('nav');nav.className='street-check';for(const [label,x,z]of [['У калитки',0,-11],['На улице',20,-18],['Задний двор',0,9],['У дерева',5,3],['Перед домом',0,-6.3]] as const){const b=document.createElement('button');b.textContent=label;b.onclick=()=>walkTo(new Vector3(x,.11,z));nav.append(b)}const out=document.createElement('output');out.id='street-status';nav.append(out);app.append(nav)}
 await scene.whenReadyAsync();loading.hidden=true;
 engine.runRenderLoop(()=>{
  const q=quality.sample(engine.getDeltaTime());if(q!==undefined)viewport.setQuality(q);viewport.update();const dt=Math.min(.04,engine.getDeltaTime()/1000),input=controls.read(!transitioning);let moving=false;
  if(input.forward||input.turn){route=[];lea.rotation.y+=input.turn*dt*2.2;const p=moveWithCollisions(lea.position,lea.rotation.y,input.forward*dt*3.3,outdoorBlocked);moving=Math.hypot(p.x-lea.position.x,p.z-lea.position.z)>.0001;lea.position.x=p.x;lea.position.z=p.z}
  else if(route.length&&!transitioning){const delta=route[0].subtract(lea.position);delta.y=0;const dist=delta.length(),travel=Math.min(dist,dt*3.3);if(dist<.001)route.shift();else{const p={x:lea.position.x+delta.x*travel/dist,z:lea.position.z+delta.z*travel/dist};if(!outdoorBlocked(p.x,p.z)){lea.position.x=p.x;lea.position.z=p.z;moving=true;lea.rotation.y+=Math.atan2(Math.sin(Math.atan2(delta.x,delta.z)-lea.rotation.y),Math.cos(Math.atan2(delta.x,delta.z)-lea.rotation.y))*Math.min(1,dt*13);if(travel===dist)route.shift()}else route=[]}}
  character.play(moving?'Walk':'Idle');dog.update(dt,moving,[],false);
  const alpha=-Math.PI/2-lea.rotation.y;camera.alpha+=Math.atan2(Math.sin(alpha-camera.alpha),Math.cos(alpha-camera.alpha))*(1-Math.exp(-dt*7));camera.target.set(lea.position.x,1.35,lea.position.z);
  const dir=new Vector3(Math.cos(camera.alpha)*Math.sin(camera.beta),Math.cos(camera.beta),Math.sin(camera.alpha)*Math.sin(camera.beta));const distance=cameraDistance(camera.target,dir,boom,walls);camera.radius=distance<camera.radius?distance:Math.min(distance,camera.radius+dt*3);
  sun.position.set(lea.position.x+12,24,lea.position.z-16);const near=nearInteraction(lea.position,new Vector3(0,.11,-5.8),2.2)&&!transitioning;homeButton.hidden=!near;pin.mesh.setEnabled(near);
  if(check)document.querySelector('#street-status')!.textContent=`Лея ${lea.position.x.toFixed(1)}, ${lea.position.z.toFixed(1)} · щенок ${dog.sitting?'сидит':'идёт'} · расстояние ${Vector3.Distance(lea.position,dog.root.position).toFixed(1)} · FPS ${engine.getFps().toFixed(0)}`;
  scene.render();
 });
}
void start().catch(error=>{console.error(error);loading.querySelector('strong')!.textContent='Не удалось загрузить улицу';loading.querySelector('span')!.innerHTML='<button class="primary" id="street-retry">Попробовать снова</button> <a href="/">Вернуться в дом</a>';document.querySelector('#street-retry')!.addEventListener('click',()=>location.reload())});
import.meta.hot?.dispose(()=>{controls.dispose();viewport.dispose();engine.dispose()});
