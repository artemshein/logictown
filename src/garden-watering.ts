import {Color3,Color4,DynamicTexture,Mesh,MeshBuilder,ParticleSystem,StandardMaterial,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import type {loadLea} from './lea';
type Bed={x:number;z:number;w:number;d:number};
type Lea=Awaited<ReturnType<typeof loadLea>>;
export const wateringDuration=5;
const CAN_KEY='logictown-watering-can';
const material=(scene:Scene,name:string,color:Color3,specular=.05)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.specularColor=new Color3(specular,specular,specular);return m};
const ease=(t:number)=>t<=0?0:t>=1?1:t*t*(3-2*t);

/** Soil beds with stone edging and a mix of small flowering plants. */
function buildFlowerBeds(scene:Scene,shadow:ShadowGenerator,beds:Bed[]){
 const soil=material(scene,'flower bed soil',new Color3(.36,.24,.16)),stone=material(scene,'flower bed edging',new Color3(.66,.63,.57)),stem=material(scene,'flower stem',new Color3(.27,.5,.2)),heart=material(scene,'flower heart',new Color3(.98,.8,.22));
 const petals=[new Color3(.92,.24,.3),new Color3(.98,.6,.75),new Color3(.97,.95,.9),new Color3(.62,.42,.86),new Color3(.98,.72,.2)].map((c,i)=>material(scene,'flower petals '+i,c));
 const parts=new Map<StandardMaterial,Mesh[]>(),add=(m:Mesh,mat:StandardMaterial)=>{parts.set(mat,[...parts.get(mat)??[],m])};
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(const [b_,bed] of beds.entries()){
  const box=MeshBuilder.CreateBox('flower bed soil '+b_,{width:bed.w,height:.12,depth:bed.d},scene);box.position.set(bed.x,.06,bed.z);add(box,soil);
  for(const [w,d,x,z] of [[bed.w+.16,.08,0,bed.d/2+.04],[bed.w+.16,.08,0,-bed.d/2-.04],[.08,bed.d,bed.w/2+.04,0],[.08,bed.d,-bed.w/2-.04,0]]){const e=MeshBuilder.CreateBox('flower bed edge',{width:w,height:.16,depth:d},scene);e.position.set(bed.x+x,.08,bed.z+z);add(e,stone)}
  const cols=9,rows=2;
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
   const x=bed.x+(c+.5-cols/2)*bed.w/cols+(rnd()-.5)*.12,z=bed.z+(r+.5-rows/2)*bed.d/rows+(rnd()-.5)*.1,h=.28+rnd()*.2,petal=petals[Math.floor(rnd()*petals.length)];
   const s=MeshBuilder.CreateCylinder('flower stem',{height:h,diameter:.022,tessellation:5},scene);s.position.set(x,.12+h/2,z);add(s,stem);
   for(const side of [-1,1]){const leaf=MeshBuilder.CreateSphere('flower leaf',{diameter:.12,segments:4},scene);leaf.scaling.set(.35,.12,1);leaf.position.set(x+side*.025,.15+h*.35,z);leaf.rotation.y=rnd()*3;leaf.rotation.x=side*.5;add(leaf,stem)}
   const top=.12+h,tilt=rnd()*Math.PI*2;
   const centre=MeshBuilder.CreateSphere('flower heart',{diameter:.055,segments:5},scene);centre.position.set(x,top+.008,z);add(centre,heart);
   for(let p=0;p<5;p++){const a=tilt+p*Math.PI*2/5,leaf=MeshBuilder.CreateSphere('flower petal',{diameter:.09,segments:4},scene);leaf.scaling.set(.55,.18,1);leaf.position.set(x+Math.sin(a)*.046,top,z+Math.cos(a)*.046);leaf.rotation.y=a;add(leaf,petal)}
  }
 }
 const merged:Mesh[]=[];
 for(const [mat,meshes] of parts){const m=Mesh.MergeMeshes(meshes,true,true);if(!m)continue;m.name='flower beds '+mat.name;m.material=mat;m.isPickable=false;m.receiveShadows=true;shadow.addShadowCaster(m);merged.push(m)}
 const dry=soil.diffuseColor.clone(),wet=new Color3(.2,.13,.09);
 return {setWet(amount:number){Color3.LerpToRef(dry,wet,Math.max(0,Math.min(1,amount)),soil.diffuseColor)},dispose(){merged.forEach(m=>m.dispose());[soil,stone,stem,heart,...petals].forEach(m=>m.dispose())}};
}

