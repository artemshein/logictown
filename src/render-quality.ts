// Limit pixel work independently of CSS layout, including large Retina windows.
export function renderRatio(width:number,height:number,deviceRatio:number,quality=1){
 return Math.min(deviceRatio||1,1.25,Math.sqrt(2_000_000/Math.max(1,width*height)))*quality;
}

// Sustained slow frames lower resolution. Loading stalls and tab resumes are ignored.
// Quality only steps down during a session to avoid visible up/down oscillation.
export function createAdaptiveQuality(){
 let quality=1,total=0,count=0,warmup=120;
 return {sample(milliseconds:number):number|undefined{
  if(milliseconds<=0||milliseconds>100){total=0;count=0;return}
  if(warmup>0){warmup--;return}
  total+=milliseconds;count++;
  if(count<180)return;
  const average=total/count;total=0;count=0;
  if(average>24&&quality>.7){quality=Math.max(.7,Math.round((quality-.15)*100)/100);warmup=120;return quality}
 },get quality(){return quality}};
}
