export type PlayerLocation={version:1;area:'house'|'street';x:number;z:number;heading:number};
type Store=Pick<Storage,'getItem'|'setItem'>;
export const playerLocationKey='logictown-player-location-v1';
function browserStore():Store|undefined{try{return localStorage}catch{return undefined}}
export function parsePlayerLocation(raw:unknown):PlayerLocation|undefined{
 if(!raw||typeof raw!=='object')return;
 const r=raw as Record<string,unknown>;
 if(r.version!==1||(r.area!=='house'&&r.area!=='street'))return;
 if(![r.x,r.z,r.heading].every(v=>typeof v==='number'&&Number.isFinite(v)))return;
 if(Math.abs(r.x as number)>2000||Math.abs(r.z as number)>2000)return;
 return {version:1,area:r.area,x:r.x as number,z:r.z as number,heading:Math.atan2(Math.sin(r.heading as number),Math.cos(r.heading as number))};
}
export function readPlayerLocation(store=browserStore()){
 try{return parsePlayerLocation(JSON.parse(store?.getItem(playerLocationKey)||'null'))}catch{return undefined}
}
export function savePlayerLocation(location:PlayerLocation,store=browserStore()){
 const valid=parsePlayerLocation(location);if(!valid||!store)return false;
 try{store.setItem(playerLocationKey,JSON.stringify(valid));return true}catch{return false}
}
export function createLocationAutosave(read:()=>PlayerLocation,enabled:()=>boolean,store=browserStore()){
 let elapsed=0,last='';
 const flush=()=>{if(!enabled())return;const location=read(),text=JSON.stringify(location);if(text!==last&&savePlayerLocation(location,store))last=text};
 return {flush,tick(dt:number){elapsed+=dt;if(elapsed>=.75){elapsed=0;flush()}}};
}
export function installLocationAutosave(read:()=>PlayerLocation,enabled:()=>boolean){
 const saver=createLocationAutosave(read,enabled);
 const hide=()=>{if(document.hidden)saver.flush()};
 window.addEventListener('pagehide',saver.flush);document.addEventListener('visibilitychange',hide);
 return {...saver,dispose(){saver.flush();window.removeEventListener('pagehide',saver.flush);document.removeEventListener('visibilitychange',hide)}};
}
