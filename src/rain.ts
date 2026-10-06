import {Color3,Matrix,MeshBuilder,Quaternion,StandardMaterial,Vector3,type DirectionalLight,type HemisphericLight,type Mesh,type Scene} from '@babylonjs/core';
// One shared weather clock for every outdoor location: a shower roughly every three minutes.
const weatherKey='logictown-weather-v1',showerLength=30,ramp=3;
const random=(min:number,max:number)=>min+Math.random()*(max-min);
type Clock={get():number;set(next:number):void};
function weatherClock(persist:boolean):Clock{
 let local=0;
 return {
  get(){if(!persist)return local;try{return Number(localStorage.getItem(weatherKey))||0}catch{return local}},
  set(next){local=next;if(persist)try{localStorage.setItem(weatherKey,String(next))}catch{}},
 };
}
/** Showers: the next start time; intensity ramps in and out over a few seconds. */
export function rainIntensity(now:number,next:number){const t=(now-next)/1000;return t<0||t>showerLength?0:Math.min(1,t/ramp,(showerLength-t)/ramp)}
// Soft hiss of rain: looped noise whose volume follows the shower. Starts after a gesture.
function createRainSound(){
 let audio:AudioContext|undefined,gain:GainNode|undefined,disposed=false;
 function unlock(){
  if(disposed||gain)return;
  try{
   audio??=new AudioContext();void audio.resume().catch(()=>{});
   const ctx=audio,buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),samples=buffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(Math.random()<.002?3:1);
   const source=ctx.createBufferSource(),high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter();gain=ctx.createGain();gain.gain.value=0;
   source.buffer=buffer;source.loop=true;high.type='highpass';high.frequency.value=700;low.type='lowpass';low.frequency.value=5200;
   source.connect(high);high.connect(low);low.connect(gain);gain.connect(ctx.destination);source.start();
  }catch{/* Audio is optional. */}
 }
 window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});
 return {
  update(level:number){if(audio&&gain)gain.gain.setTargetAtTime(document.hidden?0:level*.16,audio.currentTime,.4)},
  dispose(){disposed=true;window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);void audio?.close()},
 };
}
/** Falling rain streaks around the player, dimmer daylight and a hiss while it pours. */
export function createRain(scene:Scene,lights:{sun:DirectionalLight;sky:HemisphericLight;dome:Mesh},onChange?:(raining:boolean)=>void,options:{force?:boolean;persist?:boolean}={}){
 const clock=weatherClock(options.persist??true),max=2600,radius=12,height=10,speed=9.5,wind=new Vector3(1.3,0,.5);
 let next=clock.get();const now=Date.now();
 if(options.force)next=now+1500;
 else if(!next||now>next+showerLength*1000)next=now+random(.4,1)*180*1000;
 clock.set(next);
 const streak=MeshBuilder.CreateBox('rain streaks',{width:.012,height:.42,depth:.012},scene);
 const mat=new StandardMaterial('rain streak',scene);mat.disableLighting=true;mat.emissiveColor=new Color3(.78,.84,.92);mat.alpha=.32;streak.material=mat;streak.isPickable=false;streak.alwaysSelectAsActiveMesh=true;
 // Every streak shares the wind tilt; only its translation changes per frame.
 const dir=new Vector3(wind.x,speed,wind.z).normalize(),axis=Vector3.Cross(Vector3.Up(),dir),tilt=axis.length()>1e-6?Quaternion.RotationAxis(axis.normalize(),Math.acos(Vector3.Dot(Vector3.Up(),dir))):Quaternion.Identity();
 const base=Matrix.Compose(Vector3.One(),tilt,Vector3.Zero()),matrices=new Float32Array(max*16),drops=new Float32Array(max*3);
 for(let i=0;i<max;i++){base.copyToArray(matrices,i*16);drops.set([random(-radius,radius),random(0,height),random(-radius,radius)],i*3)}
 streak.thinInstanceSetBuffer('matrix',matrices,16,false);streak.thinInstanceCount=0;
 const sound=createRainSound(),domeMaterial=lights.dome.material as StandardMaterial|null;
 const baseSun=lights.sun.intensity,baseSky=lights.sky.intensity;let raining=false,level=0;
 const wrap=(d:number)=>((d+radius)%(2*radius)+2*radius)%(2*radius)-radius;
 function update(dt:number,center:Vector3){
  const t=Date.now();
  if(t>next+showerLength*1000){next=next+showerLength*1000+random(150,210)*1000;if(t>next)next=t+random(150,210)*1000;clock.set(next)}
  else if(!options.force){const shared=clock.get();if(shared&&shared!==next)next=shared}
  level=rainIntensity(t,next);
  if(level>0!==raining){raining=level>0;onChange?.(raining)}
  lights.sun.intensity=baseSun*(1-.6*level);lights.sky.intensity=baseSky*(1-.25*level);
  if(domeMaterial?.emissiveTexture)domeMaterial.emissiveTexture.level=1-.4*level;
  sound.update(level);
  const count=Math.round(max*level);streak.thinInstanceCount=count;if(!count)return;
  for(let i=0;i<count;i++){
   const k=i*3;let x=drops[k]+wind.x*dt,y=drops[k+1]-speed*dt,z=drops[k+2]+wind.z*dt;
   // Keep streaks in a column around the player; landed ones start again from the top.
   if(y<0){y+=height;x=center.x+random(-radius,radius);z=center.z+random(-radius,radius)}
   x=center.x+wrap(x-center.x);z=center.z+wrap(z-center.z);
   drops[k]=x;drops[k+1]=y;drops[k+2]=z;matrices[i*16+12]=x;matrices[i*16+13]=y;matrices[i*16+14]=z;
  }
  streak.thinInstanceBufferUpdated('matrix');
 }
 return {update,get level(){return level},get raining(){return raining},get secondsToRain(){return Math.max(0,(next-Date.now())/1000)},dispose(){sound.dispose();streak.dispose();mat.dispose()}};
}
