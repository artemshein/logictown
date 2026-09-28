import type {Engine} from '@babylonjs/core';

// Safari can settle CSS viewport dimensions after its window.resize event.
// Observe the actual canvas and also sync before rendering, never CSS-stretch an old buffer.
export function createViewportSync(canvas:HTMLCanvasElement,engine:Engine,onResize?:(aspect:number)=>void){
 let width=0,height=0,ratio=0,frame=0;
 function update(){
  const nextWidth=canvas.clientWidth,nextHeight=canvas.clientHeight,nextRatio=Math.min(window.devicePixelRatio||1,1.5);
  if(nextWidth<=0||nextHeight<=0)return;
  if(nextWidth===width&&nextHeight===height&&nextRatio===ratio)return;
  width=nextWidth;height=nextHeight;ratio=nextRatio;
  engine.setHardwareScalingLevel(1/ratio);
  engine.setSize(Math.round(width*ratio),Math.round(height*ratio));
  onResize?.(engine.getRenderWidth()/engine.getRenderHeight());
 }
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)};
 const observer=new ResizeObserver(schedule);observer.observe(canvas);
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
 window.screen.orientation?.addEventListener('change',schedule);
 update();
 return {update,dispose:()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.screen.orientation?.removeEventListener('change',schedule)}};
}
