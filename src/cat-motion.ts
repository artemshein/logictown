export type CatPoint={x:number;z:number};
export type CatNavigation={path:(from:CatPoint,to:CatPoint)=>CatPoint[];blocked:(x:number,z:number)=>boolean};
const distance=(a:CatPoint,b:CatPoint)=>Math.hypot(a.x-b.x,a.z-b.z);
/** A roaming animal; threat detection uses the dog's velocity towards the cat. */
export function createCatMotion(start:CatPoint,nav:CatNavigation,random= Math.random){
 const position={...start};let route:CatPoint[]=[],pause=3,replan=0,fear=0,lastDog:CatPoint|undefined,facing=0,fleeCount=0,closingSpeed=0,held=false,threat:CatPoint|undefined;
 const visible=(dog:CatPoint)=>{const n=Math.ceil(distance(dog,position)/.15);for(let i=1;i<n;i++)if(nav.blocked(dog.x+(position.x-dog.x)*i/n,dog.z+(position.z-dog.z)*i/n))return false;return true};
 function chooseRoute(dog:CatPoint,escape:boolean){
  let best:CatPoint[]=[],score=-Infinity;
  for(let i=0;i<12;i++){
   const angle=escape?Math.atan2(position.z-dog.z,position.x-dog.x)+(i===0?0:(random()-.5)*Math.PI):random()*Math.PI*2;
   const length=escape?6+random()*4:3+random()*7;
   const target={x:position.x+Math.cos(angle)*length,z:position.z+Math.sin(angle)*length};
   if(nav.blocked(target.x,target.z))continue;
   const candidate=nav.path(position,target),end=candidate.at(-1);if(!end||candidate.length>100)continue;
   if(escape&&candidate.slice(0,3).some(p=>distance(p,dog)<distance(position,dog)-.15))continue;
   const value=escape?distance(end,dog):length;
   if(value>score){score=value;best=candidate}if(!escape&&best.length)break;
  }
  route=best;replan=escape?.65:2;pause=best.length?0:1;
 }
 return {position,get closingSpeed(){return closingSpeed},get fleeCount(){return fleeCount},
 /** Keep still (e.g. while being watered), looking at `towards`. */
 hold(on:boolean,towards?:CatPoint){held=on;if(on){route=[];if(towards)facing=Math.atan2(towards.x-position.x,towards.z-position.z)}},
 /** Run away from a point that is not the dog, such as the player. */
 scare(from:CatPoint){held=false;threat={x:from.x,z:from.z};if(fear===0)fleeCount++;fear=3;route=[];replan=0},
 update(dt:number,dog:CatPoint){
  if(held){lastDog={x:dog.x,z:dog.z};return {state:'held',facing}}
  if(dt<=0)return {state: fear>0?'run':route.length?'walk':'idle',facing};
  const d=distance(position,dog);
  const closing=lastDog&&d>.001?((dog.x-lastDog.x)*(position.x-dog.x)+(dog.z-lastDog.z)*(position.z-dog.z))/(dt*d):0;
  closingSpeed=closing;lastDog={x:dog.x,z:dog.z};fear=Math.max(0,fear-dt);replan-=dt;pause-=dt;
  if(d<4.5&&closing>1.8&&visible(dog)){if(fear===0){fleeCount++;route=[];replan=0}fear=2.5}
  if(fear===0)threat=undefined;
  const escaping=fear>0;
  if(escaping&&replan<=0||!route.length&&pause<=0)chooseRoute(escaping&&threat?threat:dog,escaping);
  const before={...position};let budget=dt*(escaping?5: .85);
  while(route.length&&budget>0){const p=route[0],length=distance(p,position);if(length<.001){route.shift();continue}const step=Math.min(length,budget),x=position.x+(p.x-position.x)*step/length,z=position.z+(p.z-position.z)*step/length;
   if(nav.blocked(x,z)){route=[];pause=.5;break}position.x=x;position.z=z;budget-=step;if(step===length)route.shift();
  }
  const moved=distance(before,position)>.00001;if(moved)facing=Math.atan2(position.x-before.x,position.z-before.z);
  if(!route.length&&moved)pause=2+random()*4;
  return {state:moved?(escaping?'run':'walk'):'idle',facing};
 }};
}
