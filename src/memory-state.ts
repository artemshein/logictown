export const medals=['flower','cup','boat','book','moon'] as const;
export type Medal=typeof medals[number];
export type QuestState={earned:Medal[];plums:number;jugs:[number,number];mirror:number[];fragments:number[];photo:number[];shadows:number[];order:Medal[];key:boolean;exited:boolean};
export const freshQuest=():QuestState=>({earned:[],plums:0,jugs:[0,0],mirror:[0,0,0],fragments:[],photo:[2,0,1],shadows:[1,2,3],order:[],key:false,exited:false});
export function restoreQuest(raw:unknown):QuestState{
 const s=freshQuest();if(!raw||typeof raw!=='object')return s;const r=raw as Record<string,unknown>;
 const ints=(v:unknown,n:number,max:number)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=max);
 if(Array.isArray(r.earned))s.earned=medals.filter(m=>r.earned instanceof Array&&r.earned.includes(m));
 if(Number.isInteger(r.plums)&&Number(r.plums)>=0&&Number(r.plums)<=9)s.plums=Number(r.plums);
 if(ints(r.jugs,2,5)&&Number((r.jugs as number[])[0])<=3)s.jugs=r.jugs as [number,number];
 if(ints(r.mirror,3,2))s.mirror=r.mirror as number[];
 if(Array.isArray(r.fragments))s.fragments=[0,1,2].filter(i=>(r.fragments as unknown[]).includes(i));
 if(ints(r.photo,3,2)&&new Set(r.photo as number[]).size===3)s.photo=r.photo as number[];
 if(ints(r.shadows,3,3))s.shadows=r.shadows as number[];
 if(Array.isArray(r.order)&&r.order.length<=5&&new Set(r.order).size===r.order.length&&r.order.every(m=>s.earned.includes(m)))s.order=r.order as Medal[];
 s.key=r.key===true&&medals.every(m=>s.earned.includes(m));s.exited=r.exited===true&&s.key;return s;
}
export function pour(jugs:[number,number],from:0|1):[number,number]{const next:[number,number]=[...jugs],to=from===0?1:0,amount=Math.min(next[from],[3,5][to]-next[to]);next[from]-=amount;next[to]+=amount;return next;}
export function canEarn(s:QuestState,m:Medal){switch(m){case 'cup':return s.plums===5;case 'boat':return s.jugs[1]===4;case 'flower':return s.mirror.join() ==='2,0,1';case 'book':return s.fragments.length===3&&s.photo.join()==='0,1,2';case 'moon':return s.earned.includes('book')&&s.shadows.every(x=>x===0)}}
export function award(s:QuestState,m:Medal){if(!canEarn(s,m))return false;if(!s.earned.includes(m))s.earned.push(m);return true;}
export function unlock(s:QuestState){if(medals.every(m=>s.earned.includes(m))&&s.order.join()===medals.join()){s.key=true;return true}return false;}
