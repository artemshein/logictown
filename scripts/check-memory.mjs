import assert from 'node:assert/strict';
import {freshQuest,restoreQuest,pour,award,unlock,medals} from '../src/memory-state.ts';
const s=freshQuest();assert(!unlock(s));assert(!award(s,'cup'));assert(!award(s,'boat'));assert(!award(s,'flower'));assert(!award(s,'book'));assert(!award(s,'moon'));
s.plums=5;assert(award(s,'cup'));assert(award(s,'cup'));assert.equal(s.earned.length,1);
s.jugs=[0,5];s.jugs=pour(s.jugs,1);assert.deepEqual(s.jugs,[3,2]);s.jugs[0]=0;s.jugs=pour(s.jugs,1);assert.deepEqual(s.jugs,[2,0]);s.jugs[1]=5;s.jugs=pour(s.jugs,1);assert.deepEqual(s.jugs,[3,4]);assert(award(s,'boat'));
s.mirror=[2,0,1];assert(award(s,'flower'));s.shadows=[0,0,0];assert(!award(s,'moon'),'photo prerequisite must hold');s.fragments=[0,1,2];assert(!award(s,'book'),'wrong photo order');s.photo=[0,1,2];assert(award(s,'book'));assert(award(s,'moon'));
s.order=['moon','book','boat','cup','flower'];assert(!unlock(s),'wrong final sequence');s.order=[...medals];assert(unlock(s));s.exited=true;assert.deepEqual(restoreQuest(JSON.parse(JSON.stringify(s))),{...s,earned:[...medals]});
assert(!restoreQuest({key:true,exited:true}).key);assert.deepEqual(restoreQuest({jugs:[999,-1],photo:[0,0,0]}).jugs,[0,0]);
// Every reachable jug state stays within capacities, and 4 litres is reachable.
const seen=new Set(['0,0']),queue=[[0,0]];for(let k=0;k<queue.length;k++){const j=queue[k];for(const next of [[3,j[1]],[j[0],5],[0,j[1]],[j[0],0],pour(j,0),pour(j,1)]){assert(next[0]>=0&&next[0]<=3&&next[1]>=0&&next[1]<=5);if(!seen.has(next.join())){seen.add(next.join());queue.push(next)}}}assert(queue.some(j=>j[1]===4));
// The story clues admit exactly one order.
const permutations=a=>a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];
const solutions=permutations([...medals]).filter(p=>{const at=m=>p.indexOf(m);return at('flower')<at('cup')&&at('cup')<at('book')&&at('boat')===at('cup')+1&&at('book')>at('boat')&&at('book')<at('moon')});assert.deepEqual(solutions,[[...medals]]);
console.log('Full quest, wrong answers, prerequisites, save/load, water states and unique final solution passed');
