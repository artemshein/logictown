import type {RoomId} from './house-data';
export type PlayerLocation={version:2;area:'house';room:RoomId}|{version:2;area:'street'};
const rooms=['bedroom','living','kitchen','bathroom','toilet','hall'];
type Store=Pick<Storage,'getItem'|'setItem'>;
export const playerLocationKey='logictown-player-location-v1';
function browserStore():Store|undefined{try{return localStorage}catch{return undefined}}
export function parsePlayerLocation(raw:unknown):PlayerLocation|undefined{
 if(!raw||typeof raw!=='object')return;
 const r=raw as Record<string,unknown>;
 if(r.version!==2)return;
 if(r.area==='street')return {version:2,area:'street'};
 if(r.area==='house'&&typeof r.room==='string'&&rooms.includes(r.room))return {version:2,area:'house',room:r.room as RoomId};
}
export function readPlayerLocation(store=browserStore()){
 try{
  const raw=JSON.parse(store?.getItem(playerLocationKey)||'null');
  if(raw?.version===1){
   if(raw.area==='street')return {version:2,area:'street'} as PlayerLocation;
   if(raw.area==='house'){const room=store?.getItem('logictown-room');return {version:2,area:'house',room:room&&rooms.includes(room)?room as RoomId:'bedroom'} as PlayerLocation}
  }
  return parsePlayerLocation(raw);
 }catch{return undefined}
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
