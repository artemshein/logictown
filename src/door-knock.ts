import type {TransformNode} from '@babylonjs/core';
type Door={x:number;z:number;facing:number};
const KNOCKS=[0,.24,.48,1.05,1.29];
/** Knuckles on a wooden door: a low body thump with a short bright tap. */
function knock(ctx:AudioContext,at:number,volume:number){
 const length=Math.ceil(ctx.sampleRate*.12),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.012));
 const noise=ctx.createBufferSource(),band=ctx.createBiquadFilter(),tap=ctx.createGain();
 noise.buffer=buffer;band.type='bandpass';band.frequency.value=900+Math.random()*250;band.Q.value=1.4;tap.gain.value=volume*.7;
 noise.connect(band);band.connect(tap);tap.connect(ctx.destination);noise.start(at);
 const body=ctx.createOscillator(),thump=ctx.createGain();body.type='sine';
 body.frequency.setValueAtTime(190+Math.random()*20,at);body.frequency.exponentialRampToValueAtTime(95,at+.09);
 thump.gain.setValueAtTime(0,at);thump.gain.linearRampToValueAtTime(volume,at+.004);thump.gain.exponentialRampToValueAtTime(.001,at+.14);
 body.connect(thump);thump.connect(ctx.destination);body.start(at);body.stop(at+.16);
 body.onended=()=>{noise.disconnect();band.disconnect();tap.disconnect();body.disconnect();thump.disconnect()};
}
/** A "knock" action at every neighbour's front door. */
export function createDoorKnocks(doors:Door[],lea:TransformNode){
 let audio:AudioContext|undefined,until=0,count=0;
 const button=document.createElement('button');button.className='street-swing';button.textContent='Постучать в дверь';button.hidden=true;document.querySelector('#app')!.append(button);
 const nearDoor=()=>doors.find(d=>Math.hypot(lea.position.x-d.x,lea.position.z-d.z)<2.2);
 async function play(){
  const door=nearDoor();if(!door||performance.now()<until)return false;
  lea.rotation.y=door.facing<0?0:Math.PI;
  until=performance.now()+(KNOCKS.at(-1)!+.35)*1000;count++;
  try{audio??=new AudioContext();await audio.resume();const t=audio.currentTime+.03;KNOCKS.forEach((k,i)=>knock(audio!,t+k,i%3===2?.45:.55))}catch(error){console.warn('Door knock sound unavailable',error)}
  return true;
 }
 button.onclick=()=>{void play()};
 return {play,get knocking(){return performance.now()<until},get count(){return count},update(active:boolean){button.hidden=!active||!nearDoor()||performance.now()<until},dispose(){button.remove();void audio?.close()}};
}
