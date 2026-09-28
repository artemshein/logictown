export type Position2={x:number;z:number};
export function moveWithCollisions(position:Position2,heading:number,distance:number,blocked:(x:number,z:number)=>boolean){
 const steps=Math.max(1,Math.ceil(Math.abs(distance)/.06)),dx=Math.sin(heading)*distance/steps,dz=Math.cos(heading)*distance/steps;
 let {x,z}=position;
 for(let i=0;i<steps;i++){if(!blocked(x+dx,z+dz)){x+=dx;z+=dz}else if(!blocked(x+dx,z)){x+=dx}else if(!blocked(x,z+dz)){z+=dz}}
 return {x,z};
}
export function nearInteraction(player:Position2,approach:Position2,radius=1.5){return Math.hypot(player.x-approach.x,player.z-approach.z)<=radius}