/** A green watering can. The root sits at the handle grip, so it pivots in the hand. */
function buildWateringCan(scene:Scene,shadow:ShadowGenerator){
 const root=new TransformNode('watering can',scene),body=new TransformNode('watering can body',scene);body.parent=root;
 const grip=new Vector3(0,.29,-.02);body.position=grip.negate();
 const paint=material(scene,'watering can paint',new Color3(.24,.55,.42),.35),metal=material(scene,'watering can rose',new Color3(.7,.72,.7),.5);
 const tank=MeshBuilder.CreateCylinder('watering can tank',{height:.2,diameterTop:.17,diameterBottom:.2,tessellation:18},scene);tank.position.y=.1;tank.material=paint;
 const lid=MeshBuilder.CreateCylinder('watering can lid',{height:.012,diameter:.18,tessellation:18},scene);lid.position.y=.205;lid.material=metal;
 const base=new Vector3(0,.05,.09),tip=new Vector3(0,.24,.32),dir=tip.subtract(base);
 const spout=MeshBuilder.CreateCylinder('watering can spout',{height:dir.length(),diameterTop:.022,diameterBottom:.04,tessellation:10},scene);spout.position=base.add(dir.scale(.5));spout.rotation.x=Math.atan2(dir.z,dir.y);spout.material=paint;
 const rose=MeshBuilder.CreateCylinder('watering can rose',{height:.02,diameterTop:.06,diameterBottom:.03,tessellation:12},scene);rose.position=tip.clone();rose.rotation.x=spout.rotation.x;rose.material=metal;
 const arc=Array.from({length:13},(_,i)=>{const t=i/12*Math.PI;return new Vector3(0,.2+.09*Math.sin(t),-.02+.085*Math.cos(t))});
 const handle=MeshBuilder.CreateTube('watering can handle',{path:arc,radius:.012,tessellation:8},scene);handle.material=paint;
 const meshes=[tank,lid,spout,rose,handle];meshes.forEach(m=>{m.parent=body;m.receiveShadows=true;shadow.addShadowCaster(m)});
 const nozzle=new TransformNode('watering can nozzle',scene);nozzle.parent=body;nozzle.position=tip.add(dir.normalize().scale(.02));
 return {root,meshes,nozzle,direction(){return Vector3.TransformNormal(dir,body.getWorldMatrix()).normalize()},dispose(){root.dispose(false,true);paint.dispose();metal.dispose()}};
}

function buildWaterSpray(scene:Scene){
 const texture=new DynamicTexture('water drop',32,scene,false);texture.hasAlpha=true;
 const c=texture.getContext() as unknown as CanvasRenderingContext2D,g=c.createRadialGradient(16,16,1,16,16,15);g.addColorStop(0,'rgba(235,248,255,1)');g.addColorStop(1,'rgba(150,200,255,0)');c.fillStyle=g;c.fillRect(0,0,32,32);texture.update();
 const spray=new ParticleSystem('watering spray',400,scene);spray.particleTexture=texture;spray.emitter=Vector3.Zero();
 spray.minEmitBox=new Vector3(-.015,-.015,-.015);spray.maxEmitBox=new Vector3(.015,.015,.015);
 spray.color1=new Color4(.8,.92,1,.9);spray.color2=new Color4(.6,.8,1,.75);spray.colorDead=new Color4(.6,.8,1,0);
 spray.minSize=.024;spray.maxSize=.045;spray.minLifeTime=.35;spray.maxLifeTime=.6;spray.emitRate=380;spray.gravity=new Vector3(0,-9.8,0);
 spray.minEmitPower=1.1;spray.maxEmitPower=1.6;spray.blendMode=ParticleSystem.BLENDMODE_STANDARD;
 return {spray,dispose(){spray.dispose();texture.dispose()}};
}

