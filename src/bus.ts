import {Color3,Color4,DirectionalLight,Engine,FxaaPostProcess,HemisphericLight,PointLight,Scene,ShadowGenerator,UniversalCamera,Vector3} from '@babylonjs/core';
import {buildOutdoorWorld} from './outdoor-world';
import {buildBusInterior,busInterior} from './bus-interior';
import {createBusEngineSound} from './bus-engine-sound';
import {outdoorBusRoute} from './outdoor-layout';
import {createOutdoorSky,outdoorSunDirection} from './outdoor-sky';
import {createViewportSync} from './viewport';
import './style.css';
export const busRideDuration=10;
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<canvas id="world" aria-label="Поездка на автобусе через город. Поворачивай голову перетаскиванием или стрелками."></canvas><div class="loading"><strong>Садимся в автобус…</strong><span>Маршрут 1 · Школа</span></div><div class="toast" role="status">Потяни экран или нажми стрелки, чтобы посмотреть в окно</div>';
const checkMode=import.meta.env.DEV?new URLSearchParams(location.search).get('check'):null,check=!!checkMode;
// In checks, `at` freezes the ride at a moment for screenshots.
const frozenAt=check?Number(new URLSearchParams(location.search).get('at')??NaN):NaN;
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,loading=document.querySelector<HTMLElement>('.loading')!,hint=document.querySelector<HTMLElement>('.toast')!;
const engine=new Engine(canvas,false,{stencil:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});engine.renderEvenInBackground=false;engine.maxFPS=60;
const scene=new Scene(engine);scene.clearColor=new Color4(.34,.69,.96,1);scene.fogMode=Scene.FOGMODE_NONE;
const sky=new HemisphericLight('clear blue sky',Vector3.Up(),scene);sky.intensity=.55;
const sun=new DirectionalLight('bright afternoon sun',outdoorSunDirection.scale(-1),scene);sun.intensity=1.65;sun.diffuse=new Color3(1,.96,.84);
sky.diffuse=sun.diffuse.clone();sky.groundColor=sun.diffuse.scale(.45);
const shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.0005;shadow.normalBias=.02;shadow.darkness=.22;
createOutdoorSky(scene);
const bus=buildBusInterior(scene);bus.root.position.set(outdoorBusRoute.from,0,outdoorBusRoute.z);
// The roof blocks daylight: the cabin gets its own soft fill and ceiling lamp instead.
sky.excludedMeshes.push(...bus.interior);sun.excludedMeshes.push(...bus.interior);
const cabinFill=new HemisphericLight('bus cabin fill',Vector3.Up(),scene);cabinFill.intensity=.72;cabinFill.diffuse=new Color3(1,.98,.94);cabinFill.groundColor=new Color3(.42,.42,.44);cabinFill.includedOnlyMeshes=bus.interior;
const cabinLamp=new PointLight('bus ceiling lamps',new Vector3(0,busInterior.ceiling-.3,0),scene);cabinLamp.parent=bus.root;cabinLamp.intensity=.45;cabinLamp.range=9;cabinLamp.diffuse=new Color3(1,.97,.9);cabinLamp.includedOnlyMeshes=bus.interior;
const sound=createBusEngineSound();
const camera=new UniversalCamera('bus passenger view',Vector3.Zero(),scene);camera.parent=bus.head;camera.inputs.clear();camera.minZ=.05;camera.maxZ=180;camera.fov=.95;new FxaaPostProcess('bus antialias',1,camera);
const viewport=createViewportSync(canvas,engine,aspect=>camera.fov=aspect<.8?1.2:.95);
// Head turning only: the passenger stays seated. Start glancing at the left window.
const look={yaw:-.85,pitch:.04};const limits={yaw:2.4,pitch:.55};
const clampLook=()=>{look.yaw=Math.max(-limits.yaw,Math.min(limits.yaw,look.yaw));look.pitch=Math.max(-limits.pitch,Math.min(limits.pitch,look.pitch))};
let dragging:number|undefined,lastX=0,lastY=0;const keys=new Set<string>();
canvas.addEventListener('pointerdown',e=>{dragging=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==dragging)return;const k=3/Math.max(canvas.clientWidth,320);look.yaw+=(e.clientX-lastX)*k;look.pitch+=(e.clientY-lastY)*k;lastX=e.clientX;lastY=e.clientY;clampLook()});
const release=(e:PointerEvent)=>{if(e.pointerId===dragging)dragging=undefined};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
const keyDown=(e:KeyboardEvent)=>{if(/^(Arrow(Left|Right|Up|Down)|Key[WASD])$/.test(e.code)){keys.add(e.code);e.preventDefault()}},keyUp=(e:KeyboardEvent)=>keys.delete(e.code);
window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
const ease=(u:number)=>u<=0?0:u>=1?1:(1-Math.cos(Math.PI*u))/2;
let time=0,arriving=false;
function arrive(){
 if(arriving)return;arriving=true;
 loading.querySelector('strong')!.textContent='Приехали!';loading.querySelector('span')!.textContent='Возвращаемся на остановку';loading.hidden=false;
 try{sessionStorage.setItem('logictown-return-bus','1')}catch{}
 setTimeout(()=>location.assign(check?'/street.html?check=bus-return':'/street.html'),700);
}
function place(t:number){
 const u=t/busRideDuration,span=outdoorBusRoute.to-outdoorBusRoute.from;
 bus.root.position.x=outdoorBusRoute.from+span*ease(u);
 // Gentle body roll from the road and a forward pitch while accelerating or braking.
 const accel=Math.PI*Math.PI/2*Math.cos(Math.PI*Math.min(1,Math.max(0,u)))*span/busRideDuration**2;
 bus.root.rotation.x=Math.sin(t*3.3)*.006+Math.sin(t*7.9)*.002;bus.root.rotation.z=accel*.004;
 bus.root.position.y=Math.abs(Math.sin(t*5.1))*.008;
}
async function start(){
 await buildOutdoorWorld(scene,shadow);
 place(0);await scene.whenReadyAsync();loading.hidden=true;
 await sound.unlock();if(!sound.running)hint.textContent='Потяни экран или нажми стрелки, чтобы посмотреть в окно. Нажми, чтобы включить звук.';
 hint.classList.add('visible');setTimeout(()=>hint.classList.remove('visible'),4500);
 if(check)Object.assign(window,{busCheck:{get time(){return time},get x(){return bus.root.position.x},look,skip(t:number){time=t}}});
 engine.runRenderLoop(()=>{
  viewport.update();const dt=Math.min(.05,engine.getDeltaTime()/1000);
  const turn=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),tilt=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
  if(turn||tilt){look.yaw+=turn*dt*1.6;look.pitch+=tilt*dt*1.1;clampLook()}
  camera.rotation.set(look.pitch,look.yaw,0);
  time=Number.isFinite(frozenAt)?frozenAt:time+dt;place(Math.min(time,busRideDuration));
  sun.position.copyFrom(bus.root.position.add(outdoorSunDirection.scale(80)));
  const u=Math.min(1,time/busRideDuration);sound.update(Math.sin(Math.PI*u),arriving?0:1);
  bus.setNextStop(time<.6?'1 · Школа':time<busRideDuration-1.2?'Следующая: Магазин':'Остановка «Магазин»');
  scene.render();
  if(!Number.isFinite(frozenAt)&&time>=busRideDuration)arrive();
 });
}
void start().catch(error=>{console.error(error);loading.querySelector('strong')!.textContent='Не удалось завести автобус';loading.querySelector('span')!.innerHTML='<a href="/street.html">Вернуться на улицу</a>'});
import.meta.hot?.dispose(()=>{sound.dispose();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);viewport.dispose();engine.dispose()});
