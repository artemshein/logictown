import {Color3,DynamicTexture,MeshBuilder,Space,StandardMaterial,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import {schoolBlocked,schoolGoals,schoolPitch} from './school-layout';
export const ballRadius=.11;
const gravity=9.8,kickSpeed=10.5,kickLift=4.2,reach=1.3;
// Classic black-and-white panels, painted on the sphere's equirectangular UVs.
function ballMaterial(scene:Scene){
 const texture=new DynamicTexture('football panels',{width:512,height:256},scene,true),c=texture.getContext() as unknown as CanvasRenderingContext2D;
 c.fillStyle='#f7f7f4';c.fillRect(0,0,512,256);c.fillStyle='#1d1f22';
 c.fillRect(0,0,512,22);c.fillRect(0,234,512,22);
 const pentagon=(x:number,y:number,r:number)=>{for(const dx of [-512,0,512]){c.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;c.lineTo(x+dx+Math.cos(a)*r*1.6,y+Math.sin(a)*r)}c.fill()}};
 for(let i=0;i<5;i++){pentagon(i*102.4,86,24);pentagon(i*102.4+51.2,170,24)}
 c.strokeStyle='#9a9a96';c.lineWidth=2;for(let i=0;i<10;i++){c.beginPath();c.moveTo(i*51.2,22);c.lineTo(i*51.2+25.6,128);c.lineTo(i*51.2,234);c.stroke()}
 texture.update();
 const m=new StandardMaterial('football leather',scene);m.diffuseTexture=texture;m.specularColor=new Color3(.25,.25,.25);m.specularPower=24;
 return m;
}
// A soft leather thump, synthesised so no file has to load before the first kick.
function createKickSound(){
 let audio:AudioContext|undefined;
 return {play(strength=1){
  try{
   audio??=new AudioContext();void audio.resume();const t=audio.currentTime;
   const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(140,t);osc.frequency.exponentialRampToValueAtTime(48,t+.12);
   gain.gain.setValueAtTime(.55*strength,t);gain.gain.exponentialRampToValueAtTime(.001,t+.16);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.18);
  }catch{/* Audio is optional. */}
 },dispose(){void audio?.close()}};
}
/** A football on the centre spot: Lea dribbles it by walking into it and can kick it forward. */
export function createSchoolBall(scene:Scene,shadow:ShadowGenerator,onGoal:()=>void){
 const mesh=MeshBuilder.CreateSphere('football',{diameter:ballRadius*2,segments:16},scene);mesh.material=ballMaterial(scene);mesh.isPickable=false;mesh.receiveShadows=true;shadow.addShadowCaster(mesh);
 const start=new Vector3(schoolPitch.x,ballRadius,schoolPitch.z);mesh.position.copyFrom(start);
 const velocity=Vector3.Zero(),sound=createKickSound();let scored=false,kicks=0,goals=0;
 // Walls stop the ball below fence height; the open goal mouths let it into the net.
 const wall=(x:number,z:number,y:number)=>y<2.6&&schoolBlocked(x,z);
 function step(dt:number){
  const p=mesh.position;velocity.y-=gravity*dt;
  const nx=p.x+velocity.x*dt,nz=p.z+velocity.z*dt,inNet=schoolGoals.some(g=>(p.x-g.x)*g.side>0&&Math.abs(p.z-g.z)<g.w/2);
  const damp=inNet?.2:.45;
  if(wall(nx,p.z,p.y)){velocity.x*=-damp;velocity.z*=.8}else p.x=nx;
  if(wall(p.x,nz,p.y)){velocity.z*=-damp;velocity.x*=.8}else p.z=nz;
  p.y+=velocity.y*dt;
  if(p.y<ballRadius){p.y=ballRadius;velocity.y=velocity.y<-1.2?-velocity.y*.5:0}
  const grounded=p.y<=ballRadius+.001,speed=Math.hypot(velocity.x,velocity.z);
  if(grounded&&speed>0){const slowed=Math.max(0,speed-(.9+speed*.35)*dt);velocity.x*=slowed/speed;velocity.z*=slowed/speed}
  // Roll the panels with the travelled distance.
  const travelled=Math.hypot(velocity.x,velocity.z)*dt;
  if(travelled>1e-5){const axis=Vector3.Cross(Vector3.Up(),new Vector3(velocity.x,0,velocity.z)).normalize();mesh.rotate(axis,travelled/ballRadius,Space.WORLD)}
  if(!scored)for(const g of schoolGoals)if((p.x-g.x)*g.side>ballRadius&&Math.abs(p.z-g.z)<g.w/2-ballRadius&&p.y<g.h){scored=true;goals++;onGoal()}
 }
 return {
  mesh,get kicks(){return kicks},get goals(){return goals},get speed(){return velocity.length()},
  near(lea:Vector3){return Math.hypot(lea.x-mesh.position.x,lea.z-mesh.position.z)<reach&&mesh.position.y<.6},
  kick(heading:number){
   velocity.set(Math.sin(heading)*kickSpeed,kickLift,Math.cos(heading)*kickSpeed);scored=false;kicks++;sound.play();
  },
  update(dt:number,lea:Vector3,moving:boolean){
   // Walking into the ball nudges it ahead: a gentle dribble.
   const dx=mesh.position.x-lea.x,dz=mesh.position.z-lea.z,d=Math.hypot(dx,dz);
   if(moving&&d<.42&&d>1e-4&&mesh.position.y<.3){const push=Math.max(2.4,Math.hypot(velocity.x,velocity.z));velocity.x=dx/d*push;velocity.z=dz/d*push;scored=false}
   const n=Math.max(1,Math.ceil(velocity.length()*dt/.05));for(let i=0;i<n;i++)step(dt/n);
  },
  reset(){mesh.position.copyFrom(start);velocity.setAll(0);scored=false},
  dispose(){sound.dispose()},
 };
}