/** Flower beds by the front door, a can to find, and a five-second watering. */
export function createGardenWatering(scene:Scene,shadow:ShadowGenerator,lea:TransformNode,character:Lea,beds:Bed[],canSpot:{x:number;z:number},say:(text:string)=>void){
 const flowers=buildFlowerBeds(scene,shadow,beds),can=buildWateringCan(scene,shadow),{spray,dispose:disposeSpray}=buildWaterSpray(scene);
 let carried=false;try{carried=localStorage.getItem(CAN_KEY)==='carried'}catch{}
 let pouring=false,watering=-1,bed:Bed|undefined,wet=0,waterings=0;const startHand=new Vector3();
 const groundPose=()=>{can.root.position.set(canSpot.x,.29,canSpot.z);can.root.rotation.set(0,.7,0)};
 if(!carried)groundPose();
 const pickupButton=button('Взять лейку'),waterButton=button('Полить цветы');
 function button(text:string){const b=document.createElement('button');b.className='street-swing';b.textContent=text;b.hidden=true;document.querySelector('#app')!.append(b);return b}
 const nearCan=()=>!carried&&Math.hypot(lea.position.x-canSpot.x,lea.position.z-canSpot.z)<1.7;
 const nearBed=()=>beds.find(b=>Math.hypot(Math.max(0,Math.abs(lea.position.x-b.x)-b.w/2),Math.max(0,Math.abs(lea.position.z-b.z)-b.d/2))<1.1);
 function pickUp(){if(!nearCan()||watering>=0)return false;carried=true;try{localStorage.setItem(CAN_KEY,'carried')}catch{}say('Лейка у тебя. Теперь можно полить цветы у дома.');return true}
 can.meshes.forEach(m=>{m.isPickable=true;m.metadata={interaction:()=>{if(!carried)pickUp()}}});
 function water(){
  if(watering>=0)return false;const target=nearBed();if(!target)return false;
  if(!carried){say('Найди лейку');return false}
  bed=target;watering=0;character.play('Idle');
  // Stand facing the nearest part of the bed.
  const fx=Math.max(target.x-target.w/2+.3,Math.min(target.x+target.w/2-.3,lea.position.x));lea.rotation.y=Math.atan2(fx-lea.position.x,target.z-lea.position.z);lea.computeWorldMatrix(true);
  startHand.copyFrom(character.palm('Right'));
  return true;
 }
 pickupButton.onclick=()=>{pickUp()};waterButton.onclick=()=>{water()};
 const heading=()=>lea.rotation.y,forward=()=>new Vector3(Math.sin(heading()),0,Math.cos(heading())),right=()=>new Vector3(Math.cos(heading()),0,-Math.sin(heading()));
 // The can hangs from the right hand when carried; while watering, the hand
 // follows the can along a raised, tilted pouring path.
 function carryPose(){const p=character.palm('Right').addInPlace(right().scale(.03));can.root.position.set(p.x,p.y-.02,p.z);can.root.rotation.set(0,heading(),0)}
 function pourPose(t:number){
  const lift=ease(t/.8)*(1-ease((t-(wateringDuration-.8))/.8)),sweep=Math.sin(Math.max(0,t-.8)*1.6)*.28*lift;
  const anchor=lea.position.add(forward().scale(.4)).add(right().scale(.22)).addInPlaceFromFloats(0,.8,0);
  // Start from the hanging hand, rise to the pour, then lower again.
  Vector3.LerpToRef(startHand,anchor,lift,can.root.position);
  can.root.rotation.set(.95*lift,heading()+sweep,0);
  character.reach('Right',can.root.position);
  return lift;
 }
 function update(dt:number,active:boolean){
  if(watering>=0){
   watering+=dt;const lift=pourPose(Math.min(watering,wateringDuration));
   can.root.computeWorldMatrix(true);
   if(lift>.85){if(!pouring){pouring=true;spray.start()}can.nozzle.computeWorldMatrix(true);(spray.emitter as Vector3).copyFrom(can.nozzle.getAbsolutePosition());const d=can.direction();spray.direction1=d.add(new Vector3(-.15,-.1,-.15));spray.direction2=d.add(new Vector3(.15,.1,.15));wet=Math.min(1,wet+dt*.4)}
   else if(pouring){pouring=false;spray.stop()}
   if(watering>=wateringDuration){watering=-1;bed=undefined;pouring=false;spray.stop();character.relax();waterings++;say('Цветы политы!')}
  }else{
   wet=Math.max(0,wet-dt/90);
   if(carried)carryPose();
  }
  flowers.setWet(wet);
  pickupButton.hidden=!active||!nearCan();
  waterButton.hidden=!active||watering>=0||!nearBed();
 }
 return {update,pickUp,water,get busy(){return watering>=0},get carried(){return carried},get wateringTime(){return Math.max(0,watering)},get waterings(){return waterings},get spraying(){return pouring},
  reset(){carried=false;try{localStorage.removeItem(CAN_KEY)}catch{}groundPose()},
  dispose(){flowers.dispose();can.dispose();disposeSpray();pickupButton.remove();waterButton.remove()}};
}
