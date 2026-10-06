// Where the puppy was told to stay when Lea took the bus. No record: the puppy is with Lea.
export type DogPlace='town'|'school';
const key='logictown-dog-left-at';
function read():DogPlace|undefined{try{const v=localStorage.getItem(key);return v==='town'||v==='school'?v:undefined}catch{return undefined}}
function write(place:DogPlace|undefined){try{if(place)localStorage.setItem(key,place);else localStorage.removeItem(key)}catch{}}
/** Is the puppy here? Coming back to where it stayed reunites it with Lea. */
export function dogPresent(place:DogPlace){const left=read();if(!left)return true;if(left!==place)return false;write(undefined);return true}
/** Boarding the bus: a puppy told to sit stays behind; a following one rides along. */
export function dogBoardsBus(from:DogPlace,dog:{staying:boolean}|undefined){if(dog)write(dog.staying?from:undefined)}
