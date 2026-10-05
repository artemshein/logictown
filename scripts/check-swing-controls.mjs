import assert from 'node:assert/strict';
import {createSwingControls} from '../src/swing-controls.ts';

// Exercise real input handlers against a minimal DOM event surface.
const buttons=[1,-1].map(lean=>({dataset:{lean:String(lean)},setPointerCapture(){},classList:{toggle(){}}}));
const hint={textContent:''},progress={value:0};
const panel={hidden:false,dataset:{},setAttribute(){},remove(){},querySelectorAll:()=>buttons,querySelector:s=>s==='progress'?progress:hint};
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.createElement=()=>panel;
const controls=createSwingControls({append(){}});
function key(type,code){const e=new Event(type,{cancelable:true});e.code=code;window.dispatchEvent(e)}
controls.show(true);
key('keydown','KeyW');assert.equal(controls.read(),1);
key('keydown','KeyS');assert.equal(controls.read(),0,'opposite keys cancel');
key('keyup','KeyW');assert.equal(controls.read(),-1);
window.dispatchEvent(new Event('blur'));assert.equal(controls.read(),0,'focus loss releases leaning');
key('keydown','ArrowUp');controls.show(false);assert.equal(controls.read(),0,'exit releases held keys');
key('keydown','ArrowDown');assert.equal(controls.read(),0,'inactive controller ignores keys');
controls.show(true);
const pointer={pointerId:1,preventDefault(){}};
buttons[0].onpointerdown(pointer);assert.equal(controls.read(),1,'touch holds forward');
buttons[0].onpointercancel(pointer);assert.equal(controls.read(),0,'cancelled touch releases');
buttons[1].onpointerdown(pointer);assert.equal(controls.read(),-1,'touch holds back');
buttons[1].onlostpointercapture(pointer);assert.equal(controls.read(),0,'lost capture releases');
controls.update(.35,-1,'wrong',false);assert.equal(progress.value,.35);assert.match(hint.textContent,/назад.*Теряем скорость/);
controls.update(.65,1,'correct',true);assert.match(hint.textContent,/Получилось/);
controls.dispose();key('keydown','KeyW');assert.equal(controls.read(),0,'disposed controller removes listeners');
console.log('Swing controls: keyboard, touch, cancellation, focus loss, exit and feedback verified.');
