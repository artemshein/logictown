/** Soft, occasional outdoor gusts. Audio starts after a player gesture. */
export function createWindSound(diagnostics=false){
 let audio:AudioContext|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,gusts=0,nextAt=0;
 let voice:{source:AudioBufferSourceNode;low:BiquadFilterNode;high:BiquadFilterNode;gain:GainNode;meter?:AnalyserNode}|undefined;
 const meterSamples=new Float32Array(2048);
 const random=(min:number,max:number)=>min+Math.random()*(max-min);
 function clearTimer(){clearTimeout(timer);timer=undefined;nextAt=0;}
 function stop(){if(!voice)return;const old=voice;voice=undefined;old.source.onended=null;old.source.stop();old.source.disconnect();old.low.disconnect();old.high.disconnect();old.gain.disconnect();old.meter?.disconnect();}
 function schedule(first=false){
  clearTimer();if(disposed||document.hidden||audio?.state!=='running')return;
  const delay=first?random(20,40):random(60,120);nextAt=Date.now()+delay*1000;
  timer=setTimeout(()=>{timer=undefined;nextAt=0;play()},delay*1000);
 }
 function play(){
  if(disposed||document.hidden||audio?.state!=='running'||voice)return false;
  clearTimer();const ctx=audio,duration=random(6,10),buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
  // Combine differently smoothed noise layers for a rustling, low wind texture.
  let slow=0,medium=0;
  for(let i=0;i<samples.length;i++){const noise=Math.random()*2-1;slow=slow*.995+noise*.005;medium=medium*.94+noise*.06;samples[i]=slow*2+medium+noise*.08;}
  const source=ctx.createBufferSource(),low=ctx.createBiquadFilter(),high=ctx.createBiquadFilter(),gain=ctx.createGain(),t=ctx.currentTime,volume=random(.22,.32);
  source.buffer=buffer;high.type='highpass';high.frequency.value=70;low.type='lowpass';low.Q.value=.5;
  low.frequency.setValueAtTime(650,t);low.frequency.linearRampToValueAtTime(1500,t+duration*.45);low.frequency.linearRampToValueAtTime(500,t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume*.5,t+duration*.2);gain.gain.linearRampToValueAtTime(volume,t+duration*.45);gain.gain.linearRampToValueAtTime(volume*.55,t+duration*.65);gain.gain.linearRampToValueAtTime(0,t+duration);
  const meter=diagnostics?ctx.createAnalyser():undefined;
  source.connect(high);high.connect(low);low.connect(gain);if(meter){gain.connect(meter);meter.connect(ctx.destination);}else gain.connect(ctx.destination);voice={source,low,high,gain,meter};gusts++;
  source.onended=()=>{if(voice?.source===source){voice=undefined;source.disconnect();high.disconnect();low.disconnect();gain.disconnect();meter?.disconnect();schedule();}};
  source.start();return true;
 }
 async function unlock(){
  if(disposed||document.hidden)return;
  try{audio??=new AudioContext();await audio.resume();if(!disposed&&!voice&&!timer)schedule(true);}catch{}
 }
 const visibility=()=>{if(document.hidden){clearTimer();stop();void audio?.suspend().catch(()=>{});}else if(audio)void unlock();};
 window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});document.addEventListener('visibilitychange',visibility);
 function status(){let level=0;if(voice?.meter){voice.meter.getFloatTimeDomainData(meterSamples);level=Math.sqrt(meterSamples.reduce((sum,x)=>sum+x*x,0)/meterSamples.length);}return !audio?'Ветер: ожидает первого нажатия':voice?`Ветер: порыв №${gusts}, звук ${audio.state} · уровень ${level.toFixed(4)}`:`Ветер: пауза ${Math.max(0,Math.ceil((nextAt-Date.now())/1000))} с · порывов ${gusts}`;}
 return {preview:async()=>{await unlock();return play();},status,dispose(){disposed=true;clearTimer();stop();window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',visibility);void audio?.close();}};
}
