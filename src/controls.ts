export function createMovementControls(host:HTMLElement){
 const pad=document.createElement('div');pad.className='movement-pad';pad.setAttribute('role','group');pad.setAttribute('aria-label','Управление Леей');
 const directions=[{label:'Повернуть налево',symbol:'↶',forward:0,turn:-1},{label:'Идти вперёд и поворачивать налево',symbol:'↖',forward:1,turn:-1},{label:'Идти вперёд',symbol:'↑',forward:1,turn:0},{label:'Идти вперёд и поворачивать направо',symbol:'↗',forward:1,turn:1},{label:'Повернуть направо',symbol:'↷',forward:0,turn:1}];
 const point=(angle:number,r:number)=>[110+Math.cos(angle)*r,110-Math.sin(angle)*r];
 pad.innerHTML=`<svg viewBox="0 0 220 112">${directions.map((d,i)=>{const a=point(Math.PI-i*Math.PI/5,104),b=point(Math.PI-(i+1)*Math.PI/5,104),t=point(Math.PI-(i+.5)*Math.PI/5,73);return `<g data-direction="${i}" role="button" tabindex="0" aria-label="${d.label}"><path d="M110 110 L${a} A104 104 0 0 1 ${b} Z"/><text x="${t[0]}" y="${t[1]}" dy=".35em" text-anchor="middle">${d.symbol}</text></g>`}).join('')}</svg>`;host.append(pad);
 type Action='forward'|'back'|'left'|'right';type Input={forward:number,turn:number};const pointers=new Map<number,Input>(),keys=new Set<Action>();let tap:Input|undefined,tapUntil=0;
 const mapping:Record<string,Action>={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 let enabled=true;
 const clear=()=>{pointers.clear();keys.clear();tap=undefined;tapUntil=0};
 const updatePointer=(e:PointerEvent)=>{const bounds=pad.getBoundingClientRect(),x=(e.clientX-bounds.left)/bounds.width*220-110,y=110-(e.clientY-bounds.top)/bounds.height*112;const angle=Math.atan2(Math.max(0,y),x),index=Math.min(4,Math.floor((Math.PI-angle)/Math.PI*5));pointers.set(e.pointerId,directions[index])};
 pad.onpointerdown=e=>{if(!enabled)return;e.preventDefault();pad.setPointerCapture(e.pointerId);updatePointer(e)};
 pad.onpointermove=e=>{if(pointers.has(e.pointerId))updatePointer(e)};
 pad.onpointerup=pad.onpointercancel=pad.onlostpointercapture=e=>{pointers.delete(e.pointerId)};
 pad.oncontextmenu=e=>e.preventDefault();
 for(const [i,b] of Array.from(pad.querySelectorAll<SVGGElement>('[data-direction]')).entries()){
  const activate=()=>{if(enabled){tap=directions[i];tapUntil=performance.now()+200}};
  b.onclick=e=>{if(e.detail===0)activate()};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 }
 const down=(e:KeyboardEvent)=>{if(!enabled||!mapping[e.code])return;e.preventDefault();keys.add(mapping[e.code])};
 const up=(e:KeyboardEvent)=>{if(mapping[e.code])keys.delete(mapping[e.code])};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 return {read:(active:boolean)=>{enabled=active;pad.hidden=!active;if(!active)clear();const inputs=[...pointers.values(),...(tap&&tapUntil>performance.now()?[tap]:[])];const held=(a:Action)=>keys.has(a);const forward=Math.max(Number(held('forward')),...inputs.map(v=>v.forward))-Number(held('back')),turn=Math.max(Number(held('right')),...inputs.map(v=>Math.max(0,v.turn)))-Math.max(Number(held('left')),...inputs.map(v=>Math.max(0,-v.turn)));for(const [i,b] of Array.from(pad.querySelectorAll('[data-direction]')).entries())b.classList.toggle('held',inputs.includes(directions[i]));return {forward,turn}},clear,dispose:()=>{clear();pad.remove();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}};
}
