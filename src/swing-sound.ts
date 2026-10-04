/** Local hinge creak: full volume nearby, a smooth fade, silence beyond 12 m. */
export function swingAudibility(distance:number){
 const t=Math.max(0,Math.min(1,(distance-2)/10));return 1-t*t*(3-2*t);
}
export function createSwingSound(){
 let audio:AudioContext|undefined,voice:{noise:AudioBufferSourceNode,tone:OscillatorNode,filter:BiquadFilterNode,gain:GainNode}|undefined;
 let lastAngle=0,wasActive=false;
 const unlock=()=>{audio??=new AudioContext();void audio.resume().catch(()=>{})};
 window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});
 function stop(){if(voice){voice.noise.stop();voice.tone.stop();voice.noise.disconnect();voice.tone.disconnect();voice.filter.disconnect();voice.gain.disconnect();voice=undefined}}
 function start(){
  const ctx=audio!,buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),samples=buffer.getChannelData(0);
  // Friction noise plus an uneven metallic resonance, rather than a musical beep.
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(.55+.45*Math.sin(i/ctx.sampleRate*47)**2);
  const noise=ctx.createBufferSource(),tone=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  noise.buffer=buffer;noise.loop=true;tone.type='triangle';filter.type='bandpass';filter.Q.value=7;gain.gain.value=0;
  noise.connect(filter);tone.connect(filter);filter.connect(gain);gain.connect(ctx.destination);noise.start();tone.start();voice={noise,tone,filter,gain};
 }
 return {update(active:boolean,angle:number,dt:number,distance:number){
  const speed=active&&wasActive?Math.abs(angle-lastAngle)/Math.max(dt,.001):0;lastAngle=angle;wasActive=active;
  if(!active||document.hidden||!audio||audio.state!=='running'){stop();return}
  const audibility=swingAudibility(distance);if(!audibility){stop();return}if(!voice)start();
  const motion=Math.min(1,speed/.9),pitch=330+Math.abs(angle)*420+motion*110,t=audio.currentTime;
  voice!.filter.frequency.setTargetAtTime(pitch,t,.04);voice!.tone.frequency.setTargetAtTime(pitch*.49,t,.04);
  voice!.gain.gain.setTargetAtTime(audibility*motion*.055,t,.035);
 },dispose(){stop();window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);void audio?.close()}};
}
