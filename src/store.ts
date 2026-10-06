import {ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,FxaaPostProcess,HemisphericLight,PointerEventTypes,Scene,ShadowGenerator,TransformNode,Vector3} from '@babylonjs/core';
import {buildStore,storeBlocked,storeExit,storeFixtures,storePath,cashierPosition} from './store-world';
import {installShopping,shoppingZone} from './store-shopping';
import {loadLea} from './lea';
import {installLeaCommands} from './lea-commands';
import {loadStoreCashier} from './store-cashier';
import {createMovementControls} from './controls';
import {createViewportSync} from './viewport';
import {moveWithCollisions,nearInteraction} from './movement';
import {cameraDistance} from './camera-collision';
import {outdoorCameraDirection} from './outdoor-camera';
import {createInteractionMarker} from './interaction-marker';
import {installLocationAutosave,savePlayerLocation} from './player-location';
import './style.css';
import './store-shopping.css';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<canvas id="world" aria-label="Продуктовый магазин. Движение: WASD, стрелки или нажатие на пол."></canvas><div class="loading"><strong>Заходим в магазин…</strong></div><button class="street-swing" id="store-exit" hidden>Выйти на улицу</button>';
const checkMode=import.meta.env.DEV?new URLSearchParams(location.search).get('check'):null,check=!!checkMode;
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,loading=document.querySelector<HTMLElement>('.loading')!,exitButton=document.querySelector<HTMLButtonElement>('#store-exit')!;
const engine=new Engine(canvas,false,{stencil:true,powerPreference:'high-performance'});engine.maxFPS=60;engine.renderEvenInBackground=false;
const scene=new Scene(engine);scene.clearColor=new Color4(.92,.88,.79,1);
const camera=new ArcRotateCamera('shop camera',-Math.PI/2,1.3,3.5,new Vector3(0,1.1,-3.4),scene);camera.minZ=.05;camera.maxZ=45;camera.fov=.95;new FxaaPostProcess('shop antialias',1,camera);
const viewport=createViewportSync(canvas,engine,aspect=>camera.fov=aspect<.8?1.12:.95);
const ambient=new HemisphericLight('warm shop ceiling light',Vector3.Up(),scene);ambient.intensity=1.15;ambient.diffuse=Color3.FromHexString('#fff5e6');ambient.groundColor=new Color3(.65,.59,.5);
const sun=new DirectionalLight('shop daylight',new Vector3(-.5,-1,-.4),scene);sun.position.set(2,7,3);sun.intensity=.7;sun.diffuse=Color3.FromHexString('#fff1d9');
const shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.darkness=.3;shadow.bias=.001;shadow.normalBias=.025;
const lea=new TransformNode('Lea shopping',scene);lea.position.set(0,.08,-2.5);
const controls=createMovementControls(app);let transitioning=false,route:Vector3[]=[];
const shopping=installShopping(app,open=>{controls.clear();controls.read(!open&&!transitioning);route=[]});
if(checkMode==='shopping-shelf')lea.position.set(2.5,.08,-.55);
if(checkMode==='shopping-fridge')lea.position.set(4,.08,-2.6);
if(checkMode==='shopping-checkout')lea.position.set(-2.85,.08,-3.3);
if(checkMode?.startsWith('shopping-')){
 const nav=document.createElement('nav');nav.className='shopping-check-nav';nav.setAttribute('aria-label','Проверка магазина');
 for(const [label,x,z] of [['Полка',2.5,-.55],['Холодильник',4,-2.6],['Касса',-2.85,-3.3],['Проход',0,-2.5]] as const){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{if(shopping.isOpen)return;controls.clear();route=[];lea.position.set(x,.08,z)};nav.append(button)}app.append(nav);
}
const locationSaver=installLocationAutosave(()=>({version:2,area:'store'}),()=>!check&&!transitioning);
function leave(){if(transitioning||shopping.isOpen||!nearInteraction(lea.position,storeExit,1.8))return;transitioning=true;controls.clear();if(!check)savePlayerLocation({version:2,area:'street'});try{sessionStorage.setItem('logictown-return-store','1')}catch{}location.assign(check?'/street.html?check=store':'/street.html')}
exitButton.onclick=leave;
const exitMarker=createInteractionMarker(scene,'Выйти на улицу','↪',new Vector3(0,1.7,-4.85),leave);
const walls=[...storeFixtures.map(o=>({min:new Vector3(o.x-o.w/2,0,o.z-o.d/2),max:new Vector3(o.x+o.w/2,o.h,o.z+o.d/2)})),{min:new Vector3(-6.1,0,-5.1),max:new Vector3(-5.9,3.8,5.1)},{min:new Vector3(5.9,0,-5.1),max:new Vector3(6.1,3.8,5.1)},{min:new Vector3(-6.1,0,4.9),max:new Vector3(6.1,3.8,5.1)},{min:new Vector3(-6.1,0,-5.1),max:new Vector3(6.1,3.8,-4.9)}];
async function start(){
 const [world,character,cashier]=await Promise.all([buildStore(scene,shadow),loadLea(scene,lea,shadow),loadStoreCashier(scene,shadow)]);scene.environmentIntensity=.4;
 const leaCommands=installLeaCommands(app,character);scene.onDisposeObservable.add(()=>leaCommands.dispose());
 scene.onPointerObservable.add(info=>{if(info.type!==PointerEventTypes.POINTERTAP||transitioning||shopping.isOpen)return;const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m===world.floor||!!m.metadata?.interaction);if(hit?.pickedMesh?.metadata?.interaction){hit.pickedMesh.metadata.interaction();return}if(hit?.pickedPoint)route=storePath(lea.position,hit.pickedPoint).map(p=>new Vector3(p.x,.08,p.z))});
 await scene.whenReadyAsync();loading.hidden=true;locationSaver.flush();
 engine.runRenderLoop(()=>{
  viewport.update();const dt=Math.min(.04,engine.getDeltaTime()/1000),input=controls.read(!transitioning&&!shopping.isOpen);let moving=false;
  if(input.forward||input.turn){route=[];lea.rotation.y+=input.turn*dt*2.2;const p=moveWithCollisions(lea.position,lea.rotation.y,input.forward*dt*(input.run?4.6:2.7),storeBlocked);moving=Math.hypot(p.x-lea.position.x,p.z-lea.position.z)>.001;lea.position.x=p.x;lea.position.z=p.z}
  else if(!shopping.isOpen&&route.length){const delta=route[0].subtract(lea.position),dist=delta.length(),travel=Math.min(dist,dt*2.7);if(dist<.02)route.shift();else{const x=lea.position.x+delta.x*travel/dist,z=lea.position.z+delta.z*travel/dist;if(!storeBlocked(x,z)){lea.position.x=x;lea.position.z=z;moving=true;lea.rotation.y+=Math.atan2(Math.sin(Math.atan2(delta.x,delta.z)-lea.rotation.y),Math.cos(Math.atan2(delta.x,delta.z)-lea.rotation.y))*Math.min(1,dt*13)}else route=[]}}
  character.play(moving?(input.run&&(input.forward||input.turn)?'Run':'Walk'):'Idle');camera.target.set(lea.position.x,1.15,lea.position.z);camera.alpha=-Math.PI/2-lea.rotation.y;camera.radius=cameraDistance(camera.target,outdoorCameraDirection(camera.alpha,camera.beta),3.5,walls);
  if(checkMode==='overview'){camera.target.set(0,1.3,.5);camera.alpha=-Math.PI/2-.38;camera.beta=1.3;camera.radius=6.2}
  if(checkMode==='fixtures'){camera.target.set(-4,1.25,2.8);camera.alpha=-Math.PI/2+.5;camera.beta=1.3;camera.radius=4.5}
  if(checkMode==='fridge'){camera.target.set(5,1.25,-2.6);camera.alpha=Math.PI;camera.beta=1.3;camera.radius=3.3}
  if(checkMode==='products'){camera.target.set(2.5,1.05,.8);camera.alpha=-Math.PI/2+.35;camera.beta=1.3;camera.radius=2.8}
  if(checkMode==='prices'){camera.target.set(-2.8,1.2,4.45);camera.alpha=-Math.PI/2;camera.beta=1.35;camera.radius=2.5}
  if(checkMode==='cashier'){camera.target.set(-2.85,1.35,-1.05);camera.alpha=-Math.PI/2;camera.beta=1.4;camera.radius=2.5}
  if(checkMode==='cashier-side'){camera.target.set(-2.85,1.05,-1.05);camera.alpha=-.7;camera.beta=1.3;camera.radius=2.8}
  if(checkMode==='cashier-back'){camera.target.set(-2.85,1.05,-1.05);camera.alpha=Math.PI/2;camera.beta=1.3;camera.radius=2.4}
  shopping.update(shoppingZone(lea.position,storeFixtures,cashierPosition));leaCommands.update(!transitioning&&!shopping.isOpen);const nearExit=!transitioning&&!shopping.isOpen&&nearInteraction(lea.position,storeExit,1.8);exitButton.hidden=!nearExit;exitMarker.mesh.setEnabled(nearExit);scene.render();locationSaver.tick(dt);
  if(check){canvas.dataset.cashierFrame=String(cashier.idle?.animatables[0]?.masterFrame??-1);canvas.dataset.cashierHead=cashier.head?.rotationQuaternion?.asArray().join(',')??''}
 });
}
void start().catch(error=>{console.error(error);loading.textContent='Не удалось загрузить магазин. Обновите страницу.'});
import.meta.hot?.dispose(()=>{shopping.dispose();locationSaver.dispose();controls.dispose();viewport.dispose();engine.dispose()});
