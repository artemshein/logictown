export function createDogCommandSound(enabled:()=>boolean,onPlayback:(count:number,playing:boolean)=>void){
 let audio:AudioContext|undefined,decoded:Promise<AudioBuffer>|undefined,disposed=false,count=0;
 const voices=new Map<AudioBufferSourceNode,GainNode>();
 const file=fetch('/audio/dog-bark.wav').then(response=>{if(!response.ok)throw new Error('Dog bark unavailable');return response.arrayBuffer();});
 // Keep a handled promise while loading before the first player gesture.
 void file.catch(()=>{});
 const unlock=()=>{if(disposed)return;audio??=new AudioContext();decoded??=file.then(bytes=>audio!.decodeAudioData(bytes));void decoded.catch(()=>{});void audio.resume().catch(()=>{});};
 window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});
 return {async play(){
  if(disposed||!enabled()||document.hidden)return;
  try{
   unlock();await audio!.resume();const buffer=await decoded!;
   if(disposed||!enabled()||document.hidden||audio!.state!=='running')return;
   const source=audio!.createBufferSource(),gain=audio!.createGain();source.buffer=buffer;source.loop=false;gain.gain.value=.3;source.connect(gain);gain.connect(audio!.destination);voices.set(source,gain);
   source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();onPlayback(count,voices.size>0);};
   source.start();onPlayback(++count,true);
  }catch(error){if(!disposed)console.warn('Dog command sound unavailable',error);}
 },dispose(){disposed=true;window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);for(const [source,gain] of voices){source.onended=null;source.stop();source.disconnect();gain.disconnect();}voices.clear();void audio?.close();}};
}
