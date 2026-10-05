export const catHissDuration=1.1;
/** An angry cat hiss: a sharp spit followed by a breathy, wavering noise. */
export function createCatHissSound(){
 let ctx:AudioContext|undefined,count=0;
 async function play(){
  try{
   ctx??=new AudioContext();await ctx.resume();
   const t=ctx.currentTime+.02,length=Math.ceil(ctx.sampleRate*catHissDuration),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
   const source=ctx.createBufferSource(),high=ctx.createBiquadFilter(),peak=ctx.createBiquadFilter(),gain=ctx.createGain(),flutter=ctx.createOscillator(),depth=ctx.createGain();
   source.buffer=buffer;high.type='highpass';high.frequency.value=1700;peak.type='peaking';peak.frequency.value=4300;peak.Q.value=1.2;peak.gain.value=9;
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.42,t+.012);gain.gain.exponentialRampToValueAtTime(.16,t+.09);
   gain.gain.linearRampToValueAtTime(.2,t+.3);gain.gain.linearRampToValueAtTime(.12,t+catHissDuration*.75);gain.gain.linearRampToValueAtTime(0,t+catHissDuration);
   // The throat trembles slightly while hissing.
   flutter.frequency.value=23;depth.gain.value=.05;flutter.connect(depth);depth.connect(gain.gain);
   source.connect(high);high.connect(peak);peak.connect(gain);gain.connect(ctx.destination);
   source.start(t);flutter.start(t);source.stop(t+catHissDuration);flutter.stop(t+catHissDuration);
   source.onended=()=>{source.disconnect();high.disconnect();peak.disconnect();gain.disconnect();flutter.disconnect();depth.disconnect()};
   count++;
  }catch(error){console.warn('Cat hiss unavailable',error)}
 }
 return {play,get count(){return count},dispose(){void ctx?.close()}};
}
