// Development-only exit fixture, isolated from the game and other quest checks.
import {freshQuest,medals} from '../src/memory-state';
if(import.meta.env.DEV){
 const key='logictown-outdoor-check-v1';
 if(!localStorage.getItem(key)){const state=freshQuest();state.earned=[...medals];state.key=true;localStorage.setItem(key,JSON.stringify(state))}
 await import('../src/main');
}
