/** A synthesized diesel rumble whose pitch follows the bus speed, plus tyre noise. */
export function createBusEngineSound(){
 let ctx:AudioContext|undefined,disposed=false;
 let voice:{master:GainNode;engine:OscillatorNode[];firing:OscillatorNode;road:GainNode;roadFilter:BiquadFilterNode;source:AudioBufferSourceNode}|undefined;
 function build(audio:AudioContext){
  const master=audio.createGain();master.gain.value=0;master.connect(audio.destination);
  // Two detuned saw waves through a low-pass give a throaty idle; an LFO pulses it like cylinders firing.
  const low=audio.createBiquadFilter();low.type='lowpass';low.frequency.value=320;low.Q.value=.8;low.connect(master);
  const body=audio.createGain();body.gain.value=.55;body.connect(low);
  const engine=[0,7].map(cents=>{const o=audio.createOscillator();o.type='sawtooth';o.frequency.value=38;o.detune.value=cents;o.connect(body);o.start();return o});
  const firing=audio.createOscillator(),depth=audio.createGain();firing.frequency.value=19;depth.gain.value=.3;firing.connect(depth);depth.connect(body.gain);firing.start();
  const length=audio.sampleRate*2,buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);let brown=0;
  for(let i=0;i<length;i++){brown=(brown+.02*(Math.random()*2-1))/1.02;data[i]=brown*3.2}
  const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;
  const roadFilter=audio.createBiquadFilter();roadFilter.type='lowpass';roadFilter.frequency.value=300;const road=audio.createGain();road.gain.value=0;
  source.connect(roadFilter);roadFilter.connect(road);road.connect(master);source.start();
  return {master,engine,firing,road,roadFilter,source};
 }
 async function unlock(){
  if(disposed)return;
  try{ctx??=new AudioContext();if(ctx.state!=='running')await ctx.resume();if(ctx.state==='running'&&!voice)voice=build(ctx)}catch{}
 }
 window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});
 return {
  unlock,
  get running(){return !!voice&&ctx?.state==='running'},
  /** speed: 0 at rest … 1 at top speed; level fades the whole sound. */
  update(speed:number,level=1){
   if(!voice||!ctx)return;const t=ctx.currentTime,s=Math.max(0,Math.min(1,speed));
   const freq=36+s*46;voice.engine.forEach(o=>o.frequency.setTargetAtTime(freq,t,.12));voice.firing.frequency.setTargetAtTime(freq/2,t,.12);
   voice.road.gain.setTargetAtTime(s*.55,t,.2);voice.roadFilter.frequency.setTargetAtTime(250+s*650,t,.2);
   voice.master.gain.setTargetAtTime(.16*Math.max(0,Math.min(1,level))*(.75+s*.25),t,.15);
  },
  dispose(){disposed=true;window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);void ctx?.close()},
 };
}
