import {layout,roomAt} from './layout';
import {puzzleFragments} from './puzzle-fragments';
import type {GroundPoint} from './dog-motion';
export function createDogHints(){
 const notified=new Set<number>();let count=0;
 return {notified,get count(){return count},update(lea:GroundPoint,dog:GroundPoint,collected:number[],bark:()=>boolean){
  for(const [room,id,x,,z] of puzzleFragments){
   if(collected.includes(id)||notified.has(id)||roomAt(lea.x,lea.z)!==room||roomAt(dog.x,dog.z)!==room)continue;
   const [ox,oz]=layout[room];
   if(Math.hypot(lea.x-ox-x,lea.z-oz-z)<2&&Math.hypot(dog.x-ox-x,dog.z-oz-z)<2.3&&bark()){notified.add(id);count++;}
  }
 }};
}
