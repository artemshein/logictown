import {EngineInstrumentation,type Scene,type Engine} from '@babylonjs/core';
export function startBenchmark(scene:Scene,engine:Engine,version:string){
 const instrument=new EngineInstrumentation(engine);instrument.captureGPUFrameTime=true;
 const experiment=new URLSearchParams(location.search).get('experiment')||'baseline';
 const start=performance.now(),intervals:number[]=[],cpu:number[]=[],gpu:number[]=[];let last=0,began=0;
 const panel=document.createElement('pre');panel.style.cssText='position:fixed;top:10px;left:10px;z-index:9999;background:white;color:black;padding:12px;font:14px monospace';document.body.append(panel);
 const before=scene.onBeforeRenderObservable.add(()=>{began=performance.now()});
 const after=scene.onAfterRenderObservable.add(()=>{
  const now=performance.now(),elapsed=now-start;
  panel.textContent=version+' / '+experiment+' '+Math.round(elapsed/1000)+'s';
  if(elapsed>15000&&last){intervals.push(now-last);cpu.push(now-began);const ns=instrument.gpuFrameTimeCounter.current;if(ns>0)gpu.push(ns/1e6)}last=now;
  if(elapsed<45000)return;
  scene.onBeforeRenderObservable.remove(before);scene.onAfterRenderObservable.remove(after);
  const mean=(a:number[])=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
  const sorted=[...intervals].sort((a,b)=>a-b);
  const result={version,experiment,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],buffer:[engine.getRenderWidth(),engine.getRenderHeight()],frames:intervals.length,fps:1000/(mean(intervals)||1),frameMs:mean(intervals),p95Ms:sorted[Math.floor(sorted.length*.95)],cpuRenderMs:mean(cpu),gpuMs:mean(gpu),gpuSamples:gpu.length,meshes:scene.meshes.length};
  panel.textContent=JSON.stringify(result,null,2);instrument.dispose();void fetch('/benchmark-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
 });
}
